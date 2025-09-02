# TODO: Task Logic Compatibility Adapter (Quick Fix)

Status: COMPLETED ✅

Implementation summary (what was done):
- Added legacy shim methods on `taskTemplateManager` and `taskInstanceManager` in `public/js/taskLogic.js`.
- Shims map old API calls to new manager APIs and infer `userId` via dynamic import when needed.
- Added safe instance resolution helper using state cache and `dataOffline.taskInstances.getForDate` fallback.
- Included HH:MM <-> minutes helpers for postpone logic.

Files changed:
- Updated: `public/js/taskLogic.js` (added adapter shims and helpers)

Verification steps performed:
- Searched repo for legacy calls (duplicateTemplate, bulkActivate/bulkDeactivate, toggleTaskCompletion/skipTask/postponeTask) to ensure shims cover them.
- Ensured no UI/state changes required for compatibility.

Goal: Restore compatibility between the refactored `public/js/taskLogic.js` and existing UI/state code without touching many files.

Why: Several UI/state call sites still use legacy method names that no longer exist after refactoring. Adding small shims prevents runtime errors while keeping the new architecture intact.

## Scope
- Implement lightweight adapter methods in `public/js/taskLogic.js` that forward to the new manager APIs.
- Keep behavior identical from the perspective of current callers.
- Do not modify UI or state files in this quick pass.

## Changes To Make (in public/js/taskLogic.js)

1) Template manager shims (map legacy to new)
- createTemplate(userId, data) -> `taskTemplateManager.create(userId, data)`
- updateTemplate(templateId, updates) -> `taskTemplateManager.update(templateId, updates)`
- deleteTemplate(templateId) -> `taskTemplateManager.delete(templateId)`
- duplicateTemplate(templateId, customName?) -> resolve `userId` via dynamic import:
  - `const { state } = await import('./state.js')`
  - `const user = state.getUser()`; throw if missing
  - call `taskTemplateManager.duplicate(user.uid, templateId, customName)`
- bulkActivate(templateIds) -> `taskTemplateManager.getBulkOperations().bulkActivate(templateIds)`
- bulkDeactivate(templateIds) -> `taskTemplateManager.getBulkOperations().bulkDeactivate(templateIds)`

2) Instance manager shims (templateId + date semantics)
- toggleTaskCompletion(templateId, date)
  - Resolve instance for (templateId, date) using helper (see below).
  - If instance.status !== 'completed' -> `markCompleted(instance.id)`
  - Else -> `update(instance.id, { status: 'pending', completedAt: null, actualDuration: null }, 'Toggled to pending')`
- skipTask(templateId, date, reason)
  - Resolve instance; call `markSkipped(instance.id, reason || 'Skipped by user')`
- postponeTask(templateId, date, minutes = 30)
  - Resolve instance; compute new `scheduledTime` by adding minutes to existing time or to current time.
  - Clamp to 23:59; call `update(instance.id, { scheduledTime: newTime }, 'Postponed by user')`

3) Helper: resolve instance by template+date
- Add local async function `resolveInstanceByTemplateAndDate(templateId, date)`:
  - `const { state } = await import('./state.js')`
  - `const { taskTemplates } = await import('./dataOffline.js')`
  - `const user = state.getUser()`; throw if missing
  - Try `state.getTaskInstancesForDate(date)` to find an instance with matching `templateId`.
  - If none, call `taskInstanceManager.getByDate(user.uid, date)`, then search again.
  - If still none: fetch template by id; if exists and eligible, call `taskInstanceManager.generateFromTemplate(user.uid, template, date)` and return it.

4) Time utilities inside shim section
- Include small helpers for HH:MM <-> minutes if needed by postpone logic.

## Acceptance Criteria
- No UI/state changes required.
- Existing calls continue to work:
  - `taskTemplateManager.createTemplate/updateTemplate/deleteTemplate/duplicateTemplate`
  - `taskTemplateManager.bulkActivate/bulkDeactivate`
  - `taskInstanceManager.toggleTaskCompletion/skipTask/postponeTask`
- No "is not a function" errors at runtime for the above.

## Test Plan (manual)
- Duplicate a task via UI buttons in Task List and App header.
- Toggle completion from Timeline/Task actions. Ensure it toggles both ways.
- Bulk activate/deactivate from Task Library selection bar.
- Postpone and Skip actions (if present) update as expected.
- Offline mode unaffected (no changes to OfflineQueue).
