import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { Colors, CommonStyles } from '../theme/Colors';

const { width, height } = Dimensions.get('window');

export default function RoleSelectionScreen({ navigation }) {
  const handleRoleSelection = (role) => {
    navigation.navigate('Login', { userRole: role });
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <FontAwesome5 name="graduation-cap" size={40} color={Colors.primary} />
            </View>
            <Text style={styles.logo}>EduTrack</Text>
            <Text style={styles.tagline}>Smart Attendance System</Text>
          </View>
        </View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          <Text style={styles.title}>Welcome!</Text>
          <Text style={styles.subtitle}>Choose your role to continue</Text>

          <TouchableOpacity 
            style={[styles.roleCard, styles.studentCard]} 
            onPress={() => handleRoleSelection('student')}
            activeOpacity={0.8}
          >
            <View style={styles.roleIconContainer}>
              <FontAwesome5 name="user-graduate" size={32} color={Colors.surface} />
            </View>
            <Text style={styles.roleTitle}>Student</Text>
            <Text style={styles.roleDescription}>
              Mark attendance with geo-location or QR code scanning
            </Text>
            <View style={styles.roleArrow}>
              <FontAwesome5 name="arrow-right" size={14} color={Colors.surface} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.roleCard, styles.teacherCard]} 
            onPress={() => handleRoleSelection('teacher')}
            activeOpacity={0.8}
          >
            <View style={styles.roleIconContainer}>
              <FontAwesome5 name="chalkboard-teacher" size={32} color={Colors.surface} />
            </View>
            <Text style={styles.roleTitle}>Teacher</Text>
            <Text style={styles.roleDescription}>
              Manage classes and monitor student attendance
            </Text>
            <View style={styles.roleArrow}>
              <FontAwesome5 name="arrow-right" size={14} color={Colors.surface} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.roleCard, styles.adminCard]} 
            onPress={() => handleRoleSelection('admin')}
            activeOpacity={0.8}
          >
            <View style={styles.roleIconContainer}>
              <FontAwesome5 name="user-cog" size={32} color={Colors.surface} />
            </View>
            <Text style={styles.roleTitle}>Admin</Text>
            <Text style={styles.roleDescription}>
              Full system control and institutional management
            </Text>
            <View style={styles.roleArrow}>
              <FontAwesome5 name="arrow-right" size={14} color={Colors.surface} />
            </View>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              New to EduTrack? Create your account after selecting your role
            </Text>
          </View>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 30 : 60,
    paddingBottom: 30,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...CommonStyles.shadow,
  },
  logo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.surface,
    marginTop: 15,
  },
  tagline: {
    fontSize: 14,
    color: Colors.surface,
    opacity: 0.9,
    textAlign: 'center',
    marginTop: 8,
  },
  content: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    marginTop: -20,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: 15,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 25,
    marginTop: 8,
  },
  roleCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    position: 'relative',
    minHeight: 120,
    ...CommonStyles.shadow,
  },
  studentCard: {
    backgroundColor: Colors.success,
  },
  teacherCard: {
    backgroundColor: Colors.warning,
  },
  adminCard: {
    backgroundColor: Colors.secondary,
  },
  roleIconContainer: {
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  roleTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.surface,
    marginBottom: 6,
  },
  roleDescription: {
    fontSize: 13,
    color: Colors.surface,
    opacity: 0.9,
    lineHeight: 18,
    marginBottom: 15,
    paddingRight: 40,
  },
  roleArrow: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingTop: 25,
    paddingBottom: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
});