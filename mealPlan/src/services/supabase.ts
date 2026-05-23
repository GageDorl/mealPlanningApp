import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { createClient, type AuthError, type Session } from '@supabase/supabase-js';
import env from '@/constants/env';

WebBrowser.maybeCompleteAuthSession();

const isNative = Platform.OS !== 'web';
const redirectTo = makeRedirectUri({
  scheme: 'mealplan',
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

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    ...(isNative
      ? {
          storage: AsyncStorage,
          detectSessionInUrl: false,
          autoRefreshToken: true,
        }
      : {}),
  },
});

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
