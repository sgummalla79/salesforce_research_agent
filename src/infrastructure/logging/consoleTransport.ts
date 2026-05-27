import type { ILogTransport, LogEntry, LogLevel } from './types';

/** Maps log levels to console methods. */
const CONSOLE_MAP: Record<LogLevel, (...args: unknown[]) => void> = {
  debug: console.debug,
  info:  console.info,
  warn:  console.warn,
  error: console.error,
};

/**
 * Transport that writes structured log entries to the browser/WebView console.
 * Always active — other transports are additive.
 */
export class ConsoleTransport implements ILogTransport {
  send(entry: LogEntry): void {
    const fn = CONSOLE_MAP[entry.level];
    if (entry.context || entry.error) {
      fn(`[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.event}`, entry.context ?? {}, entry.error ?? '');
    } else {
      fn(`[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.event}`);
    }
  }
}
