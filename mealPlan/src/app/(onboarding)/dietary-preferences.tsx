import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/ui/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DietaryTags } from '@/constants/dietary-tags';
import { updateDietaryPreferences } from '@/services/user-service';
import { useUserProfile } from '@/hooks/use-user-profile';
import { MaxContentWidth, Spacing } from '@/constants/theme';

export default function DietaryPreferencesScreen() {
  const router = useRouter();
  const { profile, loading } = useUserProfile();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    if (profile?.dietaryPreferences) {
      setSelectedTags(profile.dietaryPreferences);
    }
  }, [profile]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
    );
  };

  const handleSave = async () => {
    if (!profile) return;
    await updateDietaryPreferences(profile.user.id, selectedTags);
    router.push('/calendar-connect');
  };

  if (loading) {
    return <ThemedView style={styles.center}><ThemedText type="default">Loading preferences...</ThemedText></ThemedView>;
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.card}>
        <ThemedText type="title" style={styles.title}>
          Choose dietary preferences
        </ThemedText>
        {DietaryTags.map((tag) => (
          <Button
            key={tag}
            label={`${selectedTags.includes(tag) ? '✓ ' : ''}${tag}`}
            onPress={() => toggleTag(tag)}
            variant={selectedTags.includes(tag) ? 'primary' : 'secondary'}
            style={styles.tagButton}
          />
        ))}
        <Button label="Save preferences" onPress={handleSave} />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.five,
  },
  card: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.four,
  },
  title: {
    marginBottom: Spacing.four,
  },
  tagButton: {
    marginBottom: Spacing.one,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
