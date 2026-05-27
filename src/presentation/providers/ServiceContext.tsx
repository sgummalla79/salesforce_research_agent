import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { AuthService } from '@/application/services/AuthService';

/** All services available via context. Extend this interface as new features are built. */
export interface Services {
  authService: AuthService;
}

const ServiceContext = createContext<Services | null>(null);

interface ServiceProviderProps {
  children: ReactNode;
  authService: AuthService;
}

/**
 * Makes all composed application services available to the component tree.
 *
 * This is a thin provider — it does NOT instantiate anything.
 * All concrete wiring happens in main.tsx (the composition root).
 * Components and hooks depend only on the Services interface (DIP).
 */
export function ServiceProvider({ children, authService }: ServiceProviderProps) {
  const services = useMemo<Services>(() => ({ authService }), [authService]);
  return <ServiceContext.Provider value={services}>{children}</ServiceContext.Provider>;
}

/**
 * Returns all application services from context.
 * Throws a clear error when called outside of ServiceProvider.
 */
export function useServices(): Services {
  const ctx = useContext(ServiceContext);
  if (!ctx) throw new Error('useServices must be used inside ServiceProvider');
  return ctx;
}
