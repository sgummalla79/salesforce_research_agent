/**
 * kill-port.mjs
 *
 * Kills whatever process is listening on the dev port before Vite starts,
 * then waits until the port is confirmed free before exiting.
 *
 * Port is read from VITE_DEV_PORT in .env.local → .env → fallback 3000.
 *
 * Windows: uses PowerShell Get-NetTCPConnection (more reliable than netstat).
 * macOS/Linux: uses lsof + kill -9.
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

/** Returns true if something is still listening on the port. */
function isPortInUse(port) {
  try {
    if (process.platform === 'win32') {
      const out = execSync(
        `PowerShell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Measure-Object | Select-Object -ExpandProperty Count"`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] },
      ).trim();
      return parseInt(out, 10) > 0;
    } else {
      const out = execSync(`lsof -ti tcp:${port} 2>/dev/null`, { encoding: 'utf8' }).trim();
      return out.length > 0;
    }
  } catch {
    return false;
  }
}

/** Sleep for ms milliseconds. */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Resolve port ──────────────────────────────────────────────────────────────
const envLocal = parseEnvFile(resolve(ROOT, '.env.local'));
const envBase  = parseEnvFile(resolve(ROOT, '.env'));
const port     = parseInt(envLocal.VITE_DEV_PORT ?? envBase.VITE_DEV_PORT ?? '3000', 10);

console.log(`[kill-port] Checking port ${port}…`);

if (!isPortInUse(port)) {
  console.log(`[kill-port] Port ${port} is free.`);
  process.exit(0);
}

// ── Kill the process holding the port ────────────────────────────────────────
try {
  if (process.platform === 'win32') {
    // Use PowerShell to find the owning PID — much more reliable than netstat parsing
    const pidsRaw = execSync(
      `PowerShell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] },
    ).trim();

    const pids = [...new Set(pidsRaw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean))];

    if (pids.length === 0) {
      console.log(`[kill-port] No process found on port ${port}.`);
    } else {
      for (const pid of pids) {
        console.log(`[kill-port] Killing PID ${pid} on port ${port}…`);
        spawnSync('taskkill', ['/F', '/PID', pid], { stdio: 'inherit' });
      }
    }
  } else {
    const pidsRaw = execSync(`lsof -ti tcp:${port}`, { encoding: 'utf8' }).trim();
    const pids = [...new Set(pidsRaw.split(/\n/).filter(Boolean))];
    for (const pid of pids) {
      console.log(`[kill-port] Killing PID ${pid} on port ${port}…`);
      spawnSync('kill', ['-9', pid], { stdio: 'inherit' });
    }
  }
} catch {
  // lsof/PowerShell exits non-zero when nothing found — that is fine
}

// ── Wait for OS to release the port (up to 3 seconds) ────────────────────────
const MAX_WAIT_MS = 3000;
const POLL_MS     = 200;
let waited = 0;

await (async () => {
  while (waited < MAX_WAIT_MS) {
    await sleep(POLL_MS);
    waited += POLL_MS;
    if (!isPortInUse(port)) {
      console.log(`[kill-port] Port ${port} is now free (waited ${waited}ms).`);
      return;
    }
  }
  console.warn(`[kill-port] Warning: port ${port} may still be in use after ${MAX_WAIT_MS}ms.`);
})();
