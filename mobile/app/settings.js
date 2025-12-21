import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/hooks/useAuth';
import { useTheme } from '../src/hooks/useTheme';
import { useNotifications } from '../src/hooks/useNotifications';
import { useBiometric } from '../src/hooks/useBiometric';
import { Card } from '../src/components/common/Card';
import { Button } from '../src/components/common/Button';
import * as Application from 'expo-application';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const { hasPermission: hasNotificationPermission, requestPermissions } = useNotifications();
  const {
    isAvailable: isBiometricAvailable,
    isEnabled: isBiometricEnabled,
    biometricType,
    enableBiometric,
    disableBiometric,
  } = useBiometric();

  const [notificationsEnabled, setNotificationsEnabled] = useState(hasNotificationPermission);

  const handleBiometricToggle = async (value) => {
    if (value) {
      const success = await enableBiometric();
      if (success) {
        Alert.alert(
          'Biometric Enabled',
          `${biometricType} has been enabled for quick login.`
        );
      } else {
        Alert.alert('Authentication Failed', 'Please try again.');
      }
    } else {
      await disableBiometric();
      Alert.alert(
        'Biometric Disabled',
        'You will need to use your email and password to login.'
      );
    }
  };

  const handleNotificationToggle = async (value) => {
    if (value) {
      const granted = await requestPermissions();
      setNotificationsEnabled(granted);
      if (!granted) {
        Alert.alert(
          'Permission Denied',
          'Please enable notifications in your device settings.'
        );
      }
    } else {
      setNotificationsEnabled(false);
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            // Clear cache logic here
            Alert.alert('Success', 'Cache cleared successfully');
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          console.log('🚪 User confirmed logout from settings');
          const result = await logout();
          console.log('🚪 Logout result:', result);
          // Force complete navigation reset to login screen
          setTimeout(() => {
            router.replace('/(auth)/login');
          }, 100);
        },
      },
    ]);
  };

  const SettingOption = ({ icon, label, value, onPress, showChevron = true }) => (
    <TouchableOpacity
      style={[styles.option, { backgroundColor: theme.colors.card }]}
      onPress={onPress}
    >
      <View style={styles.optionLeft}>
        <View style={[styles.optionIcon, { backgroundColor: `${theme.colors.primary}20` }]}>
          <Ionicons name={icon} size={20} color={theme.colors.primary} />
        </View>
        <Text style={[styles.optionLabel, { color: theme.colors.text }]}>{label}</Text>
      </View>
      <View style={styles.optionRight}>
        {value && (
          <Text style={[styles.optionValue, { color: theme.colors.textSecondary }]}>
            {value}
          </Text>
        )}
        {showChevron && (
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        )}
      </View>
    </TouchableOpacity>
  );

  const ToggleOption = ({ icon, label, subtitle, value, onValueChange, disabled = false }) => (
    <View
      style={[
        styles.option,
        { backgroundColor: theme.colors.card, opacity: disabled ? 0.5 : 1 },
      ]}
    >
      <View style={styles.optionLeft}>
        <View style={[styles.optionIcon, { backgroundColor: `${theme.colors.primary}20` }]}>
          <Ionicons name={icon} size={20} color={theme.colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.optionLabel, { color: theme.colors.text }]}>{label}</Text>
          {subtitle && (
            <Text
              style={[
                styles.optionSubtitle,
                { color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 },
              ]}
            >
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        thumbColor="#ffffff"
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            ⚙️ Settings
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            APPEARANCE
          </Text>

          <ToggleOption
            icon="moon-outline"
            label="Dark Mode"
            subtitle="Use dark theme for better night viewing"
            value={isDarkMode}
            onValueChange={toggleTheme}
          />

          <SettingOption
            icon="language-outline"
            label="Language"
            value="English"
            onPress={() => Alert.alert('Coming Soon', 'Multiple languages will be available soon')}
          />
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            SECURITY
          </Text>

          <ToggleOption
            icon="finger-print-outline"
            label="Biometric Login"
            subtitle={
              biometricType
                ? `Use ${biometricType} to login`
                : 'Not available on this device'
            }
            value={isBiometricEnabled}
            disabled={!isBiometricAvailable}
            onValueChange={handleBiometricToggle}
          />

          <SettingOption
            icon="lock-closed-outline"
            label="Change Password"
            onPress={() => router.push('/profile/change-password')}
          />

          <SettingOption
            icon="shield-checkmark-outline"
            label="Two-Factor Authentication"
            value="Disabled"
            onPress={() => Alert.alert('Coming Soon', '2FA will be available soon')}
          />
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            NOTIFICATIONS
          </Text>

          <ToggleOption
            icon="notifications-outline"
            label="Push Notifications"
            subtitle="Receive attendance reminders and updates"
            value={notificationsEnabled}
            onValueChange={handleNotificationToggle}
          />

          <SettingOption
            icon="alarm-outline"
            label="Attendance Reminders"
            value="9:00 AM"
            onPress={() => Alert.alert('Coming Soon', 'Custom reminders coming soon')}
          />

          <SettingOption
            icon="mail-outline"
            label="Email Notifications"
            value="Enabled"
            onPress={() => Alert.alert('Coming Soon', 'Email settings coming soon')}
          />
        </View>

        {/* Location Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            LOCATION
          </Text>

          <SettingOption
            icon="location-outline"
            label="Location Services"
            value="Always"
            onPress={() =>
              Alert.alert(
                'Location Settings',
                'Location is required for attendance tracking. Please manage this in your device settings.'
              )
            }
          />

          <SettingOption
            icon="map-outline"
            label="Geofencing"
            value="Enabled"
            onPress={() => Alert.alert('Geofencing', 'Automatic check-in/out based on location')}
          />
        </View>

        {/* Data & Storage Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            DATA & STORAGE
          </Text>

          <SettingOption
            icon="refresh-outline"
            label="Auto Sync"
            value="On"
            onPress={() => Alert.alert('Coming Soon', 'Auto sync settings coming soon')}
          />

          <SettingOption
            icon="trash-outline"
            label="Clear Cache"
            onPress={handleClearCache}
          />

          <SettingOption
            icon="download-outline"
            label="Download Data"
            onPress={() => Alert.alert('Coming Soon', 'Data export coming soon')}
          />
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>ABOUT</Text>

          <SettingOption
            icon="information-circle-outline"
            label="App Version"
            value={Application.nativeApplicationVersion || '1.0.0'}
            showChevron={false}
          />

          <SettingOption
            icon="document-text-outline"
            label="Terms of Service"
            onPress={() => router.push('/info/terms')}
          />

          <SettingOption
            icon="shield-outline"
            label="Privacy Policy"
            onPress={() => router.push('/info/privacy-policy')}
          />

          <SettingOption
            icon="help-circle-outline"
            label="Help & Support"
            onPress={() => router.push('/info/help')}
          />
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.error }]}>DANGER ZONE</Text>

          <Card style={[styles.dangerCard, { borderColor: theme.colors.error }]}>
            <Button
              title="Logout"
              onPress={handleLogout}
              variant="outline"
              style={{ borderColor: theme.colors.error }}
              textStyle={{ color: theme.colors.error }}
              icon={<Ionicons name="log-out-outline" size={20} color={theme.colors.error} />}
            />
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionValue: {
    fontSize: 14,
  },
  dangerCard: {
    padding: 16,
    borderWidth: 1,
  },
});
