# Timeline.js Refactoring Action Plan

**🎯 Current Status:** Phase 5 ✅ COMPLETED  
**📅 Last Updated:** 2025-09-01  
**⏭️ Next Action:** Phase 5 - Final code review and CSS audit  

**Objective:** Decompose the monolithic `Timeline.js` component into a modular, performant, and maintainable architecture, following the patterns established in the successful `taskLogic.js` refactoring.

**📋 Overall Progress:**
- **Phase 1:** ✅ COMPLETED (4/4 steps complete)
- **Phase 2:** ✅ COMPLETED (2/2 steps complete)  
- **Phase 3:** ✅ COMPLETED (3/3 steps complete)
- **Phase 4:** ✅ COMPLETED
- **Phase 5:** ✅ COMPLETED (3/3 steps complete)

**✅ Completed Components:**
- `public/js/components/TimelineHeader.js` - Date navigation, time display, filters with event emission
- `public/js/components/TimelineGrid.js` - Main timeline grid with hourly layout, task blocks, sleep blocks, and real-time indicator
- `public/js/components/TimelineContainer.js` - Smart container orchestrating header and grid components with state management

**Guiding Principles:**

*   **Separation of Concerns:** Strictly separate "smart" container components (state and logic) from "dumb" presentational components (rendering).
*   **Granular DOM Updates:** Eliminate full `innerHTML` replacements in favor of targeted DOM manipulation for efficient, non-destructive updates.
*   **Centralized Business Logic:** Move all business logic and data calculations to the `logic/` layer. Components should receive data ready for display.
*   **Modular Interaction Logic:** Extract complex UI interactions (like Drag & Drop) into independent, reusable modules.

---

### Phase 1: Initial Component Decomposition ✅ **COMPLETED** (4/4 Steps Complete)

**Goal:** Create the new component structure and integrate it into the application without breaking existing functionality. The old `Timeline.js` will serve as a source for copy-pasting logic during this phase.

**Progress Summary:**
- ✅ **Step 1/4 COMPLETE:** TimelineHeader.js component created and tested
- ✅ **Step 2/4 COMPLETE:** TimelineGrid.js component created with full grid rendering logic
- ✅ **Step 3/4 COMPLETE:** TimelineContainer.js smart container created with complete orchestration
- ✅ **Step 4/4 COMPLETE:** Integration and verification completed successfully

1.  **✅ Create `components/TimelineHeader.js`:** **COMPLETED** 
    *   **Status:** ✅ **COMPLETED** - TimelineHeader component successfully created and tested (2025-08-31)
    *   **Action:** Create a new `TimelineHeader.js` file.
    *   **Responsibility:** This component will manage the date display, navigation arrows, and filter controls.
    *   **Implementation:**
        *   ✅ Copy the relevant HTML generation from `Timeline.js` into a `render()` method.
        *   ✅ Copy the event listeners for the navigation and filter buttons.
        *   ✅ Instead of directly manipulating state, this component should emit custom events (e.g., `dispatch('navigate-day', { direction: 'next' })`).
    *   **Achievements:**
        *   ✅ Complete component lifecycle with `update()`, `render()`, `cleanup()`, `destroy()` methods
        *   ✅ Event-driven architecture emitting `navigate-day`, `go-to-today`, `time-filter-change` events
        *   ✅ Memory-safe implementation using SafeEventListener with proper cleanup
        *   ✅ Real-time time display updates with `updateCurrentTime()` method
        *   ✅ Filter statistics calculation and display for time blocks
        *   ✅ JavaScript syntax validation passed
        *   ✅ Follows established patterns from existing components (TaskBlock.js event emission)

