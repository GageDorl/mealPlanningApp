import { useMemo } from 'react';
import { useQuery } from '@powersync/react-native';
import { getCachedUserId } from '@/services/supabase';

export type UserRole = 'user' | 'moderator' | 'admin';

export function useUserRole() {
  const userId = getCachedUserId();

  const { data, isLoading } = useQuery<{ role: string }>(
    'SELECT role FROM profiles WHERE user_id = ?',
    [userId ?? ''],
  );

  const role = useMemo<UserRole | null>(() => {
    if (!userId || isLoading) return null;
    return (data[0]?.role as UserRole) ?? 'user';
  }, [userId, data, isLoading]);

  return { role, loading: isLoading };
}
