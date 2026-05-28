# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Pragna — a multi-agent AI orchestration desktop app. Built as a **Tauri v2** shell around a **React 19 + TypeScript + Vite** frontend. The original SPA (`pragna2_sgummalla_works`) is being rewritten from scratch here as a native desktop app.

---

## Engineering Rules (Non-Negotiable)

These apply to every file, every PR, every feature.

### 1. No Hard Coding
All configuration (URLs, ports, credentials, feature flags, timeouts, environment names) must live in:
- `.env` / `.env.local` files (never committed) for environment-specific values
- `src/constants/` typed constants files for app-level config
- `src-tauri/tauri.conf.json` or environment-resolved Tauri config for Rust-side config
Never embed literal URLs, secrets, or environment assumptions inline in logic code.

### 2. SOLID Principles
- **S** — Every module/class/hook has one reason to change.
- **O** — Extend via new files/implementations, not by editing existing logic.
- **L** — Subtypes must be substitutable for their base types (especially repository interfaces).
- **I** — No fat interfaces; split by caller need.
- **D** — Logic depends on abstractions (interfaces/types), never on concrete implementations directly. Infrastructure implementations are injected or resolved through the DI pattern used in each layer.

### 3. Clean Architecture — Layer Rules
Imports flow **strictly downward**. No layer may import from a layer above it.

```
constants  ←  domain  ←  application  ←  infrastructure  ←  presentation
```

- `domain/` has zero dependencies on any other local layer.
- `application/` imports `domain/` and `infrastructure/` interfaces only — never concrete classes.
- `infrastructure/` implements interfaces defined in `domain/` or `application/`.
- `presentation/` imports `application/` hooks and `domain/` types only.
- Cross-layer shortcuts (e.g., a view importing directly from `infrastructure/`) are forbidden.

### 4. Unit Testing — Mandatory
- Every non-trivial function, hook, repository, and use-case **must** have a co-located `.test.ts` / `.test.tsx` file.
- Target ≥ 80% line coverage. Vitest + React Testing Library for frontend. Rust unit tests inside each module.
- Tests must be hermetic: no real network, no real file system, no real Tauri APIs. Mock at the interface boundary.
- Each test follows **Arrange / Act / Assert** structure (no interleaving).
- See **QA Test Documentation** section below for the full scenario format.

### 5. Documentation & Comments
- Every exported function, type, interface, hook, and Rust `pub fn` must have a JSDoc / Rustdoc comment describing *what* it does and *why* it exists (not just restating the name).
- Add `// TODO(owner): description` for known gaps, deferred work, or known fragility.
- Add `// NOTE:` for non-obvious invariants or workarounds.
- Inline comments explain *why*, not *what*.

### 6. Source Drift Tracking
The reference SPA (`pragna2_sgummalla_works`) keeps evolving. When syncing changes:
- Isolate the affected layer (domain type change, new API endpoint, new UI feature).
- Add/update the corresponding interface in `domain/` first, then propagate downward.
- Never copy logic verbatim — adapt to this app's architecture.
- If a change breaks a layer contract, update the interface **and** all implementations together in one PR.

### 7. Discuss Before Deciding
If a task requires a choice between two non-trivial approaches (data model, auth flow variant, package selection, breaking interface change), **stop and discuss** before writing code. Document the decision and rationale in a `docs/decisions/` ADR file.

### 8. Logging — Mandatory
- Use a structured logging framework throughout (not raw `console.log`). Frontend: a thin wrapper (e.g., `src/infrastructure/logging/logger.ts`) that targets the configured sink. Rust: `tracing` crate with `tracing-subscriber`.
- Log levels: `DEBUG` for dev tracing, `INFO` for lifecycle events, `WARN` for recoverable issues, `ERROR` for failures.
- Every HTTP request/response must be logged at `DEBUG` with method, URL, status, and correlation ID.
- Every Auth lifecycle event (login attempt, token refresh, logout) must be logged at `INFO`.
- **Grafana / Loki sink**: the logging infrastructure layer must support shipping logs to a Loki endpoint. The endpoint URL and auth token come from env config. If not configured, logs stay local only. No code changes required to switch sinks.