2.  **✅ Create `components/TimelineGrid.js`:** **COMPLETED**
    *   **Status:** ✅ **COMPLETED** - TimelineGrid component successfully created with comprehensive grid rendering (2025-08-31)
    *   **Action:** Create a new `TimelineGrid.js` file.
    *   **Responsibility:** This "dumb" component will be responsible for rendering the hourly grid and the task blocks within it.
    *   **Implementation:**
        *   It will receive the complete schedule data (tasks, sleep times, etc.) as a prop.
        *   Copy the core grid and task rendering logic from the `render()` method of the old `Timeline.js`. For now, it will still generate HTML strings.
    *   **Achievements:**
        *   ✅ Complete 24-hour grid rendering with adaptive hourly rows and time filtering support
        *   ✅ Real-time indicator positioning with automatic updates via updateTimeIndicator() method
        *   ✅ Sleep block visualization with cross-midnight handling for complex sleep schedules
        *   ✅ Comprehensive task block rendering with all styling classes (priority, conflicts, categories)
        *   ✅ Drag-and-drop support with event emission for task rescheduling
        *   ✅ Click-to-create functionality for easy task creation at specific times
        *   ✅ Task action buttons (complete, edit) with proper event handling
        *   ✅ Progress bars for in-progress tasks and overdue indicators for overdue tasks
        *   ✅ Performance tracking with render metrics and debug logging capability
        *   ✅ Memory-safe event handling using SafeEventListener with comprehensive cleanup
        *   ✅ All utility methods extracted (timeStringToMinutes, task status, styling classes)
        *   ✅ Event-driven architecture following TimelineHeader.js patterns with custom event emission

3.  **✅ Create `components/TimelineContainer.js`:** **COMPLETED**
    *   **Status:** ✅ **COMPLETED** - TimelineContainer smart container successfully created with comprehensive orchestration (2025-08-31)
    *   **Action:** Create a new `TimelineContainer.js` file.
    *   **Responsibility:** This "smart" container will replace the old `Timeline.js` as the main entry point. It will orchestrate all child components and manage state.
    *   **Implementation:**
        *   Subscribe to the necessary state listeners (`state.stateListeners.on(...)`).
        *   Contain the logic to fetch and process data (e.g., calling `schedulingEngine.generateScheduleForDate`).
        *   In its `render()` method, it will instantiate `TimelineHeader` and `TimelineGrid`, passing the processed data down as props.
        *   Listen for events from child components and dispatch actions to the central state.
    *   **Achievements:**
        *   ✅ Complete state management integration with listeners for date, taskTemplates, taskInstances, and userSettings
        *   ✅ Smart container orchestration managing TimelineHeader and TimelineGrid child components
        *   ✅ Comprehensive event handling system for child component events (navigation, filters, task interactions)
        *   ✅ Data loading and processing using schedulingEngine.generateScheduleForDate with error handling
        *   ✅ Real-time update system with timer management and performance optimization
        *   ✅ Drag-and-drop task rescheduling with validation and state updates
        *   ✅ Performance monitoring with detailed metrics tracking for renders, refreshes, and data loading
        *   ✅ Memory-safe implementation using SafeEventListener and ComponentManager integration
        *   ✅ Responsive window handling with resize and visibility change optimization
        *   ✅ Complete component lifecycle management (init, render, refresh, cleanup, destroy)
        *   ✅ Event-driven architecture maintaining separation of concerns between container and presentational components

4.  **✅ Integrate and Verify:** **COMPLETED**
    *   **Status:** ✅ **COMPLETED** - Application successfully integrated with new component architecture (2025-08-31)
    *   **Action:** Update `app.js` (or the main layout file) to initialize `TimelineContainer.js` instead of the old `Timeline.js`.
    *   **Goal:** The application should look and function exactly as it did before, but with the new component structure in place.
    *   **Achievements:**
        *   ✅ Updated app.js import from Timeline.js to TimelineContainer.js
        *   ✅ Updated ui.js to use TimelineContainer instead of Timeline in initializeTimeline()
        *   ✅ Updated components/index.js to export both Timeline and TimelineContainer for compatibility
        *   ✅ Added new component files to service worker cache (sw.js) for offline support
        *   ✅ Syntax validation passed for all updated files (app.js, ui.js, components/index.js)
        *   ✅ Integration testing completed - no breaking changes detected
        *   ✅ Application maintains existing API surface while using new modular architecture
        *   ✅ Backwards compatibility maintained through dual Timeline/TimelineContainer exports

---

### Phase 2: Granular Rendering and `TaskBlock.js` Adoption ✅ **COMPLETED** (2/2 Steps Complete)

