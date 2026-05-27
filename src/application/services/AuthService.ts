import type { IAuthRepository } from '@/application/ports/IAuthRepository';
import type {
  AuthTokens,
  LoginPayload,
  RegisterPayload,
  SocialConnection,
  UpdateSettingsPayload,
  User,
} from '@/domain/types/auth.types';
import type { ITokenStorage } from '@/infrastructure/storage/ITokenStorage';
import { logger } from '@/infrastructure/logging/logger';

/**
 * Orchestrates all authentication use-cases.
 *
 * Depends on IAuthRepository and ITokenStorage interfaces only — never on
 * concrete implementations (SOLID DIP). Both are injected via the constructor
 * and provided by ServiceContext at the composition root.
 */
export class AuthService {
  constructor(
    private readonly authRepository: IAuthRepository,
    private readonly tokenStorage: ITokenStorage,
  ) {}

  /** Registers a new account. Does not automatically log the user in. */
  async register(payload: RegisterPayload): Promise<User> {
    logger.info('auth:register:start', { email: payload.email });
    const user = await this.authRepository.register(payload);
    logger.info('auth:register:success', { userId: user.id });
    return user;
  }

  /** Authenticates with email + password, stores tokens, and fetches the user profile. */
  async login(payload: LoginPayload): Promise<{ user: User; tokens: AuthTokens }> {
    logger.info('auth:login:start', { email: payload.email });
    const tokens = await this.authRepository.login(payload);
    this.storeTokens(tokens);
    const user = await this.authRepository.me();
    logger.info('auth:login:success', { userId: user.id, provider: user.identityProvider });
    return { user, tokens };
  }

  /**
   * Opens the system browser to Auth0's /authorize endpoint.
   * Execution continues in AuthCallbackView after the deep-link fires.
   */
  initiateSocialLogin(connection: string): void {
    logger.info('auth:social:initiate', { connection });
    this.authRepository.initiateSocialLogin(connection);
  }

  /**
   * Completes the PKCE code exchange after the deep-link callback delivers `code`.
   * Stores tokens and returns the authenticated user.
   */
  async completeOAuthLogin(
    code: string,
    codeVerifier: string,
    redirectUri: string,
  ): Promise<{ user: User; tokens: AuthTokens }> {
    logger.info('auth:social:exchange-start');
    const tokens = await this.authRepository.completeOAuthCallback(code, codeVerifier, redirectUri);
    this.storeTokens(tokens);
    const user = await this.authRepository.me();
    logger.info('auth:social:exchange-success', { userId: user.id, provider: user.identityProvider });
    return { user, tokens };
  }

  /**
   * Restores a previously authenticated session from stored tokens on app start.
   * No Auth0 network call — the access token in storage is the source of truth.
   *
   * @returns The user + access token if a valid session exists, or null.
   */
  async bootstrap(): Promise<{ user: User; accessToken: string } | null> {
    const accessToken = this.tokenStorage.getAccessToken();
    if (!accessToken) {
      logger.debug('auth:bootstrap:no-token');
      return null;
    }
    try {
      const user = await this.authRepository.me();
      logger.info('auth:bootstrap:restored', { userId: user.id });
      return { user, accessToken };
    } catch (err) {
      logger.warn('auth:bootstrap:failed', { error: String(err) });
      this.tokenStorage.clearAll();
      return null;
    }
  }

  /** Fetches the configured social/enterprise connections to render login buttons. */
  async fetchSocialConnections(): Promise<SocialConnection[]> {
    return this.authRepository.fetchSocialConnections();
  }

  /** Returns the current user's profile from Auth0. */
  async me(): Promise<User> {
    return this.authRepository.me();
  }

  /** Persists per-user settings and returns the updated user. */
  async updateSettings(payload: UpdateSettingsPayload): Promise<User> {
    return this.authRepository.updateSettings(payload);
  }

  /** Clears all stored tokens, effectively ending the local session. */
  logout(): void {
    logger.info('auth:logout');
    this.tokenStorage.clearAll();
  }

  private storeTokens(tokens: AuthTokens): void {
    this.tokenStorage.setAccessToken(tokens.accessToken);
    if (tokens.idToken) this.tokenStorage.setIdToken(tokens.idToken);
  }
}
