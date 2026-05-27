import { open } from '@tauri-apps/plugin-shell';
import type { AxiosInstance } from 'axios';
import type { IAuthRepository } from '@/application/ports/IAuthRepository';
import type {
  AuthTokens,
  LoginPayload,
  RegisterPayload,
  SocialConnection,
  UpdateSettingsPayload,
  User,
} from '@/domain/types/auth.types';
import { userFromIdToken } from '@/domain/utils/parseJwt';
import { PragnaError } from '@/domain/errors/PragnaError';
import { ERRORS } from '@/constants/errors';
import {
  AUTH0_AUDIENCE,
  AUTH0_CLIENT_ID,
  AUTH0_DB_CONNECTION,
  AUTH0_DEEPLINK_CALLBACK,
  AUTH0_DOMAIN,
  AUTH0_SCOPE,
  SOCIAL_DISPLAY_NAMES,
  SOCIAL_STRATEGIES,
} from '@/constants/auth0';
import { generateCodeChallenge, generateCodeVerifier } from './auth0Pkce';
import { logger } from '@/infrastructure/logging/logger';
import type { ITokenStorage } from '@/infrastructure/storage/ITokenStorage';

/** In-memory PKCE state — never persisted (same-process deep-link callback). */
const pkceState: { verifier: string | null; state: string | null } = {
  verifier: null,
  state:    null,
};

interface Auth0TokenResponse {
  access_token: string;
  id_token?: string;
}

interface Auth0SocialConfig {
  strategies?: Array<{ name: string; connections: Array<{ name: string }> }>;
  connections?: Array<{ name: string; strategy?: string }>;
}

/**
 * Auth0 implementation of IAuthRepository.
 *
 * Key Tauri adaptations vs. the original SPA:
 *   - Social login: `window.location.href` replaced with `shell.open()` —
 *     opens the system browser instead of navigating the WebView.
 *   - Deeplink callback: Auth0 redirects to `pragna://auth/callback`;
 *     the OS delivers this to Tauri which emits a `deep-link://new-url` event.
 *     AuthCallbackView listens for that event and calls `completeOAuthCallback`.
 *   - Social connections discovery: JSONP replaced with a direct fetch to
 *     the Auth0 public client config endpoint (supports CORS).
 *   - PKCE state: in-memory only (no sessionStorage).
 */
export class Auth0Repository implements IAuthRepository {
  private readonly domain   = AUTH0_DOMAIN;
  private readonly clientId = AUTH0_CLIENT_ID;
  private readonly audience = AUTH0_AUDIENCE;
  private readonly dbConn   = AUTH0_DB_CONNECTION;

  constructor(
    private readonly http: AxiosInstance,
    private readonly tokenStorage: ITokenStorage,
  ) {}

  // ── Register ──────────────────────────────────────────────────────────────

  async register(payload: RegisterPayload): Promise<User> {
    logger.debug('auth0:register', { email: payload.email });
    const res = await fetch(`https://${this.domain}/dbconnections/signup`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        client_id:  this.clientId,
        connection: this.dbConn,
        email:      payload.email,
        password:   payload.password,
        ...(payload.name ? { given_name: payload.name } : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { description?: string };
      throw new Error(body.description ?? 'Registration failed');
    }

    return {
      id:               '',
      email:            payload.email,
      name:             payload.name ?? null,
      identityProvider: 'auth0',
      settings:         {},
    };
  }

  // ── Email / Password (ROPG) ───────────────────────────────────────────────

  async login(payload: LoginPayload): Promise<AuthTokens> {
    logger.debug('auth0:login:ropg', { email: payload.email });
    const res = await fetch(`https://${this.domain}/oauth/token`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        grant_type: 'password',
        client_id:  this.clientId,
        username:   payload.email,
        password:   payload.password,
        audience:   this.audience,
        scope:      AUTH0_SCOPE,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error_description?: string };
      throw new Error(body.error_description ?? 'Login failed');
    }

    const data = await res.json() as Auth0TokenResponse;
    return { accessToken: data.access_token, idToken: data.id_token };
  }

  // ── Social login — system browser + deep-link ─────────────────────────────

