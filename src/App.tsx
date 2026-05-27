import { HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ServiceProvider } from '@/presentation/providers/ServiceContext';
import { AppRoutes } from '@/presentation/router';
import { useAuthBootstrap } from '@/presentation/hooks/auth/useAuthBootstrap';
import type { AuthService } from '@/application/services/AuthService';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

/**
 * Root component — wires the bootstrap hook and renders the route tree.
 * Separated from main.tsx so it can be rendered inside ServiceProvider.
 */
function AppInner() {
  useAuthBootstrap();
  return <AppRoutes />;
}

interface AppProps {
  authService: AuthService;
}

/**
 * Application root.
 *
 * Provides:
 *   - HashRouter (required for Tauri's tauri:// protocol)
 *   - QueryClientProvider (TanStack Query)
 *   - ServiceProvider (all application services)
 */
export function App({ authService }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ServiceProvider authService={authService}>
        <HashRouter>
          <AppInner />
        </HashRouter>
      </ServiceProvider>
    </QueryClientProvider>
  );
}
