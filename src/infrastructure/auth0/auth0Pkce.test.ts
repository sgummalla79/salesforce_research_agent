import { describe, it, expect } from 'vitest';
import { generateCodeVerifier, generateCodeChallenge } from './auth0Pkce';

describe('generateCodeVerifier', () => {
  it('returns a non-empty base64url string', () => {
    // Arrange + Act
    const verifier = generateCodeVerifier();

    // Assert
    expect(verifier.length).toBeGreaterThan(0);
    // base64url must not contain +, /, or =
    expect(verifier).toMatch(/^[A-Za-z0-9\-_]+$/);
  });

  it('returns a different value each call (randomness check)', () => {
    // Arrange + Act
    const a = generateCodeVerifier();
    const b = generateCodeVerifier();

    // Assert
    expect(a).not.toBe(b);
  });
});

describe('generateCodeChallenge', () => {
  it('returns a non-empty base64url string', async () => {
    // Arrange
    const verifier = generateCodeVerifier();

    // Act
    const challenge = await generateCodeChallenge(verifier);

    // Assert
    expect(challenge.length).toBeGreaterThan(0);
    expect(challenge).toMatch(/^[A-Za-z0-9\-_]+$/);
  });

  it('produces the same challenge for the same verifier (deterministic)', async () => {
    // Arrange
    const verifier = 'fixed-test-verifier-string';

    // Act
    const c1 = await generateCodeChallenge(verifier);
    const c2 = await generateCodeChallenge(verifier);

    // Assert
    expect(c1).toBe(c2);
  });

  it('produces different challenges for different verifiers', async () => {
    // Arrange + Act
    const c1 = await generateCodeChallenge('verifier-one');
    const c2 = await generateCodeChallenge('verifier-two');

    // Assert
    expect(c1).not.toBe(c2);
  });
});
