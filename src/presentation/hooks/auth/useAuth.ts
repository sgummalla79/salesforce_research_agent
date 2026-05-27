import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/presentation/store/authStore';
import { useServices } from '@/presentation/providers/ServiceContext';
import { ROUTES } from '@/constants/routes';
import { logger } from '@/infrastructure/logging/logger';
import type { LoginPayload } from '@/domain/types/auth.types';

/**
 * Provides login, logout, and social login actions to UI components.
 *
 * All auth state reads (user, isAuthenticated) come from useAuthStore directly.
 * This hook only exposes actions.
 */
export function useAuth() {
  const navigate = useNavigate();
  const { authService } = useServices();
  const setUser        = useAuthStore((s) => s.setUser);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const reset          = useAuthStore((s) => s.reset);

  const login = useCallback(async (payload: LoginPayload): Promise<void> => {
    const { user, tokens } = await authService.login(payload);
    setAccessToken(tokens.accessToken);
    setUser(user);
    navigate(ROUTES.SETTINGS, { replace: true });
  }, [authService, setUser, setAccessToken, navigate]);

  const logout = useCallback((): void => {
    authService.logout();
    reset();
    navigate(ROUTES.LOGIN, { replace: true });
    logger.info('auth:logout:complete');
  }, [authService, reset, navigate]);

  const initiateSocialLogin = useCallback((connection: string): void => {
    authService.initiateSocialLogin(connection);
  }, [authService]);

  return { login, logout, initiateSocialLogin };
}