**Goal:** Eliminate the main source of inefficiency by replacing `innerHTML` rendering with a more granular approach.

**Progress Summary:**
- ✅ **Step 1/2 COMPLETE:** TimelineGrid.js rendering refactored to use DOM manipulation instead of HTML strings
- ⏸️ **Step 2/2 PENDING:** DOM reconciliation strategy implementation

1.  **✅ Refactor `TimelineGrid.js` Rendering:** **COMPLETED**
    *   **Status:** ✅ **COMPLETED** - TimelineGrid rendering successfully refactored to use DOM manipulation (2025-09-01)
    *   **Action:** Modify the `render()` method in `TimelineGrid.js`.
    *   **Implementation:**
        *   Instead of generating a massive HTML string for all tasks, loop through the task data.
        *   For each task, instantiate the existing `TaskBlock.js` component, passing the task data as a prop.
        *   Append the rendered `TaskBlock` element to the grid.
    *   **Achievements:**
        *   ✅ Refactored `renderTaskBlocks()` method to return DocumentFragment instead of HTML strings
        *   ✅ Created `createTaskBlockElement()` method for individual task DOM element creation
        *   ✅ Implemented DOM-based task block content creation with `createTaskBlockContent()`, `createTaskBlockMeta()`, and `createTaskBlockActions()`
        *   ✅ Replaced HTML string-based progress bar rendering with `createProgressBarElement()`
        *   ✅ Replaced HTML string-based priority indicator with `createPriorityIndicatorElement()`  
        *   ✅ Updated main `render()` method to handle DOM elements instead of HTML strings
        *   ✅ Updated `renderTimelineGrid()` to use hybrid DOM/HTML approach (partial refactoring)
        *   ✅ Maintained all existing functionality including positioning, styling, data attributes, and event handling
        *   ✅ Cleaned up redundant HTML string methods (`renderProgressBar`, `getPriorityIndicator`)
        *   ✅ Syntax validation passed - no JavaScript errors introduced

2.  **Implement a DOM Reconciliation Strategy (Minimal):** ✅ COMPLETED
    *   **Action:** Implemented direct, keyed updates in `TimelineGrid.js` without full re-render.
    *   **Approach Implemented:**
        *   Keyed by `data-task-id` with `taskNodeMap: Map<taskId, HTMLElement>`.
        *   Watched fields: `status`, `scheduledTime`, `durationMinutes`, `priority` via `taskFieldCache`.
        *   On refresh: remove stale nodes, create missing nodes, and update existing nodes only if any watched field changed.
        *   No hashing/virtualization; compares the four fields directly (`getWatchedFieldsKey`).
        *   Batched DOM writes using `requestAnimationFrame`; new nodes appended via `DocumentFragment`.
        *   Listener tokens are properly removed on node deletion; metrics remain accurate.

---

## Event Contract (Minimal)

Use a small, fixed set of custom events to coordinate components:
- `navigate-day`: `{ days: number }`
- `go-to-today`: `{}`
- `time-filter-change`: `{ filter: string }`
- `task-complete`: `{ taskId: string }`
- `task-edit`: `{ taskId: string }`
- `task-drop`: `{ taskId: string, newTime: string /* HH:MM */ }`
- `click-to-create`: `{ time: string /* HH:MM */ }`

Events should bubble and be cancelable where appropriate.

---

## Acceptance Criteria (Minimal)

- No full-grid re-render on updates; only affected task nodes change.
- Toggle/skip/postpone updates a single block without visible flicker.
- Drag/drop moves one block; click-to-create adds one block at the chosen time.
- After 10 consecutive updates: no duplicate listeners and no console errors.

---

## Test Plan (Quick)

Run quickly in the app:
- Toggle a task twice (complete → pending) and confirm only its node updates.
- Skip a task; confirm badge/status updates without grid rebuild.
- Postpone a task by 30 minutes; confirm its position/label adjusts.
- Drag/drop a task to a new hour; confirm it persists after refresh.
- Click-to-create at hour N; confirm a new block appears at N.
- Navigate prev/next day and back to today; confirm correct blocks appear.

---

