# TODO: Time Windows – Settings-Driven, Single Source of Truth

Status: COMPLETED (Phase 1: Unification) ✅

Implementation summary (what was done):
- Created `public/js/constants/timeWindows.js` exporting `TIME_WINDOWS_DEFAULT` (alias `TIME_WINDOWS`) and helpers (`toMinutes`, `toTimeString`, `formatWindowLabel`, `getTimeWindows`).
- Replaced duplicate TIME_WINDOWS definitions with imports from the constants module.
- Updated imports across logic, validation, and components to use the new constants module.

Files added/updated:
- Added: `public/js/constants/timeWindows.js`
- Updated: `public/js/taskLogic.js` (re-export constants)
- Updated: `public/js/logic/SchedulingEngine.js` (import constants)
- Updated: `public/js/utils/TaskValidation.js` (import constants)
- Updated: `public/js/components/TaskList.js` (import constants)
- Updated: `public/js/components/TaskModal.js` (import constants)

Notes:
- Future enhancement (Phase 2) remains: wire `getTimeWindows(state.getSettings())` to derive windows from user settings when desired.

Goal: Replace duplicated, hardcoded time window constants with a single, settings-driven source of truth shared across logic, validation, and UI.

Why: `TIME_WINDOWS` currently exists in multiple places (e.g., `taskLogic.js`, `logic/SchedulingEngine.js`). Duplicates can drift over time. A central module reduces bugs and aligns with the single source of truth principle.

## Design
- Create a dedicated module that exports:
  1) `getTimeWindows(settings)` – returns windows derived from user settings when applicable and defaults when not.
  2) `TIME_WINDOWS_DEFAULT` – baseline definition for Morning (06:00–12:00), Afternoon (12:00–18:00), Evening (18:00–23:00), Anytime (06:00–23:00).
  3) Helpers: `toMinutes('HH:MM')`, `toTimeString(minutes)`, and `formatWindowLabel({startMin,endMin})`.
- Represent windows in minutes internally: `{ key, startMin, endMin, label }`.
- Future-ready: later we can read user overrides (regional preferences) from settings and adjust the output of `getTimeWindows(settings)`.

## Steps
1) Add new module: `public/js/constants/timeWindows.js`
   - Export `TIME_WINDOWS_DEFAULT` and helpers.
   - Export `getTimeWindows(settings)` that returns a normalized map (keys: morning/afternoon/evening/anytime) and string labels.

2) Update imports to use the new module
   - `public/js/taskLogic.js` → `import { TIME_WINDOWS_DEFAULT as TIME_WINDOWS } from './constants/timeWindows.js'`
   - `public/js/logic/SchedulingEngine.js` → `import { TIME_WINDOWS_DEFAULT as TIME_WINDOWS } from '../constants/timeWindows.js'` (and remove local duplicates)
   - `public/js/utils/TaskValidation.js` → import from `../constants/timeWindows.js` directly (stop importing from `taskLogic.js`).
   - Components (e.g., `TaskList.js`, `TaskModal.js`) → import from `../constants/timeWindows.js` instead of `../taskLogic.js`.

3) Remove duplicate definitions
   - Delete any in-file `TIME_WINDOWS = {...}` objects in files that now import from the constants module.

4) Optional enhancement (future)
   - Replace static `TIME_WINDOWS_DEFAULT` usage in scheduling/validation with `getTimeWindows(state.getSettings())` so windows respond to settings.

## Acceptance Criteria
- Only one canonical definition remains in `public/js/constants/timeWindows.js`.
- Ripgrep search `TIME_WINDOWS\s*=\s*\{` finds no duplicates outside the constants file.
- Scheduling, validation, and UI render correct labels and boundaries.

## Test Plan (manual)
- Verify TaskModal and TaskList show correct labels for time windows.
- Generate a schedule and ensure engine still respects the intended windows.
- (Future) Adjust settings and confirm `getTimeWindows(settings)` output changes propagate when integrated.
