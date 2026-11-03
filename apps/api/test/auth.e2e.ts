import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { useApi } from './helpers';

const api = useApi();

describe('autenticación', () => {
  it('/health responde sin sesión', async () => {
    const res = await api.anon('GET', '/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
  });

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

  it('registrarse no da sesión hasta verificar el mail con el código', async () => {
    const email = api.newEmail();
    const reg = await api.anon('POST', '/auth/register', { email, password: 'prueba123', name: 'Test' });
    assert.equal(reg.status, 201);
    assert.deepEqual(reg.body, { verificationRequired: true, email });

    const login = await api.anon('POST', '/auth/login', { email, password: 'prueba123' });
    assert.equal(login.status, 200);
    assert.equal(login.body.verificationRequired, true);
    assert.equal(login.body.token, undefined);

    const ok = await api.anon('POST', '/auth/verify', { email, code: api.lastCode(email) });
    assert.equal(ok.status, 200);
    assert.ok(ok.body.token);
    // El código ya se usó.
    const again = await api.anon('POST', '/auth/verify', { email, code: api.lastCode(email) });
    assert.equal(again.status, 400);
  });

  it('un código incorrecto no verifica y a los 5 intentos hay que pedir otro', async () => {
    const email = api.newEmail();
    await api.anon('POST', '/auth/register', { email, password: 'prueba123', name: 'Test' });
    const code = api.lastCode(email);
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) {
      const res = await api.anon('POST', '/auth/verify', { email, code: wrong });
      assert.equal(res.status, 400);
    }
    const blocked = await api.anon('POST', '/auth/verify', { email, code });
    assert.equal(blocked.status, 400);
    assert.match(blocked.body.message, /intentos/);
  });

  it('reenviar el código tiene que esperar un minuto; con un email desconocido no dice nada', async () => {
    const email = api.newEmail();
    await api.anon('POST', '/auth/register', { email, password: 'prueba123', name: 'Test' });
    const res = await api.anon('POST', '/auth/resend', { email });
    assert.equal(res.status, 429);
    const unknown = await api.anon('POST', '/auth/resend', { email: api.newEmail() });
    assert.equal(unknown.status, 204);
  });

  it('volver a registrarse con un email sin verificar manda un código nuevo', async () => {
    const email = api.newEmail();
    await api.anon('POST', '/auth/register', { email, password: 'prueba123', name: 'Test' });
    const res = await api.anon('POST', '/auth/register', { email, password: 'otra12345', name: 'Otro' });
    assert.equal(res.status, 201);
    const ok = await api.anon('POST', '/auth/verify', { email, code: api.lastCode(email) });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.user.name, 'Otro');
  });

  it('un token inventado no sirve', async () => {
    const res = await api.withToken('esto.no.es-un-jwt')('GET', '/profile');
    assert.equal(res.status, 401);
  });
});
