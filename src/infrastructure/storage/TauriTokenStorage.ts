import { Store } from '@tauri-apps/plugin-store';
import type { ITokenStorage } from './ITokenStorage';
import { logger } from '@/infrastructure/logging/logger';

const STORE_FILE = 'pragna-auth.dat';

const KEYS = {
  accessToken: 'pragna_at',
  idToken:     'pragna_idt',
} as const;

/**
 * Token storage backed by @tauri-apps/plugin-store.
 *
 * The store file is sandboxed to the app's data directory by Tauri.
 * Reads/writes are async but the public ITokenStorage interface uses
 * synchronous signatures — to bridge this, we keep an in-memory cache
 * that is populated eagerly at startup via `initialize()`.
 *
 * NOTE: Call `await tauriTokenStorage.initialize()` once during app boot
 * (in main.tsx) before any auth check runs. This is the only async touch-point.
 */
export class TauriTokenStorage implements ITokenStorage {
  private store: Store | null = null;
  private cache: Record<string, string | null> = {
    [KEYS.accessToken]: null,
    [KEYS.idToken]:     null,
  };

  /**
   * Opens the Tauri store and loads all cached values into memory.
   * Must be awaited before the app renders.
   */
  async initialize(): Promise<void> {
    try {
      this.store = await Store.load(STORE_FILE);
      this.cache[KEYS.accessToken] = (await this.store.get<string>(KEYS.accessToken)) ?? null;
      this.cache[KEYS.idToken]     = (await this.store.get<string>(KEYS.idToken))     ?? null;
      logger.debug('storage:token:initialized');
    } catch (err) {
      logger.warn('storage:token:init-failed', { error: String(err) });
    }
  }

  getAccessToken(): string | null {
    return this.cache[KEYS.accessToken] ?? null;
  }

  setAccessToken(token: string): void {
    this.cache[KEYS.accessToken] = token;
    void this.persist(KEYS.accessToken, token);
  }

  clearAccessToken(): void {
    this.cache[KEYS.accessToken] = null;
    void this.delete(KEYS.accessToken);
  }

  getIdToken(): string | null {
    return this.cache[KEYS.idToken] ?? null;
  }

  setIdToken(token: string): void {
    this.cache[KEYS.idToken] = token;
    void this.persist(KEYS.idToken, token);
  }

  clearIdToken(): void {
    this.cache[KEYS.idToken] = null;
    void this.delete(KEYS.idToken);
  }

  clearAll(): void {
    this.cache[KEYS.accessToken] = null;
    this.cache[KEYS.idToken]     = null;
    void this.delete(KEYS.accessToken);
    void this.delete(KEYS.idToken);
    logger.debug('storage:token:cleared');
  }

  private async persist(key: string, value: string): Promise<void> {
    try {
      await this.store?.set(key, value);
      await this.store?.save();
    } catch (err) {
      logger.warn('storage:token:write-failed', { key, error: String(err) });
    }
  }

  private async delete(key: string): Promise<void> {
    try {
      await this.store?.delete(key);
      await this.store?.save();
    } catch (err) {
      logger.warn('storage:token:delete-failed', { key, error: String(err) });
    }
  }
}

/** Singleton instance — imported by the composition root (main.tsx). */
export const tauriTokenStorage = new TauriTokenStorage();
