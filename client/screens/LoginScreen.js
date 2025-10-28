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

export default function LoginScreen({ navigation, route, setIsLoggedIn, setUserRole }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const selectedRole = route?.params?.userRole || 'student';

  const dummyUsers = {
    'student@edu.com': { password: '123456', role: 'student', name: 'John Doe' },
    'teacher@edu.com': { password: '123456', role: 'teacher', name: 'Prof. Smith' },
    'admin@edu.com': { password: '123456', role: 'admin', name: 'Admin User' },
  };

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const user = dummyUsers[email];
    if (user && user.password === password && user.role === selectedRole) {
      setUserRole(user.role);
      setIsLoggedIn(true);
      Alert.alert('Success', `Welcome ${user.name}!`);
    } else {
      Alert.alert('Error', 'Invalid credentials or wrong role selected');
    }
  };

  const handleQuickLogin = (role) => {
    const userCredentials = {
      student: 'student@edu.com',
      teacher: 'teacher@edu.com',
      admin: 'admin@edu.com',
    };
    
    setEmail(userCredentials[role]);
    setPassword('123456');
    
    // Auto login after setting credentials
    setTimeout(() => {
      setUserRole(role);
      setIsLoggedIn(true);
      Alert.alert('Success', `Quick login as ${role.charAt(0).toUpperCase() + role.slice(1)}!`);
    }, 100);
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <FontAwesome5 name="graduation-cap" size={30} color={Colors.primary} />
            </View>
            <Text style={styles.logo}>EduTrack</Text>
          </View>
          <Text style={styles.tagline}>Smart Geo-based Attendance System</Text>
        </View>

        <ScrollView 
          style={styles.form} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.formContent}
        >
          <View style={styles.roleIndicator}>
            <FontAwesome5 
              name={selectedRole === 'student' ? 'user-graduate' : 
                   selectedRole === 'teacher' ? 'chalkboard-teacher' : 'user-cog'} 
              size={20} 
              color={Colors.primary} 
            />
            <Text style={styles.roleText}>
              {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} Login
            </Text>
          </View>
          <Text style={styles.title}>Welcome Back!</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Email Address"
            placeholderTextColor={Colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={Colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Login Now</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <Text style={styles.dividerText}>Quick Login (Demo)</Text>
          </View>

          <View style={styles.quickLoginContainer}>
            <TouchableOpacity 
              style={[styles.roleButton, styles.studentButton]} 
              onPress={() => handleQuickLogin('student')}
            >
              <FontAwesome5 name="user-graduate" size={16} color="white" />
              <Text style={styles.roleButtonText}>Student</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.roleButton, styles.teacherButton]} 
              onPress={() => handleQuickLogin('teacher')}
            >
              <FontAwesome5 name="chalkboard-teacher" size={16} color="white" />
              <Text style={styles.roleButtonText}>Teacher</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.roleButton, styles.adminButton]} 
              onPress={() => handleQuickLogin('admin')}
            >
              <FontAwesome5 name="user-cog" size={16} color="white" />
              <Text style={styles.roleButtonText}>Admin</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup', { userRole: selectedRole })}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.navigate('RoleSelection')}
          >
            <FontAwesome5 name="arrow-left" size={16} color={Colors.primary} />
            <Text style={styles.backButtonText}>Change Role</Text>
          </TouchableOpacity>
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 50,
    paddingBottom: 30,
    minHeight: 180,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...CommonStyles.shadow,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.surface,
    marginTop: 10,
  },
  tagline: {
    fontSize: 14,
    color: Colors.surface,
    opacity: 0.9,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginTop: 5,
  },
  form: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    marginTop: -20,
  },
  formContent: {
    padding: 25,
    paddingBottom: 30,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 20,
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
  loginButton: {
    ...CommonStyles.primaryButton,
    marginTop: 10,
    marginBottom: 20,
  },
  loginButtonText: {
    color: Colors.surface,
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  quickLoginContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  roleButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    ...CommonStyles.shadow,
  },
  studentButton: {
    backgroundColor: Colors.success,
  },
  teacherButton: {
    backgroundColor: Colors.warning,
  },
  adminButton: {
    backgroundColor: Colors.secondary,
  },
  roleButtonText: {
    color: Colors.surface,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  signupLink: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  roleIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  roleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
    marginLeft: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    padding: 10,
  },
  backButtonText: {
    fontSize: 14,
    color: Colors.primary,
    marginLeft: 8,
  },
});
