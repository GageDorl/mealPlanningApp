import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { createClient, type AuthError, type Session } from '@supabase/supabase-js';
import env from '@/constants/env';

WebBrowser.maybeCompleteAuthSession();

const isNative = Platform.OS !== 'web';
const redirectTo = makeRedirectUri({
  scheme: 'prepd',
  path: 'auth/callback',
});

function readAuthParam(url: string, key: string) {
  const [baseAndQuery, hash = ''] = url.split('#');
  const query = baseAndQuery.includes('?') ? baseAndQuery.split('?')[1] : '';
  const queryValue = new URLSearchParams(query).get(key);

  if (queryValue) {
    return queryValue;
  }

  return new URLSearchParams(hash).get(key);
}

// All Supabase data/auth requests get a hard AbortController timeout so a
// suspended network connection (e.g. app returning from background) fails fast
// instead of hanging indefinitely.
const FETCH_TIMEOUT_MS = 15_000;

function fetchWithTimeout(url: RequestInfo | URL, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  // Forward any upstream signal so caller aborts still propagate
  const upstream = options?.signal;
  const onUpstreamAbort = () => controller.abort(upstream?.reason);
  upstream?.addEventListener('abort', onUpstreamAbort, { once: true });
  if (upstream?.aborted) controller.abort(upstream.reason);

  return fetch(url, { ...options, signal: controller.signal }).finally(() => {
    clearTimeout(timer);
    upstream?.removeEventListener('abort', onUpstreamAbort);
  });
}

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  global: { fetch: fetchWithTimeout },
  auth: {
    persistSession: true,
    ...(isNative
      ? {
          storage: AsyncStorage,
          detectSessionInUrl: false,
          autoRefreshToken: true,
        }
      : {
          // Chrome freezes JS timers (including AbortController timeouts) for
          // background tabs. If an auto-refresh is in-flight when the tab goes to
          // background, its fetch never gets aborted, so it holds the Supabase Web
          // Lock (navigator.locks) indefinitely. Every subsequent getSession() call
          // queues behind it and the app hangs on foreground return.
          // Fix: bypass navigator.locks with a no-op; single-tab apps don't need
          // cross-tab lock coordination.
          lock: <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => fn(),
        }),
  },
});

// Cached user ID kept current via onAuthStateChange — avoids calling getSession()
// (which acquires the auth lock) in the hot data-fetch path.
let _cachedUserId: string | null = null;
supabase.auth.onAuthStateChange((_event, session) => {
  _cachedUserId = session?.user.id ?? null;
});
export function getCachedUserId(): string | null {
  return _cachedUserId;
}

export interface AuthProfile {
  id: string;
  email: string | null;
  displayName?: string | null;
}

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(email: string, password: string) {
  return supabase.auth.signUp({ email, password });
}

export async function createSessionFromUrl(url: string) {
  const code = readAuthParam(url, 'code');
  const accessToken = readAuthParam(url, 'access_token');
  const refreshToken = readAuthParam(url, 'refresh_token');
  const errorDescription = readAuthParam(url, 'error_description') ?? readAuthParam(url, 'error');

  if (errorDescription) {
    throw new Error(errorDescription);
  }

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      throw error;
    }

    return data.session;
  }

  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      throw error;
    }

    return data.session;
  }

  return null;
}

export async function signInWithProvider(provider: 'google' | 'apple'): Promise<{
  session: Session | null;
  error: AuthError | Error | null;
}> {
  if (!isNative) {
    const webRedirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: webRedirectTo ? { redirectTo: webRedirectTo } : undefined,
    });
    return { session: null, error };
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      ...(provider === 'google'
        ? {
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          }
        : {}),
    },
  });

  if (error) {
    return { session: null, error };
  }

  if (!data?.url) {
    return { session: null, error: new Error('Supabase did not return an OAuth URL.') };
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type !== 'success') {
    return { session: null, error: new Error('Authentication was canceled before completion.') };
  }

  try {
    const session = await createSessionFromUrl(result.url);
    return { session, error: null };
  } catch (sessionError) {
    return {
      session: null,
      error: sessionError instanceof Error ? sessionError : new Error('Failed to create session from OAuth callback.'),
    };
  }
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getCurrentSession() {
  return supabase.auth.getSession();
}

export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange((event, session) => callback(event, session));
}
