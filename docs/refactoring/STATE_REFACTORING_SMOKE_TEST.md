# ST-11 Smoke Test Checklist

Use these steps in the browser DevTools console after running the app. They verify wiring, events, and core flows without changing public APIs.

Prereq
- Confirm `window.stateActions` exists and `state`/`stateListeners` are available: `state`, `stateListeners`, `stateActions`.

Helpers
```
const today = new Date().toISOString().slice(0,10);
const log = (...a) => { console.log('SMOKE:', ...a); };
state.stateListeners?.onAll?.((e) => console.log('EVENT:', e.type, e.data));
```

1) Templates: load/create/update/duplicate/delete/search/filter
- Load: `await stateActions.loadTaskTemplates({ includeInactive: true })`
- Create: `const t = await stateActions.createTaskTemplate({ taskName:'ST11 Smoke', isActive:true, priority:2 }); log('created', t.id);`
- Update: `await stateActions.updateTaskTemplate(t.id, { taskName:'ST11 Smoke Updated' })`
- Duplicate: `const td = await stateActions.duplicateTaskTemplate(t.id, 'ST11 Smoke Dup');`
- Search: `await stateActions.searchTaskTemplates('ST11')`
- Filter: `await stateActions.filterTaskTemplates({ priority: 2 }, { limit: 10, offset: 0 })`
- Delete: `await stateActions.deleteTaskTemplate(t.id)`

Expect
- Events: `taskTemplates`, `templateUpdate`, `templateRemove`, `taskTemplateMetadata`, `taskTemplateSearch`, filters/pagination.
- Selectors reflect changes: `state.getTaskTemplateById(id)`; queues empty.

2) Instances: per-date load/create/update/delete/batch
- Load for date: `await stateActions.loadTaskInstancesForDate(today, { force: true })`
- Create: `const i = await stateActions.createTaskInstance({ templateId: (td?.id||null), date: today, status:'pending' })`
- Update: `await stateActions.updateTaskInstance(i.id, { status:'completed', actualDuration: 30 })`
- Delete: `await stateActions.deleteTaskInstance(i.id)`
- Batch update: `await stateActions.batchUpdateTaskInstances([{ instanceId: i.id, updates: { status:'skipped' } }])`

Expect
- Events: `taskInstances`, `instanceUpdate`, `instanceRemove`, `taskInstanceMetadata`, `instanceBatchUpdate`.
- Selectors reflect changes: `state.getTaskInstancesForDate(today)`.

3) App/meta: view/date/loading/search/filters/online
- View: `stateActions.setCurrentView('library'); state.getCurrentView()`
- Date: `stateActions.setCurrentDate(today); state.getCurrentDate()`
- Loading: `stateActions.setLoading('tasks', true); state.isLoading('tasks') === true; stateActions.setLoading('tasks', false)`
- Search: `stateActions.setSearchQuery('focus'); state.getSearchQuery()`
- Filters: `stateActions.setFilter('timeWindow','morning'); stateActions.setActiveFilters({ mandatory:'all' }); state.getActiveFilters()`
- Online: `stateActions.setOnline(false); state.isOnline() === false; stateActions.setOnline(true)`

Expect
- Events: `view`, `date`, `loading`, `search`, `filters`, `online`.

4) Daily schedules
- Load: `await stateActions.loadDailyScheduleForDate(today)`
- Set: `stateActions.setDailyScheduleForDate(today, { blocks: [] })`

Expect
- Events: `dailySchedules`; selector: `state.getDailyScheduleForDate(today)`.

5) Offline queues
- Go offline: `stateActions.setOnline(false)`
- Queue template op: `await stateActions.createTaskTemplate({ taskName:'ST11 Offline', isActive:true }).catch(()=>{}); state.getTemplateOperationQueue()`
- Queue instance op: `await stateActions.createTaskInstance({ templateId: 'fake', date: today }).catch(()=>{}); state.getInstanceOperationQueue()`
- Back online: `stateActions.setOnline(true); await stateActions.processTemplateOperationQueue(); await stateActions.processInstanceOperationQueue();`

Expect
- Queues clear; events fire for processed operations.

6) Multi-tab sync (optional)
- Open a second tab to the app.
- In Tab A, make a change (e.g., `setCurrentDate(today)`).
- In Tab B, observe the same change and `EVENT:` logs indicating `state-date` messages were handled.

Troubleshooting
- If any call throws, check the console stack for the domain module path (templates/instances/app/user) to confirm the new wiring is active.
- If events don’t appear, ensure the wildcard listener is attached and that `state.stateListeners.onAll` exists.

