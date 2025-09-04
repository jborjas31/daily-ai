# Phase 4 — Responsive Task Management (Action Plan)

Purpose
- Polish the task creation/editing experience, wire core actions across list and timeline, ensure accessibility/keyboard support, and make defaults + validation precise. Build on existing components; avoid re‑writes.

Scope
- Task modal UX (responsive + a11y), smart defaults from context, inline validation, core actions (create/edit/duplicate/soft delete/complete/skip/postpone), recurrence edit options, confirmations and feedback.

Non‑Goals (defer to polish after Phase 4)
- Haptics/long‑press interactions
- Advanced drag‑and‑drop beyond current functionality
- Import/export UI (feature exists but remains hidden for now)

Prerequisites
- TaskModalContainer (existing)
- TemplateDefaultsService, TaskTemplateFormService (existing)
- SimpleValidation + TaskTemplateValidation (existing)
- SimpleErrorHandler (existing)
- TaskActions wiring and state listeners (existing)

---

Checklist (step‑by‑step with files, code touchpoints)

1) Responsive Modal Polish (TaskModalContainer)
- Files:
  - public/js/components/TaskModalContainer.js
  - public/js/features/FocusTrap.js (already exists)
  - public/css/components.css (modal styles), public/css/main.css (focus styles)
- Steps:
 - 1.1 Add `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` on the modal root. Point labelledby to the modal title id. — Completed (in `public/js/components/TaskModalContainer.js`; title `id="taskmodal-v2-title"` with `aria-labelledby` set on dialog)
 - 1.2 Integrate FocusTrap: on open → `FocusTrap.activate(modalEl)`; on close → `FocusTrap.deactivate(modalEl)`. — Completed (activated on mount, deactivated in teardown; see `public/js/features/FocusTrap.js` and container wiring)
 - 1.3 Keyboard handler: close on `Esc`; submit on `Enter` when primary button is enabled and form valid. — Completed (persistent keydown listener; Esc closes; Enter submits when Save enabled and form valid; ignores textarea/contenteditable; cleans up on close)
- 1.4 CSS breakpoints: mobile full‑screen (100vh), tablet/desktop centered (max‑width). Adjust spacing/typography via CSS variables. — Completed (added modal layout + breakpoints in `public/css/components.css`: mobile `height: 100vh`, overlay no padding; desktop centered with `max-width`; header/body/footer spacing with variables and scrollable body)
- 1.5 Focus restoration: store invoker element before open; on close, `requestAnimationFrame(() => invoker?.focus())`. — Completed (stores `document.activeElement` on open; restores focus on next frame in `public/js/components/TaskModalContainer.js`)
- Acceptance:
  - Create/edit fully via keyboard; modal fits mobile (no horizontal scroll); tab order contained; focus returns to trigger.

2) Intelligent Pre‑Fill (Timeline → Modal)
- Files:
  - public/js/components/TimelineGrid.js (or TimelineContainer.js) — capture click/tap context
  - public/js/app.js — handle `addTask` detail payload
  - public/js/components/TaskModalContainer.js — consume initialData
  - public/js/logic/TaskTemplateFormService.js — compute form defaults
  - public/js/logic/TemplateDefaultsService.js — default duration/priority/window
- Steps:
- 2.1 In TimelineGrid click handler, compute `{ defaultTime: 'HH:MM', timeWindow: 'morning|afternoon|evening' }`. — Completed (compute `defaultTime` and `timeWindow` from clicked hour in `public/js/components/TimelineGrid.js` using `public/js/constants/timeWindows.js`)
- 2.2 Dispatch `new CustomEvent('addTask', { detail })` with that payload. — Completed (TimelineGrid now dispatches a global `addTask` event on `document` with `{ defaultTime, timeWindow, scheduledTime, hour }`)
- 2.3 In `app.js` `handleAddTaskAction`, read `event.detail` and call `taskModal.showCreate(detail, onSaved)`. — Completed (handler now consumes payload and passes to modal in `public/js/app.js`)
- 2.4 In `TaskModalContainer.showCreate`, merge `initialData` into the form model, then call `TaskTemplateFormService.applyDefaults(formModel)`. — Completed (merges initial data and applies defaults in `public/js/components/TaskModalContainer.js`; added `applyDefaults` to `public/js/logic/TaskTemplateFormService.js`)
- 2.5 Ensure `TemplateDefaultsService` sets sensible defaults (duration, priority, window, defaultTime) when fields are missing. — Completed (adds window-aware `defaultTime` fallback and maintains duration/priority heuristics in `public/js/logic/TemplateDefaultsService.js`)
- Acceptance:
  - Clicking 09:00 yields prefilled 09:00 (or morning window) in the modal; required fields are prepopulated.

