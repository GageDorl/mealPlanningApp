import { Platform } from 'react-native';
import { db } from '@/services/powersync-database';
import { SupabasePowerSyncConnector } from '@/services/powersync-connector';

export async function triggerSync(): Promise<void> {
  try {
    // triggerCrudUpload is synchronous fire-and-forget on the stream implementation
    db.syncStreamImplementation?.triggerCrudUpload();
  } catch {
    // Upload trigger failure is non-fatal
  }

  // On native, reconnect to force a fresh download cycle.
  // On web, PowerSync's SharedWorker maintains its own persistent connection —
  // calling disconnect() there can destabilise the worker, so we skip it.
  if (Platform.OS !== 'web') {
    try {
      await db.disconnect();
      await db.connect(new SupabasePowerSyncConnector());
    } catch {
      // Reconnect failure is non-fatal
    }
  }
}
