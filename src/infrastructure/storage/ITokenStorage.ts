/**
 * Contract for token storage adapters.
 *
 * The Tauri implementation uses @tauri-apps/plugin-store (persistent, sandboxed).
 * A MemoryTokenStorage is used in tests.
 * No sessionStorage or localStorage — desktop apps have no meaningful "session" boundary.
 */
export interface ITokenStorage {
  getAccessToken(): string | null;
  setAccessToken(token: string): void;
  clearAccessToken(): void;

  getIdToken(): string | null;
  setIdToken(token: string): void;
  clearIdToken(): void;

  /** Clears all stored tokens (called on logout). */
  clearAll(): void;
}