### 9. Feature-Gated Rollout
Each feature branch must be independently buildable and testable before merge:
- New features go behind a feature flag (env var `VITE_FEATURE_<NAME>=true`) until stable.
- The app must compile and all existing tests must pass even when the flag is off.
- Remove the flag only when the feature is fully integrated and tested.

### 10. QA Test Documentation Format
Every feature must have a `docs/testing/<feature>.md` file written for a QA engineer with zero prior knowledge of the app. Each test case uses this exact structure:

```markdown
### TC-<ID>: <Short title>

**Preconditions / Setup**
- Step-by-step environment setup (app state, test data, config required)

**Act**
- Numbered steps the tester performs

**Assert**
- Exact expected outcomes (UI state, API calls, log entries, stored values)

**Teardown** (if applicable)
- Steps to reset state for the next test
```

---

## Tech Stack

| Layer | Choice |
|---|---|
| Desktop shell | Tauri v2 (Rust) |
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| State | Zustand (in-memory) + TanStack Query (server) |
| Router | React Router v7 — **`createHashRouter`** (required for Tauri's `tauri://` protocol) |
| Auth | Auth0 PKCE — email/password via direct HTTP; social login via `@tauri-apps/plugin-shell` + `@tauri-apps/plugin-deep-link` |
| Storage | `@tauri-apps/plugin-store` (replaces all `localStorage`/`sessionStorage`) |
| HTTP | Axios with Bearer-token + correlation-ID interceptors |
| Streaming | SSE via `@ag-ui/client` HttpAgent over `fetch` |
| Backend | FastAPI at configurable URL (Option A: external; Option B: PyInstaller sidecar) |
| Logging | Frontend: custom `logger.ts` → Loki/Grafana sink. Rust: `tracing` crate |
| Testing | Vitest + React Testing Library (frontend); Rust built-in `#[test]` |

---

## Commands

```bash
# Install JS deps
pnpm install

# Run in dev mode (Tauri + Vite HMR)
pnpm tauri:dev

# Production build
pnpm tauri:build

# Type-check only
pnpm type-check

# Lint
pnpm lint

# Run all unit tests
pnpm test

# Run a single test file
pnpm test:file src/path/to/file.test.ts

# Run tests with coverage report
pnpm test:coverage

# Run Rust tests
cargo test --manifest-path src-tauri/Cargo.toml
```

---

## Architecture

### Frontend (`src/`)

Clean layered architecture — imports flow strictly downward:

```
constants/              # env vars, Auth0 config, API base URLs, deep-link URIs, feature flags
domain/                 # pure TypeScript types, interfaces, and repository contracts
application/            # use-case hooks (orchestrate domain interfaces + infrastructure)
infrastructure/         # side-effect adapters (implement domain interfaces)
  auth0/                # Auth0Repository, PKCE helpers
  http/                 # axiosClient, interceptors, snake↔camelCase mappers
  storage/              # Tauri plugin-store wrappers (tokenStorage, uiStorage, prefsStorage)
  logging/              # logger.ts — structured logger with Loki/Grafana sink support
presentation/           # React UI
  router/               # createHashRouter definition
  store/                # Zustand stores (useAuthStore, useUiStore)
  views/                # page-level components
  components/           # shared UI components (shadcn wrappers, etc.)
  hooks/                # React hooks bridging application layer to UI
```

### Tauri backend (`src-tauri/`)

```
src/
  lib.rs                # plugin registration, app builder, tracing subscriber init
  deeplink.rs           # handles pragna://auth/callback — extracts code param, emits to JS
  sidecar.rs            # (Option B) FastAPI process lifecycle management
tauri.conf.json         # app name, window config, CSP, allowed origins, plugin declarations
Cargo.toml              # Tauri v2 + plugin crates + tracing
```

### Logging infrastructure

```
src/infrastructure/logging/
  logger.ts             # exported singleton: logger.debug/info/warn/error(message, context)
  lokiTransport.ts      # ships batched log lines to Loki HTTP endpoint (if VITE_LOKI_URL set)
  types.ts              # LogLevel, LogEntry interfaces
```

Loki endpoint is configured via:
```
VITE_LOKI_URL=http://localhost:3100
VITE_LOKI_AUTH_TOKEN=<optional bearer token>
VITE_LOKI_APP_LABEL=pragna-desktop
```

If `VITE_LOKI_URL` is not set, all logs go to console only. No code change needed.

---

### Key architectural decisions

**Router**: `createHashRouter` is mandatory — Tauri serves the app via `tauri://localhost`, and `createBrowserRouter` breaks navigation on reload.

**Auth — social login**: Cannot use `window.location.href` redirects in a WebView. Flow is:
1. JS calls `shell.open(auth0AuthorizeUrl)` — opens system browser
2. Auth0 redirects to `pragna://auth/callback?code=...`
3. OS hands the deeplink to Tauri; Rust handler fires an event to JS
4. JS completes PKCE token exchange via direct `fetch` to Auth0

**Storage**: All persistence goes through `@tauri-apps/plugin-store`. No `localStorage` or `sessionStorage`. PKCE verifier/state are kept in-memory (not persisted) since the deeplink callback is same-process.

**Backend URL**: Configured via `VITE_API_BASE_URL` env var. In dev, defaults to `http://localhost:8000`. For sidecar (Option B), the Rust layer starts the FastAPI process and communicates the dynamic port to JS via a Tauri event.

**Cross-tab sync removed**: The original SPA used `window.addEventListener('storage')` for cross-tab preference sync. Desktop is single-window — Zustand in-memory state is the single source of truth.

**No window.confirm**: All confirmation dialogs use the existing shadcn `AlertDialog` component, not `window.confirm()`.

---

## Auth0 Configuration Required

The Auth0 application must have `pragna://auth/callback` registered as an **Allowed Callback URL** before social login will work. This is a manual dashboard step — not automated.

---

## Running the App

### Prerequisites

**macOS**
```bash
# 1. Xcode Command Line Tools
xcode-select --install

# 2. Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# 3. pnpm (if not already installed)
npm install -g pnpm
```

**Windows**
```powershell
# 1. Install Visual Studio C++ build tools (required by Rust)
#    Download: https://visualstudio.microsoft.com/visual-cpp-build-tools/
#    Select: "Desktop development with C++"

# 2. Rust toolchain
winget install Rustlang.Rust.MSVC

# 3. WebView2 — already bundled on Windows 11, no action needed

# 4. pnpm (if not already installed)
npm install -g pnpm
```

### First-time setup

```bash
# 1. Clone the repo
git clone https://github.com/sgummalla79/salesforce_research_agent.git
cd salesforce_research_agent

# 2. Create your local env file and fill in real Auth0 values
cp .env.example .env.local
# Edit .env.local — set VITE_AUTH0_DOMAIN, VITE_AUTH0_CLIENT_ID, VITE_AUTH0_AUDIENCE

# 3. Install JS dependencies
pnpm install

# 4. Run in dev mode (opens the desktop app with Vite HMR)
pnpm tauri:dev
```

> **Note:** `pnpm tauri:dev` compiles the Rust backend on first run — this takes 2–3 minutes. Subsequent runs are fast.

### Production build

```bash
pnpm tauri:build
# Output: src-tauri/target/release/bundle/
```

---

## New Machine Setup (Claude Code memory)

Memory files are stored in `.claude/memory/` in this repo so Claude Code context travels with the code.

After cloning, run the script for your OS to copy them to the Claude Code memory directory:

**macOS / Linux:**
```bash
# Run from the repo root
PROJ=$(pwd)
DEST="$HOME/.claude/projects/$(echo "$PROJ" | sed -e 's|/|-|g' -e 's|^-||')/memory"
mkdir -p "$DEST"
cp .claude/memory/* "$DEST/"
echo "Memory copied to: $DEST"
```

**Windows (PowerShell):**
```powershell
# Run from the repo root
$proj = (Get-Location).Path -replace '[:\\]', '-' -replace '^-', ''
$dest = "$env:USERPROFILE\.claude\projects\$proj\memory"
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Copy-Item .claude\memory\* $dest
Write-Host "Memory copied to: $dest"
```

After copying, open the project in Claude Code — it will load the memory automatically.

---

## ADR Reference

Architectural Decision Records live in `docs/decisions/`. Create a new ADR file for every significant design choice made during development.

## Feasibility Reference

See `.claude/memory/project_pragna_tauri.md` for current project state. The full feature-by-feature LOE analysis is in the local plan file (not committed — ask the original developer for a copy if needed).
