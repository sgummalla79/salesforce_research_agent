import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryTokenStorage } from './MemoryTokenStorage';

describe('MemoryTokenStorage', () => {
  let storage: MemoryTokenStorage;

  beforeEach(() => {
    // Arrange — fresh instance for each test
    storage = new MemoryTokenStorage();
  });

  it('returns null before any token is set', () => {
    // Act + Assert
    expect(storage.getAccessToken()).toBeNull();
    expect(storage.getIdToken()).toBeNull();
  });

  it('stores and retrieves the access token', () => {
    // Arrange + Act
    storage.setAccessToken('access-abc');

    // Assert
    expect(storage.getAccessToken()).toBe('access-abc');
  });

  it('stores and retrieves the ID token', () => {
    // Arrange + Act
    storage.setIdToken('id-xyz');

    // Assert
    expect(storage.getIdToken()).toBe('id-xyz');
  });

  it('clears the access token individually', () => {
    // Arrange
    storage.setAccessToken('access-abc');

    // Act
    storage.clearAccessToken();

    // Assert
    expect(storage.getAccessToken()).toBeNull();
    expect(storage.getIdToken()).toBeNull(); // unchanged
  });

  it('clears all tokens at once', () => {
    // Arrange
    storage.setAccessToken('access-abc');
    storage.setIdToken('id-xyz');

    // Act
    storage.clearAll();

    // Assert
    expect(storage.getAccessToken()).toBeNull();
    expect(storage.getIdToken()).toBeNull();
  });
});
