import type { INestApplication } from '@nestjs/common';
import { after, before } from 'node:test';
import { createApp } from '../src/app.factory';
import { PrismaService } from '../src/prisma/prisma.service';

/** Los usuarios de los tests se reconocen por el email y se borran al terminar. */
const EMAIL_PREFIX = 'e2e-';

export interface Response<T = any> {
  status: number;
  body: T;
}

export type Call = <T = any>(method: string, path: string, body?: unknown) => Promise<Response<T>>;

/** Levanta la API en un puerto libre para el archivo de tests y la baja al terminar. */
export function useApi() {
  const ctx = { url: '', app: null as INestApplication | null };
  before(async () => {
    ctx.app = await createApp({ logger: false });
    await ctx.app.listen(0, '127.0.0.1');
    ctx.url = await ctx.app.getUrl();
  });
  after(async () => {
    await ctx.app?.get(PrismaService).user.deleteMany({ where: { email: { startsWith: EMAIL_PREFIX } } });
    await ctx.app?.close();
  });

  const client = (token?: string): Call => async (method, path, body) => {
    const res = await fetch(ctx.url + path, {
      method,
      headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  };

  return {
    /** Sin sesión. */
    anon: client(),
    /** Con un token cualquiera (para probar tokens inválidos). */
    withToken: (token: string) => client(token),
    /** Crea un usuario nuevo y devuelve un cliente con su sesión. */
    async user(): Promise<{ call: Call; email: string }> {
      const email = `${EMAIL_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.dev`;
      const res = await client()('POST', '/auth/register', { email, password: 'prueba123', name: 'Test' });
      if (res.status !== 201) throw new Error(`registro: ${res.status} ${JSON.stringify(res.body)}`);
      return { call: client(res.body.token), email };
    },
  };
}
