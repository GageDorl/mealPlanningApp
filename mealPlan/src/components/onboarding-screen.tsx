import { ScrollView, StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';

import { ScreenContainer, ScreenCard, ScreenTitle } from '@/components/ui/screen';
import { useTheme } from '@/hooks/use-theme';
import { FontSizes } from '@/constants/theme';

interface Props {
  title: string;
  children: React.ReactNode;
  scrollable?: boolean;
  loading?: boolean;
  loadingText?: string;
}

export function OnboardingScreen({ title, children, scrollable, loading, loadingText = 'Loading…' }: Props) {
  const theme = useTheme();

  if (loading) {
    return (
      <ScreenContainer style={styles.loadingContainer}>
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>{loadingText}</Text>
      </ScreenContainer>
    );
  }

  if (scrollable) {
    return (
      <View style={[styles.scrollOuter, { backgroundColor: theme.background }]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <ScreenContainer>
            <ScreenCard>
              <ScreenTitle>{title}</ScreenTitle>
              {children}
            </ScreenCard>
          </ScreenContainer>
        </ScrollView>
      </View>
    );
  }

  return (
    <ScreenContainer>
      <ScreenCard>
        <ScreenTitle>{title}</ScreenTitle>
        {children}
      </ScreenCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  loadingText: {
    fontSize: FontSizes.md,
    fontWeight: '500',
  } as TextStyle,
  scrollOuter: {
    flex: 1,
  } as ViewStyle,
  scrollContent: {
    flexGrow: 1,
  } as ViewStyle,
});
