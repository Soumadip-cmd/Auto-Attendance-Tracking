import React, { useEffect, useState } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { AppProvider, useApp } from '../src/context/AppContext';
import { Loading } from '../src/components/common';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import AnimatedSplashScreen from './splash';

// Keep the splash screen visible while we check auth
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isAuthenticated, authLoading, initAuth } = useApp();
  const segments = useSegments();
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);

  useEffect(() => {
    console.log('📱 APP LAUNCHED - Starting initialization');
    
    initAuth().finally(() => {
      SplashScreen.hideAsync();
      console.log('✅ App initialization complete');
    });
  }, []);

  useEffect(() => {
    if (authLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    
    console.log('🔐 Auth State Changed:', {
      isAuthenticated,
      authLoading,
      currentSegment: segments[0],
      inAuthGroup
    });

    if (!isAuthenticated && !inAuthGroup) {
      console.log('➡️ Redirecting to login...');
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      console.log('➡️ Redirecting to main app...');
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, authLoading, segments]);

  if (showAnimatedSplash) {
    return <AnimatedSplashScreen onFinish={() => setShowAnimatedSplash(false)} />;
  }

  if (authLoading) {
    return <Loading />;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <RootLayoutNav />
    </AppProvider>
  );
}
