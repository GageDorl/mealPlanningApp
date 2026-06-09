import { StyleSheet, View, type TextStyle, type ViewStyle } from 'react-native';

import { ScreenContainer, ScreenCard, ScreenTitle } from '@/components/ui/screen';
import { Colors, Spacing } from '@/constants/theme';

interface Props {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthScreen({ title, children, footer }: Props) {
  return (
    <ScreenContainer>
      <ScreenCard>
        <ScreenTitle>{title}</ScreenTitle>
        {children}
        {footer && <View style={styles.footer}>{footer}</View>}
      </ScreenCard>
    </ScreenContainer>
  );
}

export const authStyles = {
  input: { marginBottom: Spacing.md } as TextStyle,
  error: { color: Colors.light.error } as TextStyle,
  socialButton: { marginTop: Spacing.md } as ViewStyle,
};

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  } as ViewStyle,
});
