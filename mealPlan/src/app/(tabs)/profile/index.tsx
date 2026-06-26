import { ScrollView, View, Text, Pressable, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, FontSizes, Spacing, BorderRadius, MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useUserRole } from '@/hooks/use-user-role';

interface NavRowProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  last?: boolean;
}

function NavRow({ icon, label, onPress, last }: NavRowProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.navRow,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.border },
        pressed && { backgroundColor: theme.backgroundSelected },
      ]}
    >
      <View style={[styles.navIcon, { backgroundColor: `${Colors.accent}1A` }]}>
        <Ionicons name={icon} size={18} color={Colors.accent} />
      </View>
      <Text style={[styles.navLabel, { color: theme.text }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { profile } = useUserProfile();
  const { role } = useUserRole();

  const isAdmin = role === 'moderator' || role === 'admin';
  const displayName = profile?.user.display_name ?? 'Account';
  const email = profile?.user.email ?? '';

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.content, { maxWidth: MaxContentWidth, alignSelf: 'center', width: '100%' }]}>

        {/* User card */}
        <View style={[styles.userCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <View style={[styles.avatar, { backgroundColor: `${Colors.accent}1A` }]}>
            <Text style={[styles.avatarLetter, { color: Colors.accent }]}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: theme.text }]}>{displayName}</Text>
            {email ? <Text style={[styles.userEmail, { color: theme.textSecondary }]}>{email}</Text> : null}
          </View>
        </View>

        {/* Nav rows */}
        <View style={[styles.navGroup, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <NavRow
            icon="person-outline"
            label="Account"
            onPress={() => router.push('/(tabs)/profile/account')}
          />
          <NavRow
            icon="notifications-outline"
            label="Notifications"
            onPress={() => router.push('/(tabs)/profile/notifications')}
          />
          <NavRow
            icon="color-palette-outline"
            label="Appearance"
            onPress={() => router.push('/(tabs)/profile/appearance')}
          />
          <NavRow
            icon="library-outline"
            label="My Food Library"
            onPress={() => router.push('/(tabs)/profile/food-library')}
            last={!isAdmin}
          />
          {isAdmin && (
            <NavRow
              icon="shield-checkmark-outline"
              label="Admin"
              onPress={() => router.push('/(tabs)/profile/admin')}
              last
            />
          )}
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  } as ViewStyle,
  content: {
    gap: Spacing.lg,
  } as ViewStyle,
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  } as ViewStyle,
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  avatarLetter: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
  } as TextStyle,
  userInfo: {
    flex: 1,
    gap: 2,
  } as ViewStyle,
  userName: {
    fontSize: FontSizes.md,
    fontWeight: '700',
  } as TextStyle,
  userEmail: {
    fontSize: FontSizes.sm,
  } as TextStyle,
  navGroup: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  } as ViewStyle,
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    minHeight: 52,
  } as ViewStyle,
  navIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  navLabel: {
    flex: 1,
    fontSize: FontSizes.md,
    fontWeight: '500',
  } as TextStyle,
});
