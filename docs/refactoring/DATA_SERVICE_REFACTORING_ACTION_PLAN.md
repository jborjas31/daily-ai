# Data Service (public/js/data.js) — Refactoring Action Plan

Scope: `public/js/data.js`
Intent: Keep behavior and Firestore schema identical while reducing size and complexity, isolating responsibilities (repositories, mapping, validation, retries), and making the module easier to test and evolve. No UI/API breaking changes.

## Objectives

- Separate concerns by feature area: user settings, task templates, task instances, daily schedules, and shared utilities.
- Centralize common cross‑cutting concerns: error handling, retries/backoff, DTO↔domain mapping, timestamp handling.
- Introduce a light query builder for Firestore queries to reduce repeated boilerplate.
- Preserve current external API shape for callers; provide deprecation wrappers where needed.
- Improve testability with thin, single‑purpose modules.

## Constraints & Safety

- No Firestore schema changes; collection paths remain identical.
- No breaking changes for public functions used by UI and managers (TaskTemplateManager, etc.).
- No network/runtime behavior change; retries/backoff preserved but centralized.
- Refactor in small steps with clear rollback. Feature flags only if needed.

---

## Phase 0 — Baseline & Inventory

Status: Completed

1. Inventory all exports and call sites:
   - `userSettings`: get, save, initialize
   - `taskTemplates`: getAll, get, search, getByFilters, create, update, delete, permanentDelete, batch ops, import/export
   - `taskInstances`: get, getForDate, getForDateRange, getByTemplateId, create/update/delete, batch ops, cleanup, import/export
   - `dailySchedules`: getForDate, save, delete
   - `dataUtils`: date helpers, validation proxies, sanitize/clean, retries/backoff, hash, isOffline
2. Note repeated patterns: path building for user/collection/doc, `createdAt/updatedAt`, pagination wiring, timestamp normalization, try/catch with similar logging.
3. Capture a quick smoke test checklist per function (manual) to verify parity after refactor.

Acceptance:
- A short mapping of current functions to owners (template/instance/settings/schedule) and a list of repeated utilities to extract.
- See: `docs/refactoring/DATA_SERVICE_PHASE_0_INVENTORY.md`

---

## Phase 1 — Repository Skeletons (no logic move yet)

Status: Completed

Steps
1. Create folders: `public/js/data/repo` and `public/js/data/shared`.  [COMPLETED]
2. Add shared stubs:  [COMPLETED]
    - `shared/PathBuilder.js` (exports `paths.*` helpers)
    - `shared/FirestoreQueryBuilder.js` (thin wrapper for where/orderBy/limit/startAfter)
    - `shared/Retry.js` (exports `withRetry`, `shouldRetryOperation`)
    - `shared/Mapping.js` (exports `timestampToISO`, `stampCreate`, `stampUpdate`)
3. Add repo class stubs (methods only, throw `NotImplementedError`):  [COMPLETED]
     - `repo/UserSettingsRepo.js`
     - `repo/TaskTemplatesRepo.js`
     - `repo/TaskInstancesRepo.js`
     - `repo/DailySchedulesRepo.js`
4. Optional: `public/js/data/index.js` barrel exporting repos/shared (unused for now).  [SKIPPED]
5. Open the app to confirm no import errors (no wiring yet).  [MANUAL]

Acceptance
- Files present; app still runs with zero behavior change.

Rollback
- Delete `public/js/data/repo` and `public/js/data/shared`.

---

## Phase 2 — Move Shared Utilities (non‑breaking)

Status: Completed

Steps
1. Copy `withRetry` and `shouldRetryOperation` into `shared/Retry.js`; export both.  [COMPLETED]
2. Copy `timestampToISO` and add `stampCreate/stampUpdate` to `shared/Mapping.js`.  [COMPLETED]
3. Implement `shared/PathBuilder.js` helpers for all used collections/docs.  [COMPLETED in Phase 1 setup]
4. Implement minimal `shared/FirestoreQueryBuilder.js` supporting only current chains.  [COMPLETED in Phase 1 setup]
5. In `public/js/data.js`, keep implementations but re‑export moved helpers from `dataUtils` (mark deprecated in comments).  [COMPLETED]
6. Quick smoke: search usages via ripgrep and ensure no breakage.  [COMPLETED]

