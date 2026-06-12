import { StyleSheet } from 'react-native';
import { Spacing, MaxContentWidth } from '@/constants/theme';

export const layout = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowSpaceBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fill: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  absoluteFill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  // Standard scroll content padding used across tab screens
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  // Max-width constrained container for web layout
  screenContainer: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    marginHorizontal: 'auto',
  },
});
