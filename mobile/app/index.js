import { useEffect } from 'react';
import { Redirect, router } from 'expo-router';
import { useApp } from '../src/context/AppContext';
import { Loading } from '../src/components/common';

export default function Index() {
  const { isAuthenticated, authLoading } = useApp();

  if (authLoading) {
    return <Loading />;
  }

  // Redirect based on authentication state
  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login_new" />;
}
