# TaskList.js Refactor — Actionable Implementation Plan

Scope: `public/js/components/TaskList.js`
Intent: Preserve behavior and visuals; reduce complexity and render cost; isolate business logic; enable incremental improvements without regressions.

## Objectives

- Extract all filtering/sorting/searching to the logic layer (`TaskQuery.js`).
- Split the monolith into a small container + dumb presentational components.
- Replace full re-renders with minimal DOM reconciliation (item-level updates).
- Keep CSS selectors and UI behavior identical initially; no UX change.

## Constraints & Safety

- No build-step changes; vanilla JS + current file layout.
- Do not alter public events or global state API.
- Maintain keyboard/mouse behavior and existing CSS classes.
- Keep diffs reviewable by shipping in small batches with clear rollback.

---

## Phase 0 — Baseline & Safety Nets

Status: Completed on 2025-09-02

Implementation Notes:
- Added plan to instrument TaskList with debug-only metrics gated by `window.DEBUG_TASKLIST` (initial render time, item count; future reconcile timings).
- Baseline smoke checklist defined for small/medium/large lists; no code changes yet.
- No UX or behavior changes; this phase only documents instrumentation approach and acceptance.

1. Add developer notes in file header about refactor goals and invariants.
2. Capture baseline metrics in console (behind `window.DEBUG_TASKLIST`) for:
   - Initial render ms, items rendered, re-render ms.
3. Smoke checklist (manual):
   - Render list with 5/100/500 items; verify filter/sort/search.
   - Verify selection/actions/context where applicable.
   - Verify no layout shift; scroll position maintained on updates.

Acceptance:
- Baseline metrics approach defined; manual smoke checklist captured for reference.

---

## Phase 1 — Extract Query Logic to `TaskQuery`

Status: Completed — Steps 1–4 completed on 2025-09-02

Goal: Make TaskList a thin view over a query service.

Steps:
1. Identify inline logic for:
   - Search: currently delegated to `TaskQuery.search(templates, searchQuery)` in `getFilteredAndSortedTemplates()`.
   - View filter: ‘active’/‘inactive’ handled in `getFilteredAndSortedTemplates()` before detailed filters.
   - Detailed filters: `applyDetailedFilters(templates)` implements:
     - Priority: `template.priority === Number(currentFilters.priority)`.
     - Time window: `template.timeWindow === currentFilters.timeWindow`.
     - Scheduling type: `template.schedulingType === currentFilters.schedulingType`.
     - Mandatory: `!!template.isMandatory === (currentFilters.isMandatory === 'true')`.
     - Active: `(template.isActive !== false) === (currentFilters.isActive === 'true')`.
   - Sorting: `sortTemplates(templates)` handles `name|priority|created|modified` with `sortDirection` multiplier.
   - Categorization: `categorizeTemplates(templates)` (display-only; not part of query extraction).
2. Create a mapping function in TaskList:
   - `buildCriteriaFromUI(): Criteria` → { search, filters, sort, paging }
3. Route all data access through `TaskQuery.queryTemplates(criteria)`.
4. Remove/disable duplicated in-component filtering/sorting.

Step 2 — Implementation Plan (next)
Step 2 — Implementation Notes
- Implemented `buildCriteriaFromUI()` in `public/js/components/TaskList.js` returning:
  - `search`: trimmed `this.searchQuery`
  - `view`: `this.currentView`
  - `filters`: shallow copy of `this.currentFilters`
  - `sort`: `{ field: this.currentSort, direction: this.sortDirection }`
  - `paging`: omitted for now to avoid behavior changes
- Debug-only log under `window.DEBUG_TASKLIST` for quick inspection.
- Acceptance: Met — stable, serializable criteria object; no behavior change.

Step 3 — Routing Plan (after Step 2)
- Replace `getFilteredAndSortedTemplates()` body with call to `TaskQuery.queryTemplates(criteria)` plus categorization for display.
- Remove or bypass `applyDetailedFilters` and `sortTemplates` (leave helpers temporarily for rollback, but unused).

Step 3 — Implementation Notes (completed 2025-09-02)
- Added `TaskQuery.queryTemplates(criteria, templates)` implementing view filter, search, detailed filters, and sorting to match legacy behavior.
  - File: `public/js/logic/TaskQuery.js`
- Routed TaskList to use centralized query:
  - File: `public/js/components/TaskList.js`
  - Method `getFilteredAndSortedTemplates()` now builds `criteria` via `buildCriteriaFromUI()` and returns `TaskQuery.queryTemplates(criteria, state.getTaskTemplates())`.
- Left `applyDetailedFilters` and `sortTemplates` in place but unused to allow quick rollback if needed.

Acceptance (met):
- Search/filter/sort results match baseline combinations during manual smoke.
- No changes to DOM structure or CSS classes; rendering still handled by TaskList.

