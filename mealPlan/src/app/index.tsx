import { useCallback, useEffect, useMemo } from 'react';
import { Alert, View, Text, ScrollView, ActivityIndicator, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useMealPlan } from '@/hooks/use-meal-plan';
import { useMacros } from '@/hooks/use-macros';
import { useGrocery } from '@/hooks/use-grocery';
import { useCalendar } from '@/hooks/use-calendar';

import { CalendarPreviewCard } from '@/components/dashboard/calendar-preview-card';
import { GroceryPreviewCard } from '@/components/dashboard/grocery-preview-card';
import { MealsPreviewCard } from '@/components/dashboard/meals-preview-card';
import { MacrosPreviewCard } from '@/components/dashboard/macros-preview-card';
import { NudgeBanner } from '@/components/dashboard/nudge-banner';
import { Colors, FontSizes, Spacing } from '@/constants/theme';

function todayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const TODAY_DATE = new Date();

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();

  const { profile, loading: profileLoading } = useUserProfile();
  const { weekPlan } = useMealPlan(TODAY_DATE);
  const { dailyProgress } = useMacros(TODAY_DATE);
  const { state: grocery } = useGrocery();
  const { connected: calendarConnected } = useCalendar();

  useEffect(() => {
    if (!profileLoading && !profile) {
      router.replace('/sign-in');
    }
  }, [profileLoading, profile, router]);

  const todayStr = todayString();

  const todaySlots = useMemo(() => {
    if (!weekPlan) return [];
    return weekPlan.slots
      .filter((s) => s.date === todayStr)
      .sort((a, b) => a.display_order - b.display_order);
  }, [weekPlan, todayStr]);

  const handleAddRecipe = useCallback(() => {
    Alert.alert('Add Recipe', undefined, [
      { text: 'Import from URL', onPress: () => router.push('/recipes/import') },
      { text: 'Search Recipes', onPress: () => router.push('/recipes/search') },
      { text: 'Create New', onPress: () => router.push('/recipes/create') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [router]);

  const handleNudgePress = useCallback(() => {
    if (!calendarConnected) {
      router.push('/calendar-connect' as any);
    } else if (profile && profile.macroGoals.length === 0) {
      router.push('/macro-goals' as any);
    } else {
      router.push('/profile');
    }
  }, [calendarConnected, profile, router]);

  if (profileLoading || !profile) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  const greeting = getGreeting();
  const displayName = profile.user.display_name ?? 'there';

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
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
      <NudgeBanner
        profile={profile}
        calendarConnected={calendarConnected}
        onPress={handleNudgePress}
      />

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
          <MealsPreviewCard
            slots={todaySlots}
            onPress={() => router.push('/calendar')}
            onAddPress={handleAddRecipe}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  root: {
    flex: 1,
  } as ViewStyle,
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.xxxl,
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
