import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { FontSizes, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface FatSecretAttributionProps {
  style?: ViewStyle;
}

export function FatSecretAttribution({ style }: FatSecretAttributionProps) {
  const theme = useTheme();
  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.text, { color: theme.textSecondary }]}>Powered by FatSecret</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  } as ViewStyle,
  text: {
    fontSize: FontSizes.xs,
    fontStyle: 'italic',
  } as TextStyle,
});
