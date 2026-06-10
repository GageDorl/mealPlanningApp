import { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';

export type UserRole = 'user' | 'moderator' | 'admin';

export function useUserRole() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      setRole((data?.role as UserRole) ?? 'user');
      setLoading(false);
    })();
  }, []);

  return { role, loading };
}
