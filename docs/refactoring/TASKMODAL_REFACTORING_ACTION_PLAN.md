# TaskModal.js Refactoring Action Plan

**🎯 Current Status:** In Progress — Phase 1 complete; ready for Phase 2  
**📅 Last Updated:** 2025-09-01  
**⏭️ Next Action:** Phase 2 – Container Shell

**Objective:** Decompose the monolithic `public/js/components/TaskModal.js` into a modular, accessible, maintainable architecture with granular updates and centralized business logic.

---

## Actionable Implementation Steps (Developer TODOs)

Use these concrete steps to implement the refactor incrementally. Each step lists files to add/edit and acceptance criteria. Keep legacy TaskModal working behind a feature flag until full cutover.

### Phase 0 — Bootstrap & Flag
- [x] TM-00: Add feature flag `USE_TASK_MODAL_V2` (temporary) in `public/js/app.js` or a central config.
  - Acceptance: Flag defaults to off; no behavior change.
- [x] TM-01: Add minimal `TaskModalContainer.js` (skeleton) under `public/js/components/` exporting a class with `showCreate`, `showEdit`, `close` no-ops.
  - Acceptance: Importable without runtime errors.

### Phase 1 — Audit & Contracts
- [x] TM-02: Audit `TaskModal.js` and document section boundaries (basics, scheduling, recurrence, dependencies, preview, actions) in a new `docs/refactoring/notes/TASKMODAL_AUDIT.md`.
  - Acceptance: Section list + major responsibilities captured.
- [x] TM-03: Define event contract in `TaskModalContainer.js` as stubs (dispatch helpers for `section-change`, `validate-request`, `dirty-change`, `submit-request`, etc.).
  - Acceptance: Methods exist and dispatch `CustomEvent`s; unit smoke test logs show events fire.

### Phase 2 — Container Shell
- [x] TM-04: Implement modal shell markup in `TaskModalContainer.js` (overlay, dialog, header/body/footer regions) with open/close APIs.
  - Acceptance: `container.showCreate()` opens shell; `close()` disposes and restores focus.
- [x] TM-05: Load template data (new/existing) via `state` and hydrate an internal form model.
  - Acceptance: Console logs show correct initial form model; errors handled.
- [x] TM-06: Wire save/delete/close flows (no-op validation for now) using existing `state.updateTaskTemplate` / `state.deleteTaskTemplate`.
  - Acceptance: Saving updates template; delete removes template; close respects simple confirm if dirty flag set.

### Phase 3 — Presentational Sections
- [x] TM-07: Create `public/js/components/taskModal/TemplateBasicsSection.js` rendering name/description/category/priority with local DOM updates.
  - Acceptance: Emits `section-change` patches on input; basic inline errors placeholders.
- [x] TM-08: Create `.../SchedulingSection.js` (schedulingType, defaultTime, timeWindow) supporting 24/12h rendering (read from settings).
  - Acceptance: Emits patches; switches fields visibility by type.
- [x] TM-09: Create `.../RecurrenceSection.js` (frequency, interval, days, end conditions) with minimal client validation.
  - Acceptance: Emits patches; guards obvious invalid combos (interval >=1).
- [x] TM-10: Create `.../DependenciesSection.js` (dependsOn selector, simple order UI).
  - Acceptance: Emits patches; prevents self-dependency in UI.
- [x] TM-11: Create `.../PreviewSection.js` (read-only summary + conflicts snippet using existing logic/services).
  - Acceptance: Updates on `section-change`; no edit controls.
- [x] TM-12: Create `.../ActionsFooter.js` (Save/Cancel/Delete, dirty indicator).
  - Acceptance: Buttons dispatch container-level events; Save disabled while invalid (placeholder valid=true initially).

### Phase 4 — Feature Modules (UI Behaviors)
- [x] TM-13: Add `public/js/features/FocusTrap.js` with focus containment + restore on close; hide background from SR (aria-hidden).
  - Acceptance: Tab/Shift+Tab cycles within modal; focus returns to opener.
- [x] TM-14: Add `public/js/features/DirtyStateGuard.js` tracking form vs. persisted template; emits `dirty-change`.
  - Acceptance: Dirty flag toggles on changes; close prompts when dirty.
- [x] TM-15: Add `public/js/features/KeyboardShortcuts.js` (Esc close if clean or prompt; Cmd/Ctrl+S submit).
  - Acceptance: Shortcuts work without affecting inputs.
- [x] TM-16: Add `public/js/features/AutosaveDraft.js` (debounced localStorage save by draft key; restore on reopen).
  - Acceptance: Draft persists; clears on successful submit.

### Phase 5 — Logic Extraction
- [x] TM-17: Add `public/js/logic/TaskTemplateFormService.js` with `toFormModel`/`toTemplate` mapping and defaults derivation.
  - Acceptance: Round-trip mapping preserves values; sensible defaults applied.
- [x] TM-18: Add `public/js/logic/TaskTemplateValidation.js` centralizing field + cross-field rules; return structured errors.
  - Acceptance: Valid/invalid cases covered; sections display errors by field.
- [x] TM-19: Replace inline section checks with calls to validation service; container orchestrates per-section validation.
  - Acceptance: Save disabled when any section invalid; error focus moves to first invalid.

### Phase 6 — Performance & Reconciliation
- [x] TM-20: Per-section reconciliation — maintain a minimal state key; skip DOM updates if unchanged.
  - Acceptance: Rapid typing yields no flicker; reduced reflows observed.
- [x] TM-21: Batch DOM writes with `requestAnimationFrame` for high-frequency updates.
  - Acceptance: No layout thrash during fast edits; stable FPS.

### Phase 7 — Integration & Cutover
- [x] TM-22: Feature-flag hook — route existing open/edit flows to new container when `USE_TASK_MODAL_V2` is on.
  - Acceptance: Flag on → new modal; off → legacy modal.
- [x] TM-23: QA pass using the Test Plan; fix blocking issues.
  - Acceptance: Test checklist complete; no regressions.
  - Note: See `docs/refactoring/notes/TASKMODAL_QA_CHECKLIST.md` for manual steps.
- [x] TM-24: Remove legacy TaskModal and the feature flag.
  - Acceptance: `public/js/components/TaskModal.js` deleted; imports updated to use `TaskModalContainer`; `USE_TASK_MODAL_V2` removed; build succeeds.

---

## Reference (Design Rationale)

The sections below (original plan) document principles, target architecture, event contracts, acceptance criteria, test plan, rollout, risks, timeline, and success metrics. Use them to guide decisions while executing the actionable steps above.