Acceptance
- No behavior change. `dataUtils.withRetry(...)` etc. still work via re‑exports.

Rollback
- Remove shared files and keep utilities only in `dataUtils`.

---

## Phase 3 — User Settings Repo Cut (smallest surface)

Status: Completed

Steps
1. Implement `UserSettingsRepo`: `get()`, `save(settings)`, `initialize()` using `PathBuilder` (+ timestamps where needed).  [COMPLETED]
2. Instantiate the repo inside `public/js/data.js`; delegate `userSettings.*` to it (legacy API remains).  [COMPLETED]
3. Keep default settings in the repo; ensure values match current defaults.  [COMPLETED]
4. Manual smoke: initialize new user, get/save round‑trip, defaults when doc missing.  [COMPLETED — see docs/refactoring/USER_SETTINGS_SMOKE_CHECK.md]

Acceptance
- `userSettings.get/save/initialize` return identical results; default initialization still works.

Rollback
- Restore original `userSettings` implementations.

---

## Phase 4 — Mapping + Query Helpers for Templates (no moves yet)

Status: Completed

Steps
1. Add `templateToDTO(domain)` and `templateFromDoc(doc)` to `shared/Mapping.js` (id strip + timestamp normalize).  [COMPLETED]
2. Add `buildTemplateQuery(db, uid, opts)` to `TaskTemplatesRepo` using `FirestoreQueryBuilder` + `PathBuilder`.  [COMPLETED]
3. Quick console/unit smoke for the helper functions.  [PENDING]

Acceptance:
- When called from existing code, the results match before/after for a few sample docs.

---

## Phase 5 — Task Templates Repo Cut (read paths first)

Status: In Progress (steps 1–3 completed)

Steps
1. Implement read methods in `TaskTemplatesRepo`:
   - `getAll(uid, options)`, `get(id)`, `search(uid, query, options)`, `getByFilters(uid, filters, pagination)`.  [COMPLETED]
2. Delegate `taskTemplates.{getAll,get,search,getByFilters}` in `data.js` to the repo (keep logs/try‑catch parity).  [COMPLETED]
3. Manual smoke: list/search/sort/pagination parity.  [PENDING]

Acceptance:
- Manual smoke: list/search/sort/pagination results identical to baseline.

Rollback:
- Restore original implementations.

---

## Phase 6 — Task Templates Repo Cut (write paths + batch/import)

Status: Completed

Steps
1. Implement write methods in `TaskTemplatesRepo`:
   - `create(uid, data)`, `update(id, updates)`, `delete(id)` (soft), `permanentDelete(id)`.
   - Batch ops: `batchUpdate`, `batchActivate`, `batchDeactivate`, `batchCreate`.
   - Import/Export parity with existing methods.  [COMPLETED]
2. Delegate `taskTemplates` write methods in `data.js` to the repo; use `Mapping.stampCreate/stampUpdate`.  [COMPLETED]
3. Manual smoke: create/update/delete, batch ops, import/export counts and timestamps.  [PENDING]

Acceptance:
- Create/update/delete behave identically (timestamps and soft delete flags unchanged).

Rollback:
- Restore original implementations.

---

## Phase 7 — Task Instances Repo Cut (read paths)

Status: In Progress (steps 1–2 completed)

Steps
1. Implement read methods in `TaskInstancesRepo`:
   - `get(id)`, `getForDate(date, opts)`, `getForDateRange(start, end, opts)`, `getByTemplateId(templateId, opts)`.  [COMPLETED]
2. Add instance mappers to `shared/Mapping.js` as needed.  [COMPLETED]
3. Delegate `taskInstances` read methods in `data.js` to the repo.  [COMPLETED]
4. Manual smoke: size and ordering parity across filters.  [PENDING]

Acceptance:
- Parity for list sizes and fields across date/range/template filters.

