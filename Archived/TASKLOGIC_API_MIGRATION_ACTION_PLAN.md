# TaskLogic API Migration — Action Plan

Status: Completed — 2025-09-01

Summary of completion
- Instance helpers added to `TaskInstanceManager`.
- Instance callers migrated across UI files; `window.toggleTaskCompletion` routes to new API.
- Template callers migrated to `create/update/delete/duplicate(userId, ...)` and bulk via `getBulkOperations()`.
- TIME_WINDOWS imports verified; shims removed from `public/js/taskLogic.js`.

Purpose: implement the new instance methods, migrate callers off legacy shims, and safely remove shims from `public/js/taskLogic.js`.

Outcome: no references to legacy names; all template operations use the new manager APIs; instance actions use first‑class `*ByTemplateAndDate` methods.

---

## Prerequisites

- Confirm call sites can access the authenticated user ID via `state.getUser()?.uid`.
- Ensure all modules import paths are ESM‑correct for the target files.

---

## Step 1 — Implement instance helpers on TaskInstanceManager

Add the following methods to `public/js/logic/TaskInstanceManager.js`:

```js
// Resolve (or generate) an instance for a template/date
async resolveInstanceByTemplateAndDate(templateId, date) {
  const user = state.getUser();
  if (!user) throw new Error('No authenticated user');

  const cached = state.getTaskInstancesForDate(date) || [];
  const hit = cached.find(i => i.templateId === templateId);
  if (hit) return hit;

  const fetched = await taskInstances.getByDate(user.uid, date);
  const instance = (fetched || []).find(i => i.templateId === templateId);
  if (instance) return instance;

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

Notes:
- Prefer using `state` cache for performance; fall back to `taskInstances.getByDate(uid, date)`.
- Generate from template when valid for the given date.

---

## Step 2 — Migrate instance callers

Replace legacy shim calls with the new methods:

- `toggleTaskCompletion(templateId, date)` → `toggleByTemplateAndDate(templateId, date)`
- `skipTask(templateId, date, reason)` → `skipByTemplateAndDate(templateId, date, reason)`
- `postponeTask(templateId, date, minutes)` → `postponeByTemplateAndDate(templateId, date, minutes)`

Target files:
- `public/js/components/TaskBlock.js`
- `public/js/components/TimelineContainer.js`
- `public/js/components/Timeline.js`
- `public/js/ui.js`
- `public/js/app.js`

If you keep `window.toggleTaskCompletion`, update its implementation to call `taskInstanceManager.toggleByTemplateAndDate(...)`.

---

## Step 3 — Migrate template callers

Replace legacy template calls and pass `userId` explicitly where required:

- `createTemplate(userId, data)` → `create(userId, data)`
- `updateTemplate(id, updates)` → `update(id, updates)`
- `deleteTemplate(id)` → `delete(id)`
- `duplicateTemplate(id, name?)` → `duplicate(userId, id, name?)`
- `bulkActivate(ids)` → `getBulkOperations().bulkActivate(ids)`
- `bulkDeactivate(ids)` → `getBulkOperations().bulkDeactivate(ids)`

Target files and hints:
- `public/js/components/TaskList.js`
- `public/js/components/TaskModal.js`
- `public/js/state.js` (bulk ops)
- `public/js/utils/OfflineQueue.js` (duplicate)
- `public/js/app.js`, `public/js/ui.js` (if any template actions live here)

Pattern for `userId`:

```js
import { state } from '../state.js'; // adjust path as needed
const uid = state.getUser()?.uid;
await taskTemplateManager.duplicate(uid, templateId);
```

---

## Step 4 — Verify TIME_WINDOWS imports

Ensure imports come from `public/js/constants/timeWindows.js` rather than `taskLogic.js`.

---

## Step 5 — Grep audit (no legacy names remain)

Commands:

```bash
rg -n "\b(createTemplate|updateTemplate|deleteTemplate|duplicateTemplate)\b" public
rg -n "\b(bulkActivate|bulkDeactivate)\b" public | rg -v TemplateOperationsService
rg -n "\b(toggleTaskCompletion|skipTask|postponeTask)\b" public | rg -v taskLogic.js
```

---

## Step 6 — Remove shims from taskLogic.js

After audits and manual checks pass, delete the compatibility blocks from `public/js/taskLogic.js`:

- Template shims: `createTemplate/updateTemplate/deleteTemplate/duplicateTemplate`, `bulkActivate/bulkDeactivate`.
- Instance shims: `toggleTaskCompletion/skipTask/postponeTask`.

Keep `taskLogic.js` as a thin composition/export of singletons and shared primitives.

---

## Step 7 — Manual test checklist

Template flows
- Create, update, duplicate, delete from Task Library and modal.
- Bulk activate/deactivate selections; verify state and UI badges update.

Instance flows
- Timeline/Task UI: complete, toggle back to pending, skip (with reason), postpone (time increases appropriately).
- Confirm state and UI rerender correctly; no console errors.

Offline/rehydration
- Queue a duplicate and a postpone offline; reconnect; verify replay and persistence.

Constants
- Validate all `TIME_WINDOWS` imports resolve without involving `taskLogic.js`.

---

## Suggested commit sequence

1) feat(instance): add *ByTemplateAndDate helpers to TaskInstanceManager
2) refactor(instance): migrate instance callers to new helpers
3) refactor(templates): migrate template callers; route bulk ops via getBulkOperations
4) chore(constants): normalize TIME_WINDOWS imports
5) chore(audit): remove remaining legacy references
6) refactor(tasklogic): remove compatibility shims

---

## Rollback plan

- If regressions occur after shim removal, temporarily reintroduce the shim block from git history while keeping call‑site changes. Fix issues, re‑test, then remove shims again.
