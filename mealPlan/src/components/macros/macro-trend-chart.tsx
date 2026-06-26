import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { parseWeightLogs, parseWeightGoal } from '@/services/weight-log-service';
import {
  Animated,
  View,
  Text,
  Pressable,
  StyleSheet,
  type LayoutChangeEvent,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { BarChart, LineChart, type barDataItem, type lineDataItem, type referenceConfigType } from 'react-native-gifted-charts';
import { useQuery } from '@powersync/react-native';
import { DefaultMacros } from '@/constants/macros';
import { type DailyMacroProgress, type MacroProgress } from '@/services/macro-service';
import { FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type MacroKey = 'calories' | 'protein' | 'carbs' | 'fat' | 'weight';
type ChartType = 'bar' | 'line';
type Range = '7d' | '30d';

const MACRO_OPTIONS: { key: MacroKey; label: string; color: string }[] = [
  { key: 'calories', label: 'Calories', color: '#FF6B2C' },
  { key: 'protein', label: 'Protein', color: '#4A90D9' },
  { key: 'carbs', label: 'Carbs', color: '#F5A623' },
  { key: 'fat', label: 'Fat', color: '#7B68EE' },
  { key: 'weight', label: 'Weight', color: '#34C759' },
];

const DAY_ABBREVS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_ABBREVS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const Y_AXIS_WIDTH = 48;
const CHART_HEIGHT = 160;
// 30d view renders at 3× container width so ~10 days are visible; user scrolls to see the rest.
const THIRTY_DAY_MULTIPLIER = 3;

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function startDateForRange(range: Range): string {
  const d = new Date();
  d.setDate(d.getDate() - (range === '7d' ? 6 : 29));
  return dateKey(d);
}

function buildDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(startDate + 'T12:00:00');
  const end = new Date(endDate + 'T12:00:00');
  while (cursor <= end) {
    dates.push(dateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function xLabel(dateStr: string, index: number, range: Range, labelStep = 5): string {
  if (range === '7d') {
    const day = new Date(dateStr + 'T12:00:00').getDay();
    return DAY_ABBREVS[day];
  }
  return index % labelStep === 0 ? String(Number(dateStr.slice(8))) : '';
}

function formatTooltipDate(dateStr: string, range: Range): string {
  const d = new Date(dateStr + 'T12:00:00');
  if (range === '7d') return DAY_NAMES[d.getDay()];
  return `${MONTH_ABBREVS[d.getMonth()]} ${d.getDate()}`;
}

interface Props {
  userId: string;
}

export function MacroTrendChart({ userId }: Props) {
  const theme = useTheme();
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [selectedMacro, setSelectedMacro] = useState<MacroKey>('calories');
  const [range, setRange] = useState<Range>('7d');
  const [containerWidth, setContainerWidth] = useState(0);
  const [tooltip, setTooltip] = useState<{ value: number; date: string } | null>(null);

  const rangeRef = useRef(range);
  rangeRef.current = range;

  const startDate = startDateForRange(range);
  const endDate = dateKey(new Date());

  const panOffset = useRef(new Animated.Value(0)).current;
  const panCurrentX = useRef(0);
  const panStartX = useRef(0);
  const baseChartWidthRef = useRef(0);
  const decayListenerRef = useRef<string>('');

  // Reset pan on range change; snap 30d to the most-recent end
  useLayoutEffect(() => {
    panOffset.stopAnimation();
    if (range === '30d' && baseChartWidthRef.current > 0) {
      const maxLeft = -(Math.floor(baseChartWidthRef.current * THIRTY_DAY_MULTIPLIER) - baseChartWidthRef.current);
      panOffset.setValue(maxLeft);
      panCurrentX.current = maxLeft;
    } else {
      panOffset.setValue(0);
      panCurrentX.current = 0;
    }
  }, [range]);

  useEffect(() => { setTooltip(null); }, [selectedMacro, range]);
  useEffect(() => { if (selectedMacro === 'weight') setChartType('line'); }, [selectedMacro]);

  // — PowerSync queries (reactive, local SQLite) —
  const { data: weightUserRows } = useQuery<{ weight_logs: string | null; weight_goal: string | null }>(
    'SELECT weight_logs, weight_goal FROM users WHERE id = ?',
    [userId],
  );

  const weightByDate = useMemo(() => {
    if (selectedMacro !== 'weight') return new Map<string, number>();
    const logs = parseWeightLogs(weightUserRows[0]?.weight_logs);
    return new Map(logs.map((e) => [e.date, e.weight_lbs]));
  }, [weightUserRows, selectedMacro]);

  const parsedWeightGoal = useMemo(() => {
    if (selectedMacro !== 'weight') return null;
    return parseWeightGoal(weightUserRows[0]?.weight_goal);
  }, [weightUserRows, selectedMacro]);

  const { data: goalRows } = useQuery<{
    macro_name: string; daily_target: number; unit: string; display_order: number;
  }>(
    'SELECT macro_name, daily_target, unit, display_order FROM macro_goals WHERE user_id = ? AND is_active = 1 ORDER BY display_order',
    [userId],
  );

  const { data: foodLogRows } = useQuery<{
    date: string; calories: number; protein: number; carbs: number; fat: number;
  }>(
    `SELECT fl.date,
       COALESCE(SUM(fli.calories * fli.servings_eaten), 0) as calories,
       COALESCE(SUM(fli.protein * fli.servings_eaten), 0) as protein,
       COALESCE(SUM(fli.carbs * fli.servings_eaten), 0) as carbs,
       COALESCE(SUM(fli.fat * fli.servings_eaten), 0) as fat
     FROM food_logs fl
     LEFT JOIN food_log_items fli ON fli.food_log_id = fl.id
     WHERE fl.user_id = ? AND fl.date >= ? AND fl.date <= ?
     GROUP BY fl.date`,
    [userId, startDate, endDate],
  );

  const { data: slotRows } = useQuery<{
    date: string; calories: number; protein: number; carbs: number; fat: number;
  }>(
    `SELECT ms.date,
       COALESCE(SUM(COALESCE(r.calories_per_serving, 0) * COALESCE(msr.servings_eaten, r.servings, 1)), 0) as calories,
       COALESCE(SUM(COALESCE(r.protein_per_serving, 0) * COALESCE(msr.servings_eaten, r.servings, 1)), 0) as protein,
       COALESCE(SUM(COALESCE(r.carbs_per_serving, 0) * COALESCE(msr.servings_eaten, r.servings, 1)), 0) as carbs,
       COALESCE(SUM(COALESCE(r.fat_per_serving, 0) * COALESCE(msr.servings_eaten, r.servings, 1)), 0) as fat
     FROM meal_plans mp
     JOIN meal_slots ms ON ms.meal_plan_id = mp.id
     JOIN meal_slot_recipes msr ON msr.meal_slot_id = ms.id
     JOIN recipes r ON r.id = msr.recipe_id
     WHERE mp.user_id = ? AND ms.date >= ? AND ms.date <= ?
     GROUP BY ms.date`,
    [userId, startDate, endDate],
  );

  const histData = useMemo<DailyMacroProgress[]>(() => {
    const foodByDate = new Map(foodLogRows.map((r) => [r.date, r]));
    const slotByDate = new Map(slotRows.map((r) => [r.date, r]));

    return buildDateRange(startDate, endDate).map((date) => {
      const food = foodByDate.get(date);
      const slot = slotByDate.get(date);
      const totals = {
        calories: (food?.calories ?? 0) + (slot?.calories ?? 0),
        protein: (food?.protein ?? 0) + (slot?.protein ?? 0),
        carbs: (food?.carbs ?? 0) + (slot?.carbs ?? 0),
        fat: (food?.fat ?? 0) + (slot?.fat ?? 0),
      };

      const macros: MacroProgress[] = goalRows.map((goal) => {
        const def = DefaultMacros.find((m) => m.key === goal.macro_name);
        const current = totals[goal.macro_name as keyof typeof totals] ?? 0;
        const rounded = Math.round(current * 10) / 10;
        return {
          macro_name: goal.macro_name,
          label: def?.label ?? goal.macro_name,
          current: rounded,
          goal: goal.daily_target,
          unit: goal.unit,
          percentage: goal.daily_target > 0 ? Math.min(100, Math.round((rounded / goal.daily_target) * 100)) : 0,
          color: def?.color ?? '#888888',
        };
      });

      return { date, macros, meal_breakdown: [] };
    });
  }, [foodLogRows, slotRows, goalRows, startDate, endDate]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const newWidth = e.nativeEvent.layout.width;
    setContainerWidth(newWidth);
    // Snap to most-recent on first layout if already in 30d (range effect ran before width was known)
    if (rangeRef.current === '30d' && panCurrentX.current === 0) {
      const base = newWidth > Y_AXIS_WIDTH ? newWidth - Y_AXIS_WIDTH : 0;
      if (base > 0) {
        const maxLeft = -(Math.floor(base * THIRTY_DAY_MULTIPLIER) - base);
        panOffset.setValue(maxLeft);
        panCurrentX.current = maxLeft;
      }
    }
  }, []);

  const panGesture = useMemo(() =>
    Gesture.Pan()
      .runOnJS(true)
      .maxPointers(1)
      .onBegin(() => {
        panOffset.stopAnimation();
        panStartX.current = panCurrentX.current;
      })
      .onUpdate((e) => {
        if (rangeRef.current !== '30d') return;
        const maxPanLeft = -(Math.floor(baseChartWidthRef.current * THIRTY_DAY_MULTIPLIER) - baseChartWidthRef.current);
        const next = Math.max(maxPanLeft, Math.min(0, panStartX.current + e.translationX));
        panOffset.setValue(next);
        panCurrentX.current = next;
      })
      .onEnd((e) => {
        if (rangeRef.current !== '30d') return;
        const maxPanLeft = -(Math.floor(baseChartWidthRef.current * THIRTY_DAY_MULTIPLIER) - baseChartWidthRef.current);

        decayListenerRef.current = panOffset.addListener(({ value }) => {
          panCurrentX.current = value;
          if (value < maxPanLeft || value > 0) {
            panOffset.stopAnimation();
            panOffset.removeListener(decayListenerRef.current);
            const clamped = Math.max(maxPanLeft, Math.min(0, value));
            panOffset.setValue(clamped);
            panCurrentX.current = clamped;
          }
        });

        Animated.decay(panOffset, {
          velocity: e.velocityX / 1000,
          deceleration: 0.997,
          useNativeDriver: false,
        }).start(() => {
          panOffset.removeListener(decayListenerRef.current);
        });
      }),
    []
  );

  const macroOption = MACRO_OPTIONS.find((m) => m.key === selectedMacro)!;
  const isWeight = selectedMacro === 'weight';

  const baseChartWidth = containerWidth > Y_AXIS_WIDTH ? containerWidth - Y_AXIS_WIDTH : 0;
  baseChartWidthRef.current = baseChartWidth;
  const chartWidth = range === '30d' ? Math.floor(baseChartWidth * THIRTY_DAY_MULTIPLIER) : baseChartWidth;
  const n = histData.length || 1;
  const slotWidth = chartWidth / n;
  const labelStep = 1;

  const chartPoints = isWeight
    ? buildDateRange(startDate, endDate).map((date, i) => ({
        value: weightByDate.get(date) ?? 0,
        goal: parsedWeightGoal?.goal_weight_lbs ?? 0,
        label: xLabel(date, i, range, labelStep),
        date,
      }))
    : histData.map((day, i) => {
        const macro = day.macros.find((m) => m.macro_name === selectedMacro);
        return {
          value: macro?.current ?? 0,
          goal: macro?.goal ?? 0,
          label: xLabel(day.date, i, range, labelStep),
          date: day.date,
        };
      });

  const goalValue = chartPoints.find((p) => p.goal > 0)?.goal ?? 0;
  const maxRaw = Math.max(...chartPoints.map((p) => p.value), goalValue, 0);
  const stepValue = isWeight ? 5 : selectedMacro === 'calories' ? 500 : 25;

  // For weight, anchor the Y-axis near the actual weight range instead of starting at 0
  const yOffset = (() => {
    if (!isWeight) return 0;
    const vals = chartPoints.filter((p) => p.value > 0).map((p) => p.value);
    if (vals.length === 0) return 0;
    const floorVal = Math.min(...vals, goalValue > 0 ? goalValue : Infinity);
    return Math.max(0, Math.floor((floorVal - 10) / 5) * 5);
  })();

  const noOfSections = Math.max(4, Math.ceil(((maxRaw - yOffset) * 1.15) / stepValue));
  const maxValue = yOffset + noOfSections * stepValue;
  const hasData = chartPoints.some((p) => p.value > 0);

  const yAxisLabels = Array.from({ length: noOfSections + 1 }, (_, i) =>
    yOffset + (noOfSections - i) * stepValue,
  );

  const labelStyle = { color: theme.textSecondary, fontSize: 10 };

  const barData: barDataItem[] = chartPoints.map(({ value, label, date }) => ({
    value,
    label,
    frontColor: macroOption.color,
    labelTextStyle: labelStyle,
    onPress: () => setTooltip((prev) => (prev?.date === date && prev?.value === value ? null : { value, date })),
  }));

  const lineData: lineDataItem[] = chartPoints.map(({ value, label, date }) => ({
    value,
    label,
    labelTextStyle: labelStyle,
    dataPointColor: macroOption.color,
    onPress: () => setTooltip((prev) => (prev?.date === date && prev?.value === value ? null : { value, date })),
  }));

  const refLineConfig: referenceConfigType = {
    color: macroOption.color,
    thickness: 1,
    type: 'dashed',
    dashWidth: 6,
    dashGap: 4,
  };

  const barWidth = Math.max(4, Math.floor(slotWidth * 0.55));
  const barSpacing = Math.max(2, Math.floor(slotWidth * 0.45));
  const pointSpacing = Math.floor(slotWidth);

  const commonChartProps = {
    height: CHART_HEIGHT,
    maxValue,
    noOfSections,
    stepValue,
    hideYAxisText: true,
    yAxisThickness: 0,
    yAxisLabelWidth: 0,
    showReferenceLine1: goalValue > 0,
    referenceLine1Position: goalValue,
    referenceLine1Config: refLineConfig,
    xAxisColor: theme.border,
    rulesColor: theme.border,
    backgroundColor: 'transparent' as const,
    ...(isWeight && yOffset > 0 ? { yAxisOffset: yOffset } : {}),
  };

  const toggleBg = theme.backgroundSelected;

  return (
    <View onLayout={onLayout} style={{ width: '100%' }}>
      {/* Controls row */}
      <View style={styles.controlsRow}>
        {!isWeight && (
          <View style={[styles.toggleGroup, { backgroundColor: toggleBg }]}>
            {(['bar', 'line'] as ChartType[]).map((type) => (
              <Pressable
                key={type}
                style={[styles.toggleBtn, chartType === type && { backgroundColor: macroOption.color }]}
                onPress={() => setChartType(type)}
              >
                <Text style={[styles.toggleText, { color: chartType === type ? '#fff' : theme.textSecondary }]}>
                  {type === 'bar' ? 'Bar' : 'Line'}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={[styles.toggleGroup, { backgroundColor: toggleBg }]}>
          {(['7d', '30d'] as Range[]).map((r) => (
            <Pressable
              key={r}
              style={[styles.toggleBtn, range === r && { backgroundColor: macroOption.color }]}
              onPress={() => setRange(r)}
            >
              <Text style={[styles.toggleText, { color: range === r ? '#fff' : theme.textSecondary }]}>{r}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Macro chips */}
      <View style={styles.macroChips}>
        {MACRO_OPTIONS.map((opt) => {
          const active = selectedMacro === opt.key;
          return (
            <Pressable
              key={opt.key}
              style={[styles.macroChip, { borderColor: opt.color }, active && { backgroundColor: opt.color }]}
              onPress={() => setSelectedMacro(opt.key)}
            >
              <Text style={[styles.macroChipText, { color: active ? '#fff' : opt.color }]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Tooltip */}
      <View style={styles.tooltipRow}>
        {tooltip && (
          <Text style={[styles.tooltipText, { color: macroOption.color }]}>
            {formatTooltipDate(tooltip.date, range)}: {tooltip.value.toFixed(isWeight ? 1 : 0)} {isWeight ? 'lbs' : macroOption.key === 'calories' ? 'kcal' : 'g'}
          </Text>
        )}
      </View>

      {/* Chart area */}
      {!hasData ? (
        <View style={styles.placeholder}>
          <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>No data for this period</Text>
        </View>
      ) : baseChartWidth > 0 ? (
        <GestureDetector gesture={panGesture}>
          <View style={styles.chartRow}>
            <View style={styles.yAxis}>
              {yAxisLabels.map((label, i) => (
                <Text key={i} style={[styles.yAxisLabel, { color: theme.textSecondary }]}>
                  {label}
                </Text>
              ))}
            </View>

            <View style={styles.chartDataContainer}>
              <Animated.View style={{ transform: [{ translateX: panOffset }] }}>
                {chartType === 'bar' ? (
                  <BarChart
                    data={barData}
                    width={chartWidth}
                    barWidth={barWidth}
                    spacing={barSpacing}
                    initialSpacing={barSpacing / 2}
                    endSpacing={0}
                    {...commonChartProps}
                  />
                ) : (
                  <LineChart
                    data={lineData}
                    color={macroOption.color}
                    width={chartWidth}
                    spacing={pointSpacing}
                    {...commonChartProps}
                  />
                )}
              </Animated.View>
            </View>
          </View>
        </GestureDetector>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  } as ViewStyle,
  toggleGroup: {
    flexDirection: 'row',
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  } as ViewStyle,
  toggleBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  } as ViewStyle,
  toggleText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  } as TextStyle,
  macroChips: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
    marginBottom: Spacing.md,
  } as ViewStyle,
  macroChip: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  } as ViewStyle,
  macroChipText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  } as TextStyle,
  placeholder: {
    height: CHART_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  placeholderText: {
    fontSize: FontSizes.sm,
  } as TextStyle,
  tooltipRow: {
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  } as ViewStyle,
  tooltipText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
  chartRow: {
    flexDirection: 'row',
  } as ViewStyle,
  yAxis: {
    width: Y_AXIS_WIDTH,
    justifyContent: 'space-between',
    paddingBottom: 20,
  } as ViewStyle,
  yAxisLabel: {
    fontSize: 10,
    textAlign: 'right',
    paddingRight: 4,
  } as TextStyle,
  chartDataContainer: {
    flex: 1,
    overflow: 'hidden',
  } as ViewStyle,
});
