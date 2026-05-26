import type { ReactNode } from 'react';

interface PowerSyncProviderProps {
  children: ReactNode;
}

/**
 * Web stub for PowerSyncProvider.
 * PowerSync's React Native SDK uses native SQLite which isn't available on web.
 * On web, data is fetched directly from Supabase without local-first sync.
 */
export function PowerSyncProvider({ children }: PowerSyncProviderProps) {
  return <>{children}</>;
}
