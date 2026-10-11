import { Platform, type ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { colors } from '@/theme';

type Name = keyof typeof Ionicons.glyphMap;
const icon = (on: Name, off: Name) => ({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) => (
  <Ionicons name={focused ? on : off} size={size} color={color} />
);

export default function TabsLayout() {
  const { me } = useAuth();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.navy,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarStyle: {
          backgroundColor: '#fff', borderTopColor: colors.line,
          height: 56 + Math.max(insets.bottom, Platform.OS === 'ios' ? 0 : 6), paddingTop: 6,
        },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('home', 'home-outline') }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: icon('calendar', 'calendar-outline') }} />
      <Tabs.Screen name="requests" options={{ title: 'Requests', tabBarIcon: icon('document-text', 'document-text-outline') }} />
      <Tabs.Screen name="admin" options={{ title: 'Admin', href: me?.can_admin || me?.can_access_approvals || me?.can_manage_roles ? undefined : null, tabBarIcon: icon('shield-checkmark', 'shield-checkmark-outline') }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: icon('person-circle', 'person-circle-outline') }} />
    </Tabs>
  );
}
