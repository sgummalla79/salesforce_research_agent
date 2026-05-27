/**
 * PKCE (Proof Key for Code Exchange) utilities.
 *
 * These use the WebCrypto API which is available in all Tauri WebViews.
 * Pure functions — no side effects, no storage reads/writes.
 */

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Generates a cryptographically random PKCE code verifier (32 bytes, base64url-encoded).
 * Store this in memory — never persist it.
 */
export function generateCodeVerifier(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes.buffer as ArrayBuffer);
}

/**
 * Derives the PKCE code challenge from a verifier using SHA-256.
 * This is the value sent to Auth0's /authorize endpoint.
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(hash);
}
