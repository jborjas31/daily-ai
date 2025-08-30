# Phase 3: Timeline Interface - Implementation Plan

## 🎯 **Objective**

The primary goal of Phase 3 is to build the core user interface of the Daily AI application: the **Timeline View**. This phase will bring the scheduling engine to life by creating a visual, interactive, and responsive representation of the user's daily schedule.

This plan is designed for an AI assistant to execute. Each step should be followed precisely.

---

## 🚀 **Foundation from Phase 2**

This phase builds upon a solid foundation established in Phase 2. The following systems are fully operational and should be leveraged:

*   **Complete Task Data**: `taskTemplateManager` and `taskInstanceManager` in `taskLogic.js` are ready to provide all necessary data.
*   **State Management**: The central `state.js` module is the single source of truth and should be used for all data access.
*   **Offline-First**: All data operations via `dataOffline.js` are automatically cached and synced.
*   **Memory Management**: The `ComponentManager` and `SafeEventListener` in `utils/MemoryLeakPrevention.js` must be used for all new components and event listeners to prevent memory leaks.
*   **Error Handling**: The `SimpleErrorHandler` in `utils/SimpleErrorHandler.js` should be used for all user-facing error messages.

---

## 💻 **Implementation Patterns to Follow**

To ensure consistency with the existing codebase, all new implementations in Phase 3 **must** follow these established patterns from Phase 2:

### **Error Handling Pattern**
```javascript
// Use existing error handling system
try {
  const result = await taskOperation();
  SimpleErrorHandler.showSuccess('Operation completed');
} catch (error) {
  console.error('Operation failed:', error);
  SimpleErrorHandler.showError('Failed to complete operation', error);
}
```

### **State Management Pattern**
```javascript
// Extend existing state actions for new functionality
export const stateActions = {
  // ... existing actions ...
  
  async newTimelineAction(data) {
    try {
      state.setLoading('timeline', true);
      const result = await someAsyncOperation(data);
      state.updateTimeline(result);
      return result;
    } catch (error) {
      console.error('New timeline action failed:', error);
      throw error;
    } finally {
      state.setLoading('timeline', false);
    }
  }
};
```

### **Component Registration Pattern**
```javascript
// Use memory management for all new components
import { ComponentManager } from '../utils/MemoryLeakPrevention.js';

export class NewTimelineComponent {
  constructor() {
    ComponentManager.register(this);
  }
  
  destroy() {
    // Cleanup logic (e.g., remove event listeners)
    ComponentManager.unregister(this);
  }
}
```

---


## 🏗️ **Core Components to be Built**

Based on the `PROJECT_MASTER_BLUEPRINT.md`, the following components are the focus of this phase:

1.  **Responsive Timeline Grid**: A 24-hour vertical grid that serves as the canvas for the schedule.
2.  **Sleep Block Visualization**: Shaded, non-interactive blocks representing the user's sleep hours.
3.  **Task Block Rendering**: Visual blocks for each scheduled task, positioned accurately on the timeline.
4.  **Real-time Clock and Indicator**: A live clock and a horizontal red line that moves down the timeline to indicate the current time.
5.  **Day Navigation**: UI controls to move between previous, current, and future dates.

---

## 📋 **Step-by-Step Implementation Plan**

### **Step 1: Basic Timeline Structure**

1.  **File to Edit**: `public/js/ui.js` (specifically the `todayViewUI` object).
2.  **Task**: In the `render` method of `todayViewUI`, create the basic HTML structure for the timeline. This should include a main container for the timeline grid and placeholders for the 24-hour markers.
3.  **Details**:
    *   The main container should have an ID, e.g., `timeline-container`.
    *   Inside the container, create a `div` for the hour labels (e.g., `timeline-hours`) and another for the task blocks (e.g., `timeline-tasks`).
    *   Dynamically generate 24 `div` elements for each hour (00:00 to 23:00). Each hour element should have a data attribute, e.g., `data-hour="8"` for 8:00 AM.

### **Step 2: Render Sleep Blocks**

1.  **File to Edit**: `public/js/ui.js` (`todayViewUI`).
2.  **Task**: Fetch the user's sleep schedule and render it as a shaded block on the timeline.
3.  **Details**:
    *   Get the `sleepTime` and `wakeTime` from the `state.getSettings()` method.
    *   Calculate the `top` and `height` of the sleep block in pixels based on the start and end times. The height of each hour should be a configurable value (e.g., 80px).
    *   Handle overnight sleep schedules (e.g., sleep at 23:00, wake at 06:30). This will require two separate visual blocks.
    *   Add a distinct CSS class (e.g., `sleep-block`) for styling.

### **Step 3: Render Task Blocks**

