import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('contraseñas', () => {
  it('verifica la correcta y rechaza otra', async () => {
    const hash = await hashPassword('sentadilla123');
    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(await verifyPassword('sentadilla123', hash)).toBe(true);
    expect(await verifyPassword('sentadilla124', hash)).toBe(false);
  });

  it('usa una sal distinta cada vez', async () => {
    expect(await hashPassword('igual')).not.toBe(await hashPassword('igual'));
  });

  it('rechaza un hash con otro formato', async () => {
    expect(await verifyPassword('x', 'md5$abc')).toBe(false);
  });
});
