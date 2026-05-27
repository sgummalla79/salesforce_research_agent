import type { SocialConnection } from '@/domain/types/auth.types';
import { cn } from '@/lib/utils';

interface Props {
  connection: SocialConnection;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}

/**
 * Renders a single social login button for a given Auth0 connection.
 * Displays the connection's display name and a spinner when loading.
 * Colors are entirely token-driven — no inline styles.
 */
export function SocialLoginButton({ connection, loading, disabled, onClick }: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={`Sign in with ${connection.displayName}`}
      aria-busy={loading}
      className={cn(
        'flex items-center justify-center gap-2 w-full h-9 rounded-md border border-border bg-transparent',
        'text-sm font-medium text-foreground transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        'disabled:pointer-events-none disabled:opacity-50',
      )}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="h-3.5 w-3.5 rounded-full border-2 border-muted border-t-foreground animate-spin"
        />
      ) : null}
      Sign in with {connection.displayName}
    </button>
  );
}
