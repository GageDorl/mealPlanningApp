import { StyleSheet, TextInput, View, type TextInputProps, type ViewStyle, type TextStyle } from 'react-native';
import { Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface InputProps extends TextInputProps {
  containerStyle?: ViewStyle;
}

export function Input({ containerStyle, style, ...props }: InputProps) {
  const theme = useTheme();

  const inputStyle: TextStyle = {
    borderColor: theme.border,
    color: theme.text,
    backgroundColor: theme.background,
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <TextInput
        style={[inputStyle, styles.input, style]}
        placeholderTextColor={theme.textSecondary}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  } as ViewStyle,
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  } as TextStyle,
});
