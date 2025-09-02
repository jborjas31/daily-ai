# TaskModal.js Audit (Phase 1)

Last updated: 2025-09-01

Objective: Identify clear section boundaries and responsibilities in the legacy monolithic `public/js/components/TaskModal.js` to guide decomposition into modular V2 sections and a container.

## High-Level Responsibilities

- UI rendering: Full modal markup, form, tabs (Configure/Preview), and footer actions.
- State/init: Tracks `mode` (create/edit), current task, selected dependencies, weekly recurrence set, preview state, and validation result.
- Event wiring: Attaches many DOM listeners (close, tab switch, inputs, recurrence, dependencies, preview refresh, keyboard).
- Data mapping: Reads/writes from DOM, builds `formData` via `getEnhancedFormData()`.
- Validation: Real-time field-level and full template validation via `taskValidation` service.
- Actions: Save (create/update), Delete, Cancel/Close, Validate, Preview refresh.
- Preview: Generates preview HTML from current form data and simple instance generation helpers.
- Integration: Uses `state`, `taskTemplateManager`, `TIME_WINDOWS`, `taskValidation`, and memory leak prevention utilities.

## Section Boundaries (UI)

1) Basics (Task Information)
- Fields: `taskName`, `description`, `isActive`.
- Errors: `task-name-error`.
- Responsibilities: Basic metadata.

2) Duration & Priority
- Fields: `durationMinutes` (`#duration`), `minDurationMinutes` (`#min-duration`), `priority` (`#priority`), `isMandatory`.
- Real-time coupling: adjusts min duration on duration change; validates.

3) Scheduling
- Fields: `schedulingType` (flexible/fixed), `defaultTime` (for fixed), `timeWindow` (for flexible) from `TIME_WINDOWS`.
- Dynamic UI: toggles visibility of fixed-time vs time-window groups.

4) Dependencies
- UI: dependency selector, add/remove, list of selected dependencies `#selected-dependencies` with chips.
- Data: `dependsOn` as array; internal `selectedDependencies` Set.
- Constraints: prevents self-dependency in rendering logic.

5) Recurrence
- Controls: frequency (none/daily/weekly/monthly/yearly/custom), interval, weekdays, monthly/day-of-month, yearly (month/day), date range (start/end), end-after occurrences, custom patterns (weekdays, weekends, nth_weekday).
- Internal: `recurrenceWeekdays` Set; helpers to render weekday selector and labels.
- Validation: interval >= 1; date range sanity; weekly checkbox handling.

6) Preview
- Tabs: Configure vs Preview; `switchTab('preview')` triggers `refreshPreview()`.
- Rendering: `generateTemplatePreview(formData)` builds HTML summary; simple instance generation for demo; `shouldGenerateInstanceForDate()` checks pattern.

7) Actions Footer
- Buttons: Validate (`#validate-btn`), Save (`#save-btn`), Cancel (`#cancel-btn`), Delete (`#delete-btn` in edit mode).
- Behaviors: validate shows `#validation-status`; save calls create/update; delete prompts and calls `taskTemplateManager.delete` (via dedicated handler).

## Cross-Cutting Concerns

- Validation flows:
  - Real-time: `validateFieldRealTime(fieldId)` covers name, duration, recurrence interval, etc.; maps errors to DOM via `showValidationError`/`clearValidationError`.
  - Full: `taskValidation.validateTemplate(formData)` with structured result and UI status display.
- Data mapping: `getEnhancedFormData()` centralizes DOM→model; used for submit and preview.
- Keyboard/close: Esc to close; clicking overlay closes; clean-up via MemoryLeakPrevention utilities.

## Decomposition Targets (V2 mapping)

- Container: lifecycle, open/close, focus management, draft/dirty tracking, validation orchestration, save/delete routing, event contracts.
- Sections:
  - TemplateBasicsSection: name/description/isActive.
  - DurationPrioritySection: duration/min/priority/isMandatory.
  - SchedulingSection: type/defaultTime/timeWindow.
  - DependenciesSection: dependsOn selector and list.
  - RecurrenceSection: frequency/interval/days/range/custom.
  - PreviewSection: read-only summary + generated insights.
  - ActionsFooter: Validate/Save/Cancel/Delete + dirty indicator.

## Risks/Notes

- Tight coupling between DOM and logic; ensure services for mapping/validation are extracted (Phase 5).
- Cross-field validation spans sections (e.g., scheduling + recurrence); container should coordinate.
- Preview is UX-only; keep optional in first cut of V2 to reduce scope.

