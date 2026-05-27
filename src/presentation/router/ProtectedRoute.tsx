import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/presentation/store/authStore';
import { ROUTES } from '@/constants/routes';

/**
 * Renders children only when the user is authenticated.
 * Redirects to /login while bootstrap is in progress (shows nothing) or
 * after it completes with no session.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const bootstrapped    = useAuthStore((s) => s.bootstrapped);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!bootstrapped) return null; // Blank screen during initial session check
  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />;
  return <>{children}</>;
}
