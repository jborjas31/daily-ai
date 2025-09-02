# state.js Refactoring Action Plan

**🎯 Objective:** Decompose the monolithic `public/js/state.js` into a small, cohesive set of modules with clear responsibilities: a single store, domain‑focused actions, and pure selectors — without changing the public API used by the app.

- Current usage in app: most code imports `state`, `stateListeners`, and `stateActions` from `./state.js`.
- Constraint: avoid breaking imports; keep a compatibility façade during the refactor.
- Avoid overengineering: no new frameworks, keep the existing event bus (`notifyStateChange`, `stateListeners`).

---

## Phases & Steps

### Phase 0 — Bootstrap & Compatibility
- [x] ST-00: Add module skeletons alongside `state.js`.
  - Files to add under `public/js/state/`:
    - `Store.js` (app state object + `notifyStateChange` + `stateListeners`)
    - `selectors.js` (pure getters only)
    - `actions.templates.js` (template CRUD/load-related actions)
    - `actions.instances.js` (instance CRUD/range/navigation/actions)
    - `actions.app.js` (view/date/loading/search/filters/online flags)
    - `actions.user.js` (auth user + settings)
  - Acceptance: New files exist and can import without side effects.
  - Completed: Skeletons created with no side effects at:
    - `public/js/state/Store.js`
    - `public/js/state/selectors.js`
    - `public/js/state/actions.templates.js`
    - `public/js/state/actions.instances.js`
    - `public/js/state/actions.app.js`
    - `public/js/state/actions.user.js`

- [x] ST-01: Create a thin façade in `state.js` that re-exports from the new modules.
  - Keep existing named exports: `state` (selectors), `stateActions` (aggregated actions), `stateListeners` (event bus).
  - Acceptance: No behavior change; app builds and runs.
  - Implemented: Non-breaking façade re-exports added to `public/js/state.js` under compatibility names:
    - `__storeStateListeners` from `./state/Store.js`
    - `__selectors` from `./state/selectors.js`
    - `__actionsTemplates` from `./state/actions.templates.js`
    - `__actionsInstances` from `./state/actions.instances.js`
    - `__actionsApp` from `./state/actions.app.js`
    - `__actionsUser` from `./state/actions.user.js`
    These allow gradual extraction without changing the current API until ST-10 flips the primary exports.

### Phase 1 — Audit & Contracts (1 pass, pragmatic)
- [x] ST-02: Inventory state domains and group actions/selectors.
  - Domains: `user`, `settings`, `currentView/date`, `taskTemplates`, `taskInstances`, `dailySchedules`, `loading`, `online`, `search/filters`, `queues (template/instance ops)`, `stats`, `tabSync` metadata.
  - Acceptance: Simple mapping doc (inline comments) captured in `Store.js` for maintainers.
  - Implemented: Added a detailed "Domain Inventory & Mapping" comment block to `public/js/state/Store.js` documenting:
    - State keys per domain
    - Selector names to extract
    - Mutators that will live in `Store.js`
    - Action functions to move into domain action modules

- [x] ST-03: Confirm event contract (no change).
  - Keep `notifyStateChange(type, payload)` and `stateListeners.on(type, fn)` semantics.
  - Acceptance: Write a short header in `Store.js` documenting supported event types (existing calls in `state.js` are the source of truth).
  - Implemented: Added "Event Contract" section to `public/js/state/Store.js` documenting:
    - Emission and subscription semantics (`on`, `off`, `onAll`, wildcard `*`).
    - Full list of event types discovered in `public/js/state.js`.

### Phase 2 — Extract Store
- [x] ST-04: Move `appState`, `notifyStateChange`, and `stateListeners` to `Store.js`.
  - Keep identical structure and defaults; migrate only, don’t redesign.
  - Acceptance: `Store.js` exports `{ appState, notifyStateChange, stateListeners }` and can be consumed by actions/selectors.
  - Implemented:
    - Moved full `appState` initialization and event bus (sanitize/broadcast, listeners, notify) into `public/js/state/Store.js`.
    - Updated `public/js/state.js` to import `appState`, `notifyStateChange`, and re-export `stateListeners` to preserve public API.
    - Removed in-file duplicates of sanitize/broadcast/event bus from `public/js/state.js`.

