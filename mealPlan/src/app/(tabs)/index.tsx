import { useCallback, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';
import { triggerSync } from '@/utils/trigger-sync';
import { getCachedUserId } from '@/services/supabase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useTopRecipes } from '@/hooks/use-top-recipes';
import { useMacros } from '@/hooks/use-macros';
import { useGrocery } from '@/hooks/use-grocery';
import { useCalendar } from '@/hooks/use-calendar';
import { useRefresh } from '@/contexts/refresh-context';
import { useSetPageRefresh } from '@/hooks/use-page-refresh';

import { CalendarPreviewCard } from '@/components/dashboard/calendar-preview-card';
import { GroceryPreviewCard } from '@/components/dashboard/grocery-preview-card';
import { RecipePreviewCard } from '@/components/dashboard/recipe-preview-card';
import { MacrosPreviewCard } from '@/components/dashboard/macros-preview-card';
import { NudgeBanner } from '@/components/dashboard/nudge-banner';
import { Colors, FontSizes, MaxContentWidth, Spacing } from '@/constants/theme';

const TODAY_DATE = new Date();

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();

  const { profile } = useUserProfile();
  const { recipes: topRecipes } = useTopRecipes();
  const { dailyProgress, refresh: refreshMacros } = useMacros(TODAY_DATE);
  const { state: grocery, refresh: refreshGrocery } = useGrocery();
  const { connected: calendarConnected } = useCalendar();

  const { isRefreshing, triggerRefresh } = useRefresh();

  // Initial load + navigation-focus reload
  useFocusEffect(useCallback(() => { refreshMacros(); refreshGrocery(); }, [refreshMacros, refreshGrocery]));

  // Register combined refresh for pull-to-refresh
  useSetPageRefresh(useCallback(async () => {
    await triggerSync();
    await Promise.all([refreshMacros(), refreshGrocery()]);
  }, [refreshMacros, refreshGrocery]));

  useEffect(() => {
    if (!profile && !getCachedUserId()) {
      router.replace('/sign-in');
    }
  }, [profile, router]);

  const handleNudgePress = useCallback(() => {
    if (!calendarConnected) {
      router.push('/profile');
    } else if (!profile || profile.macroGoals.length === 0) {
      router.push('/macros');
    } else {
      router.push('/profile');
    }
  }, [calendarConnected, profile, router]);

  const greeting = getGreeting();
  const displayName = profile?.user?.display_name ?? '';

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={triggerRefresh}
          tintColor={Colors.accent}
          colors={[Colors.accent]}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: theme.textSecondary }]}>{greeting}</Text>
          <Text style={[styles.name, { color: theme.text }]}>{displayName}</Text>
        </View>
        <Text style={[styles.dateLabel, { color: theme.textSecondary }]}>
          {formatDate(new Date())}
        </Text>
      </View>

      {/* Contextual nudge banner */}
      {profile && (
        <NudgeBanner
          profile={profile}
          calendarConnected={calendarConnected}
          onPress={handleNudgePress}
        />
      )}

      {/* Module grid: left column (Calendar + Grocery) + right column (Meals) */}
      <View style={styles.grid}>
        <View style={styles.leftColumn}>
          <CalendarPreviewCard
            onPress={() => router.push('/calendar')}
          />
          <GroceryPreviewCard
            totalCount={grocery.totalCount}
            checkedCount={grocery.checkedCount}
            onPress={() => router.push('/grocery')}
          />
        </View>

        <View style={styles.rightColumn}>
          <RecipePreviewCard
            recipes={topRecipes}
            onRecipePress={(id) => router.push(`/recipes/${id}` as any)}
            onViewAll={() => router.push('/recipes/saved')}
          />
        </View>
      </View>

      {/* Macros — full width, expandable inline */}
      <MacrosPreviewCard
        dailyProgress={dailyProgress}
        onPress={() => router.push('/macros')}
      />
    </ScrollView>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning,';
  if (hour < 17) return 'Good afternoon,';
  return 'Good evening,';
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  } as ViewStyle,
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.xxxl,
    maxWidth: MaxContentWidth,
    width: '100%',
    marginHorizontal: 'auto',
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: Spacing.xs,
  } as ViewStyle,
  greeting: {
    fontSize: FontSizes.sm,
  } as TextStyle,
  name: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
  } as TextStyle,
  dateLabel: {
    fontSize: FontSizes.sm,
  } as TextStyle,
  grid: {
    flexDirection: 'row',
    gap: Spacing.md,
  } as ViewStyle,
  leftColumn: {
    flex: 1,
    gap: Spacing.md,
  } as ViewStyle,
  rightColumn: {
    flex: 1,
    gap: Spacing.md,
  } as ViewStyle,
});
