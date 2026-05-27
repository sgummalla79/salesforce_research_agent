import { describe, it, expect } from 'vitest';
import { PragnaError, isPragnaError } from './PragnaError';
import { ERRORS } from '@/constants/errors';

describe('PragnaError', () => {
  it('stores code, message, and severity from the catalog entry', () => {
    // Arrange + Act
    const err = new PragnaError(ERRORS.AUTH_007);

    // Assert
    expect(err.code).toBe('AUTH_007');
    expect(err.message).toBe(ERRORS.AUTH_007.message);
    expect(err.severity).toBe('warn');
    expect(err.name).toBe('PragnaError');
  });

  it('attaches a cause when provided', () => {
    // Arrange
    const cause = new Error('network failure');

    // Act
    const err = new PragnaError(ERRORS.NET_500, cause);

    // Assert
    expect(err.cause).toBe(cause);
  });

  it('toLogString formats as [CODE] message', () => {
    // Arrange + Act
    const str = new PragnaError(ERRORS.AUTH_001).toLogString();

    // Assert
    expect(str).toBe('[AUTH_001] No active session. Please sign in.');
  });
});

describe('isPragnaError', () => {
  it('returns true for a PragnaError instance', () => {
    expect(isPragnaError(new PragnaError(ERRORS.AUTH_001))).toBe(true);
  });

  it('returns false for a plain Error', () => {
    expect(isPragnaError(new Error('nope'))).toBe(false);
  });

  it('returns false for non-error values', () => {
    expect(isPragnaError('string')).toBe(false);
    expect(isPragnaError(null)).toBe(false);
  });
});
