import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, Alert, StyleSheet, ActivityIndicator, TextInput,
  type ViewStyle, type TextStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/services/supabase';
import { Colors, Spacing, FontSizes, BorderRadius, MaxContentWidth } from '@/constants/theme';

type UserRole = 'user' | 'moderator' | 'admin';

interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  role: UserRole;
}

interface ListResponse {
  users: UserRow[];
  total: number;
  page: number;
  page_size: number;
}

const ROLE_LABELS: Record<UserRole, string> = {
  user: 'User',
  moderator: 'Moderator',
  admin: 'Admin',
};

const ROLE_COLORS: Record<UserRole, string> = {
  user: '#8E8E93',
  moderator: '#FF9500',
  admin: '#FF3B30',
};

async function fetchUsers(q: string, page: number): Promise<ListResponse> {
  const params = new URLSearchParams({ page: String(page) });
  if (q) params.set('q', q);
  const { data, error } = await supabase.functions.invoke(`set-user-role?${params}`, {
    method: 'GET',
  });
  if (error) throw error;
  return data as ListResponse;
}

async function setUserRole(userId: string, role: UserRole): Promise<void> {
  const { error } = await supabase.functions.invoke('set-user-role', {
    body: { user_id: userId, role },
  });
  if (error) throw error;
}

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <View style={[styles.badge, { backgroundColor: ROLE_COLORS[role] + '22', borderColor: ROLE_COLORS[role] + '55' }]}>
      <Text style={[styles.badgeText, { color: ROLE_COLORS[role] }]}>{ROLE_LABELS[role]}</Text>
    </View>
  );
}

