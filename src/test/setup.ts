import '@testing-library/jest-dom';

// Mock all Tauri plugin APIs globally so tests run in jsdom without a Tauri runtime.
// Each test file can override these mocks for specific scenarios.

vi.mock('@tauri-apps/plugin-store', () => ({
  Store: {
    load: vi.fn().mockResolvedValue({
      get:    vi.fn().mockResolvedValue(null),
      set:    vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      save:   vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

vi.mock('@tauri-apps/plugin-shell', () => ({
  open: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@tauri-apps/plugin-deep-link', () => ({
  onOpenUrl: vi.fn().mockResolvedValue(vi.fn()),
}));
