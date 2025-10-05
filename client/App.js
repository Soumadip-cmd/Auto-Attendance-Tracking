import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text } from 'react-native';

// Import screens
import LoginScreen from './screens/LoginScreen';
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
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: { height: 60, paddingBottom: 10 },
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: 20, color }}>🏠</Text>
          ),
        }}
      />
      <Tab.Screen 
        name="Attendance" 
        component={AttendanceScreen}
        options={{
          tabBarLabel: 'Mark Attendance',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: 20, color }}>📝</Text>
          ),
        }}
      />
      <Tab.Screen 
        name="History" 
        component={AttendanceHistoryScreen}
        options={{
          tabBarLabel: 'History',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: 20, color }}>📊</Text>
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
              <Text style={{ fontSize: 20, color }}>⚙️</Text>
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
            <Text style={{ fontSize: 20, color }}>👤</Text>
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
      setIsLoggedIn(false); // Start with login screen
    }, 1000);
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isLoggedIn ? (
          <Stack.Screen name="Login">
            {props => <LoginScreen {...props} setIsLoggedIn={setIsLoggedIn} setUserRole={setUserRole} />}
          </Stack.Screen>
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
