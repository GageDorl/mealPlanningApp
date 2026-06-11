import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
import { supabase } from '@/services/supabase';
import { getHistoricalProgress, type DailyMacroProgress } from '@/services/macro-service';
import { FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type MacroKey = 'calories' | 'protein' | 'carbs' | 'fat';
type ChartType = 'bar' | 'line';
type Range = '7d' | '30d';

const MACRO_OPTIONS: { key: MacroKey; label: string; color: string }[] = [
  { key: 'calories', label: 'Calories', color: '#FF6B2C' },
  { key: 'protein', label: 'Protein', color: '#4A90D9' },
  { key: 'carbs', label: 'Carbs', color: '#F5A623' },
  { key: 'fat', label: 'Fat', color: '#7B68EE' },
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

export function MacroTrendChart() {
  const theme = useTheme();
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [selectedMacro, setSelectedMacro] = useState<MacroKey>('calories');
  const [range, setRange] = useState<Range>('7d');
  const [histData, setHistData] = useState<DailyMacroProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [tooltip, setTooltip] = useState<{ value: number; date: string } | null>(null);

  const rangeRef = useRef(range);
  rangeRef.current = range;

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user.id;
        if (!userId) return;
        const data = await getHistoricalProgress(userId, startDateForRange(range), dateKey(new Date())).catch(
          () => [] as DailyMacroProgress[],
        );
        if (!cancelled) setHistData(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [range]);

  useEffect(() => { setTooltip(null); }, [selectedMacro, range]);

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

  const baseChartWidth = containerWidth > Y_AXIS_WIDTH ? containerWidth - Y_AXIS_WIDTH : 0;
  baseChartWidthRef.current = baseChartWidth;
  const chartWidth = range === '30d' ? Math.floor(baseChartWidth * THIRTY_DAY_MULTIPLIER) : baseChartWidth;
  const n = histData.length || 1;
  const slotWidth = chartWidth / n;
  const labelStep = 1;

  const chartPoints = histData.map((day, i) => {
    const macro = day.macros.find((m) => m.macro_name === selectedMacro);
    return {
      value: macro?.current ?? 0,
      goal: macro?.goal ?? 0,
      label: xLabel(day.date, i, range, labelStep),
      date: day.date,
    };
  });

  const goalValue = chartPoints.find((p) => p.goal > 0)?.goal ?? 0;
  const maxRaw = Math.max(...chartPoints.map((p) => p.value), goalValue);
  const stepValue = selectedMacro === 'calories' ? 500 : 25;
  const noOfSections = Math.max(1, Math.ceil((maxRaw * 1.1) / stepValue));
  const maxValue = noOfSections * stepValue;
  const hasData = chartPoints.some((p) => p.value > 0);

  const yAxisLabels = Array.from({ length: noOfSections + 1 }, (_, i) => (noOfSections - i) * stepValue);

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
  };

  const toggleBg = theme.backgroundSelected;

  return (
    <View onLayout={onLayout} style={{ width: '100%' }}>
      {/* Controls row */}
      <View style={styles.controlsRow}>
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
            {formatTooltipDate(tooltip.date, range)}: {tooltip.value.toFixed(0)} {macroOption.key === 'calories' ? 'kcal' : 'g'}
          </Text>
        )}
      </View>

      {/* Chart area */}
      {loading ? (
        <View style={styles.placeholder}>
          <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>Loading…</Text>
        </View>
      ) : !hasData ? (
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
