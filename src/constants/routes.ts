/**
 * Centralised route path constants.
 *
 * All navigation targets reference these — no magic strings elsewhere.
 * Hash-router strips the leading # so these are plain path strings.
 */
export const ROUTES = {
  LOGIN:         '/login',
  REGISTER:      '/register',
  AUTH_CALLBACK: '/auth-callback',
  CHAT:          '/chat',
  SETTINGS:                  '/settings',
  SETTINGS_APPEARANCE:       '/settings/appearance',
  SETTINGS_PROVIDERS:        '/settings/providers',
  SETTINGS_AGENTS:           '/settings/agents',
  SETTINGS_AGENT_EDITOR_NEW: '/settings/agents/new',
  SETTINGS_AGENT_EDITOR:     '/settings/agents/:agentId/edit',
  SETTINGS_FLOWS:            '/settings/flows',
  SETTINGS_FLOW_EDITOR_NEW:  '/settings/flows/new',
  SETTINGS_FLOW_EDITOR:      '/settings/flows/:flowId/edit',
  SETTINGS_MCP_SERVERS:      '/settings/mcp-servers',
  SETTINGS_PROFILE:          '/settings/profile',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
