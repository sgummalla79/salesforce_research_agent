/**
 * kill-port.mjs
 *
 * Kills whatever process is listening on the dev port, then waits until
 * the OS confirms the port is free before exiting. Safe to call multiple
 * times in quick succession (Tauri restart scenario).
 *
 * Port is read from VITE_DEV_PORT in .env.local → .env → fallback 3000.
 *
 * Windows : PowerShell Get-NetTCPConnection (reliable PID lookup).
 * macOS/Linux: lsof + kill -9.
 */

import { execSync, spawnSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const lines = readFileSync(filePath, 'utf8').split('\n');
  const result = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    result[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
  }
  return result;
}

/** Returns true if something is actively listening on the port. */
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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Resolve port ──────────────────────────────────────────────────────────────
const envLocal = parseEnvFile(resolve(ROOT, '.env.local'));
const envBase  = parseEnvFile(resolve(ROOT, '.env'));
const port     = parseInt(envLocal.VITE_DEV_PORT ?? envBase.VITE_DEV_PORT ?? '3000', 10);

console.log(`[kill-port] Checking port ${port}…`);

// ── Kill if something is listening ───────────────────────────────────────────
if (isPortInUse(port)) {
  try {
    if (process.platform === 'win32') {
      const pidsRaw = execSync(
        `PowerShell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess"`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] },
      ).trim();
      const pids = [...new Set(pidsRaw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean))];
      for (const pid of pids) {
        console.log(`[kill-port] Killing PID ${pid} on port ${port}…`);
        spawnSync('taskkill', ['/F', '/PID', pid], { stdio: 'inherit' });
      }
    } else {
      const pidsRaw = execSync(`lsof -ti tcp:${port}`, { encoding: 'utf8' }).trim();
      for (const pid of pidsRaw.split(/\n/).filter(Boolean)) {
        console.log(`[kill-port] Killing PID ${pid} on port ${port}…`);
        spawnSync('kill', ['-9', pid], { stdio: 'inherit' });
      }
    }
  } catch { /* nothing listening */ }
}

// ── Wait for OS to release the port (covers both kill + Tauri-restart race) ──
// Poll until free, or up to MAX_WAIT_MS. This handles the case where Tauri
// has already killed the previous Vite process but the OS hasn't released
// the port yet by the time this script runs.
const MAX_WAIT_MS = 5000;
const POLL_MS     = 150;
let waited = 0;

while (isPortInUse(port)) {
  if (waited >= MAX_WAIT_MS) {
    console.warn(`[kill-port] Warning: port ${port} still in use after ${MAX_WAIT_MS}ms — proceeding anyway.`);
    break;
  }
  await sleep(POLL_MS);
  waited += POLL_MS;
}

if (waited > 0) {
  console.log(`[kill-port] Port ${port} is free (waited ${waited}ms).`);
} else {
  console.log(`[kill-port] Port ${port} is free.`);
}
