import { StyleSheet, View, Pressable, useWindowDimensions } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useDispatch } from 'react-redux';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, BorderRadius } from '@/constants/theme';
import { WoodTexture } from '@/components/WoodTexture';
import { GlobalAddMealModal } from '@/components/calendar/global-add-meal-modal';
import { openAddModal } from '@/store/slices/add-meal-slot-slice';
import type { AppDispatch } from '@/store';

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function CenterAddButton() {
  const dispatch = useDispatch<AppDispatch>();
  return (
    <Pressable
      onPress={() => dispatch(openAddModal({ date: todayString() }))}
      style={styles.centerTabButton}
      accessibilityRole="button"
      accessibilityLabel="Add food log or meal"
    >
      <View style={styles.centerTabCircle}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </View>
    </Pressable>
  );
}

export default function TabLayout() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      <WoodTexture width={width} height={height} style={StyleSheet.absoluteFill} />
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: theme.background },
          tabBarStyle: {
            backgroundColor: 'transparent',
            elevation: 0,
            borderTopColor: theme.border,
            borderTopWidth: StyleSheet.hairlineWidth,
            height: 64 + insets.bottom,
            paddingBottom: 4 + insets.bottom,
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
          name="add"
          options={{
            title: '',
            tabBarButton: () => <CenterAddButton />,
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
        <Tabs.Screen name="plan-week" options={{ tabBarItemStyle: { display: 'none' } }} />
      </Tabs>

      <GlobalAddMealModal />
    </View>
  );
}

const styles = StyleSheet.create({
  centerTabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerTabCircle: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
