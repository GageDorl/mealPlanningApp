import { useEffect, type ReactNode } from 'react';
import { PowerSyncContext } from '@powersync/react';
import { db } from './powersync-database.web';
import { SupabasePowerSyncConnector } from './powersync-connector.web';

export function PowerSyncProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const connector = new SupabasePowerSyncConnector();
    db.connect(connector);
    return () => { db.disconnect(); };
  }, []);

  return (
    <PowerSyncContext.Provider value={db}>
      {children}
    </PowerSyncContext.Provider>
  );
}
