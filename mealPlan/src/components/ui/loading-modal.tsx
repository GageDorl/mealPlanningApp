import { ActivityIndicator, Modal, StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { Colors, BorderRadius, Spacing, FontSizes } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  visible: boolean;
  message?: string;
}

export function LoadingModal({ visible, message }: Props) {
  const theme = useTheme();

  return (
    <Modal transparent animationType="fade" visible={visible} statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, shadowColor: theme.text }]}>
          <ActivityIndicator size="large" color={Colors.accent} />
          {message ? (
            <Text style={[styles.message, { color: theme.text }]}>{message}</Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  card: {
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xxl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    gap: Spacing.lg,
    minWidth: 180,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  } as ViewStyle,
  message: {
    fontSize: FontSizes.md,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 220,
  } as TextStyle,
});
