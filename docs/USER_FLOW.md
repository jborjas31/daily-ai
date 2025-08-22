# Daily AI App - Complete User Flow

## 🚀 **App Launch & Authentication (Multi-Device)**

### First Time Launch
1. **Open app** → Authentication check detects no login
2. **Modern login screen** appears with clean, minimalist design:
   - **Mobile:** Full-screen form with large input fields, rounded corners, subtle shadows
   - **Desktop:** Centered glassmorphism card with backdrop blur, smooth gradients
   - **Visual elements:** Inter font, modern blue primary colors, smooth micro-animations
3. **Enter credentials** → Firebase Auth validation with elegant loading states and device-appropriate feedback
4. **Successful login** → Smooth transition to Today View with subtle fade animation
5. **No onboarding, welcome messages, or setup wizards**

### Returning User
1. **Open app** → Session persistence check across all devices
2. **Automatic login** → Direct to Today View with responsive layout
3. **Default settings loaded**: 7.5h sleep, 6:30 wake, 23:00 sleep

---

## 📅 **Today View - Multi-Device Experience**

### Initial Load (Responsive)
1. **Adaptive fixed header appears**: 
   - **Mobile:** Compact header with essential controls, touch-friendly spacing
   - **Desktop:** Full header with all controls, hover states enabled
2. **Responsive 24-hour timeline grid** renders:
   - **Mobile:** 60px row height, condensed markers, touch-optimized targets
   - **Tablet:** 80px row height, medium spacing
   - **Desktop:** 100px row height, full-size markers
3. **Sleep blocks shaded** (11pm-6:30am based on user settings)
4. **Modern task blocks appear** with sophisticated styling:
   - **Mobile:** Full-width blocks with subtle gradients, soft shadows, 12px rounded corners
   - **Desktop:** Precise sizing with glassmorphism effects, hover states with gentle lift animations
   - **Visual hierarchy:** Color-coded borders, Inter typography, consistent spacing system
5. **Elegant time indicator** with red-orange gradient and subtle shadow moves smoothly across timeline

### Real-Time Updates (Every 30 Seconds)
1. **Clock time updates** in header
2. **Red timeline indicator moves** smoothly along timeline
3. **Task state checks** run:
   - Overdue mandatory tasks turn subtly red and slide to current time
   - Overdue skippable tasks grey out but remain in original position
4. **Smart countdown timers** update between anchor tasks
5. **All updates batched** in single DOM operation for performance

### Visual Task States (Device-Optimized)
- **Normal tasks**: Standard appearance with device-appropriate sizing and clear boundaries
- **Completed tasks**: Checkmark or strikethrough visual with responsive sizing
- **Overdue mandatory**: Subtle red background, auto-move to current time
- **Overdue skippable**: Greyed out, stay in original time slot
- **Empty timeline slots**: 
  - **Mobile:** Touch-friendly 44px minimum targets, no hover states
  - **Desktop:** Show "+" icon on hover, cursor changes on clickable areas
- **Interactive feedback**: 
  - **Mobile:** Touch feedback with haptic vibration (if supported), brief highlight on tap
  - **Desktop:** Hover states, cursor changes, immediate visual feedback on click

### Overlapping Task Display (Device-Adaptive)
- **Mobile:** Maximum 2 tasks side-by-side (50% each), 3+ tasks show "+X more" with horizontal carousel swipe
- **Tablet:** Up to 3 tasks horizontally (33.3% each), 4+ tasks show "+X more" indicator
- **Desktop:** Up to 3 tasks side-by-side proportionally, 4+ tasks show "+X more" indicator

### Smart Countdown UI
Between mandatory anchor tasks, displays:
- **"Time Until Next Anchor: XX:XX"**
- **"Time Required for Tasks: XX:XX"**
- **Real-time countdown** that turns red when time crunch detected

---

## ⚡ **Task Interactions**

### Viewing/Completing Tasks (Multi-Device)
1. **Interact with any task block** → Toggle complete/incomplete with smooth animations
   - **Mobile:** Tap with haptic feedback (if supported) and subtle scale animation
   - **Desktop:** Click with elegant hover lift effect and cursor feedback
2. **Beautiful completion animation** with scale effect, color transition, and checkmark appearance
3. **Auto-save to Firestore** instantly with modern skeleton loading indicators and success micro-animations
4. **Status cached** for offline functionality across all devices with consistent visual feedback

### Adding New Tasks