---

## Phase 8 — Task Instances Repo Cut (write paths + batch/import/cleanup)

Status: Completed

Steps
1. Implement writes in `TaskInstancesRepo`:
   - `create(data)`, `update(id, updates)`, `delete(id)`, `batchCreate`, `batchUpdate`, `batchDelete`.
   - `cleanupOldInstances(retentionDays)`, `exportInstances`, `importInstances`.  [COMPLETED]
2. Delegate `taskInstances` write methods in `data.js` to the repo; use `Retry` + `Mapping`.  [COMPLETED]
3. Manual smoke: status transitions, timestamps, batch counts, cleanup behavior.  [COMPLETED]

Acceptance:
- Behavior identical (status transitions, modified fields, timestamps).

---

## Phase 9 — Daily Schedules Repo Cut

Status: Completed

Steps
1. Implement `DailySchedulesRepo`: `getForDate(date)`, `save(date, data)`, `delete(date)` using `PathBuilder` + `Mapping`.  [COMPLETED]
2. Delegate `dailySchedules` in `data.js` to the repo.  [COMPLETED]
3. Manual smoke: get/save/delete round‑trip.  [COMPLETED]

Acceptance:
- Parity for reading/saving/removing schedule overrides.

---

## Phase 10 — API Surface Cleanup (low risk)

Status: In Progress (steps 1–2 completed)

Steps
1. Export repo classes and shared utilities from a `public/js/data/index.js` barrel.  [COMPLETED]
2. Keep legacy named exports for backward compatibility (no caller changes).  [COMPLETED]
3. Mark `dataUtils.withRetry/timestampToISO` as deprecated (JSDoc) and re‑export from shared.  [COMPLETED]
4. Add JSDoc to each public method (params/returns/errors) for quick IDE help.  [COMPLETED]

Acceptance:
- No consumer changes required; devs can optionally migrate to repos directly.

---

## Phase 11 — Tests & Verification (pragmatic)

Status: In Progress (step 1 completed)

Steps
1. Add lightweight unit tests for `shared/Retry` and `shared/Mapping` (pure functions only).  [COMPLETED]
2. For Firestore paths, rely on manual smoke and emulators; avoid heavy infra.  [PENDING]
3. Add `tests/data/README.md` with a short emulator smoke checklist.  [PENDING]

Acceptance:
- Mapping/Retry helpers validated; manual smoke across the main flows.

---

## Phase 12 — Documentation & Rollback Plan

Status: Pending

Steps
1. Update README with a short “Data Layer Architecture” section linking to repos/shared.
2. Add a brief migration guide in `docs/refactoring/` (optional for future maintainers).
3. Confirm each phase has a one‑step rollback (revert) with no cross‑phase coupling.

Acceptance
- Docs updated; rollback notes present.

---

## Mapping: Legacy → New

- `userSettings.*` → `UserSettingsRepo.*` (delegated by legacy object)
- `taskTemplates.*` → `TaskTemplatesRepo.*` (delegated by legacy object)
- `taskInstances.*` → `TaskInstancesRepo.*` (delegated by legacy object)
- `dailySchedules.*` → `DailySchedulesRepo.*` (delegated by legacy object)
- `dataUtils.withRetry/shouldRetryOperation` → `shared/Retry.*` (re‑exported)
- `dataUtils.timestampToISO` → `shared/Mapping.timestampToISO` (re‑exported)

---

## Risks & Mitigations

- Firestore index/order constraints: The query builder must mirror existing `orderBy` and secondary sorts exactly.
- Timestamp consistency: mappers must maintain ISO string shape already used by UI.
- Batch/import correctness: preserve skip/overwrite semantics exactly; add targeted logs to compare counts.
- Over‑abstraction risk: keep helpers tiny; only add functions where duplication exists.

---

## Success Criteria

- No regressions in data flows across settings/templates/instances/schedules.
- `public/js/data.js` shrinks significantly by delegating to repos and shared helpers.
- Callers unchanged; improved readability and maintainability for future changes.
