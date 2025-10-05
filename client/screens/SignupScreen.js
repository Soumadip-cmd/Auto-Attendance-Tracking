import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Dimensions,
  ScrollView,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { Colors, CommonStyles } from '../theme/Colors';

const { width, height } = Dimensions.get('window');

export default function SignupScreen({ navigation, route }) {
  const selectedRole = route?.params?.userRole || 'student';
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    studentId: '',
    employeeId: '',
    department: '',
    phone: '',
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSignup = () => {
    const { fullName, email, password, confirmPassword } = formData;

    // Validation
    if (!fullName || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    // Additional role-specific validation
    if (selectedRole === 'student' && !formData.studentId) {
      Alert.alert('Error', 'Student ID is required');
      return;
    }

    if ((selectedRole === 'teacher' || selectedRole === 'admin') && !formData.employeeId) {
      Alert.alert('Error', 'Employee ID is required');
      return;
    }

    // Simulate successful signup
    Alert.alert(
      'Success!', 
      `Account created successfully for ${fullName}. You can now login with your credentials.`,
      [
        {
          text: 'OK',
          onPress: () => navigation.navigate('Login', { userRole: selectedRole })
        }
      ]
    );
  };

  const getRoleSpecificFields = () => {
    switch (selectedRole) {
      case 'student':
        return (
          <>
            <TextInput
              style={styles.input}
              placeholder="Student ID *"
              placeholderTextColor={Colors.textSecondary}
              value={formData.studentId}
              onChangeText={(value) => handleInputChange('studentId', value)}
            />
            <TextInput
              style={styles.input}
              placeholder="Department"
              placeholderTextColor={Colors.textSecondary}
              value={formData.department}
              onChangeText={(value) => handleInputChange('department', value)}
            />
          </>
        );
      case 'teacher':
        return (
          <>
            <TextInput
              style={styles.input}
              placeholder="Employee ID *"
              placeholderTextColor={Colors.textSecondary}
              value={formData.employeeId}
              onChangeText={(value) => handleInputChange('employeeId', value)}
            />
            <TextInput
              style={styles.input}
              placeholder="Department"
              placeholderTextColor={Colors.textSecondary}
              value={formData.department}
              onChangeText={(value) => handleInputChange('department', value)}
            />
          </>
        );
      case 'admin':
        return (
          <>
            <TextInput
              style={styles.input}
              placeholder="Employee ID *"
              placeholderTextColor={Colors.textSecondary}
              value={formData.employeeId}
              onChangeText={(value) => handleInputChange('employeeId', value)}
            />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <FontAwesome5 name="arrow-left" size={20} color={Colors.surface} />
          </TouchableOpacity>
          
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <FontAwesome5 
                name={selectedRole === 'student' ? 'user-graduate' : 
                     selectedRole === 'teacher' ? 'chalkboard-teacher' : 'user-cog'} 
                size={35} 
                color={Colors.primary} 
              />
            </View>
            <Text style={styles.logo}>Create Account</Text>
            <Text style={styles.roleText}>
              {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} Registration
            </Text>
          </View>
        </View>

        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Join EduTrack</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Full Name *"
            placeholderTextColor={Colors.textSecondary}
            value={formData.fullName}
            onChangeText={(value) => handleInputChange('fullName', value)}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Email Address *"
            placeholderTextColor={Colors.textSecondary}
            value={formData.email}
            onChangeText={(value) => handleInputChange('email', value)}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {getRoleSpecificFields()}
          
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            placeholderTextColor={Colors.textSecondary}
            value={formData.phone}
            onChangeText={(value) => handleInputChange('phone', value)}
            keyboardType="phone-pad"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Password *"
            placeholderTextColor={Colors.textSecondary}
            value={formData.password}
            onChangeText={(value) => handleInputChange('password', value)}
            secureTextEntry
          />
          
          <TextInput
            style={styles.input}
            placeholder="Confirm Password *"
            placeholderTextColor={Colors.textSecondary}
            value={formData.confirmPassword}
            onChangeText={(value) => handleInputChange('confirmPassword', value)}
            secureTextEntry
          />

          <TouchableOpacity style={styles.signupButton} onPress={handleSignup}>
            <Text style={styles.signupButtonText}>Create Account</Text>
          </TouchableOpacity>

          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login', { userRole: selectedRole })}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? StatusBar.currentHeight + 30 : 70,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...CommonStyles.shadow,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.surface,
    marginTop: 15,
  },
  roleText: {
    fontSize: 14,
    color: Colors.surface,
    opacity: 0.9,
    marginTop: 5,
  },
  form: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 30,
    paddingTop: 30,
    marginTop: -30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
  },
  signupButton: {
    ...CommonStyles.primaryButton,
    marginTop: 10,
    marginBottom: 20,
  },
  signupButtonText: {
    color: Colors.surface,
    fontSize: 18,
    fontWeight: 'bold',
  },
  termsContainer: {
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  termsText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 30,
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  loginLink: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
});