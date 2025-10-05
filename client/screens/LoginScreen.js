import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

export default function LoginScreen({ setIsLoggedIn, setUserRole }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('student');

  // Dummy user data
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
    if (user && user.password === password) {
      setUserRole(user.role);
      setIsLoggedIn(true);
      Alert.alert('Success', `Welcome ${user.name}!`);
    } else {
      Alert.alert('Error', 'Invalid credentials');
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
    setSelectedRole(role);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.logo}>📚 EduTrack</Text>
        <Text style={styles.tagline}>Smart Geo-based Attendance System</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.title}>Welcome Back!</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Email Address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <Text style={styles.dividerText}>Quick Login (Demo)</Text>
        </View>

        <View style={styles.quickLoginContainer}>
          <TouchableOpacity 
            style={[styles.roleButton, styles.studentButton]} 
            onPress={() => handleQuickLogin('student')}
          >
            <Text style={styles.roleButtonText}>👨‍🎓 Student</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.roleButton, styles.teacherButton]} 
            onPress={() => handleQuickLogin('teacher')}
          >
            <Text style={styles.roleButtonText}>👨‍🏫 Teacher</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.roleButton, styles.adminButton]} 
            onPress={() => handleQuickLogin('admin')}
          >
            <Text style={styles.roleButtonText}>⚙️ Admin</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity>
            <Text style={styles.signupLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingTop: 50,
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  tagline: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  form: {
    flex: 2,
    backgroundColor: 'white',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 30,
    marginTop: -30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  loginButton: {
    backgroundColor: '#2196F3',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerText: {
    color: '#666',
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
  },
  studentButton: {
    backgroundColor: '#4CAF50',
  },
  teacherButton: {
    backgroundColor: '#FF9800',
  },
  adminButton: {
    backgroundColor: '#9C27B0',
  },
  roleButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: '#666',
    fontSize: 16,
  },
  signupLink: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: 'bold',
  },
});