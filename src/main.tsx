import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';
import { tauriTokenStorage } from '@/infrastructure/storage/TauriTokenStorage';
import { Auth0Repository } from '@/infrastructure/auth0/Auth0Repository';
import { AuthService } from '@/application/services/AuthService';
import { createAxiosClient } from '@/infrastructure/http/axiosClient';
import { useAuthStore } from '@/presentation/store/authStore';
import { logger } from '@/infrastructure/logging/logger';

/**
 * Composition root — the only place where concrete implementations are wired together.
 *
 * Order:
 *   1. Initialize TauriTokenStorage (async — reads stored tokens into memory cache).
 *   2. Build the axios client (needs the token getter).
 *   3. Build Auth0Repository and AuthService.
 *   4. Render the app.
 */
async function boot(): Promise<void> {
  logger.info('app:boot:start');

  await tauriTokenStorage.initialize();

  const axiosClient = createAxiosClient(
    () => tauriTokenStorage.getAccessToken(),
    () => useAuthStore.getState().reset(),
  );

  const authRepository = new Auth0Repository(axiosClient, tauriTokenStorage);
  const authService    = new AuthService(authRepository, tauriTokenStorage);

  logger.info('app:boot:render');

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App authService={authService} />
    </React.StrictMode>,
  );
}

void boot();
