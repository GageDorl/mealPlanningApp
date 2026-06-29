import { useState } from 'react';
import { ScrollView, View, StyleSheet, type ViewStyle } from 'react-native';
import { Button } from '@/components/ui/button';
import { DietaryTags, DietaryTagLabels } from '@/constants/dietary-tags';
import { Spacing } from '@/constants/theme';

// Demo-only: no DB reads or writes. Tag selections are local state and not saved.

interface Props {
  onComplete: () => void;
}

export function DietaryPreferencesSetup({ onComplete }: Props) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.tags}>
        {DietaryTags.map((tag) => (
          <Button
            key={tag}
            label={`${selectedTags.includes(tag) ? '✓  ' : ''}${DietaryTagLabels[tag]}`}
            onPress={() => toggleTag(tag)}
            variant={selectedTags.includes(tag) ? 'primary' : 'secondary'}
            style={styles.tagButton}
          />
        ))}
      </View>
      <Button label="Continue" onPress={onComplete} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
  } as ViewStyle,
  tags: {
    gap: Spacing.xs,
  } as ViewStyle,
  tagButton: {
    marginBottom: 0,
  } as ViewStyle,
});
