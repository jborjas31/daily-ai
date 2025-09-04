# Data Service – Phase 0 Inventory

Scope: `public/js/data.js` (current live implementation behind `dataOffline.js`)

Purpose: Baseline the current API surface and identify shared patterns to extract in later phases. No behavior changes.

## 1) Exports Inventory (Owners → Functions)

- userSettings
  - get()
  - save(settings)
  - initialize()

- taskTemplates
  - getAll(uid?, options)
  - get(id)
  - search(uid?, query, options)
  - getByFilters(uid?, filters, pagination)
  - create(uid?, data)
  - update(id, updates)
  - delete(id)                 // soft delete (isActive=false, timestamps)
  - permanentDelete(id)
  - batchUpdate(ids, updates)
  - batchActivate(ids)
  - batchDeactivate(ids)
  - batchCreate(uid?, templatesData)
  - getStats(uid?)
  - exportTemplates(uid?, includeInactive)
  - importTemplates(uid?, importData, options)

- taskInstances
  - get(id)
  - getForDate(date, options)
  - getForDateRange(startDate, endDate, options)
  - getByTemplateId(templateId, options)
  - create(instanceData)
  - update(id, updates)
  - delete(id)
  - batchUpdate(ids, updates)
  - batchCreate(instancesData)
  - batchDelete(ids)
  - cleanupOldInstances(retentionDays)
  - exportInstances(dateRange, options)
  - importInstances(importData, options)

- dailySchedules
  - getForDate(date)
  - save(date, schedule)
  - delete(date)

- dataUtils
  - formatDate(date?) → YYYY-MM-DD
  - getTodayDateString()
  - getCurrentTimestamp()
  - addDaysToDate(date, days) → YYYY-MM-DD
  - getDateRange(start, end) → [YYYY-MM-DD]
  - validateTask(taskData, existingTemplates?) → messages[]
  - quickValidateTask(taskData) → messages[]
  - validateTaskInstance(instanceData, template?) → messages[]
  - sanitizeInput(str)
  - cleanObjectData(obj, { removeEmpty?, sanitizeStrings? })
  - shouldRetryOperation(error, attempt?, maxAttempts?)
  - withRetry(operation, maxAttempts?, delayMs?)
  - timestampToISO(timestamp)
  - isOffline()
  - simpleHash(data)

## 2) Call Site Overview (high level)

- App consumes via `public/js/dataOffline.js`, which delegates to `utils/OfflineDataLayer.js` and ultimately to `public/js/data.js` for online paths.
- State/actions modules import `{ taskTemplates, taskInstances, dataUtils }` from `dataOffline.js`.
- Managers (`logic/TaskInstanceManager.js`, etc.) also import from `dataOffline.js`.
- Conclusion: External API must remain stable; repos will be wired behind the legacy exports.

## 3) Repeated Patterns to Extract (Phase 2 targets)

- Path building
  - Repeated `db.collection('users').doc(uid).collection('<name>')` and `.doc(id)` chains.
  - Owner: `shared/PathBuilder`.

- Timestamps and mapping
  - Consistent stamping of `createdAt`, `updatedAt`, `modifiedAt`, `deletedAt`.
  - Normalization via `timestampToISO` when reading.
  - Owner: `shared/Mapping`.

- Retry/backoff
  - `withRetry` and `shouldRetryOperation` used for resilience and offline conditions.
  - Owner: `shared/Retry`.

- Query boilerplate
  - `where/orderBy/limit/startAfter` chains with common defaults and secondary sort.
  - Owner: `shared/FirestoreQueryBuilder` (thin wrapper around Firestore queries used today).

- Data cleaning
  - `cleanObjectData` and `sanitizeInput` before writes/updates.
  - Owner: remain accessible via `dataUtils`, but core logic can live in a shared util and be re‑exported.

## 4) Smoke Test Checklist (manual)

- userSettings
  - get(): returns defaults when no doc; returns saved values when present.
  - save(): merges and persists; subsequent get() reflects updates.
  - initialize(): creates defaults only when doc does not exist.

- taskTemplates
  - getAll(): respects `includeInactive`, filters, ordering, and limit.
  - get(): returns `{id, ...data}` or errors if missing.
  - search(): case‑insensitive name/description contains; matches getAll() filters.
  - getByFilters(): applies equality filters; paginates with `createdAt` ordering; `hasMore` correctness.
  - create/update/delete/permanentDelete: timestamps and soft delete flags as today; update returns updated record.
  - batch ops: correct counts and timestamps; batchCreate returns created items with ids.
  - getStats(): totals and distributions match template set.
  - export/import: counts and duplicate skipping behavior match.

- taskInstances
  - get/getForDate/getForDateRange/getByTemplateId: correct filters, ordering, and sizes.
  - create/update/delete: timestamps, `modifiedAt` behavior, and returned shapes.
  - batch ops: update/create/delete counts and timestamps.
  - cleanupOldInstances: respects retention and deletes in batches.
  - export/import: range filtering and duplicate handling.

- dailySchedules
  - getForDate returns null when missing; save/delete round‑trip.

- dataUtils
  - format/add/getDateRange correctness; retry stops after max; `timestampToISO` handles both `Timestamp` and ISO string.

## 5) Acceptance

- Inventory complete and mapped to future owners.
- Shared patterns identified for extraction in Phase 2.
- Manual smoke checklist defined to verify parity during refactors.