Rollback:
- Revert the routing change in `TaskList.js` to restore inline filtering/sorting.

Step 4 — Cleanup (completed 2025-09-02)
- Removed dead helpers `applyDetailedFilters` and `sortTemplates` from `public/js/components/TaskList.js`.
- Source of truth for filtering/sorting is now `TaskQuery.queryTemplates`.
- Tests/docs: this plan now references `TaskQuery.queryTemplates`; future test coverage should target this API.

Phase 1 Summary:
- TaskList now delegates all querying (search/filter/sort/view) to the logic layer via `TaskQuery.queryTemplates`, reducing duplication and centralizing behavior. Ready to proceed to Phase 2 (extract TaskCard).

---

## Phase 2 — Extract TaskCard (presentational)

Goal: Make single-item rendering testable and reusable.

Steps:
1. Add `public/js/components/TaskCard.js` (dumb component):
   - Input: `{ template, status, handlers }`.
   - Produces element: `div.task-card` structure matching current markup.
   - No internal state; events delegated via passed handlers.
2. Replace TaskList per-item HTML string with TaskCard element creation.
3. Ensure CSS classes/attributes match existing ones.

Acceptance:
- Visual parity for a single item (compare DOM snapshot of one item).
- Event wiring (click/edit/open) works via handlers.

Rollback:
- Revert TaskCard usage; keep file for future iteration.

Status: In progress — Steps 1–3 completed on 2025-09-02

Progress Checklist:
- [x] Step 1: Add `TaskCard` component
- [x] Step 2: Replace per-item HTML with `TaskCard.create(...)`
- [x] Step 3: Ensure CSS classes/attributes match

Step 1 — Implementation Notes (completed)
- Added `public/js/components/TaskCard.js` exporting `createTaskCard({ template, isSelected, handlers })` and `TaskCard.create` alias.
- Markup mirrors existing TaskList card structure and classes (`task-card`, header/body, action buttons, checkbox, meta rows).
- Delegated events to provided handlers: `onSelectChange`, `onEdit`, `onDuplicate`, `onToggleStatus`.
- Imported `TIME_WINDOWS` for time window labels to keep parity with existing UI.

Acceptance (Step 1):
- Markup parity and handler wiring verified in isolation; ready for integration.

Next (Step 2):
- Replace `renderTaskCard(template)` usage in `TaskList` with `TaskCard.create(...)` while preserving DOM structure and CSS hooks.

Step 2 — Implementation Notes (completed)
- Imported `TaskCard` into `TaskList.js` and added `mountTaskCards(templates)` to insert elements post-render.
- Updated `render()` to call `mountTaskCards(templates)` after setting static HTML.
- Modified `renderTaskGrid()` to output an empty `.task-grid` container, then populated via `TaskCard.create(...)`.
- Modified `renderCategorizedGrid()` to add `data-category` and empty per-section `.task-grid` containers, then populated accordingly.
- Kept existing event wiring in `TaskList` (no handlers passed to `TaskCard`) to avoid duplicate listeners; parity preserved.

Acceptance (Step 2):
- Visual parity and interactions preserved; selection and action buttons continue to function via existing listeners.

Step 3 — Implementation Notes (completed)
- Verified TaskCard parity with legacy markup:
  - Root: `div.task-card[data-template-id]` with `active|inactive` and `selected` states.
  - Header: selection `input.task-checkbox`, status `.status-indicator`, actions `.edit-btn`, `.duplicate-btn`, `.toggle-status-btn`.
  - Body: `.task-name`, optional `.task-description`, `.task-meta` rows, optional dependencies block, recurrence block.
- Confirmed event selectors used in `TaskList.setupEventListeners()` target the same classes/attributes.
- Category sections now include `data-category` for mounting; no CSS dependency on this attribute.

Acceptance (Step 3):
- DOM snapshot parity for representative cards; CSS class hooks and data attributes unchanged.

---

## Phase 3 — Extract TaskGrid (presentational list)

Goal: Isolate list layout and item container behavior.

Steps:
1. Add `public/js/components/TaskGrid.js` (dumb component):
   - Input: `Array<template>`, renderItem callback.
   - Returns a `DocumentFragment` or container element with items appended.
2. TaskList becomes a container that:
   - Computes `criteria`, calls `TaskQuery`.
   - Builds items via `TaskCard` and passes into `TaskGrid`.

Acceptance:
- Parity for list rendering (same items in same order).
- Scrolling and focus behavior unchanged.

Rollback:
- Revert TaskGrid usage; keep API sketch.

---

Status: Steps 1–4 completed on 2025-09-02

Step 1 — Implementation Notes (completed)
- Added `public/js/components/TaskGrid.js` exporting `createTaskGrid({ items, renderItem, className })` and `TaskGrid.create` alias.
- Produces a container element with class `task-grid` by default and appends rendered items.
- Purely presentational; no internal state or side effects.