#### Method 1: Add Task Button (Device-Adaptive)
1. **Activate "Add Task" button** → Unified time block editor modal opens
   - **Mobile:** Floating Action Button (FAB) in bottom-right corner, tap to activate
   - **Desktop:** Prominent button in header/sidebar, click or keyboard shortcut
2. **Fill in task properties** with responsive form design:
   - Task name
   - Description (optional plain text notes)
   - Duration (normal and minimum for crunch time)
   - Scheduling type (fixed time vs. flexible window)
   - Time window (morning/afternoon/evening/anytime)
   - Priority level (1-5)
   - Mandatory vs. skippable
   - Dependencies (tasks that must complete before this one)
   - Recurrence rules (daily/weekly/monthly/yearly/custom)
3. **Intelligent defaults applied** → Smart pre-population:
   - **Priority:** 3 (middle priority)
   - **Duration:** 30 minutes if not specified
   - **Type:** Flexible unless specific time selected
   - **Time Window:** Auto-detected from creation time (morning/afternoon/evening)
   - **Mandatory:** No (skippable)
   - **Recurrence:** None (one-time task)
4. **Save task** → Device-appropriate feedback with data validation:
   - **Mobile:** Full-screen loading overlay, haptic feedback on completion
   - **Desktop:** Loading spinner, button disabled, "Saving..." text
   - **Validation errors:** Clear feedback ("Task name is required", "Duration must be 1-480 minutes")
5. **Task template created** → Scheduling engine recalculates automatically
6. **New task appears** on timeline with smooth animation

#### Method 2: Timeline Direct Creation (Touch/Click Optimized)
1. **Interact with empty timeline space** → Instant task creation with smart defaults
   - **Mobile:** Tap empty space (44px touch target), haptic feedback on activation
   - **Desktop:** Click empty space with hover "+" icon, immediate highlight feedback
2. **Auto-populated fields** work across all devices:
   - **defaultTime**: Set to tapped/clicked hour (e.g., tap 2 PM → "14:00")
   - **schedulingType**: Defaults to "fixed" since specific time was selected
   - **timeWindow**: Auto-detected (morning 6-12, afternoon 12-18, evening 18-23)
   - **duration**: Calculated from available space before next task or defaults to 60 min
3. **Conflict handling**: If slot occupied, suggests alternative nearby times with device-appropriate alerts
4. **Responsive modal opens** with pre-populated intelligent defaults:
   - **Mobile:** Full-screen modal with large form fields, swipe-to-dismiss
   - **Desktop:** Centered modal with keyboard navigation, ESC to close
5. **Complete remaining fields** using device-optimized inputs and save normally
6. **Immediate timeline update** with new task in selected location

### Editing Existing Tasks
1. **Click any task block** → Unified time block editor modal opens
2. **Current values pre-populated** in all fields
3. **For recurring tasks**, choose edit scope:
   - **"This instance only"**: Edit affects only current occurrence
   - **"This and future instances"**: End original recurrence, create new template from edit day
   - **"All instances"**: Update original template affecting all occurrences
4. **Make changes** → Click Save
5. **Scheduling engine recalculates** if needed

### Task Management Actions
From unified modal:
- **Save**: Update task template with loading feedback and data validation
- **Copy Task**: Duplicate current task with all properties, open new modal for user to modify name/time before saving
- **Delete**: Confirmation dialog → "Are you sure you want to delete this task?" → Soft delete (isActive=false), moves to deleted section
- **Delete Recurring**: Additional confirmation → "Delete all future instances?" or "Delete this instance only?"
- **Skip for Today**: Create task_instance with status 'skipped'
- **Postpone**: Move task to next day
- **Mark Complete**: Toggle completion state with immediate visual feedback

### Confirmation Dialogs
1. **Delete Task**: "Are you sure you want to delete this task?" with Cancel/Delete buttons
2. **Delete Recurring**: "Delete all future instances?" or "Delete this instance only?" options
3. **Permanent Delete**: "Permanently delete this task template?" for soft-deleted tasks

---

## 🧭 **Navigation Between Views (Multi-Device)**

### Responsive Menu System
- **Mobile:** Bottom tab bar or collapsible hamburger menu for space efficiency
- **Tablet/Desktop:** Top navigation bar or side menu panel with full labels
- **Fixed header persists** across all views with device-appropriate sizing
- **No loading screens** - instant switching across all devices

