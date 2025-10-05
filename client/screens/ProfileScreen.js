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
    profileImage: null, // In real app, this would be an image URI
    phone: '+1 (555) 123-4567',
    address: '123 University Ave, City, State 12345',
  };

  const attendanceStats = {
    totalClasses: 125,
    attended: 112,
    percentage: 89.6,
    streak: 12,
    lastAttended: '2024-10-05',
  };

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
            // In real app, clear auth tokens and navigate to login
            Alert.alert('Success', 'You have been logged out successfully');
          }
        },
      ]
    );
  };

  const handleEditProfile = () => {
    Alert.alert('Edit Profile', 'Profile editing feature coming soon!');
  };

  const handleChangePassword = () => {
    Alert.alert('Change Password', 'Password change feature coming soon!');
  };

  const handleSupport = () => {
    Alert.alert('Support', 'Contact support at support@edutrack.com');
  };

  const menuItems = [
    {
      id: 1,
      title: 'Edit Profile',
      subtitle: 'Update your personal information',
      icon: '✏️',
      action: handleEditProfile,
    },
    {
      id: 2,
      title: 'Change Password',
      subtitle: 'Update your account password',
      icon: '🔒',
      action: handleChangePassword,
    },
    {
      id: 3,
      title: 'Attendance Report',
      subtitle: 'Download detailed attendance report',
      icon: '📊',
      action: () => navigation.navigate('History'),
    },
    {
      id: 4,
      title: 'Help & Support',
      subtitle: 'Get help or contact support',
      icon: '❓',
      action: handleSupport,
    },
    {
      id: 5,
      title: 'Privacy Policy',
      subtitle: 'Read our privacy policy',
      icon: '📋',
      action: () => Alert.alert('Privacy Policy', 'Privacy policy details...'),
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.profileImageContainer}>
          {userProfile.profileImage ? (
            <Image source={{ uri: userProfile.profileImage }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Text style={styles.profileImagePlaceholderText}>
                {userProfile.name.split(' ').map(n => n[0]).join('')}
              </Text>
            </View>
          )}
          <TouchableOpacity style={styles.editImageButton}>
            <Text style={styles.editImageIcon}>📷</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{userProfile.name}</Text>
          <Text style={styles.profileEmail}>{userProfile.email}</Text>
          <Text style={styles.profileId}>ID: {userProfile.studentId}</Text>
          
          <View style={styles.profileDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Department:</Text>
              <Text style={styles.detailValue}>{userProfile.department}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Semester:</Text>
              <Text style={styles.detailValue}>{userProfile.semester}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Batch:</Text>
              <Text style={styles.detailValue}>{userProfile.batch}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Attendance Summary */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Attendance Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{attendanceStats.totalClasses}</Text>
            <Text style={styles.summaryLabel}>Total Classes</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{attendanceStats.attended}</Text>
            <Text style={styles.summaryLabel}>Attended</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{attendanceStats.percentage}%</Text>
            <Text style={styles.summaryLabel}>Percentage</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{attendanceStats.streak}</Text>
            <Text style={styles.summaryLabel}>Day Streak</Text>
          </View>
        </View>
      </View>

      {/* Settings */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Settings</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Push Notifications</Text>
            <Text style={styles.settingSubtitle}>Receive attendance reminders</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#e0e0e0', true: '#2196F3' }}
            thumbColor={notificationsEnabled ? '#ffffff' : '#ffffff'}
          />
        </View>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Location Services</Text>
            <Text style={styles.settingSubtitle}>Enable geo-based attendance</Text>
          </View>
          <Switch
            value={locationServicesEnabled}
            onValueChange={setLocationServicesEnabled}
            trackColor={{ false: '#e0e0e0', true: '#2196F3' }}
            thumbColor={locationServicesEnabled ? '#ffffff' : '#ffffff'}
          />
        </View>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Auto Check-in</Text>
            <Text style={styles.settingSubtitle}>Automatically mark attendance when in range</Text>
          </View>
          <Switch
            value={autoCheckInEnabled}
            onValueChange={setAutoCheckInEnabled}
            trackColor={{ false: '#e0e0e0', true: '#2196F3' }}
            thumbColor={autoCheckInEnabled ? '#ffffff' : '#ffffff'}
          />
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account</Text>
        
        {menuItems.map((item) => (
          <TouchableOpacity key={item.id} style={styles.menuItem} onPress={item.action}>
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Contact Information */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Contact Information</Text>
        
        <View style={styles.contactItem}>
          <Text style={styles.contactIcon}>📞</Text>
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>Phone</Text>
            <Text style={styles.contactValue}>{userProfile.phone}</Text>
          </View>
        </View>
        
        <View style={styles.contactItem}>
          <Text style={styles.contactIcon}>📧</Text>
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>Email</Text>
            <Text style={styles.contactValue}>{userProfile.email}</Text>
          </View>
        </View>
        
        <View style={styles.contactItem}>
          <Text style={styles.contactIcon}>📍</Text>
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>Address</Text>
            <Text style={styles.contactValue}>{userProfile.address}</Text>
          </View>
        </View>
      </View>

      {/* Logout Button */}
      <View style={styles.logoutContainer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>🚪 Logout</Text>
        </TouchableOpacity>
      </View>

      {/* App Version */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>EduTrack v1.0.0</Text>
        <Text style={styles.versionSubtext}>Smart Geo-based Attendance System</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#2196F3',
    padding: 20,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  profileCard: {
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImagePlaceholderText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  editImageIcon: {
    fontSize: 14,
  },
  profileInfo: {
    alignItems: 'center',
    width: '100%',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  profileEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 3,
  },
  profileId: {
    fontSize: 14,
    color: '#999',
    marginBottom: 15,
  },
  profileDetails: {
    width: '100%',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  card: {
    backgroundColor: 'white',
    margin: 15,
    marginBottom: 0,
    borderRadius: 15,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 15,
    width: 25,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  menuChevron: {
    fontSize: 20,
    color: '#ccc',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  contactIcon: {
    fontSize: 18,
    marginRight: 15,
    width: 25,
    marginTop: 2,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 14,
    color: '#666',
  },
  contactValue: {
    fontSize: 16,
    color: '#333',
    marginTop: 2,
  },
  logoutContainer: {
    margin: 15,
  },
  logoutButton: {
    backgroundColor: '#F44336',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  versionContainer: {
    alignItems: 'center',
    padding: 20,
  },
  versionText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  versionSubtext: {
    fontSize: 12,
    color: '#ccc',
    marginTop: 2,
  },
});