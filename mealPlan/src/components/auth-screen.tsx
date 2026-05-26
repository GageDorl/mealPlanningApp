import { StyleSheet, View, type TextStyle, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';

interface Props {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthScreen({ title, children, footer }: Props) {
  return (
    <ThemedView style={styles.container}>
      <View style={styles.card}>
        <ThemedText type="title" style={styles.title}>{title}</ThemedText>
        {children}
        {footer && <View style={styles.footer}>{footer}</View>}
      </View>
    </ThemedView>
  );
}

export const authStyles = {
  input: { marginBottom: Spacing.md } as TextStyle,
  error: { color: Colors.light.error } as TextStyle,
  socialButton: { marginTop: Spacing.md } as ViewStyle,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
});
