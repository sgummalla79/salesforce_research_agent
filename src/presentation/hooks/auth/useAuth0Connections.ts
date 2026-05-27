import { useQuery } from '@tanstack/react-query';
import { useServices } from '@/presentation/providers/ServiceContext';
import type { SocialConnection } from '@/domain/types/auth.types';

/**
 * Fetches the list of social/enterprise Auth0 connections configured for this tenant.
 * Used by LoginForm to render social login buttons dynamically.
 *
 * Returns an empty array on failure — a missing connection list should not
 * block the email/password login form from rendering.
 */
export function useAuth0Connections() {
  const { authService } = useServices();

  return useQuery<SocialConnection[]>({
    queryKey: ['auth0-connections'],
    queryFn:  () => authService.fetchSocialConnections(),
    staleTime: Infinity, // Connection list does not change at runtime
    retry: 1,
  });
}
