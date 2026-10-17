import Constants from 'expo-constants';

/**
 * URL de la API. En desarrollo se deduce de la IP de la PC que sirve el bundle (la misma
 * que usa Expo Go), así el celular la encuentra sin configurar nada. Se puede forzar con
 * EXPO_PUBLIC_API_URL.
 */
function resolveBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  const host = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost';
  return `http://${host}:3000`;
}

export const API_URL = resolveBaseUrl();

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Token de la sesión actual; lo maneja `AuthProvider`. */
let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

/** Se llama si la API rechaza el token (vencido o inválido): la app cierra la sesión. */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: init?.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', ...(authToken && { Authorization: `Bearer ${authToken}` }) },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const data = await res.json().catch(() => null);
  if (res.status === 401 && authToken) onUnauthorized?.();
  if (!res.ok) {
    const msg = Array.isArray(data?.message) ? data.message.join('\n') : data?.message;
    throw new ApiError(res.status, msg ?? `Error ${res.status}`);
  }
  return data as T;
}
