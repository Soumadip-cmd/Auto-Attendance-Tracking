import { Tabs } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { TabBar } from '../../src/components/common/TabBar';

export default function TabLayout() {
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="attendance" options={{ title: 'Attendance' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
      <Tabs.Screen name="map" options={{ title: 'Map' }} />

      {/* Admin tab - hidden for non-admin users */}
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          href: isAdmin ? undefined : null,
        }}
      />

      <Tabs.Screen name="reports" options={{ title: 'Reports' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}