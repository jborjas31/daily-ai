# TODO: Task Logic API Migration (Long‑Term Clean Up)

Status: Completed — 2025-09-01

Completion notes
- All call sites migrated to new manager APIs (templates and instances).
- `TIME_WINDOWS` imports normalized to `public/js/constants/timeWindows.js`.
- Compatibility shims removed from `public/js/taskLogic.js`.
- Smoke tests added under `docs/SMOKE_TESTS_TASKLOGIC_MIGRATION.md`.

Goal: migrate every caller to the refactored manager APIs and remove the temporary compatibility shims in `public/js/taskLogic.js`.

Why: the shims were a bridge during the refactor. Migrating call sites removes indirection, reduces coupling, and prevents drift between the façade and the real APIs.

---

## Current State (as of 2025‑08‑31)

- New managers in place:
  - `TaskTemplateManager` with `create(userId, data)`, `update(id, updates)`, `delete(id)`, `duplicate(userId, id, name?)`, and bulk ops via `getBulkOperations()`.
  - `TaskInstanceManager` with CRUD + lifecycle: `markCompleted(id)`, `markSkipped(id)`, `updateScheduledTime(id, hh:mm)`, `postpone(id, date)`.
- Backward‑compatibility shims live in `public/js/taskLogic.js`:
  - Template shims: `createTemplate/updateTemplate/deleteTemplate/duplicateTemplate`, `bulkActivate/bulkDeactivate`.
  - Instance shims: `toggleTaskCompletion(templateId, date)`, `skipTask(templateId, date, reason)`, `postponeTask(templateId, date, minutes)`.
- `TIME_WINDOWS` now resides in `public/js/constants/timeWindows.js` and is also re‑exported from `taskLogic.js` for legacy callers.

Key call sites using legacy names (grep sample):

- Instance actions
  - `public/js/components/TaskBlock.js`: toggle/skip/postpone
  - `public/js/components/TimelineContainer.js`: `window.toggleTaskCompletion`
  - `public/js/components/Timeline.js`: `window.toggleTaskCompletion`
  - `public/js/ui.js` and `public/js/app.js`: `window.toggleTaskCompletion`
- Template actions
  - `public/js/components/TaskList.js`: create/update/delete/duplicate, bulk activate/deactivate
  - `public/js/components/TaskModal.js`: create/update/delete/duplicate
  - `public/js/state.js`: bulk activate/deactivate
  - `public/js/utils/OfflineQueue.js`: duplicate

---

## Phase 1 — Update Call Sites

1) Template operations (rename + signature alignment)

- Replace legacy calls:
  - `createTemplate(userId, data)` → `create(userId, data)`
  - `updateTemplate(id, updates)` → `update(id, updates)`
  - `deleteTemplate(id)` → `delete(id)`
  - `duplicateTemplate(id, name?)` → `duplicate(userId, id, name?)`
  - `bulkActivate(ids)` → `getBulkOperations().bulkActivate(ids)`
  - `bulkDeactivate(ids)` → `getBulkOperations().bulkDeactivate(ids)`

- Practical change notes:
  - `duplicate()` requires `userId`. Use `state.getUser()?.uid` at call sites (not inside the manager) so auth context is explicit and testable.
  - Ensure files import `state` when needed: `import { state } from '../state.js'` (adjust relative path per file).

- Targeted files and examples:
  - `public/js/components/TaskList.js`
    - `createTemplate(formData)` → `create(user.uid, formData)`
    - `updateTemplate(id, updates)` → `update(id, updates)`
    - `deleteTemplate(id)` → `delete(id)`
    - `duplicateTemplate(id)` → `duplicate(user.uid, id)`
    - `bulkActivate(ids)` → `getBulkOperations().bulkActivate(ids)`
    - `bulkDeactivate(ids)` → `getBulkOperations().bulkDeactivate(ids)`
  - `public/js/components/TaskModal.js`
    - Save flow: `updateTemplate/createTemplate/deleteTemplate/duplicateTemplate` → use new names and pass `user.uid` where required.
  - `public/js/state.js`
    - Bulk ops: route through `getBulkOperations()`.
  - `public/js/utils/OfflineQueue.js`
    - Duplicate → `duplicate(user.uid, id)` using `state.getUser()`.
  - `public/js/app.js` and `public/js/ui.js`
    - Any template actions: same substitutions as above.

