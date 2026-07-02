import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Tabs } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/theme';
import { WoodTexture } from '@/components/WoodTexture';

export default function TabLayout() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const { width, height } = useWindowDimensions();

  return (
    <View style={{ flex: 1 }}>
      <WoodTexture width={width} height={height} style={StyleSheet.absoluteFill} />
      <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.background },
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopColor: theme.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 64,
          paddingBottom: 4,
          paddingTop: 4,
        },
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: colorScheme === 'dark' ? theme.textSecondary : theme.text,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
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
      <Tabs.Screen name="grocery/pantry-staples" options={{ tabBarItemStyle: { display: 'none' } }} />
      <Tabs.Screen name="recipes/[id]" options={{ tabBarItemStyle: { display: 'none' } }} />
      <Tabs.Screen name="recipes/create" options={{ tabBarItemStyle: { display: 'none' } }} />
      <Tabs.Screen name="recipes/import" options={{ tabBarItemStyle: { display: 'none' } }} />
      <Tabs.Screen name="recipes/saved" options={{ tabBarItemStyle: { display: 'none' } }} />
    </Tabs>
    </View>
  );
}
