import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { usePowerSync } from '@powersync/react-native';

import { Button } from '@/components/ui/button';
import { OnboardingScreen } from '@/components/onboarding-screen';
import { DietaryTags } from '@/constants/dietary-tags';
import { updateDietaryPreferences } from '@/services/user-service';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Spacing } from '@/constants/theme';

export default function DietaryPreferencesScreen() {
  const db = usePowerSync();
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
    await updateDietaryPreferences(db, profile.user.id, selectedTags);
    router.push('/calendar-connect');
  };

  return (
    <OnboardingScreen title="Choose dietary preferences" scrollable loading={loading} loadingText="Loading preferences…">
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
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  tagButton: {
    marginBottom: Spacing.xs,
  },
});