2) Instance operations (promote template+date flows to first‑class API)

- Add to `public/js/logic/TaskInstanceManager.js`:

```js
// Inside TaskInstanceManager
async resolveInstanceByTemplateAndDate(templateId, date) {
  const user = state.getUser();
  if (!user) throw new Error('No authenticated user');

  // Prefer state cache
  const cached = state.getTaskInstancesForDate(date) || [];
  const hit = cached.find(i => i.templateId === templateId);
  if (hit) return hit;

  // Fallback: load for date then find
  const fetched = await taskInstances.getByDate(user.uid, date);
  const instance = (fetched || []).find(i => i.templateId === templateId);
  if (instance) return instance;

  // Generate if due
  const template = await taskTemplates.get(templateId);
  if (!template) return null;
  return await this.generateFromTemplate(user.uid, template, date);
}

async toggleByTemplateAndDate(templateId, date) {
  const instance = await this.resolveInstanceByTemplateAndDate(templateId, date);
  if (!instance) return null;
  return instance.status !== 'completed'
    ? this.markCompleted(instance.id)
    : this.update(instance.id, { status: 'pending', completedAt: null, actualDuration: null }, 'Toggled to pending');
}

async skipByTemplateAndDate(templateId, date, reason = 'Skipped by user') {
  const instance = await this.resolveInstanceByTemplateAndDate(templateId, date);
  return instance ? this.markSkipped(instance.id, reason) : null;
}

async postponeByTemplateAndDate(templateId, date, minutes = 30) {
  const instance = await this.resolveInstanceByTemplateAndDate(templateId, date);
  if (!instance) return null;
  const toMinutes = (t) => { const [h,m] = (t||'00:00').split(':').map(Number); return h*60 + (m||0); };
  const toTime = (mins) => `${String(Math.floor(mins/60)).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}`;
  const now = new Date();
  const base = instance.scheduledTime ? toMinutes(instance.scheduledTime) : now.getHours()*60 + now.getMinutes();
  return this.update(instance.id, { scheduledTime: toTime(base + Number(minutes||0)) }, 'Postponed by user');
}
```

- Update callers to use these new methods instead of the shimmed ones:
  - `toggleTaskCompletion(templateId, date)` → `toggleByTemplateAndDate(templateId, date)`
  - `skipTask(templateId, date, reason)` → `skipByTemplateAndDate(templateId, date, reason)`
  - `postponeTask(templateId, date, minutes)` → `postponeByTemplateAndDate(templateId, date, minutes)`

- Targeted files and examples:
  - `public/js/components/TaskBlock.js`: replace the three calls.
  - `public/js/components/TimelineContainer.js`, `public/js/components/Timeline.js`, `public/js/ui.js`, `public/js/app.js`: update any `window.toggleTaskCompletion` helpers to call the new manager method; keep the window name for now (minimize UI churn).

3) TIME_WINDOWS imports

- Where code imports `TIME_WINDOWS` from `taskLogic.js`, change to `import { TIME_WINDOWS } from '../constants/timeWindows.js'` (relative path varies). Most files already follow this; verify no stragglers.

Quick grep to migrate callers (do in order, commit each group):

```bash
rg -n "\b(createTemplate|updateTemplate|deleteTemplate|duplicateTemplate)\b" public
rg -n "\b(bulkActivate|bulkDeactivate)\b" public | rg -v TemplateOperationsService
rg -n "\b(toggleTaskCompletion|skipTask|postponeTask)\b" public | rg -v taskLogic.js
```

