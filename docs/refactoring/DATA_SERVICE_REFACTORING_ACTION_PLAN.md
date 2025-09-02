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

Status: Pending

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

---

## Phase 1 — Repository Skeletons (no logic move yet)

Status: Pending

Add new files (no functional changes yet):
- `public/js/data/repo/UserSettingsRepo.js`
- `public/js/data/repo/TaskTemplatesRepo.js`
- `public/js/data/repo/TaskInstancesRepo.js`
- `public/js/data/repo/DailySchedulesRepo.js`
- `public/js/data/shared/PathBuilder.js` (user/collection/doc helpers)
- `public/js/data/shared/FirestoreQueryBuilder.js` (tiny query helper)
- `public/js/data/shared/Retry.js` (withRetry/shouldRetry)
- `public/js/data/shared/Mapping.js` (toDTO/toDomain; timestamps)

Each repo exports a class with the same method names that exist today but throws `NotImplementedError`. Wire nothing yet.

Acceptance:
- Build passes; no callers changed.

Rollback:
- Remove new files.

---

## Phase 2 — Move Shared Utilities (non‑breaking)

Status: Pending

1. Move `withRetry` and `shouldRetryOperation` from `dataUtils` → `shared/Retry.js`.
2. Move `timestampToISO` and timestamp helpers → `shared/Mapping.js`.
3. Move path builders (userId resolution + collection paths) into `shared/PathBuilder.js`.
4. Introduce `FirestoreQueryBuilder` with only the chaining used today (where/orderBy/limit/startAfter). Keep it as a thin wrapper around Firestore queries.
5. Re‑export from `dataUtils` to preserve existing imports for now (deprecated tag in comment).

Acceptance:
- No behavior change. Existing code still calls `dataUtils.withRetry(...)` etc.

Rollback:
- Revert the re‑exports and deletes.

---

## Phase 3 — User Settings Repo Cut (smallest surface)

Status: Pending

1. Implement `UserSettingsRepo` with methods: `get()`, `save(settings)`, `initialize()`.
2. Replace the internal logic in `userSettings` to delegate to the repo instance. Keep `export const userSettings = { ... }` API stable.
3. Use `PathBuilder` for `users/{uid}` paths; move default settings constants into the repo file for locality.

Acceptance:
- `userSettings.get/save/initialize` return identical results; default initialization still works.

Rollback:
- Point `userSettings` back to its original implementation.

---

## Phase 4 — Mapping + Query Helpers for Templates (no moves yet)

Status: Pending

1. Add template mappers to `shared/Mapping.js`:
   - `templateToDTO(domain)` strips `id`, normalizes timestamps.
   - `templateFromDoc(doc)` returns `{ id, ...data }` and converts Firestore timestamps.
2. Add `buildTemplateQuery(db, uid, opts)` in `TaskTemplatesRepo` using `FirestoreQueryBuilder`.
3. Unit‑test these helpers with a tiny fixture (where possible) or console smoke.

Acceptance:
- When called from existing code, the results match before/after for a few sample docs.

---

## Phase 5 — Task Templates Repo Cut (read paths first)

Status: Pending

1. Implement read‑oriented methods in `TaskTemplatesRepo`:
   - `getAll(uid, options)`
   - `get(id)`
   - `search(uid, query, options)` (retain current approach: fetch all then filter)
   - `getByFilters(uid, filters, pagination)`
2. Update `taskTemplates.{getAll,get,search,getByFilters}` to call the repo, keeping the same export surface. Preserve logs and try/catch behavior.

Acceptance:
- Manual smoke: list/search/sort/pagination results identical to baseline.

Rollback:
- Restore original implementations.

---

## Phase 6 — Task Templates Repo Cut (write paths + batch/import)

Status: Pending

1. Implement write methods in `TaskTemplatesRepo`:
   - `create(uid, data)`, `update(id, updates)`, `delete(id)` (soft), `permanentDelete(id)`
   - Batch operations and `importTemplates(uid, data, { skipDuplicates })`
2. Migrate `taskTemplates` methods to delegate to repo. Use mappers for clean DTOs and timestamp fields.

Acceptance:
- Create/update/delete behave identically (timestamps and soft delete flags unchanged).

Rollback:
- Restore original implementations.

---

## Phase 7 — Task Instances Repo Cut (read paths)

Status: Pending

1. Port reads into `TaskInstancesRepo`:
   - `get(id)`, `getForDate(date, opts)`, `getForDateRange(start, end, opts)`, `getByTemplateId(templateId, opts)`
2. Add mappers for instances in `shared/Mapping.js` similar to templates.
3. Delegate `taskInstances` read methods to repo.

Acceptance:
- Parity for list sizes and fields across date/range/template filters.

---

## Phase 8 — Task Instances Repo Cut (write paths + batch/import/cleanup)

Status: Pending

1. Implement writes in `TaskInstancesRepo`:
   - `create(data)`, `update(id, updates)`, `delete(id)`, batch create/update, cleanup routines, import/export.
2. Delegate `taskInstances` write methods to repo; use Retry + Mapping utilities.

Acceptance:
- Behavior identical (status transitions, modified fields, timestamps).

---

## Phase 9 — Daily Schedules Repo Cut

Status: Pending

1. Implement `DailySchedulesRepo` with `getForDate(date)`, `save(date, data)`, `delete(date)`.
2. Delegate `dailySchedules` object methods to the repo.

Acceptance:
- Parity for reading/saving/removing schedule overrides.

---

## Phase 10 — API Surface Cleanup (low risk)

Status: Pending

1. Keep the legacy named exports for backward compatibility, but also export repo classes for direct use by future code.
2. Mark `dataUtils.withRetry/timestampToISO` as deprecated (point to shared modules). Continue re‑exporting for now.
3. Add small JSDoc to each public method with param/return types and error notes.

Acceptance:
- No consumer changes required; devs can optionally migrate to repos directly.

---

## Phase 11 — Tests & Verification (pragmatic)

Status: Pending

1. Add lightweight unit tests where a pattern already exists (e.g., Mapping and Retry functions).
2. For Firestore calls, rely on current manual smoke tests and emulators where available. Do not add heavy infra.
3. Add a short verification checklist to `tests/data/README.md` explaining how to run a quick local smoke against emulators.

Acceptance:
- Mapping/Retry helpers validated; manual smoke across the main flows.

---

## Phase 12 — Documentation & Rollback Plan

Status: Pending

- Update README link for data layer architecture overview.
- Document module ownership and a short call‑site migration guide (optional).
- Rollback: each phase is an isolated set of file moves and delegations; revert the last phase commit to restore prior behavior.

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

