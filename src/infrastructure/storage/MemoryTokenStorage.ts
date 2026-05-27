import type { ITokenStorage } from './ITokenStorage';

/**
 * In-memory ITokenStorage implementation for use in unit tests.
 *
 * No Tauri runtime required — drop-in replacement for TauriTokenStorage.
 * Use this in all test fixtures to keep tests hermetic.
 */
export class MemoryTokenStorage implements ITokenStorage {
  private store: Record<string, string | null> = {
    accessToken: null,
    idToken:     null,
  };

  getAccessToken(): string | null  { return this.store.accessToken ?? null; }
  setAccessToken(t: string): void  { this.store.accessToken = t; }
  clearAccessToken(): void         { this.store.accessToken = null; }

  getIdToken(): string | null      { return this.store.idToken ?? null; }
  setIdToken(t: string): void      { this.store.idToken = t; }
  clearIdToken(): void             { this.store.idToken = null; }

  clearAll(): void {
    this.store.accessToken = null;
    this.store.idToken     = null;
  }
}
