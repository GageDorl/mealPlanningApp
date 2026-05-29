import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { BorderRadius, Colors, FontSizes, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useRecipes } from '@/hooks/use-recipes';
import {
  IngredientInput,
  toIngredientInput,
  type IngredientInputValue,
} from '@/components/recipes/ingredient-input';
import type { RecipeFormData } from '@/services/recipe-service';
import { lookupIngredient } from '@/services/fatsecret';
import { calculateForQuantity } from '@/utils/macro-calculator';

export const IMPORT_PREFILL_KEY = 'recipe:pending_import';

const DIFFICULTY_OPTIONS: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];

interface StepInput {
  id: string;
  text: string;
}

function makeIngredient(index: number): IngredientInputValue & { id: string } {
  return { id: String(Date.now() + index), name: '', quantity: '', unit: '' };
}

function makeStep(index: number): StepInput {
  return { id: String(Date.now() + index), text: '' };
}

function sumMacros(ingredients: Array<IngredientInputValue & { id: string }>) {
  return ingredients.reduce(
    (acc, ing) => ({
      calories: acc.calories + (ing.macros?.calories ?? 0),
      protein: acc.protein + (ing.macros?.protein ?? 0),
      carbs: acc.carbs + (ing.macros?.carbs ?? 0),
      fat: acc.fat + (ing.macros?.fat ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export default function CreateRecipeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { save } = useRecipes();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [servings, setServings] = useState('2');
  const [prepMinutes, setPrepMinutes] = useState('');
  const [cookMinutes, setCookMinutes] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | null>(null);
  const [ingredients, setIngredients] = useState<Array<IngredientInputValue & { id: string }>>(
    [makeIngredient(0)]
  );
  const [steps, setSteps] = useState<StepInput[]>([makeStep(0)]);
  const [saving, setSaving] = useState(false);
  const [prefillSourceUrl, setPrefillSourceUrl] = useState<string | undefined>();
  const [prefillLoaded, setPrefillLoaded] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const stepLayouts = useRef<Record<string, number>>({});

  // Load prefilled import data if available
  useEffect(() => {
    AsyncStorage.getItem(IMPORT_PREFILL_KEY)
      .then((raw) => {
        if (!raw) return;
        AsyncStorage.removeItem(IMPORT_PREFILL_KEY);
        const prefill = JSON.parse(raw) as Partial<RecipeFormData> & { source_url?: string };
        if (prefill.title) setTitle(prefill.title);
        if (prefill.description) setDescription(prefill.description);
        if (prefill.servings) setServings(String(prefill.servings));
        if (prefill.prep_minutes) setPrepMinutes(String(prefill.prep_minutes));
        if (prefill.cook_minutes) setCookMinutes(String(prefill.cook_minutes));
        if (prefill.cuisine_type) setCuisine(prefill.cuisine_type);
        if (prefill.difficulty) setDifficulty(prefill.difficulty);
        if (prefill.source_url) setPrefillSourceUrl(prefill.source_url);
        if (prefill.ingredients && prefill.ingredients.length > 0) {
          setIngredients(
            prefill.ingredients.map((ing, idx) => ({
              id: String(Date.now() + idx),
              name: ing.name ?? ing.raw_text ?? '',
              quantity: ing.quantity != null ? String(ing.quantity) : '',
              unit: ing.unit ?? '',
            }))
          );
        }
        if (prefill.instructions && prefill.instructions.length > 0) {
          setSteps(
            prefill.instructions.map((s, idx) => ({
              id: String(Date.now() + 1000 + idx),
              text: s,
            }))
          );
        }
        setPrefillLoaded(true);
      })
      .catch(() => {});
  }, []);

  // Auto-run OFF lookup for each prefilled ingredient name
  useEffect(() => {
    if (!prefillLoaded) return;
    setIngredients((current) => {
      const toLookup = current.filter((ing) => ing.name.trim() && !ing.offResult);
      toLookup.forEach((ing, idx) => {
        setTimeout(async () => {
          try {
            const result = await lookupIngredient(ing.name);
            if (result.results.length === 0) return;
            const best = result.results[0];
            setIngredients((prev) =>
              prev.map((i) => {
                if (i.id !== ing.id || i.offResult) return i;
                const qty = parseFloat(i.quantity);
                const macros =
                  !isNaN(qty) && qty > 0 && i.unit
                    ? calculateForQuantity(best, qty, i.unit)
                    : undefined;
                return {
                  ...i,
                  offResult: best,
                  macros: macros
                    ? { calories: macros.calories, protein: macros.protein, carbs: macros.carbs, fat: macros.fat }
                    : undefined,
                };
              })
            );
          } catch {
            // silent — user can search manually
          }
        }, idx * 400);
      });
      return current;
    });
  }, [prefillLoaded]);

  function handleIngredientChange(id: string, val: IngredientInputValue) {
    setIngredients((prev) =>
      prev.map((ing) => (ing.id === id ? { ...ing, ...val } : ing))
    );
  }

  function handleAddIngredient() {
    setIngredients((prev) => [...prev, makeIngredient(prev.length)]);
  }

  function handleRemoveIngredient(id: string) {
    setIngredients((prev) => (prev.length > 1 ? prev.filter((i) => i.id !== id) : prev));
  }

  function handleStepChange(id: string, text: string) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, text } : s)));
  }

  function handleAddStep() {
    setSteps((prev) => [...prev, makeStep(prev.length)]);
  }

  function handleRemoveStep(id: string) {
    setSteps((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== id) : prev));
  }

  function buildFormData(): RecipeFormData {
    const validIngredients = ingredients.filter((i) => i.name.trim());
    const validSteps = steps.map((s) => s.text.trim()).filter(Boolean);
    const totals = sumMacros(validIngredients);
    const srv = parseInt(servings, 10) || 1;

    return {
      title: title.trim(),
      description: description.trim() || undefined,
      servings: srv,
      prep_minutes: parseInt(prepMinutes, 10) || undefined,
      cook_minutes: parseInt(cookMinutes, 10) || undefined,
      cuisine_type: cuisine.trim() || undefined,
      difficulty: difficulty ?? undefined,
      source_type: prefillSourceUrl ? 'url_import' : 'user_created',
      source_url: prefillSourceUrl,
      calories_per_serving: totals.calories > 0 ? Math.round(totals.calories / srv) : undefined,
      protein_per_serving: totals.protein > 0 ? parseFloat((totals.protein / srv).toFixed(1)) : undefined,
      carbs_per_serving: totals.carbs > 0 ? parseFloat((totals.carbs / srv).toFixed(1)) : undefined,
      fat_per_serving: totals.fat > 0 ? parseFloat((totals.fat / srv).toFixed(1)) : undefined,
      instructions: validSteps.length > 0 ? validSteps : undefined,
      dietary_tags: [],
      ingredients: validIngredients.map((ing, idx) => toIngredientInput(ing, idx)),
    };
  }

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please enter a recipe name.');
      return;
    }
    const validIngredients = ingredients.filter((i) => i.name.trim());
    if (validIngredients.length === 0) {
      Alert.alert('No ingredients', 'Please add at least one ingredient.');
      return;
    }

    const formData = buildFormData();

    Alert.alert(
      'Save recipe?',
      `"${formData.title}" with ${formData.ingredients.length} ingredient${formData.ingredients.length !== 1 ? 's' : ''}${formData.calories_per_serving ? `, ~${formData.calories_per_serving} cal/serving` : ''}`,
      [
        { text: 'Review', style: 'cancel' },
        {
          text: 'Save',
          onPress: async () => {
            setSaving(true);
            try {
              const recipe = await save(formData);
              router.replace(`/recipes/${recipe.id}` as any);
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save recipe');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  }

  const totals = sumMacros(ingredients);
  const srv = parseInt(servings, 10) || 1;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Text style={[styles.backIcon, { color: Colors.accent }]}>‹</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>New Recipe</Text>
        <Pressable
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Basic info */}
        <Section label="Recipe Name" theme={theme}>
          <TextInput
            style={[styles.textInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
            placeholder="e.g. Grilled Chicken Bowl"
            placeholderTextColor={theme.textSecondary}
            value={title}
            onChangeText={setTitle}
          />
        </Section>

        <Section label="Description (optional)" theme={theme}>
          <TextInput
            style={[
              styles.textInput,
              styles.multilineInput,
              { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement },
            ]}
            placeholder="Brief description…"
            placeholderTextColor={theme.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </Section>

        {/* Metadata row */}
        <View style={styles.metaRow}>
          <View style={styles.metaField}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Servings</Text>
            <TextInput
              style={[styles.smallInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
              value={servings}
              onChangeText={setServings}
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.metaField}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Prep (min)</Text>
            <TextInput
              style={[styles.smallInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
              value={prepMinutes}
              onChangeText={setPrepMinutes}
              keyboardType="number-pad"
              placeholder="—"
              placeholderTextColor={theme.textSecondary}
            />
          </View>
          <View style={styles.metaField}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Cook (min)</Text>
            <TextInput
              style={[styles.smallInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
              value={cookMinutes}
              onChangeText={setCookMinutes}
              keyboardType="number-pad"
              placeholder="—"
              placeholderTextColor={theme.textSecondary}
            />
          </View>
        </View>

        {/* Cuisine */}
        <Section label="Cuisine (optional)" theme={theme}>
          <TextInput
            style={[styles.textInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
            placeholder="e.g. Italian, Mexican…"
            placeholderTextColor={theme.textSecondary}
            value={cuisine}
            onChangeText={setCuisine}
          />
        </Section>

        {/* Difficulty */}
        <Section label="Difficulty" theme={theme}>
          <View style={styles.difficultyRow}>
            {DIFFICULTY_OPTIONS.map((d) => (
              <Pressable
                key={d}
                onPress={() => setDifficulty(d === difficulty ? null : d)}
                style={[
                  styles.difficultyChip,
                  d === difficulty
                    ? { backgroundColor: Colors.accent }
                    : { backgroundColor: theme.backgroundElement, borderColor: theme.border, borderWidth: 1 },
                ]}
              >
                <Text
                  style={[
                    styles.difficultyText,
                    { color: d === difficulty ? '#FFFFFF' : theme.text },
                  ]}
                >
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </Section>

        {/* Ingredients */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionLabel, { color: theme.text }]}>Ingredients</Text>
        </View>
        {ingredients.map((ing, idx) => (
          <IngredientInput
            key={ing.id}
            index={idx}
            value={ing}
            onChange={(val) => handleIngredientChange(ing.id, val)}
            onRemove={ingredients.length > 1 ? () => handleRemoveIngredient(ing.id) : undefined}
          />
        ))}
        <Pressable style={[styles.addBtn, { borderColor: theme.border }]} onPress={handleAddIngredient}>
          <Text style={[styles.addBtnText, { color: Colors.accent }]}>+ Add Ingredient</Text>
        </Pressable>

        {/* Macro summary */}
        {totals.calories > 0 && (
          <View style={[styles.macroSummary, { backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.macroSummaryLabel, { color: theme.textSecondary }]}>
              Total macros ({srv} serving{srv !== 1 ? 's' : ''})
            </Text>
            <View style={styles.macroSummaryRow}>
              <MacroChip label="cal" value={totals.calories} theme={theme} highlight />
              <MacroChip label="P" value={parseFloat((totals.protein).toFixed(1))} unit="g" theme={theme} />
              <MacroChip label="C" value={parseFloat((totals.carbs).toFixed(1))} unit="g" theme={theme} />
              <MacroChip label="F" value={parseFloat((totals.fat).toFixed(1))} unit="g" theme={theme} />
            </View>
            {srv > 1 && (
              <Text style={[styles.perServingNote, { color: theme.textSecondary }]}>
                ~{Math.round(totals.calories / srv)} cal / serving
              </Text>
            )}
          </View>
        )}

        {/* Steps */}
        <View style={[styles.sectionHeader, { marginTop: Spacing.lg }]}>
          <Text style={[styles.sectionLabel, { color: theme.text }]}>Steps</Text>
        </View>
        {steps.map((step, idx) => (
          <View
            key={step.id}
            style={styles.stepRow}
            onLayout={(e) => { stepLayouts.current[step.id] = e.nativeEvent.layout.y; }}
          >
            <View
              style={[
                styles.stepNum,
                { backgroundColor: Colors.accent },
              ]}
            >
              <Text style={styles.stepNumText}>{idx + 1}</Text>
            </View>
            <TextInput
              style={[
                styles.stepInput,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement },
              ]}
              placeholder={`Step ${idx + 1}…`}
              placeholderTextColor={theme.textSecondary}
              value={step.text}
              onChangeText={(t) => handleStepChange(step.id, t)}
              onFocus={() => {
                const y = stepLayouts.current[step.id];
                if (y != null) {
                  scrollRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: true });
                }
              }}
              multiline
            />
            {steps.length > 1 && (
              <Pressable
                onPress={() => handleRemoveStep(step.id)}
                style={styles.removeStepBtn}
                hitSlop={8}
              >
                <Text style={[styles.removeStepIcon, { color: theme.textSecondary }]}>×</Text>
              </Pressable>
            )}
          </View>
        ))}
        <Pressable style={[styles.addBtn, { borderColor: theme.border }]} onPress={handleAddStep}>
          <Text style={[styles.addBtnText, { color: Colors.accent }]}>+ Add Step</Text>
        </Pressable>

        <View style={{ height: Spacing.xl * 2 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Section({
  label,
  children,
  theme,
}: {
  label: string;
  children: React.ReactNode;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{label}</Text>
      {children}
    </View>
  );
}

function MacroChip({
  label,
  value,
  unit,
  theme,
  highlight,
}: {
  label: string;
  value: number;
  unit?: string;
  theme: ReturnType<typeof useTheme>;
  highlight?: boolean;
}) {
  return (
    <View style={styles.macroChip}>
      <Text
        style={[
          styles.macroChipValue,
          { color: highlight ? Colors.accent : theme.text },
        ]}
      >
        {value}
        {unit}
      </Text>
      <Text style={[styles.macroChipLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  } as ViewStyle,
  backBtn: {
    flexShrink: 0,
  } as ViewStyle,
  backIcon: {
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 30,
  } as TextStyle,
  headerTitle: {
    flex: 1,
    fontSize: FontSizes.xl,
    fontWeight: '700',
  } as TextStyle,
  saveBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    minWidth: 64,
    alignItems: 'center',
  } as ViewStyle,
  saveBtnDisabled: {
    opacity: 0.6,
  } as ViewStyle,
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: FontSizes.sm,
  } as TextStyle,
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  } as ViewStyle,
  section: {
    gap: Spacing.xs,
  } as ViewStyle,
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,
  sectionLabel: {
    fontSize: FontSizes.md,
    fontWeight: '700',
  } as TextStyle,
  fieldLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.md,
    minHeight: 44,
  } as TextStyle,
  multilineInput: {
    minHeight: 80,
    paddingTop: Spacing.sm,
    textAlignVertical: 'top',
  } as TextStyle,
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  } as ViewStyle,
  metaField: {
    flex: 1,
    gap: Spacing.xs,
  } as ViewStyle,
  smallInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.md,
    textAlign: 'center',
    height: 44,
  } as TextStyle,
  difficultyRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  } as ViewStyle,
  difficultyChip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  } as ViewStyle,
  difficultyText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
  addBtn: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  } as ViewStyle,
  addBtnText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
  macroSummary: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  } as ViewStyle,
  macroSummaryLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  macroSummaryRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  } as ViewStyle,
  macroChip: {
    alignItems: 'center',
  } as ViewStyle,
  macroChipValue: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
  } as TextStyle,
  macroChipLabel: {
    fontSize: FontSizes.xs,
  } as TextStyle,
  perServingNote: {
    fontSize: FontSizes.xs,
    fontStyle: 'italic',
  } as TextStyle,
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  } as ViewStyle,
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 8,
  } as ViewStyle,
  stepNumText: {
    color: '#FFFFFF',
    fontSize: FontSizes.xs,
    fontWeight: '700',
  } as TextStyle,
  stepInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.md,
    minHeight: 44,
    textAlignVertical: 'top',
  } as TextStyle,
  removeStepBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  } as ViewStyle,
  removeStepIcon: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '300',
  } as TextStyle,
});
