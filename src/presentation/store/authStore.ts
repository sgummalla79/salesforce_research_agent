import { create } from 'zustand';
import type { User } from '@/domain/types/auth.types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  /** True once the bootstrap check has completed (success or failure). */
  bootstrapped: boolean;
  isAuthenticated: boolean;

  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  setBootstrapped: (value: boolean) => void;
  reset: () => void;
}

/**
 * Global authentication state store.
 *
 * Holds in-memory auth state only — tokens are NOT stored here;
 * they live in TauriTokenStorage. This store is for derived UI state.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user:            null,
  accessToken:     null,
  bootstrapped:    false,
  isAuthenticated: false,

  setUser:         (user)         => set({ user, isAuthenticated: user !== null }),
  setAccessToken:  (accessToken)  => set({ accessToken }),
  setBootstrapped: (bootstrapped) => set({ bootstrapped }),
  reset:           ()             => set({ user: null, accessToken: null, bootstrapped: true, isAuthenticated: false }),
}));
