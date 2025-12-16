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
import { useAuth } from '../../src/hooks/useAuth';
import { useTheme } from '../../src/hooks/useTheme';
import { useNotifications } from '../../src/hooks/useNotifications';
import { Avatar } from '../../src/components/common/Avatar';
import { Card } from '../../src/components/common/Card';
import { Button } from '../../src/components/common/Button';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const { hasPermission:  hasNotificationPermission } = useNotifications();

  const [notificationsEnabled, setNotificationsEnabled] = useState(hasNotificationPermission);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const handleEditProfile = () => {
    router.push('/profile/edit');
  };

  const handleChangePassword = () => {
    router.push('/profile/change-password');
  };

  const ProfileOption = ({ icon, label, value, onPress, showChevron = true }) => (
    <TouchableOpacity
      style={[styles.option, { backgroundColor: theme.colors. card }]}
      onPress={onPress}
    >
      <View style={styles.optionLeft}>
        <View style={[styles.optionIcon, { backgroundColor: `${theme.colors.primary}20` }]}>
          <Ionicons name={icon} size={20} color={theme.colors. primary} />
        </View>
        <Text style={[styles.optionLabel, { color: theme.colors.text }]}>{label}</Text>
      </View>
      <View style={styles.optionRight}>
        {value && (
          <Text style={[styles.optionValue, { color: theme.colors. textSecondary }]}>
            {value}
          </Text>
        )}
        {showChevron && (
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        )}
      </View>
    </TouchableOpacity>
  );

  const ToggleOption = ({ icon, label, value, onValueChange }) => (
    <View style={[styles.option, { backgroundColor: theme.colors.card }]}>
      <View style={styles.optionLeft}>
        <View style={[styles.optionIcon, { backgroundColor: `${theme.colors.primary}20` }]}>
          <Ionicons name={icon} size={20} color={theme.colors.primary} />
        </View>
        <Text style={[styles.optionLabel, { color: theme.colors. text }]}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        thumbColor="#ffffff"
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <Card style={styles.profileCard} elevation="md">
          <View style={styles.profileHeader}>
            <Avatar
              name={`${user?. firstName} ${user?.lastName}`}
              size={80}
              source={user?.avatar ?  { uri: user.avatar } :  null}
            />
            <View style={styles.profileInfo}>
              <Text style={[styles. profileName, { color: theme.colors.text }]}>
                {user?.firstName} {user?.lastName}
              </Text>
              <Text style={[styles.profileEmail, { color: theme.colors.textSecondary }]}>
                {user?.email}
              </Text>
              {user?.employeeId && (
                <Text style={[styles.profileEmployeeId, { color: theme.colors.textSecondary }]}>
                  {user. employeeId}
                </Text>
              )}
              <View
                style={[
                  styles.roleBadge,
                  {
                    backgroundColor: `${theme.colors.primary}20`,
                    borderColor: theme.colors.primary,
                  },
                ]}
              >
                <Text style={[styles.roleText, { color: theme.colors.primary }]}>
                  {user?.role?. charAt(0).toUpperCase() + user?.role?.slice(1)}
                </Text>
              </View>
            </View>
          </View>

          <Button
            title="Edit Profile"
            onPress={handleEditProfile}
            variant="outline"
            size="small"
            style={{ marginTop: 16 }}
          />
        </Card>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            ACCOUNT
          </Text>

          <ProfileOption
            icon="person-outline"
            label="Personal Information"
            onPress={handleEditProfile}
          />

          <ProfileOption
            icon="lock-closed-outline"
            label="Change Password"
            onPress={handleChangePassword}
          />

          <ProfileOption
            icon="card-outline"
            label="Employee ID"
            value={user?. employeeId || 'Not Set'}
            onPress={() => {}}
            showChevron={false}
          />
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            PREFERENCES
          </Text>

          <ToggleOption
            icon="moon-outline"
            label="Dark Mode"
            value={isDarkMode}
            onValueChange={toggleTheme}
          />

          <ToggleOption
            icon="notifications-outline"
            label="Push Notifications"
            value={notificationsEnabled}
            onValueChange={(value) => {
              setNotificationsEnabled(value);
              // Handle notification permission request
            }}
          />

          <ProfileOption
            icon="language-outline"
            label="Language"
            value="English"
            onPress={() => {}}
          />
        </View>

        {/* Statistics Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            STATISTICS
          </Text>

          <ProfileOption
            icon="stats-chart-outline"
            label="Attendance Reports"
            onPress={() => router.push('/reports')}
          />

          <ProfileOption
            icon="time-outline"
            label="Attendance History"
            onPress={() => router.push('/(tabs)/attendance')}
          />
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            ABOUT
          </Text>

          <ProfileOption
            icon="information-circle-outline"
            label="About App"
            value="v1.0.0"
            onPress={() => {}}
          />

          <ProfileOption
            icon="document-text-outline"
            label="Privacy Policy"
            onPress={() => {}}
          />

          <ProfileOption
            icon="shield-checkmark-outline"
            label="Terms of Service"
            onPress={() => {}}
          />

          <ProfileOption
            icon="help-circle-outline"
            label="Help & Support"
            onPress={() => {}}
          />
        </View>

        {/* Logout Button */}
        <Button
          title="Logout"
          onPress={handleLogout}
          variant="danger"
          loading={isLoading}
          icon={<Ionicons name="log-out-outline" size={20} color="#ffffff" />}
          style={{ marginTop: 24, marginBottom: 40 }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
  },
  profileCard: {
    marginBottom:  24,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    marginBottom: 2,
  },
  profileEmployeeId: {
    fontSize:  12,
    marginBottom: 8,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical:  4,
    borderRadius:  12,
    borderWidth: 1,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize:  12,
    fontWeight: '600',
    marginBottom: 12,
    marginLeft: 4,
  },
  option:  {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight:  12,
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
});