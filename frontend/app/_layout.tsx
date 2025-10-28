import React from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from './context/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack
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
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/register" options={{ title: 'Create Account' }} />
        <Stack.Screen name="(student)/dashboard" options={{ title: 'My Dashboard' }} />
        <Stack.Screen name="(student)/mark-attendance" options={{ title: 'Mark Attendance' }} />
        <Stack.Screen name="(student)/attendance-history" options={{ title: 'My Attendance' }} />
        <Stack.Screen name="(teacher)/dashboard" options={{ title: 'Teacher Dashboard' }} />
        <Stack.Screen name="(teacher)/create-class" options={{ title: 'Create New Class' }} />
        <Stack.Screen name="(admin)/dashboard" options={{ title: 'Admin Dashboard' }} />
        <Stack.Screen name="class-details" options={{ title: 'Class Details' }} />
      </Stack>
    </AuthProvider>
  );
}