### Phase 3 — Extract Domain Actions
- [x] ST-05: actions.templates.js
  - Move template actions (load/create/update/delete/duplicate, filters/pagination/search, op queue helpers) to this module.
  - Use `Store.js` to read/write state and to publish events.
  - Acceptance: All template-related functions exported and re-aggregated via `stateActions` without behavior change.
  - Implemented:
    - Implemented full template action set in `public/js/state/actions.templates.js` using `appState` + `notifyStateChange`.
    - Mirrored state mutators locally (set/update/remove templates, filters/pagination/search, queues) to avoid cyclic imports.
    - In `public/js/state.js`, merged the module into `stateActions` via `Object.assign(stateActions, templateActions)` to preserve API.

- [x] ST-06: actions.instances.js
  - Move instance actions (set/get per-date, update/remove/batch, navigation/history, preload dates, caches, stats, queues) to this module.
  - Acceptance: Exports wired into `stateActions`; existing consumers behave the same.
  - Implemented:
    - Implemented all instance actions in `public/js/state/actions.instances.js` using `appState` + `notifyStateChange`.
    - Ported metadata updater and all relevant mutators locally to avoid cycles while keeping identical event emissions.
    - Merged into `stateActions` via `Object.assign(stateActions, instanceActions)` in `public/js/state.js`.

- [x] ST-07: actions.app.js
  - Move app UI/meta actions (set current view/date, set loading, set online, search/filters, daily schedules) here.
  - Acceptance: Exports wired into `stateActions` and event emissions preserved.
  - Implemented:
    - Added app/meta actions in `public/js/state/actions.app.js`:
      `setCurrentView`, `setCurrentDate`, `setLoading`, `setOnline`, `setSearchQuery`, `setFilter`, `setActiveFilters`, `setDailyScheduleForDate`, `addPendingSyncAction`, `clearPendingSyncActions`, and `loadDailyScheduleForDate`.
    - Merged into `stateActions` via `Object.assign(stateActions, appActions)` to keep API stable.
    - Preserved event names/payloads exactly.

- [x] ST-08: actions.user.js
  - Move user and settings mutators (`setUser`, `setSettings`) here.
  - Acceptance: Exports wired and events preserved.
  - Implemented:
    - Added user/settings module at `public/js/state/actions.user.js` with mutators and async actions: `initializeUser`, `loadSettings`, `saveSettings`, `updateSleepSchedule`, `updateTimeWindows`, `updatePreferences`, `resetSettingsToDefaults`.
    - Uses `appState` + `notifyStateChange` and mirrors original semantics (including loading flags and logs).
    - Merged into `stateActions` in `public/js/state.js` to keep API stable.

### Phase 4 — Extract Pure Selectors
- [x] ST-09: selectors.js
  - Move all read-only getters to selectors; ensure no mutation or side effects.
  - Keep stable names (`getUser`, `getTaskTemplates`, `getTaskInstancesForDate`, etc.).
  - Acceptance: `state` export in `state.js` becomes a bundle of these selector functions (signature compatible).
  - Implemented:
    - Added pure selectors in `public/js/state/selectors.js` that read from `Store.js` (`appState`) and mirror existing getter signatures and return shapes.
    - No side effects; cloning behavior preserved where applicable (sets, maps, arrays, and objects) to match current usage.

### Phase 5 — Wire & Verify (No API changes)
- [x] ST-10: Re-aggregate in `state.js`.
  - `state` → compatibility façade kept for now; selectors exposed via `./state/selectors.js` (compat export `__selectors`).
  - `stateActions` → object merging from domain actions; `stateListeners` → re-export from `Store.js`.
  - Acceptance: No imports broken; app behavior unchanged. Flipping `state` to pure selectors will happen after updating external callers (tracked for cleanup phase).
  - Implemented:
    - Merged domain actions into `stateActions` via `Object.assign` (templates, instances, app, user).
    - Re-exported `stateListeners` from `Store.js`; kept `state` as existing façade to avoid breaking external usages in `app.js`, `ui.js`, and components.

- [ ] ST-11: Smoke test critical flows.
  - Create/edit/delete template; instance toggle/skip/postpone; view/date change; online/offline toggle; search & filters.
  - Acceptance: No regressions vs. pre-refactor behavior.
  - Prepared: See `docs/refactoring/STATE_REFACTORING_SMOKE_TEST.md` for a copy-paste console checklist to validate wiring and events.

