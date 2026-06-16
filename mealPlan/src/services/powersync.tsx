import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, type AppStateStatus, Animated, PanResponder, TouchableOpacity, View, Text, ScrollView, StyleSheet } from 'react-native';
import { PowerSyncContext } from '@powersync/react-native';
import { db } from './powersync-database';
import { SupabasePowerSyncConnector } from './powersync-connector';
import { supabase } from './supabase';
import { cleanupExpiredCache } from './local-cache-service';

export function PowerSyncProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<string[]>([]);
  const [visible, setVisible] = useState(true);
  const pan = useRef(new Animated.ValueXY()).current;
  const log = (msg: string) => setLogs(prev => [`${new Date().toLocaleTimeString()} ${msg}`, ...prev]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 2 || Math.abs(gs.dy) > 2,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => pan.extractOffset(),
    }),
  ).current;

  useEffect(() => {
    const connector = new SupabasePowerSyncConnector(log);

    cleanupExpiredCache().catch(() => {});

    log('mount: checking session...');
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        log('mount: session found, connecting...');
        db.connect(connector);
        log('mount: db.connect() called');
      } else {
        log('mount: no session');
      }
    });

    const statusUnsub = db.registerListener({
      statusChanged: (status) => {
        log(`sync: connected=${status.connected} lastSync=${status.lastSyncedAt?.toLocaleTimeString() ?? 'never'} downloading=${status.dataFlowStatus?.downloading}`);
      },
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        log(`auth change: signed in, connecting...`);
        db.connect(connector);
        log('auth change: db.connect() called');
        setTimeout(async () => {
          const tables = [
            'users', 'recipes', 'meal_plans', 'meal_slots', 'meal_slot_recipes',
            'food_logs', 'food_log_items', 'personal_foods', 'macro_goals',
            'grocery_lists', 'grocery_items', 'recipe_ingredients',
          ];
          for (const t of tables) {
            const rows = await db.getAll(`SELECT id FROM ${t} LIMIT 1000`);
            log(`db:${t}=${rows.length}`);
          }
        }, 5000);
      } else {
        log('auth change: signed out, disconnecting');
        db.disconnect();
      }
    });

    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        const connected = db.currentStatus?.connected ?? false;
        log(`appState: foreground connected=${connected}`);
        if (!connected) {
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
              log('appState: was disconnected, reconnecting...');
              db.connect(connector);
            }
          });
        }
      }
    };
    const appStateSub = AppState.addEventListener('change', handleAppState);

    return () => {
      statusUnsub();
      subscription.unsubscribe();
      appStateSub.remove();
      db.disconnect();
    };
  }, []);

  return (
    <PowerSyncContext.Provider value={db}>
      {children}
      {visible ? (
        <Animated.View style={[styles.banner, { transform: pan.getTranslateTransform() }]} {...panResponder.panHandlers}>
          <View style={styles.header}>
            <Text style={styles.headerText}>Debug Log</Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                onPress={async () => {
                  log('resync: disconnecting...');
                  await db.disconnect();
                  log('resync: reconnecting...');
                  const connector = new SupabasePowerSyncConnector(log);
                  await db.connect(connector);
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
                  const connector = new SupabasePowerSyncConnector(log);
                  await db.connect(connector);
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
        </Animated.View>
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
  resync: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 16,
  },
  clearBtn: {
    color: '#ff6b6b',
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'monospace',
  },
  close: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 16,
  },
  line: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'monospace',
  },
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
  pillText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'monospace',
  },
});