### Adaptive Day Navigation
1. **Day navigation** adapts to input method:
   - **Mobile:** Swipe gestures (primary) + compact arrow buttons (secondary)
   - **Desktop:** Arrow buttons (primary) + keyboard shortcuts ←/→ (secondary)
2. **Today button** provides instant navigation with device optimization:
   - **Mobile:** Large, thumb-friendly button placement for easy one-handed access
   - **Desktop:** Standard button with keyboard shortcut (Home key)
   - Single tap/click performs both date navigation and timeline scroll
   - Smooth scroll animation to current time position optimized for device performance
3. **Calendar selector** displays appropriately:
   - **Mobile:** Full-screen calendar modal overlay for easy touch interaction
   - **Desktop:** Dropdown calendar picker with keyboard navigation
4. **Historical data**: Past days show completion data and task instances across all devices
5. **Future scheduling**: Show scheduled recurring tasks and anchors with responsive layout
6. **Cross-midnight tasks** display continuously across day boundaries with adaptive sizing

---

## 📚 **Task Library Experience**

### Search and Filter
1. **Search bar at top** for instant filtering
2. **Type to search** → Real-time filtering of all task lists
3. **Multi-field search** by task name and description
4. **Case-insensitive search** across all text fields
5. **Results update** as user types

### Task Categories
- **Overdue Tasks**: Tasks past their scheduled time, with distinction between overdue mandatory (needs immediate attention) and overdue skippable (can be rescheduled/skipped). Shows count in section header.
- **Active Tasks**: Currently scheduled and recurring tasks, sorted by priority (high to low)
- **Completed Tasks**: Tasks marked complete with timestamps, with recently completed tasks shown first
- **Skipped Tasks**: Tasks deliberately skipped (user choice vs. missed), with recently skipped tasks shown first
- **Deleted Tasks**: Soft-deleted tasks for potential recovery

### Enhanced Features
- **Priority-Based Sorting**: Within each section, high-priority tasks appear first for better focus
- **Dependencies Indicator**: Visual indicators showing which tasks are blocked by incomplete prerequisites (e.g., "🔗 Waiting for: Do Laundry")
- **Simple Filters**: Toggle options for "Mandatory vs Skippable" tasks and filter by time window (Morning/Afternoon/Evening/Anytime)
- **Recently Modified**: Recent changes appear at the top of their respective sections for context and easier review

### Task Management
1. **Click any task** → Same unified time block editor modal
2. **Same interaction patterns** as Today View
3. **Enhanced status indicators** show current state visually (overdue, active, completed, skipped, deleted)
4. **Filter by category and enhanced options** for focused management

---

## ⚙️ **Settings Configuration**

### Sleep Settings
1. **Navigate to Settings** → Sleep configuration fields appear
2. **Modify values**:
   - Desired sleep duration (hours)
   - Default wake time (HH:MM)
   - Default sleep time (HH:MM)
3. **Changes save automatically**
4. **Timeline updates** immediately reflect new sleep blocks
5. **Scheduling engine recalculates** with new constraints

### Daily Overrides
1. **Click sleep block** on any day → Unified time block editor opens
2. **Override wake/sleep times** for that specific day only
3. **Changes apply** to selected date only
4. **Default settings** remain unchanged

---

## 📱 **PWA Installation (Multi-Platform)**

### Device-Specific Install Experience
1. **Browser/platform detection** → Show appropriate install prompt for each device
2. **Install prompts** adapt to platform:
   - **Mobile (iOS):** "Add to Home Screen" with Safari share button instructions
   - **Mobile (Android):** Native "Add to Home Screen" browser prompt
   - **Desktop:** "Install Daily AI" browser notification or manual instructions
3. **Installation process** varies by platform:
   - **Mobile:** App icon appears on home screen, full-screen experience when launched
   - **Desktop:** App appears in applications folder, opens in dedicated window
4. **Offline capability** immediately available across all devices
5. **Cross-device sync** maintains data consistency when switching between devices

### App Updates (Multi-Platform)
1. **New version detected** → Device-appropriate notification:
   - **Mobile:** Subtle banner notification optimized for small screens
   - **Desktop:** Standard notification in header area
2. **Update process** → Platform-optimized refresh experience
3. **Simple update management** → Consistent across all platforms

---

## 🔄 **Behind the Scenes - Intelligent Scheduling**

