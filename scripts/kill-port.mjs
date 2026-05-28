/**
 * kill-port.mjs
 *
 * Kills whatever process is listening on the dev port before Vite starts.
 * Port is read from VITE_DEV_PORT in .env.local → .env → fallback 3000.
 *
 * Works on Windows (netstat + taskkill) and macOS/Linux (lsof + kill).
 * Called automatically by the "predev" and "pretauri:dev" npm scripts.
 */

import { execSync, spawnSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

/** Reads KEY=VALUE lines from a .env file, ignoring comments. */
function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const lines = readFileSync(filePath, 'utf8').split('\n');
  const result = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    result[key] = val;
  }
  return result;
}

// Resolve port: .env.local wins over .env, both win over default
const envLocal = parseEnvFile(resolve(ROOT, '.env.local'));
const envBase  = parseEnvFile(resolve(ROOT, '.env'));
const port = parseInt(
  envLocal.VITE_DEV_PORT ?? envBase.VITE_DEV_PORT ?? '3000',
  10,
);

console.log(`[kill-port] Checking port ${port}…`);

const isWindows = process.platform === 'win32';

try {
  if (isWindows) {
    // netstat lists: Proto  Local Address  Foreign Address  State  PID
    const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
    const pids = new Set();
    for (const line of output.split('\n')) {
      // Match only lines where the local address ends with :<port>
      if (!new RegExp(`:${port}\\s`).test(line)) continue;
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0') pids.add(pid);
    }
    if (pids.size === 0) {
      console.log(`[kill-port] Port ${port} is free.`);
    } else {
      for (const pid of pids) {
        console.log(`[kill-port] Killing PID ${pid} on port ${port}…`);
        spawnSync('taskkill', ['/F', '/PID', pid], { stdio: 'inherit' });
      }
    }
  } else {
    // macOS / Linux: lsof lists PID in column 2
    const output = execSync(`lsof -ti tcp:${port}`, { encoding: 'utf8' }).trim();
    if (!output) {
      console.log(`[kill-port] Port ${port} is free.`);
    } else {
      for (const pid of output.split('\n').filter(Boolean)) {
        console.log(`[kill-port] Killing PID ${pid} on port ${port}…`);
        spawnSync('kill', ['-9', pid], { stdio: 'inherit' });
      }
    }
  }
} catch {
  // findstr / lsof exit non-zero when nothing is found — that's fine
  console.log(`[kill-port] Port ${port} is free.`);
}
