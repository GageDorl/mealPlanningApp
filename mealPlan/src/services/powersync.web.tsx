import { useEffect, type ReactNode } from 'react';
import { PowerSyncContext } from '@powersync/react';
import { db } from './powersync-database.web';
import { SupabasePowerSyncConnector } from './powersync-connector.web';

const SCHEMA_VERSION = 1;
const SCHEMA_VERSION_KEY = 'powersync:schema_version';

export function PowerSyncProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const connector = new SupabasePowerSyncConnector();
    (async () => {
      const stored = localStorage.getItem(SCHEMA_VERSION_KEY);
      if (stored !== String(SCHEMA_VERSION)) {
        await db.disconnectAndClear();
        localStorage.setItem(SCHEMA_VERSION_KEY, String(SCHEMA_VERSION));
      }
      db.connect(connector);
    })();
    return () => { db.disconnect(); };
  }, []);

  return (
    <PowerSyncContext.Provider value={db}>
      {children}
    </PowerSyncContext.Provider>
  );
}
