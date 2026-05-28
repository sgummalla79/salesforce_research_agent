---
name: project-pragna-tauri
description: Pragna desktop app project context — Tauri v2 + React 19 rewrite from scratch
metadata:
  type: project
---

This is a **from-scratch rewrite** (not a migration) of the Pragna SPA into a Tauri v2 desktop app. The source repo (`pragna2_sgummalla_works`) is read for reference only; all code is written fresh in this repo following clean architecture rules.

**Tech stack:** Tauri v2 (Rust) + React 19 + TypeScript + Vite + Tailwind + shadcn/ui + Zustand + TanStack Query + React Router v7 (hash router) + Auth0 PKCE + @tauri-apps/plugin-store + @tauri-apps/plugin-shell + @tauri-apps/plugin-deep-link + Vitest + tracing (Rust) + custom Loki logger (TS)

**Why:** Port Pragna to a native desktop app for better OS integration, offline capability, and eventual FastAPI sidecar bundling.

**Backend strategy:** Start with Option A (external FastAPI at configurable URL). Option B (PyInstaller sidecar) planned for production.

**Key decisions locked:**
- `createHashRouter` (not browser router) — required for tauri:// protocol
- Auth0 social login via system browser + `pragna://auth/callback` deeplink
- All storage via @tauri-apps/plugin-store (no localStorage/sessionStorage)
- Cross-tab sync removed (single window desktop)
- No window.confirm — use shadcn AlertDialog

**Completed:**
- Week 1 + Week 2: Full Login feature — all clean-arch layers, Tauri plugins, logging, 33 unit tests, QA docs. Committed on `feature/login`.

**Up next:**
- Settings page (branch off feature/login or main after merge)
- Chat page

**Feasibility plan:** See `C:\Users\<you>\.claude\plans\go-through-each-every-fuzzy-sun.md` (local only — not committed).

**How to apply:** Use this context to understand why decisions were made and what the current phase of work is.
