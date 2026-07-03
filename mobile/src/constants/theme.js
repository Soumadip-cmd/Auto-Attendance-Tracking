import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// Maps our numeric/named fontWeight scale to the loaded Inter font files —
// RN doesn't synthesize weights for custom fonts, so the family itself must change.
export const fontFamily = {
  regular: 'Inter_400Regular',
  '400': 'Inter_400Regular',
  normal: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  '500': 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  '600': 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  '700': 'Inter_700Bold',
  '800': 'Inter_800ExtraBold',
  extrabold: 'Inter_800ExtraBold',
  '900': 'Inter_900Black',
  black: 'Inter_900Black',
};

export const getFontFamily = (weight) => fontFamily[String(weight)] || fontFamily.regular;

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6366f1',
    secondary: '#8b5cf6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    background: '#f8fafc',
    surface: '#ffffff',
    text: '#0f172a',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    card: '#ffffff',
    notification: '#ef4444',
  },
  spacing: {
    xs: 4,
    sm:  8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md:  8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  fontFamily,
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity:  0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor:  '#000',
      shadowOffset:  { width: 0, height:  4 },
      shadowOpacity:  0.15,
      shadowRadius: 8,
      elevation: 8,
    },
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#818cf8',
    secondary: '#a78bfa',
    success:  '#34d399',
    warning: '#fbbf24',
    error:  '#f87171',
    info: '#60a5fa',
    background:  '#0f172a',
    surface:  '#1e293b',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    border: '#334155',
    card: '#1e293b',
    notification: '#f87171',
  },
  spacing: lightTheme.spacing,
  borderRadius: lightTheme.borderRadius,
  fontSize: lightTheme.fontSize,
  fontWeight: lightTheme.fontWeight,
  fontFamily,
  shadows: lightTheme.shadows,
};