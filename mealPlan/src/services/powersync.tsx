import type { ReactNode } from 'react';
import * as PowerSync from '@powersync/react-native';
import env from '@/constants/env';

interface PowerSyncProviderProps {
  children: ReactNode;
}

const RawPowerSyncProvider = (PowerSync as any).PowerSyncProvider ?? (({ children }: { children: ReactNode }) => <>{children}</>);

export function PowerSyncProvider({ children }: PowerSyncProviderProps) {
  return (
    <RawPowerSyncProvider syncUrl={env.POWERSYNC_URL} databaseName="prepd" tables={[]}>
      {children}
    </RawPowerSyncProvider>
  );
}
