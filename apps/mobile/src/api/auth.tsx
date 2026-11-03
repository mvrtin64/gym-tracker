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

/** Registro y login sin el mail verificado: la API manda un código y todavía no hay sesión. */
interface VerificationRequired {
  verificationRequired: true;
  email: string;
}

interface AuthContextValue {
  session: Session | null;
  /** Mientras se lee la sesión guardada al abrir la app. */
  loading: boolean;
  /** Devuelven el email al que se mandó el código si falta verificarlo; si no, abren la sesión. */
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (name: string, email: string, password: string) => Promise<string | null>;
  /** Confirma el código de 6 dígitos y abre la sesión. */
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendCode: (email: string) => Promise<void>;
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

  const value = useMemo<AuthContextValue>(() => {
    const start = async (res: Session | VerificationRequired) => {
      if ('verificationRequired' in res) return res.email;
      await save(res);
      return null;
    };
    return {
      session,
      loading,
      signIn: async (email, password) =>
        start(await api<Session | VerificationRequired>('/auth/login', { method: 'POST', body: { email, password } })),
      signUp: async (name, email, password) =>
        start(await api<Session | VerificationRequired>('/auth/register', { method: 'POST', body: { name, email, password } })),
      verifyEmail: async (email, code) =>
        save(await api<Session>('/auth/verify', { method: 'POST', body: { email, code } })),
      resendCode: async (email) => {
        await api('/auth/resend', { method: 'POST', body: { email } });
      },
      signOut,
    };
  },
    [session, loading, save, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth tiene que usarse dentro de <AuthProvider>');
  return ctx;
}
