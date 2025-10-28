import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Import all screens directly
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import StudentDashboard from './screens/StudentDashboard';
import TeacherDashboard from './screens/TeacherDashboard';
import AdminDashboard from './screens/AdminDashboard';
import MarkAttendanceScreen from './screens/MarkAttendanceScreen';
import AttendanceHistoryScreen from './screens/AttendanceHistoryScreen';
import CreateClassScreen from './screens/CreateClassScreen';
import ClassDetailsScreen from './screens/ClassDetailsScreen';

export default function Index() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('login');
  const [screenParams, setScreenParams] = useState<any>({});

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      const storedUser = await AsyncStorage.getItem('user');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        const userData = JSON.parse(storedUser);
        setUser(userData);
        
        // Navigate to appropriate dashboard
        if (userData.role === 'student') {
          setCurrentScreen('student-dashboard');
        } else if (userData.role === 'teacher') {
          setCurrentScreen('teacher-dashboard');
        } else if (userData.role === 'admin') {
          setCurrentScreen('admin-dashboard');
        }
      }
    } catch (error) {
      console.error('Error loading auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (username: string, password: string) => {
    const response = await axios.post(`${EXPO_PUBLIC_BACKEND_URL}/api/auth/login`, {
      username,
      password,
    });

    const { access_token, user: userData } = response.data;
    
    await AsyncStorage.setItem('token', access_token);
    await AsyncStorage.setItem('user', JSON.stringify(userData));
    
    setToken(access_token);
    setUser(userData);
    
    // Navigate to appropriate dashboard
    if (userData.role === 'student') {
      setCurrentScreen('student-dashboard');
    } else if (userData.role === 'teacher') {
      setCurrentScreen('teacher-dashboard');
    } else if (userData.role === 'admin') {
      setCurrentScreen('admin-dashboard');
    }
  };

  const handleRegister = async (username: string, password: string, name: string, email: string, role: string) => {
    const response = await axios.post(`${EXPO_PUBLIC_BACKEND_URL}/api/auth/register`, {
      username,
      password,
      name,
      email,
      role,
    });

    const { access_token, user: userData } = response.data;
    
    await AsyncStorage.setItem('token', access_token);
    await AsyncStorage.setItem('user', JSON.stringify(userData));
    
    setToken(access_token);
    setUser(userData);
    
    // Navigate to appropriate dashboard
    if (userData.role === 'student') {
      setCurrentScreen('student-dashboard');
    } else if (userData.role === 'teacher') {
      setCurrentScreen('teacher-dashboard');
    } else if (userData.role === 'admin') {
      setCurrentScreen('admin-dashboard');
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setCurrentScreen('login');
  };

  const navigate = (screen: string, params: any = {}) => {
    setCurrentScreen(screen);
    setScreenParams(params);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  // Auth context value
  const authContext = {
    user,
    token,
    loading: false,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
  };

  const navigationProps = {
    navigate,
    goBack: () => {
      if (user?.role === 'student') {
        setCurrentScreen('student-dashboard');
      } else if (user?.role === 'teacher') {
        setCurrentScreen('teacher-dashboard');
      } else if (user?.role === 'admin') {
        setCurrentScreen('admin-dashboard');
      }
    },
  };

  // Screen routing
  return (
    <View style={styles.container}>
      {currentScreen === 'login' && (
        <LoginScreen 
          authContext={authContext} 
          navigation={navigationProps}
        />
      )}
      {currentScreen === 'register' && (
        <RegisterScreen 
          authContext={authContext} 
          navigation={navigationProps}
        />
      )}
      {currentScreen === 'student-dashboard' && (
        <StudentDashboard 
          authContext={authContext} 
          navigation={navigationProps}
        />
      )}
      {currentScreen === 'teacher-dashboard' && (
        <TeacherDashboard 
          authContext={authContext} 
          navigation={navigationProps}
        />
      )}
      {currentScreen === 'admin-dashboard' && (
        <AdminDashboard 
          authContext={authContext} 
          navigation={navigationProps}
        />
      )}
      {currentScreen === 'mark-attendance' && (
        <MarkAttendanceScreen 
          authContext={authContext} 
          navigation={navigationProps}
          route={{ params: screenParams }}
        />
      )}
      {currentScreen === 'attendance-history' && (
        <AttendanceHistoryScreen 
          authContext={authContext} 
          navigation={navigationProps}
        />
      )}
      {currentScreen === 'create-class' && (
        <CreateClassScreen 
          authContext={authContext} 
          navigation={navigationProps}
        />
      )}
      {currentScreen === 'class-details' && (
        <ClassDetailsScreen 
          authContext={authContext} 
          navigation={navigationProps}
          route={{ params: screenParams }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
});
