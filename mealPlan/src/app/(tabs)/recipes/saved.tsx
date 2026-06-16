import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TextInput,
  Pressable,
  Alert,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { triggerSync } from '@/utils/trigger-sync';
import { LoadingModal } from '@/components/ui/loading-modal';
import { useRouter } from 'expo-router';
import { Colors, MaxContentWidth, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { RecipeCard } from '@/components/recipes/recipe-card';
import { useRecipes } from '@/hooks/use-recipes';
import { useOffline } from '@/hooks/use-offline';

export default function SavedRecipesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { recipes, loading, error, favorite, remove, refresh } = useRecipes();
  const isOffline = useOffline();

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await triggerSync();
    setRefreshing(false);
  }, []);

  const filtered = searchQuery.trim()
    ? recipes.filter((r) => r.title.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    : recipes;

  const handleDelete = useCallback(
    (recipeId: string, title: string) => {
      Alert.alert(
        'Remove recipe',
        `Remove "${title}" from your collection?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => remove(recipeId),
          },
        ]
      );
    },
    [remove]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Text style={[styles.backIcon, { color: Colors.accent }]}>‹</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>My Recipes</Text>
        <Pressable onPress={() => router.push('/recipes/import' as any)} style={styles.searchLink}>
          <Text style={[styles.searchLinkText, { color: Colors.accent }]}>Import</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/recipes/create' as any)} style={styles.searchLink}>
          <Text style={[styles.searchLinkText, { color: Colors.accent }]}>Create</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/search' as any)} style={styles.searchLink}>
          <Text style={[styles.searchLinkText, { color: Colors.accent }]}>Search</Text>
        </Pressable>
      </View>

      {/* Offline banner */}
      {isOffline && (
        <View style={[styles.offlineBanner, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[styles.offlineBannerText, { color: theme.textSecondary }]}>
            Offline — showing saved recipes
          </Text>
        </View>
      )}

      {/* Filter input */}
      {recipes.length > 0 && (
        <View style={[styles.searchBar, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Filter recipes…"
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      )}

      <LoadingModal visible={loading} message="Loading recipes…" />
      {!loading && error ? (
        <View style={styles.center}>
          <Text style={[styles.statusText, { color: theme.textSecondary }]}>{error}</Text>
          <Pressable onPress={refresh} style={styles.retryBtn}>
            <Text style={[styles.retryBtnText, { color: Colors.accent }]}>Retry</Text>
          </Pressable>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          {recipes.length === 0 ? (
            <>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No saved recipes yet</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                Search for recipes and tap Save to add them here
              </Text>
              <Pressable
                style={[styles.discoverBtn, { backgroundColor: Colors.accent }]}
                onPress={() => router.push('/search' as any)}
              >
                <Text style={styles.discoverBtnText}>Find Recipes</Text>
              </Pressable>
            </>
          ) : (
            <Text style={[styles.statusText, { color: theme.textSecondary }]}>
              No recipes match "{searchQuery}"
            </Text>
          )}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} colors={[Colors.accent]} />}
        >
          {filtered.map((recipe) => (
            <View key={recipe.id} style={styles.cardWrapper}>
              <RecipeCard
                recipe={{
                  id: recipe.id,
                  title: recipe.title,
                  image: recipe.image_url ?? '',
                  readyInMinutes: recipe.prep_minutes != null && recipe.cook_minutes != null
                    ? recipe.prep_minutes + recipe.cook_minutes
                    : undefined,
                  calories: recipe.calories_per_serving ?? undefined,
                  isSaved: true,
                }}
                onPress={() => router.push(`/recipes/${recipe.id}` as any)}
              />
              <Pressable
                style={styles.deleteBtn}
                onPress={() => handleDelete(recipe.id, recipe.title)}
                hitSlop={8}
              >
                <Text style={styles.deleteBtnText}>×</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  title: {
    flex: 1,
    fontSize: FontSizes.xl,
    fontWeight: '700',
  } as TextStyle,
  searchLink: {
    padding: Spacing.sm,
  } as ViewStyle,
  searchLinkText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
  offlineBanner: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  } as ViewStyle,
  offlineBannerText: {
    fontSize: FontSizes.sm,
    fontStyle: 'italic',
  } as TextStyle,
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    height: 44,
  } as ViewStyle,
  searchInput: {
    flex: 1,
    fontSize: FontSizes.md,
    height: '100%',
  } as TextStyle,
  grid: {
    padding: Spacing.lg,
    gap: Spacing.md,
  } as ViewStyle,
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  } as ViewStyle,
  emptyTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    textAlign: 'center',
  } as TextStyle,
  emptySubtitle: {
    fontSize: FontSizes.sm,
    textAlign: 'center',
  } as TextStyle,
  discoverBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  } as ViewStyle,
  discoverBtnText: {
    color: '#FFFFFF',
    fontSize: FontSizes.md,
    fontWeight: '700',
  } as TextStyle,
  retryBtn: {
    padding: Spacing.sm,
  } as ViewStyle,
  retryBtnText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  } as TextStyle,
  statusText: {
    fontSize: FontSizes.md,
    textAlign: 'center',
  } as TextStyle,
  cardWrapper: {
    position: 'relative',
  } as ViewStyle,
  deleteBtn: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  deleteBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '300',
  } as TextStyle,
});
