import { useState, useCallback } from 'react';
import {
  View, Text, Pressable, ActivityIndicator, TextInput, Modal,
  StyleSheet, type ViewStyle, type TextStyle,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useFoodSuggestions } from '@/hooks/use-food-suggestions';
import { openAddModal } from '@/store/slices/add-meal-slot-slice';
import { IconPicker } from '@/components/ui/icon-picker';
import type { AppDispatch } from '@/store';
import type { FoodSuggestion } from '@/services/food-suggestions-service';

const QUICK_LABELS = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Post-workout']

interface FoodSuggestionsCardProps {
  userId: string
  date: Date
  remainingCalories: number
  remainingProtein: number
  remainingCarbs: number
  remainingFat: number
  hasGoals: boolean
}

function isToday(date: Date): boolean {
  const today = new Date()
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  )
}

export function FoodSuggestionsCard({
  userId,
  date,
  remainingCalories,
  hasGoals,
}: FoodSuggestionsCardProps) {
  const theme = useTheme()
  const dispatch = useDispatch<AppDispatch>()

  const { suggestions, status, error, isOffline, eligible, loadSuggestions, refresh } =
    useFoodSuggestions({ userId, date, remainingCalories, hasGoals })

  const [showRefreshInput, setShowRefreshInput] = useState(false)
  const [refreshText, setRefreshText] = useState('')

  // Label/icon picker state
  const [pickerTarget, setPickerTarget] = useState<FoodSuggestion | null>(null)
  const [pickerLabel, setPickerLabel] = useState('Snack')
  const [pickerIcon, setPickerIcon] = useState<string | null>(null)

  const handleRefreshConfirm = useCallback(async () => {
    setShowRefreshInput(false)
    setRefreshText('')
    await refresh(refreshText.trim())
  }, [refresh, refreshText])

  const openPicker = useCallback((suggestion: FoodSuggestion) => {
    setPickerTarget(suggestion)
    setPickerLabel('Snack')
    setPickerIcon(null)
  }, [])

  const closePicker = useCallback(() => setPickerTarget(null), [])

  const confirmLog = useCallback(() => {
    if (!pickerTarget) return
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    dispatch(openAddModal({
      date: todayStr,
      suggestion: {
        food_name: pickerTarget.name,
        brand_name: pickerTarget.brand || undefined,
        calories: String(pickerTarget.calories),
        protein: String(pickerTarget.protein),
        carbs: String(pickerTarget.carbs),
        fat: String(pickerTarget.fat),
        searchQuery: [pickerTarget.name, pickerTarget.brand].filter(Boolean).join(' '),
        label: pickerLabel,
        icon: pickerIcon,
      },
    }))
    setPickerTarget(null)
  }, [pickerTarget, pickerLabel, pickerIcon, dispatch])

  // Goals met — show positive message
  if (hasGoals && isToday(date) && remainingCalories <= 150) {
    return (
      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Food Suggestions</Text>
        <Text style={[styles.metGoalsText, { color: theme.textSecondary }]}>
          You've met your goals for today!
        </Text>
      </View>
    )
  }

  // Not eligible (past date, no goals, etc.) — don't render
  if (!eligible) return null

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Food Suggestions</Text>

      {/* Offline */}
      {isOffline && (
        <Text style={[styles.offlineText, { color: theme.textSecondary }]}>
          No internet connection — suggestions require a connection.
        </Text>
      )}

      {/* Idle */}
      {!isOffline && status === 'idle' && (
        <Pressable
          style={[styles.primaryButton, { backgroundColor: Colors.accent }]}
          onPress={loadSuggestions}
        >
          <Text style={styles.primaryButtonText}>Get food suggestions</Text>
        </Pressable>
      )}

      {/* Loading */}
      {status === 'loading' && (
        <View style={styles.centeredRow}>
          <ActivityIndicator size="small" color={Colors.accent} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Finding suggestions…</Text>
        </View>
      )}

      {/* Error */}
      {status === 'error' && (
        <View style={styles.errorBlock}>
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          <Pressable
            style={[styles.primaryButton, { backgroundColor: Colors.accent }]}
            onPress={loadSuggestions}
          >
            <Text style={styles.primaryButtonText}>Try again</Text>
          </Pressable>
        </View>
      )}

      {/* Success */}
      {status === 'success' && (
        <>
          {suggestions.map((s, i) => (
            <SuggestionRow
              key={i}
              suggestion={s}
              theme={theme}
              onLog={() => openPicker(s)}
            />
          ))}

          {/* Refresh */}
          {showRefreshInput ? (
            <View style={[styles.refreshBox, { borderColor: theme.border }]}>
              <TextInput
                style={[styles.refreshInput, { color: theme.text, borderColor: theme.border }]}
                placeholder="What are you in the mood for? (optional)"
                placeholderTextColor={theme.textSecondary}
                value={refreshText}
                onChangeText={setRefreshText}
                autoFocus
              />
              <View style={styles.refreshActions}>
                <Pressable onPress={() => { setShowRefreshInput(false); setRefreshText('') }} style={styles.ghostButton}>
                  <Text style={[styles.ghostButtonText, { color: theme.textSecondary }]}>Cancel</Text>
                </Pressable>
                <Pressable onPress={handleRefreshConfirm} style={[styles.primaryButton, { backgroundColor: Colors.accent }]}>
                  <Text style={styles.primaryButtonText}>Get suggestions</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              style={[styles.ghostButton, styles.refreshButton, { borderColor: theme.border }]}
              onPress={() => setShowRefreshInput(true)}
            >
              <Text style={[styles.ghostButtonText, { color: theme.textSecondary }]}>Refresh suggestions</Text>
            </Pressable>
          )}
        </>
      )}

      {/* Label / icon picker */}
      <Modal visible={!!pickerTarget} transparent animationType="slide" onRequestClose={closePicker}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Log as</Text>

            <Text style={[styles.pickerSectionLabel, { color: theme.textSecondary }]}>Meal</Text>
            <View style={styles.chipRow}>
              {QUICK_LABELS.map((l) => (
                <Pressable
                  key={l}
                  style={[
                    styles.chip,
                    { borderColor: theme.border },
                    pickerLabel === l && { backgroundColor: Colors.accent, borderColor: Colors.accent },
                  ]}
                  onPress={() => setPickerLabel(l)}
                >
                  <Text style={[styles.chipText, { color: theme.textSecondary }, pickerLabel === l && { color: '#fff' }]}>
                    {l}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.pickerSectionLabel, { color: theme.textSecondary }]}>Icon</Text>
            <IconPicker value={pickerIcon} onChange={setPickerIcon} />

            <View style={styles.modalActions}>
              <Pressable onPress={closePicker} style={styles.ghostButton}>
                <Text style={[styles.ghostButtonText, { color: theme.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={confirmLog} style={[styles.primaryButton, { backgroundColor: Colors.accent }]}>
                <Text style={styles.primaryButtonText}>Log it</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

export interface SuggestionRowProps {
  suggestion: FoodSuggestion
  theme: ReturnType<typeof useTheme>
  onLog: () => void
}

export function SuggestionRow({ suggestion, theme, onLog }: SuggestionRowProps) {
  return (
    <View style={[styles.suggestionRow, { borderColor: theme.border }]}>
      <View style={styles.suggestionMain}>
        <Text style={[styles.suggestionName, { color: theme.text }]} numberOfLines={2}>{suggestion.name}</Text>
        {suggestion.brand ? (
          <Text style={[styles.suggestionBrand, { color: theme.textSecondary }]}>{suggestion.brand}</Text>
        ) : null}
        <Text style={[styles.suggestionServing, { color: theme.textSecondary }]}>{suggestion.serving}</Text>

        <View style={styles.macroPillRow}>
          {[
            { label: 'Cal', value: suggestion.calories },
            { label: 'P', value: suggestion.protein, unit: 'g' },
            { label: 'C', value: suggestion.carbs, unit: 'g' },
            { label: 'F', value: suggestion.fat, unit: 'g' },
          ].map(({ label, value, unit }) => (
            <View key={label} style={[styles.macroPill, { backgroundColor: theme.backgroundSelected }]}>
              <Text style={[styles.macroPillLabel, { color: theme.textSecondary }]}>{label}</Text>
              <Text style={[styles.macroPillValue, { color: theme.text }]}>{value}{unit ?? ''}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.reasonText, { color: theme.textSecondary }]}>{suggestion.reason}</Text>
      </View>

      <Pressable
        style={[styles.logButton, { borderColor: Colors.accent }]}
        onPress={onLog}
        accessibilityRole="button"
        accessibilityLabel={`Log ${suggestion.name}`}
      >
        <Text style={[styles.logButtonText, { color: Colors.accent }]}>Log</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '100%',
    gap: Spacing.md,
  } as ViewStyle,
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    alignSelf: 'flex-start',
  } as TextStyle,
  metGoalsText: {
    fontSize: FontSizes.sm,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  } as TextStyle,
  offlineText: {
    fontSize: FontSizes.sm,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
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
  errorBlock: {
    gap: Spacing.sm,
    alignItems: 'flex-start',
  } as ViewStyle,
  errorText: {
    fontSize: FontSizes.sm,
  } as TextStyle,
  primaryButton: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    minWidth: 140,
  } as ViewStyle,
  primaryButtonText: {
    color: '#fff',
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
  ghostButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  } as ViewStyle,
  ghostButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
  } as TextStyle,
  refreshButton: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    alignSelf: 'center',
  } as ViewStyle,
  refreshBox: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  } as ViewStyle,
  refreshInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    fontSize: FontSizes.sm,
  } as TextStyle,
  refreshActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.xs,
  } as ViewStyle,
  suggestionRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  } as ViewStyle,
  suggestionMain: {
    flex: 1,
    gap: Spacing.xs,
  } as ViewStyle,
  suggestionName: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
  suggestionBrand: {
    fontSize: FontSizes.xs,
  } as TextStyle,
  suggestionServing: {
    fontSize: FontSizes.xs,
  } as TextStyle,
  macroPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  } as ViewStyle,
  macroPill: {
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    alignItems: 'center',
    minWidth: 44,
  } as ViewStyle,
  macroPillLabel: {
    fontSize: 10,
    fontWeight: '600',
  } as TextStyle,
  macroPillValue: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
  } as TextStyle,
  reasonText: {
    fontSize: FontSizes.xs,
    marginTop: Spacing.xs,
    lineHeight: 18,
  } as TextStyle,
  logButton: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
  } as ViewStyle,
  logButtonText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  } as TextStyle,
  // Picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  } as ViewStyle,
  modalSheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    gap: Spacing.md,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  } as ViewStyle,
  modalTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
  } as TextStyle,
  pickerSectionLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    marginTop: Spacing.xs,
  } as TextStyle,
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  } as ViewStyle,
  chip: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  } as ViewStyle,
  chipText: {
    fontSize: FontSizes.xs,
    fontWeight: '500',
  } as TextStyle,
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  } as ViewStyle,
})
