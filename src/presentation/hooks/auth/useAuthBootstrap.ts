import { useEffect } from 'react';
import { useAuthStore } from '@/presentation/store/authStore';
import { useServices } from '@/presentation/providers/ServiceContext';
import { logger } from '@/infrastructure/logging/logger';

/**
 * Runs the auth bootstrap check on app startup.
 *
 * Reads the stored access token (from TauriTokenStorage), calls /userinfo,
 * and populates the auth store. Sets `bootstrapped = true` when done so
 * ProtectedRoute and GuestOnlyRoute know the check is complete.
 *
 * Must be called exactly once — in the root App component.
 */
export function useAuthBootstrap(): void {
  const { authService } = useServices();
  const setUser        = useAuthStore((s) => s.setUser);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setBootstrapped = useAuthStore((s) => s.setBootstrapped);

  useEffect(() => {
    void (async () => {
      logger.debug('auth:bootstrap:start');
      const result = await authService.bootstrap();
      if (result) {
        setAccessToken(result.accessToken);
        setUser(result.user);
      }
      setBootstrapped(true);
    })();
  // NOTE: Run once on mount only — deps are stable store actions
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
