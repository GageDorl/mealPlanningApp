import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollView, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { PowerSyncContext } from '@powersync/react';
import { db } from './powersync-database.web';
import { SupabasePowerSyncConnector } from './powersync-connector.web';
import { supabase } from './supabase';

const SCHEMA_VERSION = 1;
const SCHEMA_VERSION_KEY = 'powersync:schema_version';

export function PowerSyncProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<string[]>([]);
  const [visible, setVisible] = useState(true);
  const log = (msg: string) => setLogs((prev) => [`${new Date().toLocaleTimeString()} ${msg}`, ...prev]);
  const connectorRef = useRef<SupabasePowerSyncConnector | null>(null);

  useEffect(() => {
    const connector = new SupabasePowerSyncConnector(log);
    connectorRef.current = connector;

    log('mount: checking schema version...');
    (async () => {
      const stored = localStorage.getItem(SCHEMA_VERSION_KEY);
      if (stored !== String(SCHEMA_VERSION)) {
        log(`schema: version mismatch (stored=${stored ?? 'none'}), clearing local db...`);
        await db.disconnectAndClear();
        localStorage.setItem(SCHEMA_VERSION_KEY, String(SCHEMA_VERSION));
        log('schema: local db cleared');
      }

      log('mount: checking session...');
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        log('mount: session found, connecting...');
        db.connect(connector);
        log('mount: db.connect() called');
      } else {
        log('mount: no session');
      }
    })();

    const statusUnsub = db.registerListener({
      statusChanged: (status) => {
        log(`sync: connected=${status.connected} lastSync=${status.lastSyncedAt?.toLocaleTimeString() ?? 'never'} downloading=${status.dataFlowStatus?.downloading}`);
      },
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        log('auth change: signed in, connecting...');
        db.connect(connector);
      } else {
        log('auth change: signed out, disconnecting');
        db.disconnect();
      }
    });

    return () => {
      statusUnsub();
      subscription.unsubscribe();
      db.disconnect();
    };
  }, []);

  return (
    <PowerSyncContext.Provider value={db}>
      {children}
      {visible ? (
        <View style={styles.banner}>
          <View style={styles.header}>
            <Text style={styles.headerText}>Debug Log</Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                onPress={async () => {
                  log('resync: disconnecting...');
                  await db.disconnect();
                  log('resync: reconnecting...');
                  if (connectorRef.current) db.connect(connectorRef.current);
                  log('resync: done');
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.resync}>↺</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  log('CLEAR: wiping local db...');
                  await db.disconnectAndClear();
                  log('CLEAR: reconnecting...');
                  if (connectorRef.current) db.connect(connectorRef.current);
                  log('CLEAR: done');
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.clearBtn}>✕DB</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.close}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView style={{ maxHeight: 160 }}>
            {logs.map((l, i) => <Text key={i} style={styles.line}>{l}</Text>)}
          </ScrollView>
        </View>
      ) : (
        <TouchableOpacity style={styles.pill} onPress={() => setVisible(true)}>
          <Text style={styles.pillText}>LOG</Text>
        </TouchableOpacity>
      )}
    </PowerSyncContext.Provider>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 60,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.82)',
    borderRadius: 6,
    padding: 8,
    zIndex: 9999,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerText: {
    color: '#aaa',
    fontSize: 10,
    fontFamily: 'monospace',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  resync: { color: '#fff', fontSize: 16, lineHeight: 16 },
  clearBtn: { color: '#ff6b6b', fontSize: 11, lineHeight: 16, fontFamily: 'monospace' },
  close: { color: '#fff', fontSize: 14, lineHeight: 16 },
  line: { color: '#fff', fontSize: 11, fontFamily: 'monospace' },
  pill: {
    position: 'absolute',
    bottom: 100,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    zIndex: 9999,
  },
  pillText: { color: '#fff', fontSize: 11, fontFamily: 'monospace' },
});
