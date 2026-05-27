import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/presentation/store/authStore';
import { ROUTES } from '@/constants/routes';

/**
 * Renders children only when the user is NOT authenticated.
 * Redirects authenticated users to /settings (the post-login landing page).
 */
export function GuestOnlyRoute({ children }: { children: ReactNode }) {
  const bootstrapped    = useAuthStore((s) => s.bootstrapped);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!bootstrapped) return null;
  if (isAuthenticated) return <Navigate to={ROUTES.SETTINGS} replace />;
  return <>{children}</>;
}
