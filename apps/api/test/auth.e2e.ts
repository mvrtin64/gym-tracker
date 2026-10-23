import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { useApi } from './helpers';

const api = useApi();

describe('autenticación', () => {
  it('sin sesión no se puede usar la API', async () => {
    const res = await api.anon('GET', '/profile');
    assert.equal(res.status, 401);
  });

  it('registrarse da una sesión que sirve para /auth/me', async () => {
    const { call, email } = await api.user();
    const me = await call('GET', '/auth/me');
    assert.equal(me.status, 200);
    assert.equal(me.body.email, email);
    assert.equal(me.body.passwordHash, undefined);
  });

  it('no deja registrar dos veces el mismo email', async () => {
    const { email } = await api.user();
    const res = await api.anon('POST', '/auth/register', { email, password: 'otra12345', name: 'Otro' });
    assert.equal(res.status, 409);
  });

  it('login: contraseña correcta da sesión; incorrecta, 401', async () => {
    const { email } = await api.user();
    const ok = await api.anon('POST', '/auth/login', { email, password: 'prueba123' });
    assert.equal(ok.status, 200);
    assert.ok(ok.body.token);
    const bad = await api.anon('POST', '/auth/login', { email, password: 'equivocada' });
    assert.equal(bad.status, 401);
  });

  it('valida los datos del registro', async () => {
    const res = await api.anon('POST', '/auth/register', { email: 'no-es-un-email', password: 'prueba123', name: 'X' });
    assert.equal(res.status, 400);
  });

  it('un token inventado no sirve', async () => {
    const res = await api.withToken('esto.no.es-un-jwt')('GET', '/profile');
    assert.equal(res.status, 401);
  });
});
