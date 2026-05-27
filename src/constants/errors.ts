/**
 * Centralised error catalog.
 *
 * Every user-facing error and every loggable error condition is defined here.
 * Use `code` for log correlation (grep-able across environments).
 * Use `message` for UI display.
 *
 * Prefixes:
 *   AUTH  – authentication / session
 *   PRV   – LLM provider management
 *   MDL   – model management
 *   FLW   – flow (pipeline) management
 *   CNV   – conversation / usage
 *   CHT   – chat interface
 *   NET   – network / HTTP layer
 */
export const ERRORS = {
  AUTH_001: { code: 'AUTH_001', message: 'No active session. Please sign in.',                       severity: 'warn'  },
  AUTH_002: { code: 'AUTH_002', message: 'Unable to read your profile from the sign-in token.',      severity: 'error' },
  AUTH_003: { code: 'AUTH_003', message: 'Session refresh failed. Please sign in again.',            severity: 'warn'  },
  AUTH_004: { code: 'AUTH_004', message: 'Deep-link callback was not received.',                     severity: 'warn'  },
  AUTH_005: { code: 'AUTH_005', message: 'Sign-in was cancelled.',                                   severity: 'info'  },
  AUTH_006: { code: 'AUTH_006', message: 'Social sign-in failed. Please try again.',                 severity: 'error' },
  AUTH_007: { code: 'AUTH_007', message: 'Invalid email or password.',                               severity: 'warn'  },
  AUTH_008: { code: 'AUTH_008', message: 'Registration failed. This email may already be in use.',   severity: 'warn'  },
  AUTH_009: { code: 'AUTH_009', message: 'Sign-in timed out. Please try again.',                     severity: 'warn'  },
  AUTH_010: { code: 'AUTH_010', message: 'Token exchange failed. Please try again.',                 severity: 'error' },

  PRV_001:  { code: 'PRV_001',  message: 'Failed to load providers.',                                severity: 'error' },
  MDL_001:  { code: 'MDL_001',  message: 'Failed to load models.',                                   severity: 'error' },
  FLW_001:  { code: 'FLW_001',  message: 'Failed to load flows.',                                    severity: 'error' },
  CNV_001:  { code: 'CNV_001',  message: 'Failed to load conversations.',                            severity: 'error' },
  CHT_001:  { code: 'CHT_001',  message: 'No LLM provider connected. Add a provider to start.',     severity: 'warn'  },

  NET_401:  { code: 'NET_401',  message: 'Your session has expired. Please sign in again.',          severity: 'warn'  },
  NET_403:  { code: 'NET_403',  message: 'You do not have permission to perform this action.',       severity: 'warn'  },
  NET_404:  { code: 'NET_404',  message: 'The requested resource was not found.',                    severity: 'warn'  },
  NET_500:  { code: 'NET_500',  message: 'A server error occurred. Please try again later.',         severity: 'error' },
} as const;

export type ErrorCode  = keyof typeof ERRORS;
export type ErrorEntry = (typeof ERRORS)[ErrorCode];
