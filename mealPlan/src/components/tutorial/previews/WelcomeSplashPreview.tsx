import { Image, View, Text, StyleSheet, type ViewStyle, type TextStyle, type ImageStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';

export function WelcomeSplashPreview() {
  const theme = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: `${Colors.accent}12`, borderColor: `${Colors.accent}30` }]}>
      <Image
        source={require('../../../../assets/images/icon-dark.png')}
        style={styles.appIcon}
        resizeMode="contain"
      />
      <Text style={[styles.appName, { color: Colors.accent }]}>Bento</Text>
      <Text style={[styles.tagline, { color: theme.textSecondary }]}>Your complete food toolkit</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 180,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  } as ViewStyle,
  appIcon: {
    width: 80,
    height: 80,
    borderRadius: 18,
  } as ImageStyle,
  appName: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: Spacing.xs,
  } as TextStyle,
  tagline: {
    fontSize: FontSizes.md,
    fontWeight: '500',
  } as TextStyle,
});
