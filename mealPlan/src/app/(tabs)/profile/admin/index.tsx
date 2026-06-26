import { ScrollView, View, Text, Pressable, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, FontSizes, Spacing, BorderRadius, MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useUserRole } from '@/hooks/use-user-role';

interface NavRowProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  description: string;
  onPress: () => void;
  last?: boolean;
}

function NavRow({ icon, label, description, onPress, last }: NavRowProps) {
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
      <View style={styles.navText}>
        <Text style={[styles.navLabel, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.navDesc, { color: theme.textSecondary }]}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
    </Pressable>
  );
}

export default function AdminScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { role } = useUserRole();
  const isFullAdmin = role === 'admin';

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.content, { maxWidth: MaxContentWidth, alignSelf: 'center', width: '100%' }]}>
        <Text style={[styles.title, { color: theme.text }]}>Admin</Text>

        <View style={[styles.navGroup, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <NavRow
            icon="checkmark-circle-outline"
            label="Pending Foods"
            description="Review community food submissions"
            onPress={() => router.push('/(tabs)/profile/admin/pending-foods')}
          />
          <NavRow
            icon="flag-outline"
            label="Flagged Foods"
            description="Review flagged community foods"
            onPress={() => router.push('/(tabs)/profile/admin/flagged-foods')}
          />
          {isFullAdmin && (
            <NavRow
              icon="people-outline"
              label="User Roles"
              description="Manage moderator and admin roles"
              onPress={() => router.push('/(tabs)/profile/admin/user-roles')}
            />
          )}
          <NavRow
            icon="star-outline"
            label="Popular Recipes"
            description="Curate the popular recipes list"
            onPress={() => router.push('/(tabs)/profile/admin/popular-recipes')}
            last
          />
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
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
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
    minHeight: 60,
  } as ViewStyle,
  navIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  navText: {
    flex: 1,
    gap: 2,
  } as ViewStyle,
  navLabel: {
    fontSize: FontSizes.md,
    fontWeight: '500',
  } as TextStyle,
  navDesc: {
    fontSize: FontSizes.sm,
  } as TextStyle,
});
