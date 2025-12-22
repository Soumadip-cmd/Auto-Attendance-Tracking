import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Input, Button } from '../../src/components/common';
import { useTheme } from '../../src/hooks/useTheme';
import apiClient from '../../src/services/api';

export default function ForgotPassword() {
  const { theme } = useTheme();
  const [step, setStep] = useState(1); // 1: Email, 2: Code + Password
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestCode = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/auth/forgot-password', { email });
      
      Alert.alert(
        'Code Sent',
        'If your email exists in our system, you will receive a reset code.',
        [{ text: 'OK', onPress: () => setStep(2) }]
      );
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetCode.trim()) {
      Alert.alert('Error', 'Please enter the reset code');
      return;
    }

    if (!newPassword.trim() || newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', {
        email,
        resetCode,
        newPassword,
      });

      Alert.alert(
        'Success',
        'Your password has been reset successfully',
        [{ text: 'Login', onPress: () => router.replace('/(auth)/login') }]
      );
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => step === 1 ? router.back() : setStep(1)}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {step === 1 ? 'Forgot Password' : 'Reset Password'}
          </Text>
        </View>

        {/* Step 1: Email */}
        {step === 1 && (
          <View style={styles.form}>
            <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
              Enter your email address and we'll send you a code to reset your password.
            </Text>

            <Input
              label="Email Address"
              placeholder="your.email@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<Ionicons name="mail-outline" size={20} color={theme.colors.textSecondary} />}
            />

            <Button
              title="Send Reset Code"
              onPress={handleRequestCode}
              loading={loading}
              style={styles.button}
            />
          </View>
        )}

        {/* Step 2: Code + New Password */}
        {step === 2 && (
          <View style={styles.form}>
            <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
              Enter the 6-digit code sent to {email} and your new password.
            </Text>

            <Input
              label="Reset Code"
              placeholder="000000"
              value={resetCode}
              onChangeText={setResetCode}
              keyboardType="number-pad"
              maxLength={6}
              leftIcon={<Ionicons name="key-outline" size={20} color={theme.colors.textSecondary} />}
            />

            <Input
              label="New Password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              leftIcon={<Ionicons name="lock-closed-outline" size={20} color={theme.colors.textSecondary} />}
            />

            <Input
              label="Confirm Password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              leftIcon={<Ionicons name="lock-closed-outline" size={20} color={theme.colors.textSecondary} />}
            />

            <Button
              title="Reset Password"
              onPress={handleResetPassword}
              loading={loading}
              style={styles.button}
            />

            <TouchableOpacity
              onPress={handleRequestCode}
              style={styles.resendButton}
            >
              <Text style={[styles.resendText, { color: theme.colors.primary }]}>
                Didn't receive the code? Resend
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  form: {
    flex: 1,
  },
  button: {
    marginTop: 20,
  },
  resendButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
