import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { SuggestionRow } from '@/components/macros/food-suggestions-card';

const FILLER_SUGGESTIONS = [
  {
    name: 'Chobani Plain Non-Fat Greek Yogurt',
    brand: 'Chobani',
    serving: '1 container (150g)',
    calories: 90,
    protein: 16,
    carbs: 6,
    fat: 0,
    reason: 'High protein to close your protein gap without many calories.',
  },
  {
    name: 'Chicken & Brown Rice Bowl',
    brand: '',
    serving: '1 bowl (~350g)',
    calories: 480,
    protein: 42,
    carbs: 52,
    fat: 10,
    reason: 'Balanced macros to cover your remaining calories and protein.',
  },
];

type Status = 'idle' | 'loading' | 'success';

export function FoodSuggestionsPreview() {
  const theme = useTheme();
  const [status, setStatus] = useState<Status>('idle');

  function handleGetSuggestions() {
    setStatus('loading');
    setTimeout(() => setStatus('success'), 1800);
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <Text style={[styles.title, { color: theme.text }]}>Food Suggestions</Text>

      {status === 'idle' && (
        <Pressable
          style={[styles.primaryButton, { backgroundColor: Colors.accent }]}
          onPress={handleGetSuggestions}
        >
          <Text style={styles.primaryButtonText}>Get food suggestions</Text>
        </Pressable>
      )}

      {status === 'loading' && (
        <View style={styles.centeredRow}>
          <ActivityIndicator size="small" color={Colors.accent} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Finding suggestions…</Text>
        </View>
      )}

      {status === 'success' && (
        <>
          {FILLER_SUGGESTIONS.map((s, i) => (
            <SuggestionRow key={i} suggestion={s} theme={theme} onLog={() => {}} />
          ))}
          <Pressable
            style={[styles.refreshButton, { borderColor: theme.border }]}
            onPress={() => setStatus('idle')}
          >
            <Text style={[styles.refreshText, { color: theme.textSecondary }]}>Refresh suggestions</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
  } as ViewStyle,
  title: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
  } as TextStyle,
  primaryButton: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  } as ViewStyle,
  primaryButtonText: {
    color: '#fff',
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
  centeredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  } as ViewStyle,
  loadingText: {
    fontSize: FontSizes.sm,
  } as TextStyle,
  refreshButton: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: Spacing.lg,
  } as ViewStyle,
  refreshText: {
    fontSize: FontSizes.xs,
    fontWeight: '500',
  } as TextStyle,
});
