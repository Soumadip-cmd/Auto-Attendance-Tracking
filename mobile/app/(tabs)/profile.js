import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../src/hooks/useAuth';
import { useTheme } from '../../src/hooks/useTheme';
import { useNotifications } from '../../src/hooks/useNotifications';
import { useBiometric } from '../../src/hooks/useBiometric';
import { Avatar } from '../../src/components/common/Avatar';
import { Card } from '../../src/components/common/Card';
import { Button } from '../../src/components/common/Button';
import { getUserAvatarUri } from '../../src/constants/config';
import { userAPI } from '../../src/services/api';

const getUserId = (user) => user?._id || user?.id;

export default function ProfileScreen() {
  const router = useRouter();
  const {
    user,
    logout,
    isLoading,
    refreshUser
  } = useAuth();
  const {
    theme,
    isDarkMode,
    toggleTheme
  } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    hasPermission: hasNotificationPermission
  } = useNotifications();
  const {
    isAvailable: isBiometricAvailable,
    isEnabled: isBiometricEnabled,
    biometricType,
    enableBiometric,
    disableBiometric
  } = useBiometric();
  const [notificationsEnabled, setNotificationsEnabled] = useState(hasNotificationPermission);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const uploadAvatar = async (asset) => {
    const userId = getUserId(user);
    if (!userId || !asset?.uri) return;

    const filename = asset.uri.split('/').pop() || 'avatar.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const ext = (match ? match[1] : 'jpg').toLowerCase();

    const formData = new FormData();
    formData.append('profilePicture', {
      uri: asset.uri,
      name: filename,
      type: asset.mimeType || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    });

    try {
      setUploadingAvatar(true);
      await userAPI.uploadProfilePicture(userId, formData);
      await refreshUser();
    } catch (error) {
      Alert.alert('Upload failed', error?.message || 'Could not update your profile picture.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const pickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to choose a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) await uploadAvatar(result.assets[0]);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow camera access to take a profile picture.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) await uploadAvatar(result.assets[0]);
  };

  const handleChangeAvatar = () => {
    Alert.alert('Update profile picture', undefined, [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Library', onPress: pickFromLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };
  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [{
      text: 'Cancel',
      style: 'cancel'
    }, {
      text: 'Logout',
      style: 'destructive',
      onPress: async () => {
        console.log('🚪 User confirmed logout');
        const result = await logout();
        console.log('🚪 Logout result:', result);
        // Force complete navigation reset to login screen
        setTimeout(() => {
          router.replace('/(auth)/login_new');
        }, 100);
      }
    }]);
  };
  const handleEditProfile = () => {
    router.push('/profile/edit');
  };
  const handleChangePassword = () => {
    router.push('/profile/change-password');
  };
  const handleBiometricToggle = async value => {
    if (value) {
      const success = await enableBiometric();
      if (success) {
        Alert.alert('Biometric Enabled', `${biometricType} has been enabled for quick login. You'll be able to login using your biometric next time.`);
      } else {
        Alert.alert('Authentication Failed', 'Please try again or use your password to login.');
      }
    } else {
      await disableBiometric();
      Alert.alert('Biometric Disabled', 'You will need to use your email and password to login.');
    }
  };
  const ProfileOption = ({
    icon,
    label,
    value,
    onPress,
    showChevron = true
  }) => <TouchableOpacity style={[styles.option, {
    backgroundColor: theme.colors.card
  }]} onPress={onPress}>
      <View style={styles.optionLeft}>
        <View style={[styles.optionIcon, {
        backgroundColor: `${theme.colors.primary}20`
      }]}>
          <Ionicons name={icon} size={20} color={theme.colors.primary} />
        </View>
        <Text style={[styles.optionLabel, {
        color: theme.colors.text
      }]}>{label}</Text>
      </View>
      <View style={styles.optionRight}>
        {value && <Text style={[styles.optionValue, {
        color: theme.colors.textSecondary
      }]}>
            {value}
          </Text>}
        {showChevron && <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />}
      </View>
    </TouchableOpacity>;
  const ToggleOption = ({
    icon,
    label,
    subtitle,
    value,
    onValueChange,
    disabled = false
  }) => <View style={[styles.option, {
    backgroundColor: theme.colors.card,
    opacity: disabled ? 0.5 : 1
  }]}>
      <View style={styles.optionLeft}>
        <View style={[styles.optionIcon, {
        backgroundColor: `${theme.colors.primary}20`
      }]}>
          <Ionicons name={icon} size={20} color={theme.colors.primary} />
        </View>
        <View style={{
        flex: 1
      }}>
          <Text style={[styles.optionLabel, {
          color: theme.colors.text
        }]}>{label}</Text>
          {subtitle && <Text style={[styles.optionSubtitle, {
          color: theme.colors.textSecondary,
          fontSize: 12,
          marginTop: 2,
          fontFamily: "Inter_400Regular"
        }]}>
              {subtitle}
            </Text>}
        </View>
      </View>
      <Switch value={value} onValueChange={onValueChange} disabled={disabled} trackColor={{
      false: theme.colors.border,
      true: theme.colors.primary
    }} thumbColor="#ffffff" />
    </View>;
  return <View style={[styles.container, {
    backgroundColor: theme.colors.background
  }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, {
      paddingTop: insets.top + 16,
      paddingBottom: insets.bottom + 96
    }]} showsVerticalScrollIndicator={false}>
        <View style={styles.screenHeader}>
          <Text style={[styles.screenTitle, {
          color: theme.colors.text
        }]}>
            👤 Profile
          </Text>
        </View>

        {/* Profile Header */}
        <Card style={styles.profileCard} elevation="md">
          <View style={styles.profileHeader}>
            <TouchableOpacity
              onPress={handleChangeAvatar}
              disabled={uploadingAvatar}
              activeOpacity={0.8}
              style={styles.avatarWrap}
            >
              <Avatar name={`${user?.firstName} ${user?.lastName}`} size={80} source={getUserAvatarUri(user) ? {
                uri: getUserAvatarUri(user)
              } : null} />
              {uploadingAvatar ? (
                <View style={[styles.avatarOverlay, { backgroundColor: 'rgba(15,23,42,0.55)' }]}>
                  <ActivityIndicator color="#ffffff" size="small" />
                </View>
              ) : (
                <View style={[styles.avatarBadge, { backgroundColor: theme.colors.primary, borderColor: theme.colors.card }]}>
                  <Ionicons name="camera" size={13} color="#ffffff" />
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, {
              color: theme.colors.text
            }]}>
                {user?.firstName} {user?.lastName}
              </Text>
              <Text style={[styles.profileEmail, {
              color: theme.colors.textSecondary
            }]}>
                {user?.email}
              </Text>
              {user?.phoneNumber && <Text style={[styles.profileEmployeeId, {
              color: theme.colors.textSecondary
            }]}>
                  📱 {user.phoneNumber}
                </Text>}
              {user?.employeeId && <Text style={[styles.profileEmployeeId, {
              color: theme.colors.textSecondary
            }]}>
                  🆔 {user.employeeId}
                </Text>}
              {user?.department && <Text style={[styles.profileEmployeeId, {
              color: theme.colors.textSecondary
            }]}>
                  🏢 {user.department}
                </Text>}
              <View style={[styles.roleBadge, {
              backgroundColor: `${theme.colors.primary}20`,
              borderColor: theme.colors.primary
            }]}>
                <Text style={[styles.roleText, {
                color: theme.colors.primary
              }]}>
                  {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
                </Text>
              </View>
            </View>
          </View>

          <Button title="Edit Profile" onPress={handleEditProfile} variant="outline" size="small" style={{
          marginTop: 16
        }} />
        </Card>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {
          color: theme.colors.textSecondary
        }]}>
            ACCOUNT
          </Text>

          <ProfileOption icon="person-outline" label="Personal Information" onPress={handleEditProfile} />

          <ProfileOption icon="lock-closed-outline" label="Change Password" onPress={handleChangePassword} />

          <ProfileOption icon="card-outline" label="Employee ID Card" value={user?.employeeId || 'Not Set'} onPress={() => router.push('/profile/id-card')} />

          <ProfileOption icon="call-outline" label="Phone Number" value={user?.phoneNumber || 'Not Set'} onPress={() => {}} showChevron={false} />

          <ProfileOption icon="business-outline" label="Department" value={user?.department || 'Not Set'} onPress={() => {}} showChevron={false} />
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {
          color: theme.colors.textSecondary
        }]}>
            PREFERENCES
          </Text>

          <ToggleOption icon="moon-outline" label="Dark Mode" value={isDarkMode} onValueChange={toggleTheme} />

          <ToggleOption icon="finger-print-outline" label="Biometric Login" subtitle={biometricType ? `Use ${biometricType} to login` : 'Not available on this device'} value={isBiometricEnabled} disabled={!isBiometricAvailable} onValueChange={handleBiometricToggle} />

          <ToggleOption icon="notifications-outline" label="Push Notifications" value={notificationsEnabled} onValueChange={value => {
          setNotificationsEnabled(value);
          // Handle notification permission request
        }} />

          <ProfileOption icon="settings-outline" label="More Settings" onPress={() => router.push('/settings')} />
        </View>

        {/* Statistics Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {
          color: theme.colors.textSecondary
        }]}>
            STATISTICS
          </Text>

          <ProfileOption icon="stats-chart-outline" label="Attendance Reports" onPress={() => router.push('/reports')} />

          <ProfileOption icon="time-outline" label="Attendance History" onPress={() => router.push('/(tabs)/history')} />
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {
          color: theme.colors.textSecondary
        }]}>
            ABOUT
          </Text>

          <ProfileOption icon="information-circle-outline" label="About App" value="v1.0.0" onPress={() => {}} />

          <ProfileOption icon="document-text-outline" label="Privacy Policy" onPress={() => router.push('/info/privacy-policy')} />

          <ProfileOption icon="shield-checkmark-outline" label="Terms of Service" onPress={() => router.push('/info/terms')} />

          <ProfileOption icon="help-circle-outline" label="Help & Support" onPress={() => router.push('/info/help')} />
        </View>

        {/* Logout Button */}
        <Button title="Logout" onPress={handleLogout} variant="danger" loading={isLoading} icon={<Ionicons name="log-out-outline" size={20} color="#ffffff" />} style={{
        marginTop: 24,
        marginBottom: 40
      }} />
      </ScrollView>
    </View>;
}
const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  scrollContent: {
    padding: 20
  },
  screenHeader: {
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)'
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: "Inter_700Bold"
  },
  profileCard: {
    marginBottom: 24
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatarWrap: {
    width: 80,
    height: 80,
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: "Inter_700Bold",
    marginBottom: 4
  },
  profileEmail: {
    fontSize: 14,
    marginBottom: 2,
    fontFamily: "Inter_400Regular"
  },
  profileEmployeeId: {
    fontSize: 12,
    marginBottom: 8,
    fontFamily: "Inter_400Regular"
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: "Inter_600SemiBold"
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: "Inter_600SemiBold",
    marginBottom: 12,
    marginLeft: 4
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: "Inter_500Medium"
  },
  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  optionValue: {
    fontSize: 14,
    fontFamily: "Inter_400Regular"
  }
});
