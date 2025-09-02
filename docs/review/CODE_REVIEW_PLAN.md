# Repository Code Review Plan (Surface → Deep)

Purpose: Provide a repeatable, depth‑layered plan to review every coding file in this project, starting with quick surface passes and progressively going deeper. This plan is actionable and designed for incremental execution with clear deliverables after each pass.

## Objectives

- Establish a complete inventory of coding files and their roles.
- Identify and fix surface issues quickly (lint, naming, dead code).
- Map dependencies, side effects, and public APIs per file.
- Assess correctness, performance, security, accessibility, and testability.
- Produce trackable artifacts (notes, issues, and recommendations) for each file.

## Scope

- Included: `.js`, `.css`, `.html`, configuration that affects runtime (e.g., `firebase*.js`, service modules), and tests.
- Excluded: Images, binary assets. Docs are reviewed only for alignment when needed.

## Deliverables

- Review tracker (`docs/review/REVIEW_TRACKER.md`) with status per file and per depth.
- Per‑file review notes using the template (`docs/review/TEMPLATES/PER_FILE_REVIEW_TEMPLATE.md`).
- Issue list grouped by category (optional: converted to GitHub issues).
- Summary memo per pass with key findings and recommendations.

## Depth Passes (What we check each round)

Depth 0 — Inventory & Classification (repo‑wide)
- Generate file list, size (LOC), and type; categorize by feature/area.
- Flag large (>500 LOC) and critical paths (entry points, state, logic, timeline UI) for earlier deep passes.

Depth 1 — Surface Quality (per file)
- Lint/style issues; inconsistent naming; obvious smells; TODOs/FIXMEs.
- Dead code, unused exports/imports; unreachable branches.
- Basic documentation (header comment, purpose, ownership).

Depth 2 — API & Dependencies (per file)
- List imports/exports and public API; internal vs. external functions.
- Note side effects (global state, DOM, network, storage) and event contracts.
- Identify tight coupling and circular dependencies candidates.

Depth 3 — Behavior & Correctness (per file)
- Walk primary flows; validate input handling, edge cases, and error paths.
- Check state transitions and event emissions; ensure idempotency where relevant.
- Confirm assumptions against consumers (call sites, tests).

Depth 4 — Performance & Memory (per file)
- Hot paths and loops; algorithmic complexity; caching opportunities.
- DOM operations and reflow risks; unnecessary allocations; leaks (listeners, intervals).

Depth 5 — Security & Privacy (per file)
- Input validation, escaping, and sanitization.
- Sensitive data handling; storage; exposure via logs.

Depth 6 — Accessibility & UX Consistency (UI files)
- Keyboard support; focus management; ARIA usage.
- Color contrast; reduced motion; touch target sizing; RTL readiness.

Depth 7 — Tests & Reliability (per file/module)
- Existing test coverage; gaps; flakiness risks.
- Determinism, error messages, and logging quality.

Depth 8 — Maintainability & Docs (per file)
- Separation of concerns; cohesion; abstraction clarity.
- Comments and README alignment; deprecation notes and migration hints.

## Prioritization

- Size: start with very large files (e.g., `public/js/components/*`, `public/js/state.js`, `public/css/timeline.css`).
- Criticality: entry points (`public/js/app.js`), state (`public/js/state/*`), scheduling engine, and timeline UI.
- Churn: use `git log --stat`/`git blame` to identify frequently changed files.

## Workflow (Actionable Steps)

1) Seed Inventory
- Use `loc_report.txt` and ripgrep to list candidate files.
- Export inventory into `docs/review/REVIEW_TRACKER.md` (table with path, LOC, area, priority, D0–D8 status).

2) Configure Tools (optional but recommended)
- Lint: ESLint for JS, Stylelint for CSS (respect existing configs if present).
- Search: ripgrep for dependency and usage scans.

3) Execute Passes Incrementally
- Depth 1 for all files, starting with high‑priority list; capture notes and quick fixes.
- Depth 2–3 for high‑priority files first; then proceed to remaining files.
- Depth 4–8 as needed, prioritizing hotspots and public APIs.

4) Record Findings
- For each file, create or update a note using the per‑file template.
- Open issues grouped by category (Surface, API, Correctness, Perf, Security, A11y, Tests, Docs) and link back to file notes.

5) Summarize and Plan Remediations
- After each pass, produce a short summary with recommended fixes and estimated effort.

## Commands (non‑destructive examples)

- List JS/CSS/HTML files: `rg --files -g 'public/**' -g '!**/*.png' -g '!**/*.jpg' | rg '\\.(js|css|html)$'`
- Find unused exports (quick heuristic): `rg 'export (const|function|class) (\\w+)' -n`
- Trace imports of a symbol: `rg 'import .*<symbol>.* from' -n public/js`

## Definition of Done per Depth

- D1: Lint clean or issues documented; file header updated if missing.
- D2: Imports/exports and side effects documented in the note.
- D3: Primary flows and error paths reviewed; risks documented.
- D4: Hotspots and opportunities identified; no obvious leaks left.
- D5: Input handling and sensitive data checks documented.
- D6: A11y checklist complete for UI files.
- D7: Test gaps identified or tests referenced.
- D8: Maintenance recommendations and doc updates listed.

## Artifacts

- Tracker: `docs/review/REVIEW_TRACKER.md`
- Notes: `docs/review/files/<path-with-dots>.md` (mirror file path, replacing slashes with dots)
- Template: `docs/review/TEMPLATES/PER_FILE_REVIEW_TEMPLATE.md`

