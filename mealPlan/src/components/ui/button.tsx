import { Pressable, StyleSheet, Text, type ViewStyle, type TextStyle } from 'react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ label, onPress, variant = 'primary', disabled = false, style }: ButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      style={[
        styles.button,
        variant === 'secondary'
          ? { backgroundColor: theme.backgroundElement, borderWidth: 1, borderColor: theme.border }
          : styles.primary,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.label, variant === 'secondary' ? { color: theme.text } : styles.primaryLabel]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  primary: {
    backgroundColor: Colors.accent,
  } as ViewStyle,
  disabled: {
    opacity: 0.5,
  } as ViewStyle,
  label: {
    fontSize: 16,
    fontWeight: '600',
  } as TextStyle,
  primaryLabel: {
    color: '#FFFFFF',
  } as TextStyle,
});
