---
name: engineering-rules
description: 10 non-negotiable project rules set by the user for the Pragna Tauri rewrite
metadata:
  type: feedback
---

These rules apply to every file, PR, and feature in this project. The user stated them explicitly at the start of the project.

**Rule 1 — No Hard Coding**
All config (URLs, ports, keys, timeouts) must live in `.env` files or `src/constants/`. Never inline in logic code.
**Why:** Maintainability and environment flexibility.
**How to apply:** Before writing any literal string/number that could vary by environment, put it in constants first.

**Rule 2 — SOLID Principles**
Every module follows SRP, OCP, LSP, ISP, DIP. Inject dependencies; depend on interfaces not concretions.
**Why:** Long-term codebase health; source repo keeps changing so extensibility matters.
**How to apply:** Define interfaces in `domain/` before writing implementations in `infrastructure/`.

**Rule 3 — Clean Architecture (strict layer imports)**
Import direction: constants ← domain ← application ← infrastructure ← presentation. No layer imports from above it.
**Why:** Prevents spaghetti as the codebase grows.
**How to apply:** Reject any import that goes up the stack. Presentation never imports infrastructure directly.

**Rule 4 — Unit Testing is mandatory**
≥80% coverage. Every exported function/hook/repository gets a `.test.ts`. Tests are hermetic (mock at interface boundary). Arrange/Act/Assert structure always.
**Why:** Source repo drifts; tests catch regressions when syncing changes.
**How to apply:** Write the test file alongside the implementation file, not after.

**Rule 5 — Documentation and comments**
Every exported symbol gets JSDoc/Rustdoc. Add `// TODO(owner):` for deferred work. Add `// NOTE:` for non-obvious invariants. Comments explain *why*, not *what*.
**Why:** Future engineers (and Claude) need context, not just signatures.

**Rule 6 — Source drift tracking**
Reference SPA (`pragna2_sgummalla_works`) keeps changing. When syncing: change `domain/` interface first, then propagate. Never copy logic verbatim. Always adapt to this app's architecture.
**Why:** Blind copy-paste will break the clean architecture invariants.

**Rule 7 — Discuss before deciding**
Any non-trivial architectural choice (data model, package, breaking interface change) must be discussed with the user before code is written. Document decisions in `docs/decisions/` ADRs.
**Why:** User wants to stay in the loop; unilateral decisions have caused issues before.
**How to apply:** Stop. Ask. Then code.

**Rule 8 — Structured logging + Grafana/Loki**
Use `logger.ts` singleton (never raw console.log). Every HTTP request and auth event must be logged. Support Loki HTTP endpoint via env vars (`VITE_LOKI_URL`, `VITE_LOKI_AUTH_TOKEN`). If not configured, logs go to console only — no code change required to switch.
**Why:** Observability is required from day one, not added later.
**How to apply:** Import logger in every infrastructure and application file. Wire Loki transport during app init.

**Rule 9 — Feature-gated rollout**
Each feature goes behind `VITE_FEATURE_<NAME>=true` env flag. App must compile and pass all tests with the flag off. Remove flag only when feature is fully integrated.
**Why:** Enables incremental delivery; each feature should be independently buildable/testable.

**Rule 10 — QA test documentation format**
Every feature gets `docs/testing/<feature>.md` with test cases in Setup / Act / Assert / Teardown format, written for a QA engineer with zero app knowledge.
**Why:** QA team needs self-contained test cases; the format must be standardized.
**How to apply:** Write the test doc when writing the feature, not after. Include exact expected values (UI state, API calls, log entries).
