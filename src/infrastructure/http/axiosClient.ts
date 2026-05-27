import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '@/constants/api';
import { logger } from '@/infrastructure/logging/logger';

/**
 * Factory that creates a configured Axios instance.
 *
 * Interceptors:
 *   1. Auth — injects Bearer token from the token storage getter.
 *   2. Correlation ID — adds X-Correlation-ID to every request for log tracing.
 *   3. Request/response debug logging.
 *   4. 401 handler — calls the provided onUnauthorized callback (triggers logout).
 *
 * @param getAccessToken - Synchronous getter for the current access token.
 * @param onUnauthorized - Called when any response returns 401.
 */
export function createAxiosClient(
  getAccessToken: () => string | null,
  onUnauthorized: () => void,
): AxiosInstance {
  const client = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
  });

  // ── Request interceptor: auth + correlation ID + logging ──────────────────
  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const correlationId = crypto.randomUUID();
    config.headers['X-Correlation-ID'] = correlationId;

    logger.debug('http:request', {
      method:        config.method?.toUpperCase() ?? 'UNKNOWN',
      url:           config.url ?? '',
      correlationId,
    });

    return config;
  });

  // ── Response interceptor: logging + 401 handling ──────────────────────────
  client.interceptors.response.use(
    (response) => {
      logger.debug('http:response', {
        method:        response.config.method?.toUpperCase() ?? 'UNKNOWN',
        url:           response.config.url ?? '',
        status:        response.status,
        correlationId: response.config.headers['X-Correlation-ID'] as string,
      });
      return response;
    },
    (error: unknown) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        logger.warn('http:401-unauthorized', {
          url: error.config?.url ?? '',
        });
        onUnauthorized();
      }
      return Promise.reject(error);
    },
  );

  return client;
}
