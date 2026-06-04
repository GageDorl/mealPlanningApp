import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { BorderRadius, Colors, FontSizes, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { importFromUrl, type ImportError } from '@/services/schema-import';
import { IMPORT_PREFILL_KEY } from '@/app/(tabs)/recipes/create';
import { useLoading } from '@/contexts/loading-context';

const ERROR_MESSAGES: Record<ImportError, string> = {
  invalid_url: "That doesn't look like a valid URL. Make sure it starts with https://.",
  fetch_failed:
    'Could not load the page. Check that the URL is accessible and try again.',
  no_structured_data:
    'No recipe data found on that page. The site may not use standard recipe markup.',
};

export default function ImportRecipeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { showLoading, updateMessage, hideLoading } = useLoading();

  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleImport() {
    const trimmed = url.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    showLoading('Fetching recipe page…');

    try {
      const result = await importFromUrl(trimmed, (step) => updateMessage(step));

      if (!result.success || !result.recipe) {
        setError(ERROR_MESSAGES[result.error ?? 'no_structured_data']);
        return;
      }

      updateMessage('Saving recipe…');
      const prefill = { ...result.recipe, source_url: trimmed };
      await AsyncStorage.setItem(IMPORT_PREFILL_KEY, JSON.stringify(prefill));
      router.replace('/recipes/create' as any);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      hideLoading();
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Text style={[styles.backIcon, { color: Colors.accent }]}>‹</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Import Recipe</Text>
      </View>

      <View style={styles.body}>
        <Text style={[styles.headline, { color: theme.text }]}>Paste a recipe URL</Text>
        <Text style={[styles.subtext, { color: theme.textSecondary }]}>
          Works with AllRecipes, NYT Cooking, Serious Eats, and most recipe blogs that use
          standard recipe markup.
        </Text>

        {/* URL input */}
        <View
          style={[
            styles.urlRow,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}
        >
          <TextInput
            style={[styles.urlInput, { color: theme.text }]}
            placeholder="https://example.com/recipe…"
            placeholderTextColor={theme.textSecondary}
            value={url}
            onChangeText={(t) => {
              setUrl(t);
              setError(null);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="go"
            onSubmitEditing={handleImport}
            editable={!loading}
          />
          {loading && <Text style={[styles.loadingDot, { color: Colors.accent }]}>●</Text>}
        </View>

        {/* Error message */}
        {error && (
          <View
            style={[styles.errorBox, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
          >
            <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
          </View>
        )}

        {/* Import button */}
        <Pressable
          style={[
            styles.importBtn,
            { backgroundColor: Colors.accent },
            (loading || !url.trim()) && styles.importBtnDisabled,
          ]}
          onPress={handleImport}
          disabled={loading || !url.trim()}
        >
          <Text style={styles.importBtnText}>{loading ? 'Importing…' : 'Import'}</Text>
        </Pressable>

        {/* Tip */}
        <Text style={[styles.tip, { color: theme.textSecondary }]}>
          You'll review all details before saving.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
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
  body: {
    flex: 1,
    padding: Spacing.xl,
    gap: Spacing.lg,
  } as ViewStyle,
  headline: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
  } as TextStyle,
  subtext: {
    fontSize: FontSizes.md,
    lineHeight: 22,
  } as TextStyle,
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 52,
    gap: Spacing.sm,
  } as ViewStyle,
  urlInput: {
    flex: 1,
    fontSize: FontSizes.md,
    height: '100%',
  } as TextStyle,
  errorBox: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  } as ViewStyle,
  errorText: {
    fontSize: FontSizes.sm,
    lineHeight: 20,
  } as TextStyle,
  importBtn: {
    height: 52,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  importBtnDisabled: {
    opacity: 0.5,
  } as ViewStyle,
  importBtnText: {
    color: '#FFFFFF',
    fontSize: FontSizes.md,
    fontWeight: '700',
  } as TextStyle,
  tip: {
    fontSize: FontSizes.sm,
    textAlign: 'center',
    fontStyle: 'italic',
  } as TextStyle,
  loadingDot: {
    fontSize: 10,
  } as TextStyle,
});
