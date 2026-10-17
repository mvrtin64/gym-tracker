import { useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setAuthToken, setUnauthorizedHandler } from './client';

export interface UserDto {
  id: string;
  email: string;
  name: string;
}

interface Session {
  token: string;
  user: UserDto;
}

interface AuthContextValue {
  session: Session | null;
  /** Mientras se lee la sesión guardada al abrir la app. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

/** El token se guarda cifrado en el dispositivo (Keychain / Keystore). */
const SESSION_KEY = 'gym.session';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const save = useCallback(async (next: Session | null) => {
    setAuthToken(next?.token ?? null);
    setSession(next);
    if (next) await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(next));
    else await SecureStore.deleteItemAsync(SESSION_KEY);
  }, []);

  const signOut = useCallback(async () => {
    // Que no quede nada del usuario anterior en caché.
    queryClient.clear();
    await save(null);
  }, [queryClient, save]);

  useEffect(() => {
    SecureStore.getItemAsync(SESSION_KEY)
      .then((raw) => {
        if (!raw) return;
        const stored = JSON.parse(raw) as Session;
        setAuthToken(stored.token);
        setSession(stored);
      })
      .catch(() => SecureStore.deleteItemAsync(SESSION_KEY).catch(() => {}))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => void signOut());
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      signIn: async (email, password) =>
        save(await api<Session>('/auth/login', { method: 'POST', body: { email, password } })),
      signUp: async (name, email, password) =>
        save(await api<Session>('/auth/register', { method: 'POST', body: { name, email, password } })),
      signOut,
    }),
    [session, loading, save, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth tiene que usarse dentro de <AuthProvider>');
  return ctx;
}