3) Validation & Error UX (Inline + Loading)
- Files:
  - public/js/components/TaskModalContainer.js
  - public/js/utils/SimpleValidation.js, public/js/logic/TaskTemplateValidation.js
  - public/js/utils/SimpleErrorHandler.js
- Steps:
- 3.1 On submit, run SimpleValidation per field and TaskTemplateValidation for cross‑field rules. — Completed (combines `SimpleValidation` per-field with `TaskTemplateValidation.validateForm` in `public/js/components/TaskModalContainer.js` and merges errors by field)
- 3.2 Render inline messages under inputs; add `aria-invalid="true"` and link to message via `aria-describedby`. — Completed (inline error containers already present; now fields/groups get `aria-invalid` and `aria-describedby` set in `TaskModalContainer._applyValidationToSections()`)
- 3.3 Disable submit while saving; show spinner/“Saving…”; re‑enable on error. — Completed (Save button disabled and text changes to “Saving…”/“Creating…” during async save; re‑enabled on error in `public/js/components/TaskModalContainer.js`)
- 3.4 Use SimpleErrorHandler toasts only for network/unknown errors; keep input errors inline. — Completed (validation errors block submit and render inline; network/unknown errors routed to `SimpleErrorHandler.showError` in `TaskModalContainer._handleSave` and hydration paths)
- Acceptance:
  - Specific error messages match requirements; double submit is prevented; successful save removes the loading state and closes modal.

4) Core Actions Wiring (List + Timeline)
- Files:
  - public/js/components/TaskList.js, TaskCard.js (buttons with `data-action`)
  - public/js/components/TaskBlock.js (timeline blocks; action buttons)
  - public/js/app.js (delegated click handler already present)
  - public/js/logic/TaskActions.js (editTask, duplicateTask, toggleTaskCompletion, add skip/postpone exports if missing)
- Steps:
- 4.1 Ensure buttons in TaskList/TaskBlock carry `data-action` and `data-task-id` for: edit-task, duplicate-task, toggle-task-completion, skip-task, postpone-task, soft-delete-task. — Completed (added data attributes in `TaskCard.js`, `TaskBlock.js`, and `TimelineGrid.js` actions)
- 4.2 In `app.js` click delegation, add cases for skip/postpone/soft-delete that call `TaskActions` (implement missing functions). — Completed (added `skip-task`, `postpone-task`, `soft-delete-task` handlers in `public/js/app.js`; implemented `skipTask`, `postponeTask`, `softDeleteTask` in `public/js/logic/TaskActions.js`)
- 4.3 Show toasts on success; route errors to SimpleErrorHandler. — Completed (Task actions show success toasts and route errors in `TaskActions.js`; TimelineGrid delegates completion to container; TaskBlock now shows success toast on completion and routes errors)
- Acceptance:
  - Actions work from both list and timeline; UI updates via state listeners immediately; offline queue still enqueues writes when offline.

5) Recurrence Edit Options (Scope Prompt + Split‑and‑Create)
- Files:
  - public/js/components/TaskModalContainer.js (scope prompt on save when editing recurring template)
  - public/js/logic/TemplateOperationsService.js (implement `splitAndCreateFromDate(templateId, date, updates)`)
  - public/js/state/actions.templates.js (expose action to call TemplateOperationsService)
