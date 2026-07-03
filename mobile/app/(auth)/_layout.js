import { Stack } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';

export default function AuthLayout() {
  const { theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen 
        name="login" 
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen name="login_new" />
      <Stack.Screen name="register" />
      <Stack.Screen name="register_new" />
    </Stack>
  );
}
