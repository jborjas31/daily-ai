# Bite-Sized Action Plan: Global Scope Cleanup (for AI Assistants)

This document breaks down the `GLOBAL_SCOPE_CLEANUP_ACTION_PLAN.md` into small, specific, and sequential tasks that can be executed by an AI assistant.

**Goal:** To eliminate global variables one by one, making the codebase cleaner and more maintainable.

---

## Task 1: Refactor `window.taskList` ✅ COMPLETED

*   **File to Modify:** `public/js/app.js`
*   **Action:** ~~Find and delete the line `window.taskList = taskList;`.~~ 
*   **Verification:** ~~Open the application in a browser. The main "Today" view should still display the list of tasks correctly. You should be able to interact with the tasks as before.~~
*   **Status:** Completed - Global assignment removed from line 349. TaskList functionality preserved through existing imports in ui.js.

---

## Task 2: Refactor `window.taskTemplateManager` ✅ COMPLETED

*   **File to Modify:** `public/js/app.js`
*   **Action:** ~~Find and delete the line `window.taskTemplateManager = taskTemplateManager;`.~~
*   **Verification:** ~~Open the application. Go to the "Task Library" view. The list of task templates should load correctly. You should be able to create, edit, and delete task templates.~~
*   **Status:** Completed - Global assignment removed from line 348. TaskTemplateManager functionality preserved through existing imports in ui.js and state.js.

---

## Task 3: Refactor `window.schedulingEngine` ✅ COMPLETED

*   **File to Modify:** `public/js/app.js`
*   **Action:** ~~Find and delete the line `window.schedulingEngine = schedulingEngine;`.~~
*   **Verification:** ~~Open the application. The scheduling of tasks on the timeline in the "Today" view should work as expected. Creating a new task and seeing it appear on the timeline should still work.~~
*   **Status:** Completed - Global assignment removed from line 348. SchedulingEngine functionality preserved through existing import in ui.js for timeline generation.

---

## Task 4: Refactor `window.taskModal` ✅ COMPLETED

*   **File to Modify:** `public/js/app.js`
*   **Action:** ~~The global `window.taskModal` is created with `new TaskModalContainer()`. The local `taskModal` constant should be used instead.~~
    1.  ~~Find and delete the line `window.taskModal = new TaskModalContainer();`.~~
    2.  ~~Search for any usages of `window.taskModal` in the codebase and replace them with the local `taskModal` constant, which is already available in `app.js`.~~
*   **Verification:** ~~Open the application. Click the "Add Task" button. The task creation modal should appear and function correctly. Find an existing task and try to edit it. The task editing modal should appear and function correctly.~~
*   **Status:** Completed - Created exported taskModal constant in app.js and updated all usages in ui.js, TaskList.js, and TimelineContainer.js to import and use the local constant instead of global assignment.

---

## Task 5: Refactor `window.stateActions` and `window.getState` ✅ COMPLETED

*   **File to Modify:** `public/js/app.js`
*   **Action:** ~~Find and delete the lines `window.stateActions = stateActions;` and `window.getState = () => state;`.~~
*   **Verification:** 
    ~~1. Open the browser developer console and verify these globals are no longer accessible by typing `window.stateActions` (should return `undefined`)~~
    ~~2. Open the app and confirm that your tasks and settings load correctly~~
    ~~3. Try creating a new task to ensure state management still works~~
    ~~4. Check the browser console for any errors related to missing state functions~~
*   **Status:** Completed - Removed both global assignments from lines 351-352. State management functionality preserved through proper imports in modules that need access to state and stateActions.

---

## Task 6A: Create TaskActions Module ✅ COMPLETED

*   **File to Create:** `public/js/logic/TaskActions.js`
*   **Action:** 
    ~~1. Create the `public/js/logic/` directory if it doesn't exist~~
    ~~2. Create the new file `TaskActions.js`~~
    ~~3. Cut the `editTask`, `duplicateTask`, and `toggleTaskCompletion` functions from `public/js/app.js`~~
    ~~4. Paste them into the new `TaskActions.js` file~~
    ~~5. Export each function: `export const editTask = ...`, etc.~~
*   **Verification:** ~~Check that the functions no longer exist in `app.js` and are present in the new `TaskActions.js` file.~~
*   **Status:** Completed - Created TaskActions.js module with proper imports (state, taskTemplateManager, taskInstanceManager, SimpleErrorHandler, taskModal). Moved and exported all three functions. Cleaned up unused imports in app.js.

---

## Task 6B: Add Imports to TaskActions Module ✅ COMPLETED

