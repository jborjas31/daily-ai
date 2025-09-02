# Smoke Tests — TaskLogic Migration

Use this quick script in the browser DevTools console to validate the migration without navigating all UI flows. Assumes you are signed in and the app is idle on the main screen.

## How to run

1) Open the app in the browser, sign in.
2) Open DevTools Console.
3) Paste the whole script below and press Enter.
4) Run: `smoke.templateOps()` then `smoke.instanceOps()` and `smoke.bulkOps()`.

```js
(function(){
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const getState = window.getState || (()=>null);
  const state = getState && getState();
  const uid = state?.getUser()?.uid;
  const manager = window.taskTemplateManager;
  const instances = window.taskInstanceManager;
  const today = state?.getCurrentDate?.() || new Date().toISOString().slice(0,10);
  const log = (...a) => console.log('[SMOKE]', ...a);

  if (!uid) log('Warning: no user detected; template ops will fail.');
  if (!manager || !instances || !state) log('Warning: required globals not found.');

  async function templateOps(){
    log('templateOps: start');
    const name = `Smoke Test Task ${Date.now()}`;
    // Create
    const created = await manager.create(uid, {
      taskName: name,
      description: 'Smoke test item',
      durationMinutes: 15,
      schedulingType: 'fixed',
      defaultTime: '10:00',
      priority: 3,
      isMandatory: false,
      timeWindow: 'anytime'
    });
    log('created', created?.id);

    // Update
    const updated = await manager.update(created.id, { description: 'Smoke test item (updated)' });
    log('updated ok');

    // Duplicate
    const duplicated = await manager.duplicate(uid, created.id, `${name} (Copy)`);
    log('duplicated', duplicated?.id);

    // Delete original
    await manager.delete(created.id);
    log('deleted original');

    return { created: created.id, duplicated: duplicated.id };
  }

  async function instanceOps(templateId){
    log('instanceOps: start');
    // pick a template if none provided: first active
    if (!templateId){
      const templates = state.getTaskTemplates?.() || [];
      const first = templates.find(t => t?.isActive !== false) || templates[0];
      templateId = first?.id;
    }
    if (!templateId){ log('No template to test'); return null; }

    // Toggle
    const toggled = await instances.toggleByTemplateAndDate(templateId, today);
    log('toggled', !!toggled);
    await sleep(100);
    const toggledBack = await instances.toggleByTemplateAndDate(templateId, today);
    log('toggled back', !!toggledBack);

    // Skip
    const skipped = await instances.skipByTemplateAndDate(templateId, today, 'smoke');
    log('skipped', !!skipped);

    // Postpone
    const postponed = await instances.postponeByTemplateAndDate(templateId, today, 15);
    log('postponed', !!postponed);
    return { templateId };
  }

  async function bulkOps(){
    log('bulkOps: start');
    const templates = (state.getTaskTemplates?.() || []).slice(0,3).map(t=>t.id);
    if (templates.length === 0){ log('No templates available'); return null; }
    await manager.getBulkOperations().bulkDeactivate(templates);
    log('bulk deactivated', templates.length);
    await manager.getBulkOperations().bulkActivate(templates);
    log('bulk reactivated', templates.length);
    return { count: templates.length };
  }

  window.smoke = { templateOps, instanceOps, bulkOps };
  console.info('[SMOKE] Ready: run smoke.templateOps(), smoke.instanceOps(), smoke.bulkOps()');
})();
```

Expected results
- No console errors.
- Success logs appear for every step.
- After `templateOps()`, the duplicated task should be visible in the Task Library.
- After `instanceOps()`, the selected task’s instance for today should reflect toggled/skip/postpone changes.
- After `bulkOps()`, the first 1–3 templates should deactivate then reactivate (verify badges/state).

If any step fails
- Verify you are logged in and network is online.
- Check browser console for validation messages or missing fields.
- If needed, re‑enable shims temporarily via git revert on `public/js/taskLogic.js` and retry to isolate the failure.

