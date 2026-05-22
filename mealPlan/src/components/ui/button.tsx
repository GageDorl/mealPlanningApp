import { Pressable, StyleSheet, Text, type ViewStyle, type TextStyle } from 'react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ label, onPress, variant = 'primary', disabled = false, style }: ButtonProps) {
  return (
    <Pressable
      style={[styles.button, variant === 'secondary' ? styles.secondary : styles.primary, disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.label, variant === 'secondary' ? styles.secondaryLabel : styles.primaryLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  } as ViewStyle,
  primary: {
    backgroundColor: Colors.light.accent,
  } as ViewStyle,
  secondary: {
    backgroundColor: Colors.light.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.light.border,
  } as ViewStyle,
  disabled: {
    opacity: 0.6,
  } as ViewStyle,
  label: {
    fontSize: 16,
    fontWeight: '700',
  } as TextStyle,
  primaryLabel: {
    color: '#FFFFFF',
  } as TextStyle,
  secondaryLabel: {
    color: Colors.light.text,
  } as TextStyle,
});
