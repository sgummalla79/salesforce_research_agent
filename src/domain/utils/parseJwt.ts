import type { User } from '@/domain/types/auth.types';

/** Raw claims present in an Auth0 JWT payload. */
interface JwtPayload {
  sub?: string;
  exp?: number;
  iat?: number;
  email?: string;
  name?: string;
  given_name?: string;
  [key: string]: unknown;
}

/**
 * Decodes the payload segment of a JWT without verifying the signature.
 * Verification is always done server-side; this is for reading user claims only.
 *
 * @returns The decoded payload, or null if the token is malformed.
 */
export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(payloadB64);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Returns true if the token is expired or will expire within `bufferSeconds`.
 * Treats tokens with no `exp` claim as already expired.
 */
export function isTokenExpired(token: string, bufferSeconds = 30): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  return Date.now() / 1000 + bufferSeconds > payload.exp;
}

/**
 * Constructs a User from an Auth0 ID token without making a network call.
 * Falls back to the /userinfo endpoint when no id_token is present.
 *
 * @returns A User, or null if the token is missing required claims.
 */
export function userFromIdToken(idToken: string): User | null {
  const payload = decodeJwtPayload(idToken);
  if (!payload?.sub) return null;

  return {
    id:               payload.sub,
    email:            (payload.email as string | undefined) ?? '',
    name:             (payload.name as string | undefined) ?? (payload.given_name as string | undefined) ?? null,
    identityProvider: (payload.sub as string).split('|')[0],
    settings:         {},
  };
}
