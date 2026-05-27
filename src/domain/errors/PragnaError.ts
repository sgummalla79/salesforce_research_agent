import type { ErrorEntry } from '@/constants/errors';

/**
 * Application-level error that carries a catalog code.
 *
 * Every thrown error in the application should either be a PragnaError
 * or be caught and wrapped in one. The code appears in every log line,
 * making errors grep-able across environments and Loki queries.
 *
 * @example
 *   throw new PragnaError(ERRORS.AUTH_003);
 *   throw new PragnaError(ERRORS.AUTH_007, caughtError);
 */
export class PragnaError extends Error {
  readonly code: string;
  readonly severity: string;

  constructor(entry: ErrorEntry, cause?: unknown) {
    super(entry.message);
    this.name = 'PragnaError';
    this.code = entry.code;
    this.severity = entry.severity;
    if (cause !== undefined) this.cause = cause;
  }

  /** Returns a formatted string suitable for log messages: "[AUTH_003] Session refresh failed." */
  toLogString(): string {
    return `[${this.code}] ${this.message}`;
  }
}

/** Type guard — narrows an unknown catch value to PragnaError. */
export function isPragnaError(err: unknown): err is PragnaError {
  return err instanceof PragnaError;
}
