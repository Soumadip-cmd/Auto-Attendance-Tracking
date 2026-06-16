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

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const BIOMETRIC_UNLOCKED_AT_KEY = 'biometric_unlocked_at';
const BIOMETRIC_UNLOCK_GRACE_MS = 15000;
const BIOMETRIC_PROMPT_SETTLE_MS = 3000;
const TRANSIENT_BIOMETRIC_ERRORS = new Set(['app_cancel', 'system_cancel']);

// Keep the splash screen visible while we check auth
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isAuthenticated, isLoading, interactiveAuthAt, initAuth, logout } = useAuthStore();
  const segments = useSegments();
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [biometricUnlocked, setBiometricUnlocked] = useState(false);
  const [biometricChecking, setBiometricChecking] = useState(false);
  const appState = useRef(AppState.currentState);
  const biometricPromptInFlight = useRef(false);
  const lastBiometricUnlockAt = useRef(0);
  const lastBiometricPromptCompletedAt = useRef(0);

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

    const unlockedAt = Number(await AsyncStorage.getItem(BIOMETRIC_UNLOCKED_AT_KEY));
    if (Number.isFinite(unlockedAt) && Date.now() - unlockedAt < BIOMETRIC_UNLOCK_GRACE_MS) {
      lastBiometricUnlockAt.current = unlockedAt;
      return false;
    }

    const biometricEnabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
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

    if (interactiveAuthAt && Date.now() - interactiveAuthAt < BIOMETRIC_UNLOCK_GRACE_MS) {
      const now = Date.now();
      lastBiometricUnlockAt.current = now;
      await AsyncStorage.setItem(BIOMETRIC_UNLOCKED_AT_KEY, String(now));
      setBiometricUnlocked(true);
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
        const now = Date.now();
        lastBiometricUnlockAt.current = now;
        await AsyncStorage.setItem(BIOMETRIC_UNLOCKED_AT_KEY, String(now));
        setBiometricUnlocked(true);
        return;
      }

      if (TRANSIENT_BIOMETRIC_ERRORS.has(result.error)) {
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
      lastBiometricPromptCompletedAt.current = Date.now();
      setBiometricChecking(false);
    }
  }, [interactiveAuthAt, isAuthenticated, logout, shouldRequireBiometricUnlock]);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    if (!isAuthenticated) {
      setBiometricUnlocked(true);
      return;
    }

    if (interactiveAuthAt && Date.now() - interactiveAuthAt < BIOMETRIC_UNLOCK_GRACE_MS) {
      setBiometricUnlocked(true);
      return;
    }

    if (!biometricUnlocked && appState.current === 'active') {
      unlockWithBiometric();
    }
  }, [authReady, biometricUnlocked, interactiveAuthAt, isAuthenticated, unlockWithBiometric]);

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
        const now = Date.now();
        const promptJustSettled =
          now - lastBiometricPromptCompletedAt.current < BIOMETRIC_PROMPT_SETTLE_MS;
        const recentlyUnlocked =
          now - lastBiometricUnlockAt.current < BIOMETRIC_UNLOCK_GRACE_MS;

        if (promptJustSettled || recentlyUnlocked) {
          setBiometricUnlocked(true);
          return;
        }

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