function UserCard({
  user,
  currentUserId,
  onRoleChanged,
}: {
  user: UserRow;
  currentUserId: string;
  onRoleChanged: (id: string, role: UserRole) => void;
}) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selfWarning, setSelfWarning] = useState(false);
  const isSelf = user.id === currentUserId;

  const applyRole = async (role: UserRole) => {
    if (role === user.role) {
      setExpanded(false);
      return;
    }
    setSaving(true);
    setExpanded(false);
    try {
      await setUserRole(user.id, role);
      onRoleChanged(user.id, role);
    } catch {
      Alert.alert('Error', 'Failed to update role. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <Pressable
        style={styles.cardInner}
        onPress={() => {
          if (isSelf) { setSelfWarning(true); return; }
          setExpanded((v) => !v);
        }}
        disabled={saving}
      >
        <View style={styles.cardLeft}>
          <Text style={[styles.email, { color: theme.text }]} numberOfLines={1}>
            {user.email}
            {isSelf ? ' (you)' : ''}
          </Text>
          {user.display_name ? (
            <Text style={[styles.displayName, { color: theme.textSecondary }]} numberOfLines={1}>
              {user.display_name}
            </Text>
          ) : null}
        </View>
        {saving ? (
          <ActivityIndicator size="small" color={theme.text} />
        ) : (
          <RoleBadge role={user.role} />
        )}
      </Pressable>

      {selfWarning ? (
        <Text style={[styles.selfNote, { color: theme.textSecondary }]}>
          You cannot change your own role.
        </Text>
      ) : null}

      {expanded ? (
        <View style={[styles.picker, { borderTopColor: theme.border }]}>
          {(['user', 'moderator', 'admin'] as UserRole[]).map((role) => (
            <Pressable
              key={role}
              style={[
                styles.pickerOption,
                user.role === role && { backgroundColor: ROLE_COLORS[role] + '22' },
              ]}
              onPress={() => applyRole(role)}
            >
              <Text style={[styles.pickerOptionText, { color: user.role === role ? ROLE_COLORS[role] : theme.text }]}>
                {ROLE_LABELS[role]}{user.role === role ? ' ✓' : ''}
              </Text>
            </Pressable>
          ))}
          <Pressable style={styles.pickerOption} onPress={() => setExpanded(false)}>
            <Text style={[styles.pickerOptionText, { color: theme.textSecondary }]}>Cancel</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export default function UserRolesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? '');
    });
  }, []);

  const load = useCallback(async (q: string, pageNum: number, append: boolean) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    try {
      const res = await fetchUsers(q, pageNum);
      setUsers((prev) => (append ? [...prev, ...res.users] : res.users));
      setTotal(res.total);
      setPage(pageNum);
    } catch {
      setError('Failed to load users.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    load(query, 0, false);
  }, []);// eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      load(text, 0, false);
    }, 350);
  };

  const handleLoadMore = () => {
    if (loadingMore || users.length >= total) return;
    load(query, page + 1, true);
  };

  const handleRoleChanged = (id: string, role: UserRole) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.inner, { maxWidth: MaxContentWidth }]}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Text style={[styles.back, { color: Colors.accent }]}>‹ Back</Text>
            </Pressable>
            <Text style={[styles.title, { color: theme.text }]}>User Roles</Text>
          </View>

          <TextInput
            style={[styles.search, { backgroundColor: theme.backgroundElement, borderColor: theme.border, color: theme.text }]}
            placeholder="Search by email…"
            placeholderTextColor={theme.textSecondary}
            value={query}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />

          {loading ? (
            <ActivityIndicator style={styles.centered} color={theme.text} />
          ) : error ? (
            <Text style={[styles.empty, { color: theme.textSecondary }]}>{error}</Text>
          ) : users.length === 0 ? (
            <Text style={[styles.empty, { color: theme.textSecondary }]}>No users found.</Text>
          ) : (
            <>
              <Text style={[styles.count, { color: theme.textSecondary }]}>
                {total} user{total !== 1 ? 's' : ''}
              </Text>
              {users.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  currentUserId={currentUserId}
                  onRoleChanged={handleRoleChanged}
                />
              ))}
              {users.length < total ? (
                <Pressable
                  style={[styles.loadMore, { borderColor: theme.border }]}
                  onPress={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <ActivityIndicator size="small" color={theme.text} />
                  ) : (
                    <Text style={[styles.loadMoreText, { color: Colors.accent }]}>Load more</Text>
                  )}
                </Pressable>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 } as ViewStyle,
  scroll: { padding: Spacing.lg, alignItems: 'center' } as ViewStyle,
  inner: { width: '100%' } as ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  } as ViewStyle,
  back: { fontSize: FontSizes.lg } as TextStyle,
  title: { fontSize: FontSizes.xl, fontWeight: '700', flex: 1 } as TextStyle,
  search: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    fontSize: FontSizes.md,
    marginBottom: Spacing.md,
  } as TextStyle,
  count: { fontSize: FontSizes.sm, marginBottom: Spacing.sm } as TextStyle,
  card: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  } as ViewStyle,
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  } as ViewStyle,
  cardLeft: { flex: 1, gap: 2 } as ViewStyle,
  email: { fontSize: FontSizes.sm, fontWeight: '600' } as TextStyle,
  displayName: { fontSize: FontSizes.xs } as TextStyle,
  badge: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingVertical: 3,
    paddingHorizontal: Spacing.sm,
  } as ViewStyle,
  badgeText: { fontSize: FontSizes.xs, fontWeight: '700' } as TextStyle,
  picker: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: Spacing.sm,
    paddingTop: Spacing.xs,
  } as ViewStyle,
  pickerOption: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  } as ViewStyle,
  pickerOptionText: { fontSize: FontSizes.sm, fontWeight: '600' } as TextStyle,
  selfNote: { fontSize: FontSizes.xs, marginTop: Spacing.xs } as TextStyle,
  loadMore: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  } as ViewStyle,
  loadMoreText: { fontSize: FontSizes.sm, fontWeight: '600' } as TextStyle,
  centered: { marginTop: Spacing.xxl } as ViewStyle,
  empty: { textAlign: 'center', marginTop: Spacing.xxl, fontSize: FontSizes.md } as TextStyle,
});
