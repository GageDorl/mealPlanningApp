import { View, Text, TextInput, Pressable, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { RecipeCard } from '@/components/recipes/recipe-card';

const NOOP = () => {};

// Extracted recipe shown below the URL input — matches what import.tsx hands off to create.tsx
const EXTRACTED_RECIPE = {
  id: 'imported-1',
  title: 'Chicken Tikka Masala',
  image: '',
  readyInMinutes: 35,
  calories: 480,
  isSaved: false,
};

export function RecipeImportPreview() {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      {/* Headline — matches import.tsx */}
      <Text style={[styles.headline, { color: theme.text }]}>Paste a recipe URL</Text>
      <Text style={[styles.subtext, { color: theme.textSecondary }]}>
        Works with AllRecipes, NYT Cooking, Serious Eats, and most recipe blogs.
      </Text>

      {/* URL input row — matches import.tsx urlRow style */}
      <View style={[styles.urlRow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <TextInput
          style={[styles.urlInput, { color: theme.text }]}
          value="https://budgetbytes.com/chicken-tikka-masala"
          onChangeText={NOOP}
          placeholderTextColor={theme.textSecondary}
          editable={false}
          autoCapitalize="none"
        />
      </View>

      {/* Import button — matches import.tsx importBtn style */}
      <Pressable style={[styles.importBtn, { backgroundColor: Colors.accent }]} onPress={NOOP}>
        <Text style={styles.importBtnText}>Import</Text>
      </Pressable>

      <Text style={[styles.tip, { color: theme.textSecondary }]}>
        You'll review all details before saving.
      </Text>

      {/* RecipeCard showing the extracted result */}
      <Text style={[styles.extractedLabel, { color: theme.textSecondary }]}>EXTRACTED RECIPE</Text>
      <RecipeCard recipe={EXTRACTED_RECIPE} onPress={NOOP} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  } as ViewStyle,
  headline: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
  } as TextStyle,
  subtext: {
    fontSize: FontSizes.sm,
    lineHeight: 20,
  } as TextStyle,
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 44,
  } as ViewStyle,
  urlInput: {
    flex: 1,
    fontSize: FontSizes.sm,
    height: '100%',
  } as TextStyle,
  importBtn: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  } as ViewStyle,
  importBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: FontSizes.md,
  } as TextStyle,
  tip: {
    fontSize: FontSizes.sm,
    fontStyle: 'italic',
    textAlign: 'center',
  } as TextStyle,
  extractedLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
  } as TextStyle,
});