---

## Phase 2 — Remove Shims

- In `public/js/taskLogic.js`, delete only the compatibility methods after all call sites are migrated and verified:
  - Template shims: `createTemplate/updateTemplate/deleteTemplate/duplicateTemplate`, `bulkActivate/bulkDeactivate`.
  - Instance shims: `toggleTaskCompletion/skipTask/postponeTask`.
- Keep `taskLogic.js` as a minimal composition/exports module for singletons: `taskTemplateManager`, `taskInstanceManager`, `schedulingEngine`, and re‑exported constants if still desired.

---

## Concrete Call‑Site Edits (by file)

- `public/js/components/TaskList.js`
  - Add `const user = state.getUser(); const uid = user?.uid;` in methods that create/duplicate.
  - Replace:
    - `await taskTemplateManager.createTemplate(formData)` → `await taskTemplateManager.create(uid, formData)`
    - `await taskTemplateManager.updateTemplate(id, updates)` → `await taskTemplateManager.update(id, updates)`
    - `await taskTemplateManager.deleteTemplate(id)` → `await taskTemplateManager.delete(id)`
    - `await taskTemplateManager.duplicateTemplate(id)` → `await taskTemplateManager.duplicate(uid, id)`
    - `await taskTemplateManager.bulkActivate(ids)` → `await taskTemplateManager.getBulkOperations().bulkActivate(ids)`
    - `await taskTemplateManager.bulkDeactivate(ids)` → `await taskTemplateManager.getBulkOperations().bulkDeactivate(ids)`

- `public/js/components/TaskModal.js`
  - Save/update/delete/duplicate: same replacements as above; ensure `uid` available.

- `public/js/state.js`
  - Bulk ops: route through `getBulkOperations()`.

- `public/js/utils/OfflineQueue.js`
  - Duplicate: require `uid` from `state.getUser()` and call `duplicate(uid, id)`.

- `public/js/components/TaskBlock.js`
  - Replace instance shim calls with new `*ByTemplateAndDate` methods.

- `public/js/app.js`, `public/js/ui.js`, `public/js/components/Timeline*.js`
  - Update `window.toggleTaskCompletion` implementation to call `taskInstanceManager.toggleByTemplateAndDate(templateId, currentDate)`.

---

## Acceptance Criteria

- No remaining references to legacy names: `createTemplate`, `updateTemplate`, `deleteTemplate`, `duplicateTemplate`, `bulkActivate`, `bulkDeactivate`, `toggleTaskCompletion`, `skipTask`, `postponeTask`.
- All template bulk operations go through `getBulkOperations()`.
- Task instance actions use the new `*ByTemplateAndDate` methods on `TaskInstanceManager`.
- The shims are removed and no regressions observed in manual checks below.

---

## Test Plan (Manual)

Template flows
- Create, update, duplicate, delete in Task Library and modal flows.
- Bulk activate/deactivate selections; verify state badges and counts update.

Instance flows
- From Timeline and Task UI: complete, toggle back to pending, skip with reason, postpone (time shifts forward correctly).
- Verify `state` reflects changes and UI rerenders without console errors.

Offline/rehydration
- With network offline, queue a duplicate and a postpone; bring network online; verify operations replay and persist.

Constants
- Verify all `TIME_WINDOWS` imports resolve from `public/js/constants/timeWindows.js`.

---

## Rollback Plan

- If a regression is found, re‑enable the shims by reverting the shim removal chunk in `public/js/taskLogic.js` while keeping call‑site changes; then fix and re‑migrate.

---

## Notes & Rationale

- Passing `userId` at call sites (instead of inferring inside managers) makes dependencies explicit, simplifies testing, and avoids hidden state coupling.
- The new `*ByTemplateAndDate` instance methods formalize the previously implicit pattern and reduce duplication across UI layers.
