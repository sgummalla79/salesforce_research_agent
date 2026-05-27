import type { ILogTransport, LogEntry } from './types';

/** Configuration for the Loki HTTP push transport. */
interface LokiConfig {
  /** Loki push API endpoint, e.g. http://localhost:3100 */
  url: string;
  /** Optional Bearer token for authenticated Loki instances. */
  authToken?: string;
  /** Label attached to every log stream (identifies the app in Grafana). */
  appLabel: string;
  /** Maximum entries to buffer before flushing. Default: 20 */
  batchSize?: number;
  /** Maximum milliseconds to hold entries before flushing. Default: 5000 */
  flushIntervalMs?: number;
}

/**
 * Transport that ships log entries to a Grafana Loki instance via HTTP push.
 *
 * Batches entries to reduce HTTP overhead. Falls back silently on network
 * errors — logging must never crash the application.
 *
 * Enabled only when VITE_LOKI_URL is set. If the env var is absent,
 * this transport is never instantiated (see logger.ts).
 */
export class LokiTransport implements ILogTransport {
  private readonly pushUrl: string;
  private readonly headers: Record<string, string>;
  private readonly appLabel: string;
  private readonly batchSize: number;
  private readonly flushIntervalMs: number;
  private buffer: LogEntry[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: LokiConfig) {
    this.pushUrl       = `${config.url}/loki/api/v1/push`;
    this.appLabel      = config.appLabel;
    this.batchSize     = config.batchSize     ?? 20;
    this.flushIntervalMs = config.flushIntervalMs ?? 5_000;

    this.headers = { 'Content-Type': 'application/json' };
    if (config.authToken) {
      this.headers['Authorization'] = `Bearer ${config.authToken}`;
    }
  }

  send(entry: LogEntry): void {
    this.buffer.push(entry);
    if (this.buffer.length >= this.batchSize) {
      this.flush();
    } else {
      this.scheduleFlush();
    }
  }

  private scheduleFlush(): void {
    if (this.flushTimer !== null) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flush();
    }, this.flushIntervalMs);
  }

  private flush(): void {
    if (this.buffer.length === 0) return;
    const entries = this.buffer.splice(0);
    void this.push(entries);
  }

  private async push(entries: LogEntry[]): Promise<void> {
    // Loki push API format: { streams: [{ stream: {labels}, values: [[ns_timestamp, line]] }] }
    const values = entries.map((e) => [
      String(new Date(e.timestamp).getTime() * 1_000_000), // nanosecond timestamp
      JSON.stringify(e),
    ]);

    const body = JSON.stringify({
      streams: [{
        stream: { app: this.appLabel, level: entries[0]?.level ?? 'info' },
        values,
      }],
    });

    try {
      await fetch(this.pushUrl, { method: 'POST', headers: this.headers, body });
    } catch {
      // NOTE: Silently swallow — a transport failure must not surface to the user.
    }
  }
}
