/**
 * kill-port.mjs
 *
 * Ensures the dev port is free before Vite starts.
 * Uses Node's net.createServer to probe the port — the same mechanism
 * Vite uses internally, so "free here" means "Vite will bind successfully".
 *
 * Port: VITE_DEV_PORT in .env.local → .env → 3000.
 * Platform: Windows (PowerShell) and macOS/Linux (lsof).
 */

import { createServer } from 'net';
import { execSync, spawnSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..');

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const result = {};
  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    result[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
  }
  return result;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Tries to actually bind a TCP server on the port.
 * Returns true if binding succeeds (port is genuinely free).
 * This is the same check Vite uses — if this passes, Vite will start.
 */
function canBind(port) {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.once('error', () => resolve(false));
    srv.once('listening', () => srv.close(() => resolve(true)));
    srv.listen(port, '127.0.0.1');
  });
}

/** Uses OS tools to find and kill PIDs listening on the port. */
function killListeners(port) {
  try {
    if (process.platform === 'win32') {
      const raw = execSync(
        `PowerShell -NoProfile -Command ` +
        `"Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue ` +
        `| Where-Object State -eq 'Listen' ` +
        `| Select-Object -ExpandProperty OwningProcess"`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] },
      ).trim();

      const pids = [...new Set(raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean))];
      for (const pid of pids) {
        if (pid === '0') continue;
        console.log(`[kill-port] Killing PID ${pid}…`);
        // Use exec so non-zero exit from taskkill doesn't throw
        try { execSync(`taskkill /F /PID ${pid}`, { stdio: 'pipe' }); } catch { /* already gone */ }
      }
    } else {
      const raw = execSync(`lsof -ti tcp:${port} 2>/dev/null`, { encoding: 'utf8' }).trim();
      for (const pid of raw.split(/\n/).filter(Boolean)) {
        console.log(`[kill-port] Killing PID ${pid}…`);
        try { execSync(`kill -9 ${pid}`, { stdio: 'pipe' }); } catch { /* already gone */ }
      }
    }
  } catch {
    // No listeners found — fine
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

const envLocal = parseEnvFile(resolve(ROOT, '.env.local'));
const envBase  = parseEnvFile(resolve(ROOT, '.env'));
const port     = parseInt(envLocal.VITE_DEV_PORT ?? envBase.VITE_DEV_PORT ?? '3000', 10);

console.log(`[kill-port] Ensuring port ${port} is free…`);

// Try to kill anything listening first
killListeners(port);

// Poll using actual bind attempts — if we can bind, Vite can bind
const MAX_MS  = 6000;
const POLL_MS = 200;
let waited    = 0;

while (!(await canBind(port))) {
  if (waited >= MAX_MS) {
    console.error(`[kill-port] Port ${port} still in use after ${MAX_MS}ms — giving up.`);
    process.exit(1);
  }
  // Try to kill again in case a new process grabbed the port
  if (waited % 1000 === 0) killListeners(port);
  await sleep(POLL_MS);
  waited += POLL_MS;
}

if (waited > 0) {
  console.log(`[kill-port] Port ${port} is free (waited ${waited}ms).`);
} else {
  console.log(`[kill-port] Port ${port} is free.`);
}