Step 2 — Implementation Notes (completed)
- Integrated `TaskGrid` into `TaskList`:
  - Imported `TaskGrid` and replaced manual DOM population in `mountTaskCards()`.
  - For `currentCategory === 'all'`: locate placeholder `.task-grid` and `replaceWith(TaskGrid.create({ items, renderItem }))`.
  - For categorized view: per-section `.task-grid` gets replaced similarly, keyed by `data-category`.
- Maintains identical CSS classes and structure; event wiring remains in `TaskList`.

Acceptance (Step 2):
- Grid containers are created by `TaskGrid`; items render via `TaskCard` with parity. Existing listeners continue to function.

Next:
- Proceed to Phase 4 (reconciliation) or optionally refine TaskGrid APIs if needed for batching.

## Phase 4 — Minimal DOM Reconciliation

Goal: Avoid full re-renders; update only changed items.

Steps:
1. Introduce a keyed map: `Map<templateId, HTMLElement>`.
2. On updates:
   - Compute set `nextIds` vs `prevIds` → additions/removals.
   - For shared ids, compute a small signature key (e.g., `name|priority|status`) to decide update vs skip.
3. Batch DOM writes in `requestAnimationFrame`.
4. Preserve scroll position and focus.

Acceptance:
- Measurable drop in re-render time with 200+ items.
- No visible flicker; scroll and focus preserved.

Rollback:
- Switch a flag to fall back to full render; keep reconciliation code behind feature toggle.

---

Status: Steps 1–3 completed on 2025-09-02

Step 1 — Implementation Notes (completed)
- Added `this.cardById = new Map()` to `TaskList` constructor and reset it during `mountTaskCards()`.
- While creating each `TaskCard`, store the DOM element in `cardById` keyed by `template.id`.
- Cleared `cardById` in `destroy()` to prevent leaks.

Acceptance (Step 1):
- `cardById` accurately reflects the currently rendered set of items and enables subsequent diffing logic.

Step 2 — Implementation Notes (completed)
- Added signature-based change detection logic in `TaskList`:
  - Introduced `this.prevSignatures = new Map()` and `computeTemplateSignature(template)`.
  - `mountTaskCards()` now computes `added`, `removed`, and `changed` ids by comparing signatures and logs debug metrics under `window.DEBUG_TASKLIST`.
  - Stores current signatures for the next render pass.
- Note: DOM updates still performed via full grid rebuild; actual node-level reconcile follows in Step 3.

Acceptance (Step 2):
- Correct identification of added/removed/changed sets without altering current UI behavior.

Step 3 — Implementation Notes (completed)
- Implemented minimal DOM reconciliation in `TaskList.reconcileGrid(...)`:
  - Reuses existing card nodes when unchanged and within the same grid.
  - Replaces only changed/added nodes, removes only missing ones.
  - Preserves scroll position and batches updates via `requestAnimationFrame`.
- `mountTaskCards()` now defers to `reconcileGrid` for both single-grid and categorized views, updating `cardById` and `prevSignatures` after reconcile.

Acceptance (Step 3):
- Visually identical rendering with reduced DOM churn; scroll preserved; event listeners continue to be reattached by existing setup.

Step 4 — Implementation Notes (completed)
- Added focus preservation to reconciliation:
  - Capture focused element inside grid with template id and control selector.
  - After reconcile, restore focus to the equivalent element (with `preventScroll` where supported).
  - Scroll position is preserved before and after focus restoration.

Acceptance (Step 4):
- Focus remains on the same control after updates; no unexpected scroll jumps.

## Phase 5 — Extract Toolbar (optional, time-permitting)

Goal: Make toolbar interactions independent and testable.

Steps:
1. Add `TaskListToolbar.js` (dumb): emits `change` events (search, filter, sort).
2. TaskList subscribes to toolbar events, rebuilds `criteria`, triggers reconcile.

Acceptance:
- Toolbar UI unchanged; interactions still emit correct state.

Rollback:
- Keep toolbar JSX/HTML inline; only use extracted component in the container.

---

Status: Steps 1–2 completed on 2025-09-02

Step 1 — Implementation Notes (completed)
- Added `public/js/components/TaskListToolbar.js` exporting `createTaskListToolbar(opts)` and `TaskListToolbar.create`.
- Markup mirrors existing toolbar (view buttons, category select, search input with clear, sort select + direction, filters toggle).
- Emits semantic events from the toolbar element:
  - `toolbar:view` → `{ view }`
  - `toolbar:category` → `{ category }`
  - `toolbar:search` → `{ query }`
  - `toolbar:sort-field` → `{ field }`
  - `toolbar:sort-direction` → `{ direction }`
  - `toolbar:toggle-filters` → `{}`
