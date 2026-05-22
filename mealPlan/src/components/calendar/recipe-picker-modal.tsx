import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/services/supabase';
import type { Recipe } from '@/models/recipe';

interface RecipePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (recipe: Recipe) => void;
}

export function RecipePickerModal({ visible, onClose, onSelect }: RecipePickerModalProps) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);

  const searchRecipes = async (text: string) => {
    setQuery(text);
    if (text.length < 2) {
      setRecipes([]);
      return;
    }

    setLoading(true);
    try {
      const { data } = await supabase
        .from('recipes')
        .select('*')
        .ilike('title', `%${text}%`)
        .limit(20);

      setRecipes((data as Recipe[]) ?? []);
    } catch {
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (recipe: Recipe) => {
    onSelect(recipe);
    setQuery('');
    setRecipes([]);
    onClose();
  };

  const renderRecipe = ({ item }: { item: Recipe }) => (
    <Pressable
      style={[styles.recipeRow, { borderBottomColor: theme.border }]}
      onPress={() => handleSelect(item)}
    >
      <View style={styles.recipeInfo}>
        <Text style={[styles.recipeTitle, { color: theme.text }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[styles.recipeMeta, { color: theme.textSecondary }]}>
          {item.calories ? `${item.calories} kcal` : ''}
          {item.prepTimeMinutes ? ` · ${item.prepTimeMinutes} min` : ''}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>Choose a Recipe</Text>
            <Button label="Cancel" onPress={onClose} variant="secondary" />
          </View>

          <Input
            placeholder="Search saved recipes..."
            value={query}
            onChangeText={searchRecipes}
            autoFocus
          />

          {loading ? (
            <ActivityIndicator color={Colors.accent} style={styles.loader} />
          ) : (
            <FlatList
              data={recipes}
              renderItem={renderRecipe}
              keyExtractor={(item) => item.id}
              style={styles.list}
              ListEmptyComponent={
                query.length >= 2 ? (
                  <Text style={[styles.empty, { color: theme.textSecondary }]}>No recipes found</Text>
                ) : (
                  <Text style={[styles.empty, { color: theme.textSecondary }]}>
                    Type to search your saved recipes
                  </Text>
                )
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  } as ViewStyle,
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    maxHeight: '80%',
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  } as ViewStyle,
  title: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
  } as TextStyle,
  list: {
    marginTop: Spacing.md,
  } as ViewStyle,
  recipeRow: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  } as ViewStyle,
  recipeInfo: {
    gap: 2,
  } as ViewStyle,
  recipeTitle: {
    fontSize: FontSizes.md,
    fontWeight: '500',
  } as TextStyle,
  recipeMeta: {
    fontSize: FontSizes.sm,
  } as TextStyle,
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.xl,
    fontSize: FontSizes.sm,
  } as TextStyle,
  loader: {
    marginTop: Spacing.xl,
  } as ViewStyle,
});
