import { View, Image, Pressable, StyleSheet, Linking, type ViewStyle } from 'react-native';
import { Spacing, Colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const BADGE_DARK_INK = 'https://platform.fatsecret.com/api/static/images/powered_by_fatsecret_horizontal_dark.svg';
const BADGE_WHITE_INK = 'https://platform.fatsecret.com/api/static/images/powered_by_fatsecret_horizontal_white.svg';

interface FatSecretAttributionProps {
  style?: ViewStyle;
}

export function FatSecretAttribution({ style }: FatSecretAttributionProps) {
  const theme = useTheme();
  const isDark = theme.background === Colors.dark.background;
  const badgeUri = isDark ? BADGE_WHITE_INK : BADGE_DARK_INK;

  return (
    <View style={[styles.container, style]}>
      <Pressable onPress={() => Linking.openURL('https://platform.fatsecret.com')}>
        <Image
          source={{ uri: badgeUri }}
          style={styles.badge}
          resizeMode="contain"
          accessibilityLabel="Nutrition information provided by fatsecret Platform API"
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  } as ViewStyle,
  badge: {
    width: 140,
    height: 30,
  },
});
