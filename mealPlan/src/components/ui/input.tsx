import { StyleSheet, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';

interface InputProps extends TextInputProps {
  containerStyle?: ViewStyle;
}

export function Input({ containerStyle, style, ...props }: InputProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      <TextInput style={[styles.input, style]} placeholderTextColor={Colors.light.textSecondary} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  } as ViewStyle,
  input: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
  } as ViewStyle,
});