  initiateSocialLogin(connection: string): void {
    // Generate PKCE pair and hold in memory — callback is same-process
    const codeVerifier = generateCodeVerifier();
    const state        = crypto.randomUUID();
    pkceState.verifier = codeVerifier;
    pkceState.state    = state;

    logger.debug('auth0:social:initiate', { connection });

    void generateCodeChallenge(codeVerifier).then((codeChallenge) => {
      const params = new URLSearchParams({
        response_type:         'code',
        client_id:             this.clientId,
        connection,
        redirect_uri:          AUTH0_DEEPLINK_CALLBACK,
        scope:                 AUTH0_SCOPE,
        audience:              this.audience,
        state,
        code_challenge:        codeChallenge,
        code_challenge_method: 'S256',
      });
      // NOTE: shell.open() opens the URL in the OS default browser —
      // the WebView is NOT navigated. Auth0 redirects back via the
      // pragna:// deep-link which Tauri intercepts.
      void open(`https://${this.domain}/authorize?${params.toString()}`);
    });
  }

  /**
   * Exposes the in-memory PKCE state so AuthCallbackView can validate
   * the state param and retrieve the verifier without any storage read.
   */
  getPkceState(): { verifier: string | null; state: string | null } {
    return { ...pkceState };
  }

  /** Clears PKCE state after use (or on error). */
  clearPkceState(): void {
    pkceState.verifier = null;
    pkceState.state    = null;
  }

  // ── OAuth callback — exchange code for tokens ─────────────────────────────

  async completeOAuthCallback(
    code: string,
    codeVerifier: string,
    redirectUri: string,
  ): Promise<AuthTokens> {
    logger.debug('auth0:oauth:exchange');
    const res = await fetch(`https://${this.domain}/oauth/token`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        grant_type:    'authorization_code',
        client_id:     this.clientId,
        code,
        code_verifier: codeVerifier,
        redirect_uri:  redirectUri,
      }),
    });

    if (!res.ok) throw new PragnaError(ERRORS.AUTH_010);
    const data = await res.json() as Auth0TokenResponse;
    return { accessToken: data.access_token, idToken: data.id_token };
  }

  // ── Social connections — direct fetch (replaces JSONP) ────────────────────
  // NOTE: The original SPA used JSONP via document.createElement('script').
  // Tauri's strict CSP blocks inline script injection. Auth0's public client
  // config endpoint supports CORS, so we use a direct fetch instead.

  async fetchSocialConnections(): Promise<SocialConnection[]> {
    logger.debug('auth0:connections:fetch');
    try {
      const res = await fetch(`https://${this.domain}/client/${this.clientId}.js`);
      if (!res.ok) return [];
      const text = await res.text();
      // Auth0 returns: Auth0.setClient({...})
      // Parse out the JSON argument safely without eval.
      const match = text.match(/Auth0\.setClient\(([\s\S]*?)\);?\s*$/);
      if (!match?.[1]) return [];
      const config = JSON.parse(match[1]) as Auth0SocialConfig;
      return this.parseSocialConnections(config);
    } catch (err) {
      logger.warn('auth0:connections:fetch-failed', { error: String(err) });
      return [];
    }
  }

  private parseSocialConnections(config: Auth0SocialConfig): SocialConnection[] {
    if (config.strategies?.length) {
      return config.strategies
        .filter((s) => SOCIAL_STRATEGIES.has(s.name))
        .flatMap((s) =>
          s.connections.map((c) => ({
            name:        c.name,
            strategy:    s.name,
            displayName: SOCIAL_DISPLAY_NAMES[s.name] ?? s.name,
          })),
        );
    }
    if (config.connections?.length) {
      return config.connections
        .filter((c) => SOCIAL_STRATEGIES.has(c.strategy ?? c.name))
        .map((c) => {
          const strategy = c.strategy ?? c.name;
          return { name: c.name, strategy, displayName: SOCIAL_DISPLAY_NAMES[strategy] ?? strategy };
        });
    }
    return [];
  }

  // ── User profile ──────────────────────────────────────────────────────────

  async me(): Promise<User> {
    const idToken = this.tokenStorage.getIdToken();
    if (idToken) {
      const user = userFromIdToken(idToken);
      if (user) return user;
    }
    const accessToken = this.tokenStorage.getAccessToken();
    if (!accessToken) throw new PragnaError(ERRORS.AUTH_001);
    return this.fetchUserInfo(accessToken);
  }

  private async fetchUserInfo(accessToken: string): Promise<User> {
    const res = await fetch(`https://${this.domain}/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new PragnaError(ERRORS.AUTH_001);
    const d = await res.json() as Record<string, unknown>;
    const sub = (d.sub as string) ?? '';
    return {
      id:               sub,
      email:            (d.email as string | undefined) ?? '',
      name:             (d.name as string | undefined) ?? (d.nickname as string | undefined) ?? null,
      identityProvider: sub.split('|')[0],
      settings:         {},
    };
  }

  async updateSettings(payload: UpdateSettingsPayload): Promise<User> {
    await this.http.patch('/api/auth/me/settings', { settings: payload.settings });
    return this.me();
  }
}