### Phase 3: Extract Interaction Logic into Feature Modules ✅ COMPLETED (3/3 Steps Complete)

**Goal:** Decouple complex UI interactions from the component, making them independent and reusable.

1.  **Create `features/TimelineDragDrop.js`:** ✅ COMPLETED
    *   **Action:** New feature module added for drag-and-drop logic.
    *   **Implementation:**
        *   Class `TimelineDragDrop` takes the grid root element and uses delegated listeners for `dragstart`, `dragover`, and `drop`.
        *   Emits `task-drag-start` and `task-drop` custom events; does not manipulate state directly.
        *   Integrated into `TimelineGrid` via feature initialization, replacing inline drag listeners. Safe cleanup included.

2.  **Create `features/TimelineContextMenu.js`:** ✅ COMPLETED
    *   **Action:** Context menu logic extracted into a feature module.
    *   **Implementation:**
        *   Delegated listeners for `contextmenu` and long-press (`pointerdown` + timeout) on `.task-block` elements.
        *   Creates, positions, and destroys a lightweight menu DOM with common actions.
        *   Emits events: `task-complete`, `task-edit`, `task-skip`, `task-postpone` (with `deltaMinutes`), `task-delete`.
        *   Integrated in `TimelineGrid` and handled in `TimelineContainer` with state updates via `taskInstanceManager` and `state.deleteTaskTemplate`.

3.  **Create `features/TimelineInlineEdit.js`:** ✅ COMPLETED
    *   **Action:** Inline editing logic extracted to feature module.
    *   **Implementation:**
        *   Listens for double-clicks on `.task-block` names and replaces with an input field.
        *   Commits on Enter (emits `task-rename` with `{ taskId, newName }`), cancels on Escape/blur.
        *   Integrated into `TimelineGrid`; `TimelineContainer` persists via `state.updateTaskTemplate` and refreshes.

---

### Phase 4: Centralize Remaining Business Logic ✅ COMPLETED

**Goal:** Ensure the UI layer is free of business logic, making components purely presentational.

1.  **Move Smart Scheduling Logic:** ✅
    *   **Implementation:**
        *   `logic/SchedulingEngine.js` now includes `findOptimalTimeSlots`, `findAvailableSlots`, `calculateSlotScore`, and `getRecommendationReason`.
        *   Provides reusable helpers for any UI to request suggested time slots from the engine.

2.  **Centralize Display Calculations:** ✅
    *   **Implementation:**
        *   Added `logic/TaskDisplayLogic.js` with `getTaskStatus`, `getTaskProgress`, and `determineTaskCategory`.
        *   `TimelineGrid` now imports and uses `TaskDisplayLogic` instead of local methods.
        *   Components remain presentational; business rules for status/progress/category live in `logic/`.

---

### Phase 5: Final Cleanup ✅ COMPLETED (3/3)

**Goal:** Remove all remnants of the old architecture.

1.  **Delete `Timeline.js`:** ✅ COMPLETED
    *   **Action:** Removed `public/js/components/Timeline.js` and purged references.
    *   **Implementation Notes:**
        *   Removed import/exports from `public/js/components/index.js`.
        *   Removed from Service Worker cache list (`public/sw.js`).

2.  **CSS (Keep Stable for Now):** ✅ COMPLETED
    *   **Action:** Reused existing classes and added minimal modifiers without altering behavior.
    *   **Implementation:**
        *   Added aliases in CSS so both legacy and modifier classes work:
          - `.task-block--completed`, `.task-block--skipped`, `.task-block--overdue`, `.task-block--in-progress`.
          - Priority modifiers: `.task-block--priority-{1..5}` mapped to existing priority styles.
        *   No JS changes required; components keep existing class names.

3.  **Final Code Review:** ✅ COMPLETED
    *   **Action:** Reviewed `TimelineContainer`, `TimelineGrid`, and `TimelineHeader` for architectural compliance.
    *   **Results:**
        *   `TimelineGrid` no longer imports `state`; business logic for status/progress/category moved to `logic/TaskDisplayLogic.js`.
        *   Feature modules handle interactions; container persists state changes.
        *   No stray DOM manipulation or state mutations in presentational components.
