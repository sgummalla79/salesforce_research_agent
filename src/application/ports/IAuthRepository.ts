import type {
  AuthTokens,
  LoginPayload,
  RegisterPayload,
  SocialConnection,
  UpdateSettingsPayload,
  User,
} from '@/domain/types/auth.types';

/**
 * Repository contract for all authentication operations.
 *
 * Implementations live in infrastructure/auth0/.
 * Application-layer services depend only on this interface (DIP).
 */
export interface IAuthRepository {
  /** Creates a new user account via the Auth0 database connection. */
  register(payload: RegisterPayload): Promise<User>;

  /** Authenticates with email + password (Resource Owner Password Grant). */
  login(payload: LoginPayload): Promise<AuthTokens>;

  /**
   * Opens the system browser to the Auth0 /authorize endpoint.
   * On Tauri, this uses @tauri-apps/plugin-shell to open the OS browser.
   * Auth0 redirects to pragna://auth/callback which the deep-link plugin intercepts.
   * This function does NOT return — the flow continues in AuthCallbackView.
   */
  initiateSocialLogin(connection: string): void;

  /**
   * Completes the PKCE authorization code exchange.
   * Called after the deep-link delivers the `code` param to the app.
   */
  completeOAuthCallback(
    code: string,
    codeVerifier: string,
    redirectUri: string,
  ): Promise<AuthTokens>;

  /**
   * Fetches the list of enabled social/enterprise connections from Auth0.
   * Used to render social login buttons dynamically (no hard-coded list).
   */
  fetchSocialConnections(): Promise<SocialConnection[]>;

  /** Returns the authenticated user's profile. */
  me(): Promise<User>;

  /** Persists per-user settings server-side and returns the updated user. */
  updateSettings(payload: UpdateSettingsPayload): Promise<User>;
}
