import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Stack.Screen 
        name="login" 
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen name="register" />
    </Stack>
  );
}
