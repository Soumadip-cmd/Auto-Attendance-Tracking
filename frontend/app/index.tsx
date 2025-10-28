import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import StudentDashboard from './screens/StudentDashboard';
import TeacherDashboard from './screens/TeacherDashboard';
import AdminDashboard from './screens/AdminDashboard';
import MarkAttendanceScreen from './screens/MarkAttendanceScreen';
import AttendanceHistoryScreen from './screens/AttendanceHistoryScreen';
import CreateClassScreen from './screens/CreateClassScreen';
import ClassDetailsScreen from './screens/ClassDetailsScreen';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { user } = useAuth();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#4F46E5',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      {!user ? (
        // Auth screens
        <>
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Register" 
            component={RegisterScreen}
            options={{ title: 'Create Account' }}
          />
        </>
      ) : (
        // Role-based screens
        <>
          {user.role === 'student' && (
            <>
              <Stack.Screen 
                name="StudentDashboard" 
                component={StudentDashboard}
                options={{ title: 'My Dashboard' }}
              />
              <Stack.Screen 
                name="MarkAttendance" 
                component={MarkAttendanceScreen}
                options={{ title: 'Mark Attendance' }}
              />
              <Stack.Screen 
                name="AttendanceHistory" 
                component={AttendanceHistoryScreen}
                options={{ title: 'My Attendance' }}
              />
              <Stack.Screen 
                name="ClassDetails" 
                component={ClassDetailsScreen}
                options={{ title: 'Class Details' }}
              />
            </>
          )}
          
          {user.role === 'teacher' && (
            <>
              <Stack.Screen 
                name="TeacherDashboard" 
                component={TeacherDashboard}
                options={{ title: 'Teacher Dashboard' }}
              />
              <Stack.Screen 
                name="CreateClass" 
                component={CreateClassScreen}
                options={{ title: 'Create New Class' }}
              />
              <Stack.Screen 
                name="ClassDetails" 
                component={ClassDetailsScreen}
                options={{ title: 'Class Details' }}
              />
            </>
          )}
          
          {user.role === 'admin' && (
            <>
              <Stack.Screen 
                name="AdminDashboard" 
                component={AdminDashboard}
                options={{ title: 'Admin Dashboard' }}
              />
              <Stack.Screen 
                name="CreateClass" 
                component={CreateClassScreen}
                options={{ title: 'Create New Class' }}
              />
              <Stack.Screen 
                name="ClassDetails" 
                component={ClassDetailsScreen}
                options={{ title: 'Class Details' }}
              />
            </>
          )}
        </>
      )}
    </Stack.Navigator>
  );
}

export default function Index() {
  return (
    <AuthProvider>
      <View style={styles.container}>
        <AppNavigator />
      </View>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
