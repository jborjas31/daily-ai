# Global Scope Cleanup: Action Plan

**Objective:** To systematically remove dependencies on the global `window` object, organizing the code into proper JavaScript modules.

**Why It's Worth Doing (Even for a Personal App):**

*   **Fewer Bugs:** Prevents different parts of the code from accidentally interfering with each other.
*   **Easier Maintenance:** Makes it much easier for "Future You" to understand, fix, and extend the code.
*   **Better Organization:** A clean, organized codebase is more enjoyable and motivating to work on.

---

## The Strategy: Gradual Refactoring

We will not refactor the entire application at once. Instead, we will take a gradual, file-by-file approach. This is lower-risk and allows you to make steady progress without breaking the app.

---

## The Action Plan: Step-by-Step

### Step 1: Identify the Globals

The main source of global variables is `public/js/app.js`. Here are the variables currently being assigned to the `window` object:

*   `window.taskTemplateManager`
*   `window.taskList`
*   `window.schedulingEngine`
*   `window.getState`
*   `window.stateActions`
*   `window.getCurrentFirebaseUser`
*   `window.taskModal`
*   `window.editTask`
*   `window.duplicateTask`
*   `window.toggleTaskCompletion`

Our goal is to eliminate these assignments one by one.

### Step 2: The Refactoring Process (A Repeatable Recipe)

For each global variable, we will follow this process:

1.  **Isolate the Code:** Identify the code related to the global variable. In most cases, this code is already in its own file and is being imported into `app.js`.
2.  **Ensure It's Exported:** Go to the source file (e.g., `public/js/components/TaskList.js` for `taskList`) and make sure the object or function is being `export`ed.
3.  **Import It Where Needed:** In any file that uses the global (like `app.js` or the browser console for testing), `import` it directly.
4.  **Remove the Global Assignment:** Delete the `window.variableName = ...` line from `app.js`.
5.  **Test:** Open the app and test the functionality related to the variable you just refactored.

### Step 3: A Concrete Example: Refactoring `window.taskList`

Let's walk through the process with `taskList`.

1.  **Identify:** The global is `window.taskList`, defined in `app.js`.
2.  **Isolate & Export:** The `taskList` object is already defined in `public/js/components/TaskList.js` and is exported. The file looks something like this:

    '''javascript
    // public/js/components/TaskList.js
    import { state } from '../state.js';
    // ... other imports

    export const taskList = {
      init() { /* ... */ },
      render(tasks) { /* ... */ },
      // ... other methods
    };
    '''

3.  **Import:** `app.js` is already importing it:

    '''javascript
    // public/js/app.js
    import { taskList } from './components/TaskList.js';
    '''

4.  **Remove the Global:** The only thing left to do is to find and delete this line in `app.js`:

    '''javascript
    // DELETE THIS LINE
    window.taskList = taskList;
    '''

5.  **Test:** Open the app and make sure the task list still loads and functions correctly.

### Step 4: Repeat for Other Globals

Now, repeat the process for the other globals. A good order to follow would be:

1.  `taskList`
2.  `taskTemplateManager`
3.  `schedulingEngine`
4.  `taskModal`
5.  `stateActions` and `getState`
6.  The global functions (`editTask`, `duplicateTask`, etc.)

**A special note on the global functions (`editTask`, etc.):** These are currently defined in `app.js`. They should be moved to a more appropriate module (e.g., `editTask` could be moved to `TaskList.js` or a new `TaskActions.js` module) and then imported where needed.

### Step 5: Handling Console Testing

You're likely using the global variables for testing in the browser console. Once you remove them, you won't be able to type `taskList.render()` in the console anymore.

**The Solution (No Over-engineering):**

For debugging purposes, you can create a single global "debug" object in `app.js`.

'''javascript
// public/js/app.js

// Import all the modules you want to debug
import { taskList } from './components/TaskList.js';
import { schedulingEngine } from './taskLogic.js';
// ... etc.

// Create a single global object for debugging
if (window.location.hostname === 'localhost') { // Only enable on your local machine
  window.debug = {
    taskList,
    schedulingEngine,
    // ... add other modules here
  };
}
'''

Now, in the console, you can type `debug.taskList.render()` to achieve the same result, but without polluting the global scope with dozens of variables.

---

## What Not to Do (Avoiding Over-engineering)

*   **Don't try to do it all at once.** This is a marathon, not a sprint. One variable at a time.
*   **Don't introduce complex new tools.** You don't need a dependency injection container or a complex state management library. Simple `import`/`export` is enough.
*   **Don't refactor what isn't broken.** If a file isn't using any globals, leave it alone.

---

## Success Criteria

You're done when all the `window.* = ...` assignments in `app.js` have been removed, and the application still works correctly. The only exception might be the single `window.debug` object for testing.