*   **File to Modify:** `public/js/logic/TaskActions.js`
*   **Action:** ~~Add the necessary import statements at the top of the file for dependencies used by the moved functions. Common imports will likely include:~~
    ~~```javascript
    import { state, stateActions } from '../state.js';
    import { taskTemplateManager, taskInstanceManager } from '../taskLogic.js';
    import { SimpleErrorHandler } from '../utils/SimpleErrorHandler.js';
    // Add other imports as needed based on what the functions actually use
    ```~~
*   **Verification:** ~~Check the browser console for any import errors when loading the app.~~
*   **Status:** Completed - Already completed during Task 6A. All necessary imports are in place: state, taskTemplateManager, taskInstanceManager, SimpleErrorHandler, and taskModal.

---

## Task 6C: Implement Event Delegation for Task Actions ✅ COMPLETED

*   **File to Modify:** `public/js/app.js`
*   **Action:** 
    ~~1. Import the task actions: `import { editTask, duplicateTask, toggleTaskCompletion } from './logic/TaskActions.js';`~~
    ~~2. Remove the lines that assign these functions to `window`~~
    ~~3. Add event delegation code to handle clicks:~~
    ~~```javascript
    // Event delegation for task actions
    document.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      const taskId = e.target.dataset.taskId;
      
      if (!action || !taskId) return;
      
      switch (action) {
        case 'edit-task':
          editTask(taskId);
          break;
        case 'duplicate-task':
          duplicateTask(taskId);
          break;
        case 'toggle-task-completion':
          toggleTaskCompletion(taskId);
          break;
      }
    });
    ```~~
    ~~4. Search the codebase for `onclick="window.editTask(..."` patterns and replace with data attributes like `data-action="edit-task" data-task-id="..."`~~
*   **Verification:** ~~Open the application. Find a task in the UI. Verify that you can still edit, duplicate, and mark the task as complete using the new event delegation system.~~
*   **Status:** Completed - Added event delegation system to app.js, updated onclick patterns in ui.js to use data attributes, updated TaskBlock.js and TimelineContainer.js to import/use TaskActions functions directly, removed all global window assignments from ui.js. System now uses proper module imports and event delegation instead of global functions.

---

## Task 7: Refactor `window.getCurrentFirebaseUser` ✅ COMPLETED

*   **File to Modify:** `public/js/app.js`
*   **Action:** ~~Find and delete the line `window.getCurrentFirebaseUser = () => { ... };`.~~
*   **Verification:** ~~This function is likely only used for debugging. The application should continue to function normally after its removal.~~
*   **Status:** Completed - Removed the global getCurrentFirebaseUser function (lines 348-354). Verified no active dependencies exist in the codebase - only references were in archived test files.

---

## Task 8: Implement the `window.debug` Object for Console Testing ✅ COMPLETED

*   **File to Modify:** `public/js/app.js`
*   **Action:** ~~Add the following code to the end of `app.js`. You will need to add the `import` statements for each module you want to include in the debug object.~~

    ~~```javascript
    // Import the modules you want to debug (adjust paths based on your actual file structure)
    import { taskList } from './components/TaskList.js';
    import { taskTemplateManager, schedulingEngine, taskInstanceManager } from './taskLogic.js';
    import { state, stateActions } from './state.js';

    // Create a single global object for debugging
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      window.debug = {
        taskList,
        taskTemplateManager,
        schedulingEngine,
        taskInstanceManager,
        state,
        stateActions,
      };
      console.log('Debug object available at window.debug');
    }
    ```~~
    
    ~~**Note:** If any of the import paths don't match your actual file structure, adjust them accordingly. You may need to examine your codebase to determine the correct paths.~~

*   **Verification:** 
    ~~1. Open the application on your local machine (localhost)~~
    ~~2. Open the browser's developer console~~
    ~~3. You should see the "Debug object available at window.debug" message~~
    ~~4. Type `window.debug` and press Enter - you should see the debug object with all modules~~
    ~~5. Test individual modules like `debug.taskList` to ensure they're accessible~~
*   **Status:** Completed - Added imports for taskTemplateManager and taskInstanceManager to existing imports. Created window.debug object (lines 348-359) with localhost-only access containing all required modules: taskList, taskTemplateManager, schedulingEngine, taskInstanceManager, state, stateActions. Added console log message for debug availability.

---

## Final Verification

Once all tasks are complete, do a full smoke test of the application. Create, edit, delete, and complete tasks. Navigate between the "Today" and "Task Library" views. Ensure everything works as expected.
