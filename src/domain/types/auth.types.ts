/**
 * Core authentication domain types.
 *
 * This file is the single source of truth for all auth-related shapes.
 * No infrastructure or presentation imports allowed here.
 */

/** Authenticated user profile. */
export interface User {
  /** Auth0 sub claim — unique across all identity providers. */
  id: string;
  email: string;
  name: string | null;
  /** Identity provider extracted from sub prefix, e.g. "google-oauth2", "auth0". */
  identityProvider: string;
  settings: UserSettings;
}

/** Per-user preferences persisted server-side. */
export interface UserSettings {
  theme?: string;
  defaultFlowId?: string;
  [key: string]: unknown;
}

/** Access + optional ID token pair returned by Auth0 token grants. */
export interface AuthTokens {
  accessToken: string;
  idToken?: string;
}

/** Payload for email/password login (Resource Owner Password Grant). */
export interface LoginPayload {
  email: string;
  password: string;
}

/** Payload for new user registration. */
export interface RegisterPayload {
  email: string;
  password: string;
  name?: string;
}

/** Payload for updating persisted user settings. */
export interface UpdateSettingsPayload {
  settings: UserSettings;
}

/** A social or enterprise Auth0 connection that can be shown as a login button. */
export interface SocialConnection {
  /** Auth0 connection name (used as the `connection` param on /authorize). */
  name: string;
  /** Strategy identifier, e.g. "google-oauth2". */
  strategy: string;
  /** Human-readable label for display on the button. */
  displayName: string;
}
