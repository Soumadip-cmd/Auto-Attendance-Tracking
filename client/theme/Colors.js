// Color Theme Configuration
export const Colors = {
  // Primary Colors
  primary: '#6C63FF',
  primaryLight: '#8B85FF',
  primaryDark: '#5A52E3',
  
  // Secondary Colors
  secondary: '#FF6B6B',
  secondaryLight: '#FF8E8E',
  secondaryDark: '#FF4757',
  
  // Success & Status Colors
  success: '#2ECC71',
  successLight: '#58D68D',
  successDark: '#27AE60',
  
  warning: '#F39C12',
  warningLight: '#F5B041',
  warningDark: '#E67E22',
  
  error: '#E74C3C',
  errorLight: '#EC7063',
  errorDark: '#C0392B',
  
  info: '#3498DB',
  infoLight: '#5DADE2',
  infoDark: '#2980B9',
  
  // Neutral Colors
  white: '#FFFFFF',
  black: '#2C3E50',
  
  // Gray Scale
  gray100: '#F8F9FA',
  gray200: '#E9ECEF',
  gray300: '#DEE2E6',
  gray400: '#CED4DA',
  gray500: '#ADB5BD',
  gray600: '#6C757D',
  gray700: '#495057',
  gray800: '#343A40',
  gray900: '#212529',
  
  // Text Colors
  textPrimary: '#2C3E50',
  textSecondary: '#7F8C8D',
  textMuted: '#95A5A6',
  textWhite: '#FFFFFF',
  
  // Background Colors
  background: '#F8F9FA',
  surface: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.5)',
  
  // Border Colors
  border: '#E5E5E7',
  borderLight: '#F0F0F0',
  
  // Gradient Colors
  gradientStart: '#6C63FF',
  gradientEnd: '#9C88FF',
};

// Common Styles
export const CommonStyles = {
  shadow: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  shadowLarge: {
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
};

export default { Colors, CommonStyles };