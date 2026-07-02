import { StyleSheet, Text, View, useWindowDimensions, type TextStyle, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { WoodTexture } from '@/components/WoodTexture';
import { FontSizes, MaxContentWidth, Spacing } from '@/constants/theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

interface ScreenCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

interface ScreenTitleProps {
  children: React.ReactNode;
  style?: TextStyle;
}

export function ScreenContainer({ children, style }: ScreenContainerProps) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  return (
    <View style={[styles.container, { backgroundColor: theme.background }, style]}>
      <WoodTexture width={width} height={height} style={StyleSheet.absoluteFill} />
      {children}
    </View>
  );
}

export function ScreenCard({ children, style }: ScreenCardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function ScreenTitle({ children, style }: ScreenTitleProps) {
  const theme = useTheme();
  return (
    <Text style={[styles.title, { color: theme.text }, style]}>{children}</Text>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  } as ViewStyle,
  card: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.lg,
  } as ViewStyle,
  title: {
    fontSize: FontSizes.hero,
    fontWeight: '600',
    marginBottom: Spacing.lg,
  } as TextStyle,
});
