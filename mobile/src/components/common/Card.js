import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export const Card = ({
  children,
  onPress,
  style,
  elevation = 'md',
  ...props
}) => {
  const { theme } = useTheme();

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.md,
          ... theme.shadows[elevation],
        },
        style,
      ]}
      {... props}
    >
      {children}
    </Container>
  );
};

const styles = StyleSheet.create({
  card: {},
});