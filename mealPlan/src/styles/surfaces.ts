import { StyleSheet } from 'react-native';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';

export const surfaces = StyleSheet.create({
  // Base card: add gap/flex/overflow per-component via array composition
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
  },
  // 8×8 status/accent dot; add flexShrink: 0 inline when in a row
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  // Full-screen modal overlay, content centred
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Full-screen sheet overlay, content anchored to bottom
  sheetOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
});
