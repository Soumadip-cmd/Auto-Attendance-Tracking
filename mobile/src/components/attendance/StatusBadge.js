import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

export const StatusBadge = ({ status, size = 'medium' }) => {
  const { theme } = useTheme();

  const getStatusConfig = () => {
    switch (status) {
      case 'present':
        return {
          color: theme.colors.success,
          icon: 'checkmark-circle',
          label: 'Present',
        };
      case 'absent': 
        return {
          color: theme.colors.error,
          icon: 'close-circle',
          label: 'Absent',
        };
      case 'late':
        return {
          color: theme.colors.warning,
          icon: 'time',
          label: 'Late',
        };
      case 'half-day':
        return {
          color: theme.colors. info,
          icon: 'calendar',
          label: 'Half Day',
        };
      case 'on-leave':
        return {
          color: theme.colors.secondary,
          icon: 'airplane',
          label: 'On Leave',
        };
      default:
        return {
          color: theme.colors.textSecondary,
          icon: 'help-circle',
          label:  'Unknown',
        };
    }
  };

  const config = getStatusConfig();
  const iconSize = size === 'small' ? 14 : size === 'large' ? 20 : 16;
  const fontSize = size === 'small' ?  11 : size === 'large' ? 14 : 12;
  const padding = size === 'small' ?  4 : size === 'large' ? 10 : 6;

  return (
    <View
      style={[
        styles. badge,
        {
          backgroundColor:  `${config.color}20`,
          borderColor: config.color,
          paddingHorizontal: padding * 2,
          paddingVertical: padding,
        },
      ]}
    >
      <Ionicons name={config. icon} size={iconSize} color={config.color} />
      <Text
        style={[
          styles. label,
          {
            color: config.color,
            fontSize,
            marginLeft: 4,
          },
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
  },
  label: {
    fontWeight: '600',
  },
});