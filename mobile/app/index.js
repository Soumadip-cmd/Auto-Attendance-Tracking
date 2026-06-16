import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { Loading } from '../src/components/common';

export default function Index() {
  const { isAuthenticated, isLoading, hasInitialized } = useAuthStore();

  if (!hasInitialized || isLoading) {
    return <Loading />;
  }

  // Redirect based on authentication state
  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login_new" />;
}
