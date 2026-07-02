import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@powersync/react-native';
import { supabase } from '@/services/supabase';

export type UserRole = 'user' | 'moderator' | 'admin';

export function useUserRole() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

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
