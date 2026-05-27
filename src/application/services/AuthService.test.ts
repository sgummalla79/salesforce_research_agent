import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './AuthService';
import { MemoryTokenStorage } from '@/infrastructure/storage/MemoryTokenStorage';
import type { IAuthRepository } from '@/application/ports/IAuthRepository';
import type { AuthTokens, User, SocialConnection } from '@/domain/types/auth.types';

/** Minimal User fixture. */
const mockUser: User = {
  id:               'auth0|test-user',
  email:            'test@example.com',
  name:             'Test User',
  identityProvider: 'auth0',
  settings:         {},
};

/** Minimal AuthTokens fixture. */
const mockTokens: AuthTokens = {
  accessToken: 'access-token-123',
  idToken:     'id-token-456',
};

/** Creates a mock IAuthRepository with all methods stubbed. */
function makeMockRepo(overrides: Partial<IAuthRepository> = {}): IAuthRepository {
  return {
    register:             vi.fn().mockResolvedValue(mockUser),
    login:                vi.fn().mockResolvedValue(mockTokens),
    initiateSocialLogin:  vi.fn(),
    completeOAuthCallback: vi.fn().mockResolvedValue(mockTokens),
    fetchSocialConnections: vi.fn().mockResolvedValue([]),
    me:                   vi.fn().mockResolvedValue(mockUser),
    updateSettings:       vi.fn().mockResolvedValue(mockUser),
    ...overrides,
  };
}

describe('AuthService.login', () => {
  let storage: MemoryTokenStorage;
  let repo: IAuthRepository;
  let service: AuthService;

  beforeEach(() => {
    storage = new MemoryTokenStorage();
    repo    = makeMockRepo();
    service = new AuthService(repo, storage);
  });

  it('calls the repository with the login payload', async () => {
    // Arrange
    const payload = { email: 'test@example.com', password: 'secret' };

    // Act
    await service.login(payload);

    // Assert
    expect(repo.login).toHaveBeenCalledWith(payload);
  });

  it('stores the access token in token storage', async () => {
    // Arrange + Act
    await service.login({ email: 'a@b.com', password: 'pw' });

    // Assert
    expect(storage.getAccessToken()).toBe('access-token-123');
  });

  it('stores the ID token when present', async () => {
    // Arrange + Act
    await service.login({ email: 'a@b.com', password: 'pw' });

    // Assert
    expect(storage.getIdToken()).toBe('id-token-456');
  });

  it('returns the user and tokens', async () => {
    // Arrange + Act
    const result = await service.login({ email: 'a@b.com', password: 'pw' });

    // Assert
    expect(result.user).toEqual(mockUser);
    expect(result.tokens.accessToken).toBe('access-token-123');
  });

  it('propagates repository errors', async () => {
    // Arrange
    vi.mocked(repo.login).mockRejectedValueOnce(new Error('Invalid credentials'));

    // Act + Assert
    await expect(service.login({ email: 'a@b.com', password: 'bad' })).rejects.toThrow('Invalid credentials');
  });
});

describe('AuthService.bootstrap', () => {
  let storage: MemoryTokenStorage;
  let repo: IAuthRepository;
  let service: AuthService;

  beforeEach(() => {
    storage = new MemoryTokenStorage();
    repo    = makeMockRepo();
    service = new AuthService(repo, storage);
  });

  it('returns null when no token is stored', async () => {
    // Arrange — storage is empty by default

    // Act
    const result = await service.bootstrap();

    // Assert
    expect(result).toBeNull();
    expect(repo.me).not.toHaveBeenCalled();
  });

  it('returns user and accessToken when a valid token exists', async () => {
    // Arrange
    storage.setAccessToken('existing-token');

    // Act
    const result = await service.bootstrap();

    // Assert
    expect(result?.user).toEqual(mockUser);
    expect(result?.accessToken).toBe('existing-token');
  });

  it('clears tokens and returns null when me() throws', async () => {
    // Arrange
    storage.setAccessToken('stale-token');
    vi.mocked(repo.me).mockRejectedValueOnce(new Error('Unauthorized'));

    // Act
    const result = await service.bootstrap();

    // Assert
    expect(result).toBeNull();
    expect(storage.getAccessToken()).toBeNull();
  });
});

describe('AuthService.logout', () => {
  it('clears all tokens from storage', () => {
    // Arrange
    const storage = new MemoryTokenStorage();
    storage.setAccessToken('token');
    storage.setIdToken('id-token');
    const service = new AuthService(makeMockRepo(), storage);

    // Act
    service.logout();

    // Assert
    expect(storage.getAccessToken()).toBeNull();
    expect(storage.getIdToken()).toBeNull();
  });
});

describe('AuthService.fetchSocialConnections', () => {
  it('delegates to the repository', async () => {
    // Arrange
    const connections: SocialConnection[] = [
      { name: 'google-oauth2', strategy: 'google-oauth2', displayName: 'Google' },
    ];
    const repo = makeMockRepo({
      fetchSocialConnections: vi.fn().mockResolvedValue(connections),
    });
    const service = new AuthService(repo, new MemoryTokenStorage());

    // Act
    const result = await service.fetchSocialConnections();

    // Assert
    expect(result).toEqual(connections);
  });
});