- Steps:
- 5.1 Detect recurring template on edit; show scope prompt: Only this / This and future / All. — Completed (on Save in edit mode, recurring templates trigger a scope prompt; selection stored for next step in `public/js/components/TaskModalContainer.js`)
- 5.2 Implement `TemplateOperationsService.splitAndCreateFromDate(templateId, date, updates)`: — Completed
      • Update original endDate to (editDate ‑ 1 day)
      • Create new template with updates starting editDate
      • Wired in `TaskModalContainer` when scope = “This and future”; exposed state method `state.splitTemplateFromDate`
- 5.3 For “Only this”, persist changes in instance layer (create/update an instance override for that date). — Completed (added `state.overrideTaskInstanceForDate` using `TaskInstanceManager`; modal maps form fields to instance updates and saves for the current date)
- 5.4 For “All”, apply updates to the template (no split). — Completed (default path in `TaskModalContainer` saves edits via `state.updateTaskTemplate` when scope = “All” or non‑recurring)
- Acceptance:
  - Chosen scope is reflected in Task Library and timeline; historical tasks unchanged; no duplicate or orphan templates.

6) Confirmations & Feedback (Reusable Confirm)
- Files:
  - public/js/components/ConfirmDialog.js (new lightweight component)
  - public/css/components.css (confirm styles)
  - public/js/components/* where destructive actions are triggered
- Steps:
- 6.1 Implement `ConfirmDialog.js` with `role="dialog"`, short message, primary/secondary buttons, focus trap. — Completed (new component at `public/js/components/ConfirmDialog.js`; styles added in `public/css/components.css` with `.confirm-modal` variants)
- 6.2 Integrate confirm for soft delete and duplicate; default focus on safe option on mobile. — Completed (global delegation in `public/js/app.js` shows confirm before duplicate/delete; modal’s Delete uses `ConfirmDialog`; default focus set to Cancel)
- 6.3 Keep copy short and consistent (e.g., “Delete this task?”). — Completed (standardized titles + messages: Duplicate → “Creates a copy in your library.”; Delete → “This removes it from active views. You can restore later.”)
- Acceptance:
  - All destructive actions require explicit confirmation; default focus set on the safest option on mobile.

7) Accessibility & Keyboard (A11y Sweep)
- Files:
  - public/js/components/TaskModalContainer.js
  - public/css/main.css (focus styles), components.css (buttons/inputs)
- Steps:
- 7.1 Add visible focus outlines for buttons/links/inputs; ensure contrast ratios. — Completed (added explicit `:focus-visible` styles for `.btn`, `.action-btn`, `.task-action-btn`, `.input`, `select`, `textarea`, and links; introduced `.btn-danger` for high-contrast destructive actions in `public/css/components.css`)
- 7.2 Ensure all inputs have labels; link errors via `aria-describedby`; mark invalid fields with `aria-invalid`. — Completed (added explicit label for Dependencies select; other fields already labeled; `TaskModalContainer` wires `aria-describedby` and `aria-invalid` for all fields)
- 7.3 Verify Enter submits (when valid) and Esc closes; confirm dialog announces via `aria-labelledby`. — Completed (modal key handler submits on Enter when Save is enabled and valid; Esc closes; ConfirmDialog sets `aria-labelledby`/`aria-describedby` and supports Esc + Enter)
- Acceptance:
  - Keyboard‑only flow works end‑to‑end; quick screen reader pass reads labels and errors sensibly.

---

Verification (Quick Smoke)
- Keyboard‑only flow: Open modal, fill, save, edit, close (Tab/Shift+Tab/Enter/Esc) without mouse.
- Timeline context: Click at 09:00 → modal pre‑fills 09:00 (or morning window); save reflects on timeline.
- Validation cases: Empty name; duration 0 and 481; priority 0 and 6; start> end — each shows precise inline error.
- Actions: Duplicate, soft delete, complete, skip, postpone — all reflect immediately and show a toast.
- Recurrence: Edit a recurring task with each scope option; verify library/timeline reflect scope; history intact.
- Confirm dialogs: Destructive actions always confirm; copy is short; correct default focus.

Rollout / Safety
- Guard feature behind small UI changes; no schema changes.
- Changes are mostly UI; repos/state already in place.
- If issues arise, revert specific UI handlers; state/data layer remains stable.

Notes
- Keep iterations small; validate each subsection with the smoke checklist before moving on.