- No coupling to state; parent remains responsible for handling events.

Acceptance (Step 1):
- Toolbar element renders with identical selectors/ids; events fire with expected payloads.

Step 2 — Implementation Notes (completed)
- Integrated toolbar into TaskList by replacing static toolbar markup at runtime with `TaskListToolbar.create(...)` in `mountToolbar()`.
- Preserved existing selectors/ids to keep legacy event listeners working; semantic events are available for future adoption without regress.

Acceptance (Step 2):
- Toolbar renders via component with no behavior or selector changes; existing TaskList handlers still respond to user actions.

Step 3 — Implementation Notes (completed)
- Fully decoupled toolbar interactions from TaskList DOM querying:
  - `TaskList.mountToolbar()` now subscribes to semantic events emitted by `TaskListToolbar` and routes to existing handlers.
  - Removed legacy toolbar selector listeners from `setupEventListeners()` to avoid duplication.

Acceptance (Step 3):
- All toolbar actions work via semantic events; no duplicate listeners; behavior unchanged.

## Phase 6 — Performance & UX Polishing

- Debounce search input (e.g., 150ms).
- Avoid layout thrash: compute dimensions before batch updates.
- Optional: simple windowing for >500 items (only if needed; keep behind flag).
- Add lightweight profiling hooks (start/stop) under `DEBUG_TASKLIST`.

Acceptance:
- No regression in responsiveness; large lists remain smooth.

---

Status: Completed on 2025-09-02

Implementation Notes
- Reduced search debounce to 150ms in `TaskList.handleSearchInput()`.
- Added profiling hooks under `window.DEBUG_TASKLIST`:
  - Logs reconcile plan (total, added, removed, changed) and elapsed time per reconcile.
- Minimal layout thrash: batching done via `requestAnimationFrame`; scroll and focus preserved.
- Experimental simple windowing behind flags (default off):
  - `window.TASKLIST_WINDOWING_ENABLED = true` and `window.TASKLIST_WINDOW_SIZE = 400` to cap rendered items for very large lists during perf testing.
  - Does not affect behavior unless explicitly enabled.

Acceptance
- With debug on, reconcile logs show stable timings; UI remains responsive. No visible flicker; scroll and focus preserved on updates.

## Phase 7 — Cleanup & Documentation

- Remove dead code paths from the original monolith.
- Add JSDoc to container/presentational components.
- Update README or inline dev-notes for TaskList architecture.

Acceptance:
- Lint passes; code readability improved; no console warnings.

---

Status: Completed on 2025-09-02

Implementation Notes
- Removed dead, unused methods from `TaskList.js`:
  - `renderTaskCard()` (replaced by `TaskCard.create(...)`)
  - `getPriorityIcon()`, `getRecurrenceDisplay()`, and `escapeHtml()` (only used by removed renderer)
- Added inline documentation comments to new methods (`mountToolbar`, `reconcileGrid`, `computeTemplateSignature`).
- Preserved public selectors and behavior; no external API changes.

Acceptance
- Build succeeds with no references to removed methods; UI parity maintained.

## Architecture Target (after refactor)

- `TaskListContainer` (existing TaskList.js renamed or internally restructured)
  - Owns UI state (search/filter/sort/page)
  - Calls `TaskQuery.queryTemplates(criteria)`
  - Batches updates and orchestrates children
- Presentational components
  - `TaskGrid` — layout only
  - `TaskCard` — single item
  - `TaskListToolbar` — emits UI state changes (optional)
- Logic layer
  - `TaskQuery` — the single place for filtering/sorting

---

## Mapping: Legacy → New

- Inline filter/sort logic → `TaskQuery.buildPredicate` / `buildComparator`
- HTML strings per item → `TaskCard` element factory
- `render()` full list on any change → reconcile: add/remove/update only
- Inline toolbar handlers → toolbar `change` event with `criteria`

---

## Verification Checklist (each phase)

- Visual parity (light/dark if applicable)
- Keyboard and mouse interactions
- Sort/filter/search correctness vs baseline
- No console errors; no memory leaks (detach listeners)

---

## Rollback Strategy

- Each phase is behind a single commit and feature toggle (where reasonable).
- If issues arise, revert the phase commit; prior phases remain intact.
- Keep before/after screenshots and basic perf numbers for quick comparison.

---

## Timeline (pragmatic)

- Day 1: Phase 1 (Query extraction) + Phase 2 (TaskCard)
- Day 2: Phase 3 (TaskGrid) + Phase 4 (Reconciliation)
- Day 3: Phase 5 (Toolbar, optional) + Phase 6 (Perf polish) + Phase 7 (Cleanup)

Notes:
- Stop after Phase 4 if time is tight; you still get 80% of the gains.
- Only introduce windowing if lists > 1k and perf demands it.
