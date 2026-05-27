import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { ProtectedRoute } from './ProtectedRoute';
import { GuestOnlyRoute } from './GuestOnlyRoute';

// ── Auth ─────────────────────────────────────────────────────────────────────
const LoginView        = lazy(() => import('@/presentation/views/auth/LoginView'));
const AuthCallbackView = lazy(() => import('@/presentation/views/auth/AuthCallbackView'));

// ── Placeholder stubs — replaced as features are built ───────────────────────
// TODO: replace with real views when Settings and Chat features are implemented
const SettingsPlaceholder = lazy(() =>
  Promise.resolve({ default: () => <div className="p-8 text-foreground">Settings — coming soon</div> }),
);
const ChatPlaceholder = lazy(() =>
  Promise.resolve({ default: () => <div className="p-8 text-foreground">Chat — coming soon</div> }),
);

/**
 * Application route table.
 *
 * Uses React Router v7 with createHashRouter (defined in main.tsx).
 * Hash router is required because Tauri serves the app via tauri://localhost
 * and browser-history navigation breaks on reload.
 */
export function AppRoutes() {
  return (
    <Suspense fallback={null}>
      <Routes>
        {/* ── Guest-only ── */}
        <Route
          path={ROUTES.LOGIN}
          element={<GuestOnlyRoute><LoginView /></GuestOnlyRoute>}
        />

        {/* ── OAuth deep-link callback (no auth guard) ── */}
        <Route path={ROUTES.AUTH_CALLBACK} element={<AuthCallbackView />} />

        {/* ── Protected ── */}
        <Route
          path={ROUTES.SETTINGS + '/*'}
          element={<ProtectedRoute><SettingsPlaceholder /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.CHAT + '/*'}
          element={<ProtectedRoute><ChatPlaceholder /></ProtectedRoute>}
        />

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
      </Routes>
    </Suspense>
  );
}
