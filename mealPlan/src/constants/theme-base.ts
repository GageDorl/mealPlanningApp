import '@/global.css';

export const Colors = {
  accent: '#D4622A',
  accentLight: '#E07A46',
  accentDark: '#A84E22',
  overlay: 'rgba(0,0,0,0.45)',

  light: {
    text: '#28201A',
    background: 'rgba(255,252,248,0.88)',
    backgroundElement: 'rgba(252,246,235,0.88)',
    backgroundSelected: 'rgba(240,232,218,0.75)',
    textSecondary: '#3b3835',
    border: '#C4B4A0',
    success: '#3D7A4A',
    warning: '#F0B520',
    error: '#FF5252',
  },
  dark: {
    text: '#E5DDD3',
    background: 'rgba(16,12,9,0.90)',
    backgroundElement: 'rgba(44,34,26,0.88)',
    backgroundSelected: 'rgba(60,47,36,0.75)',
    textSecondary: '#9A9085',
    border: '#4A3C30',
    success: '#3D7A4A',
    warning: '#F0B520',
    error: '#FF5252',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const FontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  hero: 34,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const BorderRadius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const MaxContentWidth = 800;
