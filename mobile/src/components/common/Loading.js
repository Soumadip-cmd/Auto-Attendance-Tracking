import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export const Loading = ({ message = 'Loading... ', size = 'large' }) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles. container,
        {
          backgroundColor:  theme.colors.background,
        },
      ]}
    >
      <ActivityIndicator size={size} color={theme.colors.primary} />
      {message && (
        <Text
          style={[
            styles. message,
            {
              color:  theme.colors.textSecondary,
              fontSize:  theme.fontSize.md,
              marginTop: theme.spacing.md,
            },
          ]}
        >
          {message}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    textAlign: 'center',
  },
});