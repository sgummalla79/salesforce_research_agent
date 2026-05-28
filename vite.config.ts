import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import svgr from 'vite-plugin-svgr';
import { tauri } from 'vite-plugin-tauri';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load .env / .env.local so VITE_DEV_PORT is available at config time
  const env = loadEnv(mode, process.cwd(), '');
  const port = parseInt(env.VITE_DEV_PORT ?? '3000', 10);

  return {
  plugins: [
    react(),
    tailwindcss(),
    svgr(),
    tauri(),
  ],

  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },

  // Vite dev server — port is read from VITE_DEV_PORT (.env.local), default 3000.
  // tauri.conf.json devUrl must match this port.
  server: {
    port,
    strictPort: true,
    // NOTE: No proxy here. The app calls VITE_API_BASE_URL directly.
    // For dev, set VITE_API_BASE_URL=http://localhost:8000 in .env.local
    watch: {
      // Prevent Vite from watching the Rust build output
      ignored: ['**/src-tauri/**'],
    },
  },

  // Production build output goes to dist/ which Tauri bundles
  build: {
    outDir: 'dist',
    // Tauri supports modern browsers only — no need for legacy polyfills
    target: command === 'serve' ? 'esnext' : ['chrome110', 'safari16'],
    minify: command !== 'serve',
    sourcemap: command === 'serve',
  },

  // Vitest configuration (collocated here per Vitest v2 convention)
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'src/test/**',
        'src/main.tsx',
        'src/**/*.d.ts',
        'src/presentation/components/ui/**', // shadcn wrappers — not our logic
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
  };
});
