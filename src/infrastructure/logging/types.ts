/** Severity levels — map to Grafana Loki severity label conventions. */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** A single structured log entry. */
export interface LogEntry {
  level: LogLevel;
  event: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: string;
}

/**
 * Contract for log transport implementations.
 * Any sink (console, Loki, file) must implement this.
 */
export interface ILogTransport {
  send(entry: LogEntry): void;
}
