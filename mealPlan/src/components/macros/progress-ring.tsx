import { View, Text, StyleSheet, Platform, type ViewStyle, type TextStyle } from 'react-native';
import { Colors, FontSizes, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ProgressRingProps {
  current: number;
  goal: number;
  unit: string;
  label?: string;
  color?: string;
  size?: number;
  showRemaining?: boolean;
}

const STROKE = 10;
const SEGMENTS = 360;
const MASK_OVERSCAN = 1;

export function ProgressRing({
  current,
  goal,
  unit,
  label,
  color = Colors.accent,
  size = 96,
  showRemaining = false,
}: ProgressRingProps) {
  const theme = useTheme();
  const maskOverscan = Platform.OS === 'web' ? MASK_OVERSCAN : 0;
  const percentage = goal > 0 ? Math.min(100, (current / goal) * 100) : 0;
  const isOver = current > goal;
  const fillColor = isOver ? theme.error : color;
  const remaining = Math.max(0, goal - current);

  const filledSegments = Math.round((percentage / 100) * SEGMENTS);
  const centerSize = size - STROKE * 2;
  const segmentWidth = Math.max(2, (Math.PI * size) / SEGMENTS);

  return (
    <View style={styles.wrapper}>
      <View style={{ width: size, height: size }}>
        <View
          style={[
            styles.ring,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: STROKE,
              borderColor: fillColor,
            },
          ]}
        />

        {/* Mask cuts away the unfilled part of the ring. */}
        <View
          pointerEvents="none"
          style={[
            styles.maskLayer,
            {
              width: size + maskOverscan * 2,
              height: size + maskOverscan * 2,
              borderRadius: (size + maskOverscan * 2) / 2,
              top: -maskOverscan,
              left: -maskOverscan,
              paddingTop: STROKE / 2,
            },
          ]}
        >
          {Array.from({ length: SEGMENTS - filledSegments }).map((_, index) => {
            const segmentIndex = filledSegments + index;
            const angle = (segmentIndex / SEGMENTS) * 360;

            return (
              <View
                key={`segment-${segmentIndex}`}
                style={[styles.segmentSlot, { transform: [{ rotate: `${angle}deg` }] }]}
              >
                <View
                  style={[
                    styles.segment,
                    {
                      width: segmentWidth,
                      height: STROKE + 2,
                      borderRadius: (STROKE + 2) / 2,
                      backgroundColor: theme.backgroundSelected,
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>

        <View
          style={[
            styles.centerDisk,
            {
              width: centerSize,
              height: centerSize,
              borderRadius: centerSize / 2,
              backgroundColor: theme.backgroundElement,
            },
          ]}
        >
          <Text style={[styles.percentage, { color: isOver ? theme.error : theme.text }]}>
            {showRemaining ? Math.round(remaining) : `${Math.round(percentage)}%`}
          </Text>
        </View>
      </View>

      <Text style={[styles.values, { color: theme.textSecondary }]} numberOfLines={1}>
        {showRemaining ? `${Math.round(remaining)} ${unit} left` : `${Math.round(current)} / ${Math.round(goal)} ${unit}`}
      </Text>
      {label ? <Text style={[styles.label, { color: theme.text }]}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: Spacing.xs,
  } as ViewStyle,
  ring: {
    position: 'absolute',
  } as ViewStyle,
  maskLayer: {
    position: 'absolute',
    overflow: 'hidden',
  } as ViewStyle,
  segmentSlot: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
  } as ViewStyle,
  segment: {
    marginTop: -1,
  } as ViewStyle,
  centerDisk: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    margin: STROKE,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  percentage: {
    fontSize: FontSizes.md,
    fontWeight: '700',
  } as TextStyle,
  values: {
    fontSize: FontSizes.xs,
    textAlign: 'center',
  } as TextStyle,
  label: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    textAlign: 'center',
  } as TextStyle,
});
