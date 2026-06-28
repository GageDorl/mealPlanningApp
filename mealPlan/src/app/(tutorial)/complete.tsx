import { ScrollView, View, Text, Pressable, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { Colors, FontSizes, Spacing, BorderRadius, MaxContentWidth } from '@/constants/theme';
import { useTutorial } from '@/hooks/use-tutorial';
import { TUTORIAL_CHAPTERS } from '@/constants/tutorial-chapters';

export default function TutorialCompleteScreen() {
  const theme = useTheme();
  const { completeTutorial } = useTutorial();

  return (
    <>
      <Stack.Screen options={{ headerRight: () => null, headerLeft: () => null }} />
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.content, { maxWidth: MaxContentWidth, alignSelf: 'center', width: '100%' }]}>

          <View style={styles.header}>
            <Text style={styles.emoji}>🎉</Text>
            <Text style={[styles.title, { color: theme.text }]}>{"You're all set!"}</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {"You've completed all five chapters. Prepd is ready when you are."}
            </Text>
          </View>

          <View style={styles.iconsRow}>
            {TUTORIAL_CHAPTERS.map((chapter) => (
              <View key={chapter.id} style={styles.iconCell}>
                <Text style={styles.chapterIcon}>{chapter.icon}</Text>
                <Text style={[styles.checkmark, { color: Colors.accent }]}>✓</Text>
              </View>
            ))}
          </View>

          <Pressable
            onPress={completeTutorial}
            style={({ pressed }) => [styles.homeButton, pressed && styles.homeButtonPressed]}
          >
            <Text style={styles.homeButtonText}>Go to Home</Text>
          </Pressable>

        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
  } as ViewStyle,
  content: {
    gap: Spacing.xxl,
    alignItems: 'center',
  } as ViewStyle,
  header: {
    alignItems: 'center',
    gap: Spacing.md,
  } as ViewStyle,
  emoji: {
    fontSize: 52,
    lineHeight: 64,
  } as TextStyle,
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    textAlign: 'center',
  } as TextStyle,
  subtitle: {
    fontSize: FontSizes.md,
    textAlign: 'center',
    lineHeight: 22,
  } as TextStyle,
  iconsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xl,
    flexWrap: 'wrap',
  } as ViewStyle,
  iconCell: {
    alignItems: 'center',
    gap: Spacing.xs,
  } as ViewStyle,
  chapterIcon: {
    fontSize: 28,
  } as TextStyle,
  checkmark: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
  } as TextStyle,
  homeButton: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    minHeight: 52,
    width: '100%',
  } as ViewStyle,
  homeButtonPressed: {
    opacity: 0.85,
  } as ViewStyle,
  homeButtonText: {
    color: '#FFFFFF',
    fontSize: FontSizes.md,
    fontWeight: '700',
  } as TextStyle,
});
