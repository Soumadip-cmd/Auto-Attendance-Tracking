import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  Alert,
  Dimensions,
} from 'react-native';
import { FontAwesome5, MaterialIcons, Ionicons } from '@expo/vector-icons';
import CommonHeader from '../components/CommonHeader';
import { Colors, CommonStyles } from '../theme/Colors';

const { width } = Dimensions.get('window');

export default function ProfileScreen({ navigation }) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationServicesEnabled, setLocationServicesEnabled] = useState(true);
  const [autoCheckInEnabled, setAutoCheckInEnabled] = useState(false);

  const userProfile = {
    name: 'John Doe',
    email: 'john.doe@student.edu',
    studentId: 'STU001234',
    department: 'Computer Science',
    semester: '6th Semester',
    batch: '2022-2026',
    profileImage: null,
    phone: '+1 (555) 123-4567',
    address: '123 University Ave, City, State 12345',
    attendanceRate: 88,
    totalClasses: 156,
    attendedClasses: 137,
  };

  const menuItems = [
    {
      id: 1,
      title: 'Personal Information',
      subtitle: 'Update your details',
      icon: 'user',
      iconFamily: 'FontAwesome5',
      onPress: () => Alert.alert('Personal Info', 'Edit personal information'),
    },
    {
      id: 2,
      title: 'Attendance History',
      subtitle: 'View detailed records',
      icon: 'history',
      iconFamily: 'FontAwesome5',
      onPress: () => navigation.navigate('AttendanceHistory'),
    },
    {
      id: 3,
      title: 'Academic Information',
      subtitle: 'Department and semester',
      icon: 'graduation-cap',
      iconFamily: 'FontAwesome5',
      onPress: () => Alert.alert('Academic Info', 'View academic details'),
    },
    {
      id: 4,
      title: 'Security & Privacy',
      subtitle: 'Manage account security',
      icon: 'shield-alt',
      iconFamily: 'FontAwesome5',
      onPress: () => Alert.alert('Security', 'Security settings'),
    },
    {
      id: 5,
      title: 'Help & Support',
      subtitle: 'Get assistance',
      icon: 'help-circle',
      iconFamily: 'Ionicons',
      onPress: () => Alert.alert('Help', 'Contact support team'),
    },
    {
      id: 6,
      title: 'About App',
      subtitle: 'App version and info',
      icon: 'info-circle',
      iconFamily: 'FontAwesome5',
      onPress: () => Alert.alert('About', 'EduTrack v1.0.0\nSmart Geo-based Attendance System'),
    },
  ];

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => {
            // Handle logout logic here
            Alert.alert('Logged Out', 'You have been logged out successfully');
          }
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <CommonHeader
        title="Profile"
        subtitle="Manage your account settings"
        showBack={true}
        onBackPress={() => navigation.goBack()}
        rightComponent={
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => Alert.alert('Edit Profile', 'Edit profile functionality coming soon!')}
          >
            <FontAwesome5 name="edit" size={20} color={Colors.surface} />
          </TouchableOpacity>
        }
      />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.profileImageContainer}>
              {userProfile.profileImage ? (
                <Image source={{ uri: userProfile.profileImage }} style={styles.profileImage} />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <FontAwesome5 name="user" size={40} color={Colors.primary} />
                </View>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{userProfile.name}</Text>
              <Text style={styles.profileEmail}>{userProfile.email}</Text>
              <Text style={styles.profileId}>ID: {userProfile.studentId}</Text>
            </View>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userProfile.attendanceRate}%</Text>
              <Text style={styles.statLabel}>Attendance</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userProfile.attendedClasses}</Text>
              <Text style={styles.statLabel}>Present</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userProfile.totalClasses}</Text>
              <Text style={styles.statLabel}>Total Classes</Text>
            </View>
          </View>
        </View>

        {/* Quick Settings */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Settings</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <FontAwesome5 name="bell" size={20} color={Colors.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Notifications</Text>
                <Text style={styles.settingSubtitle}>Get attendance reminders</Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.surface}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <FontAwesome5 name="map-marker-alt" size={20} color={Colors.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Location Services</Text>
                <Text style={styles.settingSubtitle}>Enable geo-based attendance</Text>
              </View>
            </View>
            <Switch
              value={locationServicesEnabled}
              onValueChange={setLocationServicesEnabled}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.surface}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <FontAwesome5 name="check-circle" size={20} color={Colors.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Auto Check-in</Text>
                <Text style={styles.settingSubtitle}>Automatic attendance marking</Text>
              </View>
            </View>
            <Switch
              value={autoCheckInEnabled}
              onValueChange={setAutoCheckInEnabled}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.surface}
            />
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account</Text>
          
          {menuItems.map((item) => (
            <TouchableOpacity key={item.id} style={styles.menuItem} onPress={item.onPress}>
              <View style={styles.menuLeft}>
                <View style={styles.menuIcon}>
                  {item.iconFamily === 'FontAwesome5' ? (
                    <FontAwesome5 name={item.icon} size={18} color={Colors.primary} />
                  ) : (
                    <Ionicons name={item.icon} size={18} color={Colors.primary} />
                  )}
                </View>
                <View style={styles.menuText}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
              </View>
              <FontAwesome5 name="chevron-right" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <View style={styles.card}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <FontAwesome5 name="sign-out-alt" size={20} color={Colors.error} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>EduTrack v1.0.0</Text>
          <Text style={styles.versionSubtext}>Smart Geo-based Attendance System</Text>
        </View>

        {/* Bottom padding */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  editButton: {
    padding: 5,
  },
  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: 15,
    padding: 20,
    marginTop: 15,
    ...CommonStyles.shadow,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 15,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  profileEmail: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  profileId: {
    fontSize: 14,
    color: Colors.primary,
    marginTop: 4,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 15,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 15,
    padding: 20,
    marginTop: 15,
    ...CommonStyles.shadow,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 15,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  settingSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  menuSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.error,
    marginLeft: 10,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  versionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  versionSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
});
