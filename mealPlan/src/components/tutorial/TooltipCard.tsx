import { Pressable, View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';

interface TooltipCardProps {
  step: number;
  total: number;
  title: string;
  body: string;
  onNext: () => void;
  onDismiss: () => void;
  arrowLeft?: number;
}

export function TooltipCard({ step, total, title, body, onNext, onDismiss, arrowLeft }: TooltipCardProps) {
  const theme = useTheme();
  const isLast = step === total - 1;
  return (
    <View style={styles.wrapper}>
      <View style={[styles.arrow, { borderBottomColor: Colors.accent }, arrowLeft !== undefined && { marginLeft: arrowLeft }]} />
      <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: Colors.accent }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.title, { color: Colors.accent }]}>{title}</Text>
          <Pressable onPress={onDismiss} hitSlop={10} style={styles.closeBtn}>
            <Text style={[styles.closeText, { color: Colors.accent }]}>×</Text>
          </Pressable>
        </View>
        <Text style={[styles.body, { color: theme.textSecondary }]}>{body}</Text>
        <View style={styles.footer}>
          <Text style={[styles.stepCount, { color: theme.textSecondary }]}>{step + 1} / {total}</Text>
          <Pressable
            onPress={isLast ? onDismiss : onNext}
            style={[styles.nextBtn, { backgroundColor: Colors.accent }]}
            hitSlop={4}
          >
            <Text style={styles.nextBtnText}>{isLast ? 'Got it ✓' : 'Next →'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 4,
    marginBottom: 4,
    marginHorizontal: Spacing.md,
  } as ViewStyle,
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    alignSelf: 'flex-start',
    marginLeft: 20,
  } as ViewStyle,
  card: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  } as ViewStyle,
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  } as ViewStyle,
  title: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    flex: 1,
  } as TextStyle,
  closeBtn: {
    padding: 2,
  } as ViewStyle,
  closeText: {
    fontSize: 18,
    lineHeight: 18,
    fontWeight: '400',
  } as TextStyle,
  body: {
    fontSize: FontSizes.sm,
    lineHeight: 20,
  } as TextStyle,
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,
  stepCount: {
    fontSize: FontSizes.xs,
    fontWeight: '500',
  } as TextStyle,
  nextBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.full,
  } as ViewStyle,
  nextBtnText: {
    color: '#fff',
    fontSize: FontSizes.sm,
    fontWeight: '700',
  } as TextStyle,
});
