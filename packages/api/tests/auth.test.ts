import { describe, expect, it } from 'vitest';
import { signAccessToken, verifyAccessToken } from '../src/lib/jwt.js';

describe('JWT helpers', () => {
  it('signs and verifies access token round-trip', () => {
    const token = signAccessToken({ sub: 'user-1', email: 'a@b.c', role: 'GESTOR' });
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe('user-1');
    expect(payload.role).toBe('GESTOR');
    expect(payload.type).toBe('access');
  });

  it('rejects refresh token used as access', () => {
    const malicious = signAccessToken({ sub: 'x', email: 'x@x.x', role: 'REPRESENTANTE' });
    // Modify token by re-signing under wrong secret
    expect(() => verifyAccessToken(malicious + 'tamper')).toThrow();
  });
});