### Phase 6 — Targeted Hardening (Pragmatic; keep minimal)
- [x] ST-12: Memoize heavy selectors where it’s obviously beneficial (optional).
  - Candidates: aggregate metadata derivations already computed; keep minimal to avoid overengineering.
  - Acceptance: No behavioral change; minor perf improvement confirmed via logs.
  - Implemented:
    - Added lightweight memoization in `public/js/state/selectors.js` for:
      `getInstancesForDateRange`, `getInstancesByTemplateId`, and `getInstancesByStatus`.
    - Invalidation keyed off `taskInstances.metadata.lastUpdated` (and args), logs `memo hit` via `console.debug`.
    - Still returns a fresh array on each call to avoid caller-side mutation coupling.

- [x] ST-13: Guard against accidental deep mutations in actions.
  - Use shallow copies consistently when writing to `appState` and maps/sets.
  - Acceptance: Post-update reads reflect new values; no shared object mutation across boundaries.
  - Implemented:
    - Updated `actions.app.js` to replace objects on write:
      `setLoading` now shallow-copies the `loading` object; `setFilter` now replaces `activeFilters` with a merged copy.
    - Audited domain actions: template/instance mutators already clone arrays/objects before writing and when deriving metadata; search results/filters use spread merges.
    - Selectors continue to return cloned snapshots (arrays, objects, Map/Set wrappers) to avoid exposing internal references.

### Phase 7 — Cleanups
- [x] ST-14: Remove dead code left in `state.js` after migration.
  - Ensure comments and structure are concise; keep `state.js` as the stable façade.
  - Acceptance: Lint/rg show no unused functions in `state.js`.
  - Implemented:
    - Removed duplicate `loadDailyScheduleForDate` from `stateActions` (now provided by `actions.app.js`).
    - Marked large deprecated blocks for template/instance actions with migration notes; runtime already uses extracted modules via `Object.assign`.
    - Next pass: fully delete deprecated blocks once smoke tests confirm stability across UI flows (tracked separately).

---

## Module Layout (Target)

- `public/js/state/Store.js`
  - `export const appState = { ... }`
  - `export function notifyStateChange(type, payload)`
  - `export const stateListeners = { on(type, fn), off(type, fn) }`

- `public/js/state/selectors.js`
  - `export function getUser()`, `getSettings()`, `getTaskTemplates()`, `getTaskInstancesForDate(date)`, `getDailyScheduleForDate(date)`, etc.

- `public/js/state/actions.templates.js`
  - `export async function loadTaskTemplates(opts)`, `createTaskTemplate`, `updateTaskTemplate`, `deleteTaskTemplate`, `duplicateTaskTemplate`, filter/pagination/search helpers, queues.

- `public/js/state/actions.instances.js`
  - `export function setTaskInstancesForDate`, `updateTaskInstance`, `removeTaskInstance`, `batchUpdateTaskInstances`, navigation/history, preload/cache helpers, stats.

- `public/js/state/actions.app.js`
  - `export function setCurrentView`, `setCurrentDate`, `setLoading`, `setOnline`, `setSearchQuery`, `setActiveFilters`, `setDailyScheduleForDate`.

- `public/js/state/actions.user.js`
  - `export function setUser`, `setSettings`.

- `public/js/state.js` (façade)
  - `export { stateListeners } from './state/Store.js'`
  - `import * as selectors from './state/selectors.js'`
  - `import * as templates from './state/actions.templates.js'`
  - `import * as instances from './state/actions.instances.js'`
  - `import * as app from './state/actions.app.js'`
  - `import * as user from './state/actions.user.js'`
  - `export const state = selectors;`
  - `export const stateActions = { ...templates, ...instances, ...app, ...user };`

---

## Acceptance Criteria (Overall)

- No public API changes: existing imports of `{ state, stateListeners, stateActions }` continue to work.
- Event semantics unchanged: the same `notifyStateChange` types fire in the same places.
- Behavior unchanged for all existing app flows (templates, instances, schedule, filters, settings, online/offline).
- Code readability improved: each domain’s actions and selectors are discoverable and contained.

---

## Risks & Mitigations

- Cyclic imports: keep `Store.js` free of imports from actions/selectors; actions/selectors import `Store.js`, not vice‑versa.
- Partial migrations: migrate and wire one domain at a time (templates → instances → app → user) to keep diffs small.
- Event drift: rely on a “diff-only” migration — copy/paste existing code blocks; do not change event names/payloads.

---

## Out of Scope (for now)

- Introducing Redux/Pinia/Zustand/etc.
- Complex middleware/event batching redesign.
- Full immutability libraries. Shallow copies are sufficient for this pass.

---

## Notes

- This plan follows the improvements suggested in `loc_report.txt`, adapted to the current codebase and kept intentionally lean. Focus is on clarity and low‑risk extraction rather than sweeping redesigns.
