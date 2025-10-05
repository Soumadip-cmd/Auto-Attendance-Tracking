import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text } from 'react-native';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';

// Import screens
import RoleSelectionScreen from './screens/RoleSelectionScreen';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import HomeScreen from './screens/HomeScreen';
import AttendanceScreen from './screens/AttendanceScreen';
import QRScannerScreen from './screens/QRScannerScreen';
import ProfileScreen from './screens/ProfileScreen';
import AdminDashboardScreen from './screens/AdminDashboardScreen';
import AttendanceHistoryScreen from './screens/AttendanceHistoryScreen';
import ClassManagementScreen from './screens/ClassManagementScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigator for main app
function MainTabNavigator({ userRole }) {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#6C63FF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: { 
          height: 85, 
          paddingBottom: 25,
          paddingTop: 10,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E5E7',
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Attendance" 
        component={AttendanceScreen}
        options={{
          tabBarLabel: 'Attendance',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="how-to-reg" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="History" 
        component={AttendanceHistoryScreen}
        options={{
          tabBarLabel: 'History',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="chart-bar" size={size} color={color} />
          ),
        }}
      />
      {userRole === 'admin' && (
        <Tab.Screen 
          name="Admin" 
          component={AdminDashboardScreen}
          options={{
            tabBarLabel: 'Admin',
            tabBarIcon: ({ color, size }) => (
              <FontAwesome5 name="cog" size={size} color={color} />
            ),
          }}
        />
      )}
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="user-alt" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('student'); // student, teacher, admin

  // Simulate login state
  useEffect(() => {
    // In real app, check AsyncStorage or Firebase Auth
    setTimeout(() => {
      setIsLoggedIn(false); // Start with role selection screen
    }, 1000);
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isLoggedIn ? (
          <>
            <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
            <Stack.Screen name="Login">
              {props => <LoginScreen {...props} setIsLoggedIn={setIsLoggedIn} setUserRole={setUserRole} />}
            </Stack.Screen>
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="MainTabs">
              {props => <MainTabNavigator {...props} userRole={userRole} />}
            </Stack.Screen>
            <Stack.Screen name="QRScanner" component={QRScannerScreen} />
            <Stack.Screen name="ClassManagement" component={ClassManagementScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
