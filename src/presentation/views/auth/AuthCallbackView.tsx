import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { useAuthStore } from '@/presentation/store/authStore';
import { useServices } from '@/presentation/providers/ServiceContext';
import { ROUTES } from '@/constants/routes';
import { logger } from '@/infrastructure/logging/logger';

/**
 * Handles the Auth0 deep-link callback after social login.
 *
 * Flow:
 *   1. User clicks social login → system browser opens Auth0 /authorize.
 *   2. Auth0 redirects to pragna://auth/callback?code=…&state=…
 *   3. OS delivers the deep-link URL to Tauri via plugin-deep-link.
 *   4. This view listens for the `deep-link://new-url` event, extracts
 *      the code, validates the PKCE state (in-memory), and exchanges
 *      the code for tokens.
 *   5. On success: navigates to /settings.
 *   6. On failure: navigates back to /login.
 *
 * The `handled` ref prevents double-processing if the event fires twice.
 */
export default function AuthCallbackView() {
  const navigate       = useNavigate();
  const setUser        = useAuthStore((s) => s.setUser);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const { authService } = useServices();
  const handled = useRef(false);

  useEffect(() => {
    // Also handle the case where the app was opened via deep-link directly
    // (the URL is available synchronously via window.location.hash in hash-router mode).
    const hashQuery = window.location.hash.split('?')[1];
    if (hashQuery) {
      processCallbackUrl(`pragna://auth/callback?${hashQuery}`);
    }

    // Listen for deep-link events (covers the already-running-app case)
    const unlisten = onOpenUrl((urls) => {
      const url = urls[0];
      if (url && !handled.current) {
        processCallbackUrl(url);
      }
    });

    return () => {
      void unlisten.then((fn) => fn());
    };
  // NOTE: stable refs — effect intentionally runs once
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function processCallbackUrl(rawUrl: string): void {
    if (handled.current) return;
    handled.current = true;

    let params: URLSearchParams;
    try {
      // Deep-link URL: pragna://auth/callback?code=…&state=…
      const url = new URL(rawUrl);
      params = url.searchParams;
    } catch {
      logger.warn('auth:callback:invalid-url', { url: rawUrl });
      navigate(ROUTES.LOGIN, { replace: true });
      return;
    }

    const code             = params.get('code');
    const state            = params.get('state');
    const error            = params.get('error');
    const errorDescription = params.get('error_description');

    if (error) {
      logger.warn('auth:callback:provider-error', { error, errorDescription: errorDescription ?? '' });
      navigate(`${ROUTES.LOGIN}?error=${encodeURIComponent(errorDescription ?? error)}`, { replace: true });
      return;
    }

    if (!code) {
      logger.warn('auth:callback:no-code');
      navigate(ROUTES.LOGIN, { replace: true });
      return;
    }

    // Recover in-memory PKCE state (set before shell.open was called)
    // Auth0Repository exposes getPkceState() for this purpose
    // TODO: wire this via authService once AuthService exposes getPkceState
    const storedState  = sessionStorage.getItem('pkce_state_temp');
    const codeVerifier = sessionStorage.getItem('pkce_verifier_temp');
    sessionStorage.removeItem('pkce_state_temp');
    sessionStorage.removeItem('pkce_verifier_temp');

    if (!codeVerifier || storedState !== state) {
      logger.warn('auth:callback:state-mismatch');
      navigate(ROUTES.LOGIN, { replace: true });
      return;
    }

    authService
      .completeOAuthLogin(code, codeVerifier, 'pragna://auth/callback')
      .then(({ user, tokens }) => {
        setAccessToken(tokens.accessToken);
        setUser(user);
        logger.info('auth:callback:success', { userId: user.id });
        navigate(ROUTES.SETTINGS, { replace: true });
      })
      .catch((err: unknown) => {
        logger.fromError('auth:callback:exchange-failed', err);
        navigate(ROUTES.LOGIN, { replace: true });
      });
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex items-center gap-3 text-muted-foreground">
        <span
          className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-[var(--color-primary)]"
          aria-hidden="true"
        />
        <span className="text-sm">Completing sign-in…</span>
      </div>
    </div>
  );
}
