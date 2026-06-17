import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useSegments } from 'expo-router';
import { Loading } from '../src/components/common';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import AnimatedSplashScreen from './splash';
import { useAuthStore } from '../src/store/authStore';
import websocketService from '../src/services/websocket';
import notificationService from '../src/services/notificationService';

// Keep the splash screen visible while we check auth
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isAuthenticated, isLoading, initAuth } = useAuthStore();
  const segments = useSegments();
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [updateMessage, setUpdateMessage] = useState(null);

  useEffect(() => {
    console.log('APP LAUNCHED - Starting initialization');

    initAuth().finally(() => {
      setAuthReady(true);
      SplashScreen.hideAsync();
      console.log('App initialization complete');
    });
  }, [initAuth]);

  // Global WebSocket listener — fires permission notifications regardless of tracking state
  useEffect(() => {
    if (!isAuthenticated) return;

    let unsubApproved, unsubRejected;

    const connect = async () => {
      try {
        await notificationService.configureChannel();
        await websocketService.connect();

        unsubApproved = websocketService.on('movement-permission:approved', async (data) => {
          const endStr = data.endTime
            ? new Date(data.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '';
          const grantedBy = data.grantedBy ? ` by ${data.grantedBy}` : '';
          await notificationService.scheduleNotification(
            'Movement permission granted',
            `Your request was approved${grantedBy}. Valid until ${endStr}. Stay within ${data.radius}m.`,
            { type: 'movement_permission_approved', id: data.id }
          );
        });

        unsubRejected = websocketService.on('movement-permission:rejected', async (data) => {
          await notificationService.scheduleNotification(
            'Movement permission rejected',
            data?.decisionNotes || 'Your movement permission request was not approved.',
            { type: 'movement_permission_rejected', id: data.id }
          );
        });
      } catch (e) {
        console.warn('Permission notification listener setup failed:', e?.message);
      }
    };

    connect();

    return () => {
      unsubApproved?.();
      unsubRejected?.();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    let isMounted = true;

    const checkForLaunchUpdate = async () => {
      if (__DEV__ || Platform.OS === 'web' || !Updates.isEnabled) {
        return;
      }

      try {
        const update = await Updates.checkForUpdateAsync();

        if (!isMounted || !update.isAvailable) {
          return;
        }

        setUpdateMessage('New update available. Updating app...');

        const fetchResult = await Updates.fetchUpdateAsync();

        if (!isMounted) {
          return;
        }

        if (fetchResult.isNew) {
          setUpdateMessage('Update downloaded. Restarting app...');
          await Updates.reloadAsync();
          return;
        }

        setUpdateMessage(null);
      } catch (error) {
        console.log('EAS update check skipped/failed:', error?.message || error);
        if (isMounted) {
          setUpdateMessage(null);
        }
      }
    };

    checkForLaunchUpdate();

    return () => {
      isMounted = false;
    };
  }, []);

  const authLoading = !authReady || isLoading;

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

  if (updateMessage) {
    return <UpdateScreen message={updateMessage} />;
  }

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

function UpdateScreen({ message }) {
  return (
    <View style={styles.updateContainer}>
      <View style={styles.updateIcon}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
      <Text style={styles.updateTitle}>Updating app</Text>
      <Text style={styles.updateMessage}>{message}</Text>
      <Text style={styles.updateHint}>Please keep the app open.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  updateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
  },
  updateIcon: {
    width: 72,
    height: 72,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    backgroundColor: '#eef2ff',
  },
  updateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  updateMessage: {
    fontSize: 16,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 8,
  },
  updateHint: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
  },
});
