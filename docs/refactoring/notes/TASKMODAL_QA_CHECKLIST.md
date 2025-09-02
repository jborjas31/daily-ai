# TaskModal V2 – QA Checklist (Phase 7 / TM-23)

This checklist validates TaskModal V2 (now the default). No feature flag is required.

## Open/Close & Accessibility
- Open create from nav or TaskList button: dialog appears; focus moves inside.
- Esc closes when clean; when dirty, shows confirm prompt.
- Clicking overlay closes when clean; restores focus to opener.
- Tab/Shift+Tab cycles within dialog (focus trap active).
- Screen readers: background has `aria-hidden` while modal is open.

## Basics Section
- Typing in Name/Description/Category updates preview and sets dirty indicator.
- Validation: empty name shows inline error; Save disabled.

## Scheduling Section
- Toggle Flexible/Fixed switches visible controls correctly.
- Fixed: entering time updates 12h hint (if enabled in settings). Validation warns on invalid time.
- Flexible: changing Time Window updates preview.

## Recurrence Section
- Changing frequency shows/hides appropriate controls.
- Interval clamps to >= 1.
- Weekly: selecting days updates model and preview.
- End conditions: End Date and End After inputs accept valid values; show inline errors for invalid.

## Dependencies Section
- Selector lists other templates (excludes self; excludes already-selected).
- Add/Remove works; Up/Down reorders list.
- Inline error appears if dependency rules violated by validator.

## Preview Section
- Refresh shows updated summary.
- Conflict warnings appear when creating overlapping fixed-time tasks.

## Actions Footer
- Dirty indicator appears on change.
- Save disabled when form invalid; enabled when valid.
- Cancel closes; Delete shows confirm in edit mode and removes template.
- Keyboard: Cmd/Ctrl+S triggers save when valid.

## Autosave
- Start creating a template; type fields; close without saving.
- Reopen create: draft restores from localStorage.
- After successful Save, draft clears and does not restore.

## Integration
- TaskList: Create and Edit open the new Task Modal.
- Timeline: Click-to-create and edit open the new Task Modal.

## Regression Checks
- No console errors on open, edit, save, delete.
- State updates reflect in list and timeline after save/delete.

Record any failures with reproduction steps and console errors. Fix blockers before proceeding to TM-24 (cutover).