### Scheduling Engine Operation (Real-Time)
1. **Place Anchors**: All mandatory, fixed-time tasks positioned first
2. **Resolve Dependencies**: Tasks with prerequisites scheduled after dependencies
3. **Circular Dependency Check**: Prevents infinite loops (A depends on B, B depends on A)
4. **Slot Flexible Tasks**: Fit into remaining slots by priority within time windows
5. **Crunch-Time Adjustments**: Use minimum durations when time is tight
6. **Performance**: Cache results, only recalculate when tasks actually change

### Schedule Conflict Detection
1. **Impossibility Check**: Runs before scheduling
2. **Calculate total mandatory time** vs. available waking hours
3. **If impossible**: Trigger prominent alert banner
4. **Suggest solutions**: Adjust wake time, reschedule tasks, modify sleep
5. **DST Validation**: Prevent wake time becoming later than sleep time

### Auto-Rescheduling
When conflicts arise (e.g., new anchor task added):
1. **Detect overlap** with existing flexible tasks
2. **Automatically re-run** scheduling logic
3. **Move conflicting tasks** to new available slots
4. **No user intervention** required
5. **Visual update** shows new arrangement

---

## 🔄 **Offline Functionality (Cross-Device)**

### Going Offline (Device-Optimized)
1. **Connection lost** → App continues functioning normally across all devices
2. **IndexedDB cache** serves all loaded data with device-appropriate performance optimization
3. **Network status indicator** shows offline state:
   - **Mobile:** Compact indicator optimized for small screens
   - **Desktop:** Standard indicator in header area
4. **All interactions** remain available with touch/click optimization
5. **Loading states** show device-appropriate feedback: "Offline - changes will sync when online"

### Offline Actions (Multi-Device)
1. **Mark tasks** complete/incomplete → Stored in IndexedDB queue with device timestamps
2. **Add/edit tasks** → Queued for synchronization with conflict resolution metadata
3. **Navigation** works with cached data across all screen sizes
4. **Real-time updates** continue using local time with optimized performance for mobile processors

### Coming Back Online (Cross-Platform Sync)
1. **Connection restored** → Auto-sync triggers with device identification
2. **Queued actions** upload to Firestore with cross-device conflict detection
3. **Last-write-wins** conflict resolution maintains consistency across devices
4. **Visual indicator** shows sync status with device-appropriate styling
5. **Fresh data** downloads if needed, optimized for device capabilities and network speed

### Graceful Degradation (Universal)
1. **IndexedDB fails** → Automatic fallback to localStorage across all devices
2. **Data size warning** displayed with device-appropriate messaging
3. **Core functionality** preserved in all scenarios across all platforms
4. **Error handling** prevents crashes on any device type

---

## 🏁 **App Close & Data Persistence**

### Session End
1. **Close browser/tab** → No special action needed
2. **All changes auto-saved** to Firestore throughout session
3. **Offline changes queued** for next session if needed
4. **Login session persists** for return visits

### Data Retention
- **Task instances**: Rolling 30-day window prevents data growth
- **Task templates**: Retained indefinitely
- **Deleted tasks**: Soft-deleted (isActive=false) for recovery
- **Settings**: Persist until manually changed

---

## 🎯 **Key Experience Strengths**

### Real-Time Nature (Cross-Device)
- **Living schedule** with moving timeline indicator optimized for all screen sizes
- **Constant updates** every 30 seconds with performance optimization for mobile devices
- **Immediate feedback** on all interactions with device-appropriate touch/click responses
- **Dynamic scheduling** that adapts automatically across all platforms

### Multi-Device Consistency
- **Unified responsive design** adapts seamlessly from phone to desktop
- **Touch-optimized mobile** experience with 44px minimum targets and haptic feedback
- **Desktop-enhanced** experience with hover states and keyboard shortcuts
- **Cross-platform PWA** installation with native-like experience
- **Device-specific interactions** while maintaining consistent core functionality
- **Adaptive UI elements** that optimize for screen size and input method

### Intelligent Adaptivity
- **Smart scheduling engine** handles complex dependencies across all devices
- **Responsive modal patterns** for all editing (full-screen mobile, centered desktop)
- **Intuitive task creation** with multiple methods optimized for each input type
- **Smart pre-population** reduces manual input and prevents errors
- **Device-aware performance** optimization for mobile processors and networks

### Universal Reliability
- **Offline-first design** ensures availability on any device
- **Cross-device sync** maintains data consistency when switching platforms
- **Graceful degradation** handles storage limitations across all environments
- **Auto-save everything** eliminates data loss regardless of device capabilities
- **Responsive error handling** prevents crashes on any platform