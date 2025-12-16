import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export const Button = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  ... props
}) => {
  const { theme } = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: theme.colors. primary,
          color: '#ffffff',
        };
      case 'secondary': 
        return {
          backgroundColor:  theme.colors.secondary,
          color: '#ffffff',
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: theme.colors.primary,
          borderWidth: 1,
          borderColor: theme.colors.primary,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: theme.colors.primary,
        };
      case 'danger':
        return {
          backgroundColor: theme.colors.error,
          color: '#ffffff',
        };
      default:
        return {
          backgroundColor: theme.colors.primary,
          color: '#ffffff',
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: theme.spacing.sm,
          paddingHorizontal: theme.spacing.md,
          fontSize: theme.fontSize.sm,
        };
      case 'medium':
        return {
          paddingVertical:  theme.spacing.md,
          paddingHorizontal: theme. spacing.lg,
          fontSize: theme.fontSize.md,
        };
      case 'large': 
        return {
          paddingVertical: theme.spacing.lg,
          paddingHorizontal: theme.spacing.xl,
          fontSize: theme.fontSize.lg,
        };
      default: 
        return {
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          fontSize: theme.fontSize.md,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor: variantStyles.backgroundColor,
          borderWidth: variantStyles.borderWidth,
          borderColor: variantStyles.borderColor,
          paddingVertical: sizeStyles. paddingVertical,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          borderRadius: theme.borderRadius. md,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      {...props}
    >
      {loading ?  (
        <ActivityIndicator color={variantStyles.color} />
      ) : (
        <>
          {icon && icon}
          <Text
            style={[
              styles.text,
              {
                color:  variantStyles.color,
                fontSize: sizeStyles.fontSize,
                fontWeight: theme.fontWeight.semibold,
                marginLeft: icon ? theme.spacing.sm : 0,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    textAlign: 'center',
  },
});