import { ConsoleTransport } from './consoleTransport';
import { LokiTransport } from './lokiTransport';
import type { ILogTransport, LogLevel } from './types';

/**
 * Structured application logger.
 *
 * Singleton — import `logger` and call logger.info/warn/error/debug.
 * Never use console.log directly in application code.
 *
 * Sinks:
 *   - ConsoleTransport: always active.
 *   - LokiTransport: active when VITE_LOKI_URL is set in env.
 *
 * Switching sinks requires only env var changes — no code changes.
 */
class Logger {
  private readonly transports: ILogTransport[];

  constructor() {
    this.transports = [new ConsoleTransport()];

    const lokiUrl = import.meta.env.VITE_LOKI_URL as string | undefined;
    if (lokiUrl) {
      this.transports.push(new LokiTransport({
        url:        lokiUrl,
        authToken:  import.meta.env.VITE_LOKI_AUTH_TOKEN as string | undefined,
        appLabel:   (import.meta.env.VITE_LOKI_APP_LABEL as string | undefined) ?? 'pragna-desktop',
      }));
    }
  }

  /**
   * Logs a debug-level event. Use for development tracing and
   * detailed HTTP request/response logging.
   */
  debug(event: string, context?: Record<string, unknown>): void {
    this.log('debug', event, context);
  }

  /**
   * Logs an info-level lifecycle event (login, logout, navigation, feature toggled).
   */
  info(event: string, context?: Record<string, unknown>): void {
    this.log('info', event, context);
  }

  /**
   * Logs a recoverable issue — something unexpected happened but the app
   * can continue (e.g. session bootstrap failed, social connection load failed).
   */
  warn(event: string, context?: Record<string, unknown>): void {
    this.log('warn', event, context);
  }

  /**
   * Logs an unrecoverable or user-visible error.
   * Always include the error object in context when available.
   */
  error(event: string, context?: Record<string, unknown>): void {
    this.log('error', event, context);
  }

  /**
   * Convenience method — extracts message + stack from a caught error and logs at error level.
   * @example logger.fromError('auth:token-exchange', err);
   */
  fromError(event: string, err: unknown, extra?: Record<string, unknown>): void {
    const message = err instanceof Error ? err.message : String(err);
    const stack   = err instanceof Error ? err.stack   : undefined;
    this.log('error', event, { ...extra, error: message, stack });
  }

  private log(level: LogLevel, event: string, context?: Record<string, unknown>): void {
    const entry = {
      level,
      event,
      timestamp: new Date().toISOString(),
      ...(context ? { context } : {}),
    };
    for (const transport of this.transports) {
      transport.send(entry);
    }
  }
}

/** Application-wide logger instance. */
export const logger = new Logger();
