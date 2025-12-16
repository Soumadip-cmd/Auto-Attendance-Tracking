import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import * as Haptics from 'expo-haptics';

export const CheckInButton = ({ isCheckedIn, onCheckIn, onCheckOut, disabled }) => {
  const { theme } = useTheme();
  const [scaleAnim] = useState(new Animated.Value(1));

  const handlePress = async () => {
    // Haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver:  true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver:  true,
      }),
    ]).start();

    // Call action
    if (isCheckedIn) {
      onCheckOut();
    } else {
      onCheckIn();
    }
  };

  const buttonColor = isCheckedIn ? theme. colors.error : theme.colors.success;
  const buttonIcon = isCheckedIn ? 'log-out' : 'log-in';
  const buttonText = isCheckedIn ? 'Check Out' : 'Check In';

  return (
    <Animated.View style={[styles.container, { transform: [{ scale:  scaleAnim }] }]}>
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled}
        style={[
          styles.button,
          {
            backgroundColor: buttonColor,
            opacity: disabled ? 0.5 : 1,
            ... theme.shadows. lg,
          },
        ]}
        activeOpacity={0.8}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={buttonIcon} size={40} color="#ffffff" />
        </View>
        <Text style={styles.buttonText}>{buttonText}</Text>
      </TouchableOpacity>
    </Animated. View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  button: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems:  'center',
  },
  iconContainer: {
    marginBottom: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
});