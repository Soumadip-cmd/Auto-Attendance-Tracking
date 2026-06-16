import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { Stack, router, useSegments } from 'expo-router';
import { Loading } from '../src/components/common';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AnimatedSplashScreen from './splash';
import { useAuthStore } from '../src/store/authStore';

// Keep the splash screen visible while we check auth
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isAuthenticated, isLoading, initAuth, logout } = useAuthStore();
  const segments = useSegments();
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [biometricUnlocked, setBiometricUnlocked] = useState(false);
  const [biometricChecking, setBiometricChecking] = useState(false);
  const appState = useRef(AppState.currentState);
  const biometricPromptInFlight = useRef(false);

  useEffect(() => {
    console.log('APP LAUNCHED - Starting initialization');

    initAuth().finally(() => {
      setAuthReady(true);
      SplashScreen.hideAsync();
      console.log('App initialization complete');
    });
  }, [initAuth]);

  const shouldRequireBiometricUnlock = useCallback(async () => {
    if (Platform.OS === 'web') {
      return false;
    }

    const biometricEnabled = await AsyncStorage.getItem('biometric_enabled');
    if (biometricEnabled !== 'true') {
      return false;
    }

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    return hasHardware && isEnrolled;
  }, []);

  const unlockWithBiometric = useCallback(async () => {
    if (!isAuthenticated || biometricPromptInFlight.current) {
      return;
    }

    setBiometricChecking(true);

    try {
      const requiresBiometric = await shouldRequireBiometricUnlock();

      if (!requiresBiometric) {
        setBiometricUnlocked(true);
        return;
      }

      biometricPromptInFlight.current = true;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock GeoAttend',
        fallbackLabel: 'Use password',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        setBiometricUnlocked(true);
        return;
      }

      setBiometricUnlocked(false);
      await logout();
      router.replace('/(auth)/login_new');
    } catch (error) {
      console.error('Biometric unlock error:', error);
      setBiometricUnlocked(false);
      await logout();
      router.replace('/(auth)/login_new');
    } finally {
      biometricPromptInFlight.current = false;
      setBiometricChecking(false);
    }
  }, [isAuthenticated, logout, shouldRequireBiometricUnlock]);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    if (!isAuthenticated) {
      setBiometricUnlocked(true);
      return;
    }

    if (!biometricUnlocked && appState.current === 'active') {
      unlockWithBiometric();
    }
  }, [authReady, biometricUnlocked, isAuthenticated, unlockWithBiometric]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const wasInBackground = /inactive|background/.test(appState.current);
      appState.current = nextAppState;

      if (!authReady || !isAuthenticated || biometricPromptInFlight.current) {
        return;
      }

      if (/inactive|background/.test(nextAppState)) {
        setBiometricUnlocked(false);
        return;
      }

      if (wasInBackground && nextAppState === 'active') {
        setBiometricUnlocked(false);
        unlockWithBiometric();
      }
    });

    return () => subscription.remove();
  }, [authReady, isAuthenticated, unlockWithBiometric]);

  const authLoading =
    !authReady ||
    isLoading ||
    biometricChecking ||
    (isAuthenticated && !biometricUnlocked);

  useEffect(() => {
    if (authLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    console.log('Auth State Changed:', {
      isAuthenticated,
      authLoading,
      currentSegment: segments[0],
      inAuthGroup,
      allSegments: segments,
    });

    // Handle authentication redirects
    if (isAuthenticated && inAuthGroup) {
      // User logged in but still on auth screen -> go to app
      console.log('Authenticated in auth screen, redirecting to main app...');
      router.replace('/(tabs)');
    } else if (!isAuthenticated && !inAuthGroup) {
      // User logged out but still in app -> go to login
      console.log('Not authenticated, redirecting to login...');
      router.replace('/(auth)/login_new');
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
  return <RootLayoutNav />;
}
