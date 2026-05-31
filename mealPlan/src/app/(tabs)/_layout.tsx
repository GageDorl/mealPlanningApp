import { StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/theme';

export default function TabLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.backgroundElement,
          borderTopColor: theme.border,
          borderTopWidth: StyleSheet.hairlineWidth,

        },
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarLabelStyle: { fontSize: 9, fontWeight: '500' },
        tabBarIconStyle: { marginBottom: -2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'search' : 'search-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
          ),
        }}
      />

      {/* Sub-screens — part of the tab layout so the nav bar stays visible */}
      <Tabs.Screen name="grocery" options={{ tabBarItemStyle: { display: 'none' } }} />
      <Tabs.Screen name="macros" options={{ tabBarItemStyle: { display: 'none' } }} />
      <Tabs.Screen name="recipes" options={{ tabBarItemStyle: { display: 'none' } }} />
      <Tabs.Screen name="profile/notifications" options={{ tabBarItemStyle: { display: 'none' } }} />
      <Tabs.Screen name="grocery/pantry-staples" options={{ tabBarItemStyle: { display: 'none' } }} />
      <Tabs.Screen name="recipes/[id]" options={{ tabBarItemStyle: { display: 'none' } }} />
      <Tabs.Screen name="recipes/create" options={{ tabBarItemStyle: { display: 'none' } }} />
      <Tabs.Screen name="recipes/import" options={{ tabBarItemStyle: { display: 'none' } }} />
      <Tabs.Screen name="recipes/saved" options={{ tabBarItemStyle: { display: 'none' } }} />
    </Tabs>
  );
}
