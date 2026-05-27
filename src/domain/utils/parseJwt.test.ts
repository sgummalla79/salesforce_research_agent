import { describe, it, expect } from 'vitest';
import { decodeJwtPayload, isTokenExpired, userFromIdToken } from './parseJwt';

/** Builds a minimal base64url-encoded JWT with the given payload. */
function makeJwt(payload: Record<string, unknown>): string {
  const header  = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g, '');
  const body    = btoa(JSON.stringify(payload)).replace(/=/g, '');
  return `${header}.${body}.fakesig`;
}

describe('decodeJwtPayload', () => {
  it('decodes a valid JWT payload', () => {
    // Arrange
    const token = makeJwt({ sub: 'auth0|123', email: 'a@b.com' });

    // Act
    const payload = decodeJwtPayload(token);

    // Assert
    expect(payload?.sub).toBe('auth0|123');
    expect(payload?.email).toBe('a@b.com');
  });

  it('returns null for a malformed token', () => {
    // Arrange + Act + Assert
    expect(decodeJwtPayload('not.a.valid.jwt')).toBeNull();
    expect(decodeJwtPayload('')).toBeNull();
  });
});

describe('isTokenExpired', () => {
  it('returns false for a token expiring in the future', () => {
    // Arrange
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const token     = makeJwt({ sub: 'x', exp: futureExp });

    // Act + Assert
    expect(isTokenExpired(token)).toBe(false);
  });

  it('returns true for an already-expired token', () => {
    // Arrange
    const pastExp = Math.floor(Date.now() / 1000) - 100;
    const token   = makeJwt({ sub: 'x', exp: pastExp });

    // Act + Assert
    expect(isTokenExpired(token)).toBe(true);
  });

  it('returns true when there is no exp claim', () => {
    // Arrange
    const token = makeJwt({ sub: 'x' });

    // Act + Assert
    expect(isTokenExpired(token)).toBe(true);
  });
});

describe('userFromIdToken', () => {
  it('builds a User from a valid ID token', () => {
    // Arrange
    const token = makeJwt({
      sub:   'google-oauth2|456',
      email: 'user@example.com',
      name:  'Test User',
    });

    // Act
    const user = userFromIdToken(token);

    // Assert
    expect(user).not.toBeNull();
    expect(user?.id).toBe('google-oauth2|456');
    expect(user?.email).toBe('user@example.com');
    expect(user?.name).toBe('Test User');
    expect(user?.identityProvider).toBe('google-oauth2');
  });

  it('returns null when the token has no sub claim', () => {
    // Arrange
    const token = makeJwt({ email: 'a@b.com' });

    // Act + Assert
    expect(userFromIdToken(token)).toBeNull();
  });
});
