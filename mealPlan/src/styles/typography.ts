import { StyleSheet } from 'react-native';
import { FontSizes } from '@/constants/theme';

export const typography = StyleSheet.create({
  headingXl: { fontSize: FontSizes.xl, fontWeight: '700' },
  headingLg: { fontSize: FontSizes.lg, fontWeight: '700' },
  headingMd: { fontSize: FontSizes.md, fontWeight: '600' },
  headingSm: { fontSize: FontSizes.sm, fontWeight: '700' },
  // Card/section label: uppercase caps used across dashboard preview cards
  label: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  bodyMd: { fontSize: FontSizes.md },
  bodySm: { fontSize: FontSizes.sm },
  caption: { fontSize: FontSizes.xs },
  captionSemibold: { fontSize: FontSizes.xs, fontWeight: '600' },
});
