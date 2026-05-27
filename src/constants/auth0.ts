/**
 * Auth0 configuration constants.
 *
 * All VITE_AUTH0_* env reads are centralised here — no other file may
 * access import.meta.env for Auth0 values directly.
 */

export const AUTH0_DOMAIN    = import.meta.env.VITE_AUTH0_DOMAIN    ?? '';
export const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID ?? '';
export const AUTH0_AUDIENCE  = import.meta.env.VITE_AUTH0_AUDIENCE  ?? '';

/** OpenID Connect scope requested on every token grant. */
export const AUTH0_SCOPE = 'openid profile email offline_access';

/**
 * Auth0's fixed name for the built-in email/password connection.
 * This is a well-known Auth0 constant, not an env variable.
 */
export const AUTH0_DB_CONNECTION = 'Username-Password-Authentication';

/**
 * Deep-link URI that the OS delivers to Tauri after social login.
 * Must be registered in Auth0 → Application → Allowed Callback URLs.
 */
export const AUTH0_DEEPLINK_CALLBACK = 'pragna://auth/callback';

/**
 * Hash-router path used for the in-app OAuth callback screen.
 * This is the route React Router renders while Tauri hands off the code.
 */
export const AUTH0_CALLBACK_PATH = '/auth-callback';

// ── In-memory keys (not storage keys) ────────────────────────────────────────
// PKCE state travels in memory only — deeplink callback is same-process.
// These are exported as constants so consumers import them rather than
// using magic strings.
export const PKCE_VERIFIER_KEY = 'pkce_verifier';
export const PKCE_STATE_KEY    = 'pkce_state';

/**
 * Connection strategy names that represent social / enterprise providers
 * (i.e. not the local database connection).
 */
export const SOCIAL_STRATEGIES = new Set([
  'google-oauth2',
  'github',
  'twitter',
  'facebook',
  'apple',
  'microsoft',
  'linkedin',
  'windowslive',
  'yahoo',
  'salesforce',
  'salesforce-sandbox',
  'waad',  // Azure AD
  'adfs',
  'oauth2',
  'samlp',
  'oidc',
]);

/** Human-readable display name for each social strategy. */
export const SOCIAL_DISPLAY_NAMES: Record<string, string> = {
  'google-oauth2':      'Google',
  'github':             'GitHub',
  'twitter':            'Twitter / X',
  'facebook':           'Facebook',
  'apple':              'Apple',
  'microsoft':          'Microsoft',
  'linkedin':           'LinkedIn',
  'windowslive':        'Microsoft',
  'yahoo':              'Yahoo',
  'salesforce':         'Salesforce',
  'salesforce-sandbox': 'Salesforce Sandbox',
  'waad':               'Azure AD',
  'adfs':               'ADFS',
};