1.  **File to Edit**: `public/js/ui.js` (`todayViewUI`).
2.  **Task**: Fetch the scheduled tasks for the current date and render them as blocks on the timeline.
3.  **Details**:
    *   Use the `schedulingEngine.generateScheduleForDate(currentDate)` method to get the array of scheduled tasks.
    *   For each task in the schedule, create a `div` element.
    *   Calculate the `top` and `height` of the task block based on its `scheduledTime` and `durationMinutes`.
    *   The task block should display the task's name, duration, and other relevant information. Use the `TaskBlock.js` component for this if possible, or create a simplified version.
    *   Add CSS classes to the task block to represent its state (e.g., `mandatory`, `flexible`, `completed`, `overdue`).

### **Step 4: Implement Real-time Clock and Indicator**

1.  **File to Edit**: `public/js/ui.js` (`todayViewUI`).
2.  **Task**: Create the real-time components of the timeline.
3.  **Details**:
    *   **Live Clock**: Add a `div` in the header to display the current time. Update it every second.
    *   **Time Indicator**: Create a `div` with a distinct ID (e.g., `time-indicator`) that represents the current time. It should be a horizontal line across the timeline.
    *   Use a `setInterval` to update the `top` position of the time indicator every 30 seconds. The position should be calculated based on the current time.
    *   **Memory Management**: Ensure the `setInterval` is properly cleared when the view is destroyed to prevent memory leaks.

### **Step 5: Implement Day Navigation**

1.  **File to Edit**: `public/js/ui.js` (`todayViewUI`).
2.  **Task**: Add functionality to navigate between days.
3.  **Details**:
    *   Add "Previous Day" and "Next Day" buttons to the UI.
    *   Add a "Today" button.
    *   When "Previous Day" or "Next Day" is clicked, update the `currentDate` in the application state (`state.setCurrentDate()`). The UI should automatically re-render with the new date's schedule because of the state change listeners.
    *   The "Today" button should set the `currentDate` to the actual current date.

### **Step 6: Implement "Click to Create" Functionality**

1.  **File to Edit**: `public/js/ui.js` (`todayViewUI`).
2.  **Task**: Allow users to create a new task by clicking on an empty time slot.
3.  **Details**:
    *   Add a click event listener to the timeline grid container.
    *   When a click occurs, determine the hour that was clicked.
    *   Open the `TaskModal` for creating a new task.
    *   Pre-fill the `defaultTime` in the modal with the hour that was clicked.
    *   After the new task is created, the timeline should refresh to show the new task.

### **Step 7: Implement Loading States and Confirmations**

1.  **Files to Edit**: `public/js/ui.js`, `public/js/components/TaskModal.js`.
2.  **Task**: Add visual feedback for loading and destructive actions, as identified in `Archived/MISSING_FEATURES.md`.
3.  **Details**:
    *   **Loading State**: When the timeline is fetching data (e.g., after a date change), display a loading spinner or a subtle loading indicator.
    *   **Confirmation Dialog**: When deleting a task from the timeline (if this functionality is added in this phase), use a `confirm()` dialog to ask the user for confirmation.

---

## ✅ **Success Criteria**

Phase 3 will be considered complete when the following criteria are met:

1.  The timeline view renders correctly with the 24-hour grid, sleep blocks, and task blocks.
2.  Task blocks are accurately positioned and sized according to their schedule.
3.  The real-time clock and time indicator are present and update correctly.
4.  Users can navigate between days, and the timeline updates to show the correct schedule for the selected date.
5.  Users can create new tasks by clicking on the timeline.
6.  The timeline is responsive and usable on mobile, tablet, and desktop screen sizes.
7.  The implementation is robust, with proper error handling and no memory leaks.

---

## 🧪 **Testing Strategy**

While a formal testing framework is not yet in place, the following manual tests should be performed to verify the functionality of the timeline:

1.  **Visual Verification**:
    *   Load the application and verify that the timeline, sleep blocks, and task blocks are rendered correctly for the current day.
    *   Check that the real-time indicator is at the correct position.
2.  **Navigation Testing**:
    *   Navigate to the next and previous days and verify that the schedule updates correctly.
    *   Navigate several days into the future and past.
    *   Click the "Today" button and verify that it returns to the current day.
3.  **Task Creation Testing**:
    *   Click on an empty time slot and verify that the task modal opens with the correct time pre-filled.
    *   Create a new task and verify that it appears on the timeline.
4.  **Responsive Testing**:
    *   Resize the browser window to mobile, tablet, and desktop sizes and verify that the timeline layout adapts correctly.
5.  **Long-running Test**:
    *   Leave the application open for an extended period (e.g., 1 hour) and verify that the real-time indicator continues to update and that there are no performance issues or crashes.

**Recommendation**: It is strongly recommended to implement a formal testing framework like **Vitest** or **Jest** to automate the testing of the complex logic in the `schedulingEngine` and the new UI components. This will be crucial for maintaining the quality and stability of the application in the long run.
