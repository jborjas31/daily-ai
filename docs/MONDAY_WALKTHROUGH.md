# Monday Schedule Walkthrough
*A comprehensive simulation of how the Daily AI web app works in practice*

---

## 📋 **User Profile & Settings**

**Sarah's Sleep Settings:**
- Desired sleep duration: 7.5 hours
- Default wake time: 6:30 AM
- Default sleep time: 11:00 PM
- Sleep block: 11:00 PM → 6:30 AM (shaded on timeline)

---

## 📅 **Monday's Scheduled Tasks**

### **Recurring Daily Tasks**
- **Drink water AM** (Flexible, Morning, 3 min, Priority 3, Skippable)
- **Shower** (Flexible, Morning, 15 min, Priority 4, Mandatory)
- **Brush teeth AM** (Flexible, Morning, 3 min, Priority 2, Skippable)
- **Eat breakfast** (Flexible, Morning, 30 min, Priority 3, Skippable)
- **Take supplements** (Flexible, Anytime, 2 min, Priority 2, Skippable)
- **Eat lunch** (Flexible, Afternoon, 45 min, Priority 3, Skippable)
- **Cook dinner** (Flexible, Evening, 30 min, Priority 4, Skippable)
- **Eat dinner** (Flexible, Evening, 45 min, Priority 3, Skippable)
- **Brush teeth PM** (Flexible, Evening, 3 min, Priority 2, Skippable)

### **Fixed Anchor Tasks (Monday)**
- **Team standup meeting** (Fixed, 9:00 AM, 30 min, Priority 5, Mandatory)
- **Client presentation** (Fixed, 2:00 PM, 60 min, Priority 5, Mandatory)
- **Gym class** (Fixed, 6:00 PM, 60 min, Priority 4, Mandatory)

### **Flexible Work Tasks**
- **Review quarterly reports** (Flexible, Morning, 90 min, Priority 4, Mandatory)
- **Email responses** (Flexible, Anytime, 30 min, Priority 2, Skippable)
- **Update project documentation** (Flexible, Afternoon, 45 min, Priority 3, Skippable)

### **Personal Tasks**
- **Call mom** (Flexible, Evening, 20 min, Priority 3, Skippable)
- **Grocery shopping** (Flexible, Anytime, 60 min, Priority 4, Skippable)

---

## 🌅 **6:15 AM - Early Wake Up**

Sarah wakes up 15 minutes early and opens the Daily AI app on her phone.

### **App State:**
```
📱 MOBILE VIEW - TODAY VIEW
┌─────────────────────────────────────┐
│ ← Today, Mon Aug 19 →    🕕 6:15 AM │
├─────────────────────────────────────┤
│ ⚠️ Time Crunch Alert!              │
│ You have 165 min until Team Standup │
│ but 138 min of tasks scheduled.     │
│ ✅ You're ahead by 27 minutes!      │
├─────────────────────────────────────┤
│ 6:00 ├─Sleep Block─────────────────┤
│ 6:30 ├─🔴 Current Time (6:15 AM)───┤
│      │ 💧 Drink water AM (3m)      │
│      │ 🚿 Shower (15m) [MANDATORY] │
│      │ 🦷 Brush teeth AM (3m)      │
│      │ 🍳 Eat breakfast (30m)      │
│ 7:00 ├─────────────────────────────┤
│      │ 💊 Take supplements (2m)    │
│ 7:30 ├─────────────────────────────┤
│      │ 📊 Review quarterly        │
│      │     reports (90m)           │
│      │     [MANDATORY]             │
│ 8:30 ├─────────────────────────────┤
│ 9:00 ├─📅 Team standup (30m)──────┤
│      │    [ANCHOR - MANDATORY]     │
│ 9:30 ├─────────────────────────────┤
```

### **Scheduling Engine Logic:**
1. **Places Fixed Anchors**: Team standup at 9:00 AM, Client presentation at 2:00 PM, Gym at 6:00 PM
2. **Calculates Available Windows**: 6:30-9:00 (150 min), 9:30-2:00 (270 min), 3:00-6:00 (180 min), 7:00-11:00 (240 min)
3. **Slots Morning Tasks**: Prioritizes mandatory shower + quarterly reports, fits in skippable morning routine
4. **Smart Countdown**: Shows positive buffer since user woke early

---

## 🚿 **6:18 AM - Starting Morning Routine**

Sarah taps "Drink water AM" to mark it complete.

### **User Action:**
- **Tap task block** → Task completion animation (scale + checkmark)
- **Visual feedback**: Task turns green with ✅, gentle haptic feedback

### **App Response:**
```
📱 UPDATED VIEW
┌─────────────────────────────────────┐
│ 6:30 ├─🔴 Current Time (6:18 AM)───┤
│      │ ✅ Drink water AM (complete) │
│      │ 🚿 Shower (15m) [MANDATORY] │
│      │ 🦷 Brush teeth AM (3m)      │
│      │ 🍳 Eat breakfast (30m)      │
│ 7:00 ├─────────────────────────────┤
```

### **Behind the Scenes:**
- **Firestore Update**: Creates task_instance with status: "completed", completedAt: "2024-08-19T06:18:00Z"
- **State Update**: App state reflects completion immediately
- **No Rescheduling**: No dependent tasks, so no scheduling recalculation needed

---

## ⏰ **6:45 AM - Time Crunch Develops**

Sarah got distracted and is running behind. She opens the app.

### **App State:**
```
📱 UPDATED VIEW - TIME CRUNCH
┌─────────────────────────────────────┐
│ ← Today, Mon Aug 19 →    🕕 6:45 AM │
├─────────────────────────────────────┤
│ ⚠️ TIME CRUNCH DETECTED!           │
│ 135 min until Team Standup         │
│ 135 min of tasks remaining          │
│ Consider using minimum durations!   │
├─────────────────────────────────────┤
│ 6:30 ├─🔴 Current Time (6:45 AM)───┤
│      │ ✅ Drink water AM            │
│      │ 🚿 Shower (15m→10m min)     │
│      │    [MANDATORY]               │
│      │ 🦷 Brush teeth AM (3m)      │
│      │ 🍳 Eat breakfast (30m)      │
│ 7:00 ├─────────────────────────────┤
│      │ 📊 Review quarterly         │
│      │     reports (90m→60m min)   │
│      │     [MANDATORY]             │
│ 8:30 ├─────────────────────────────┤
│ 9:00 ├─📅 Team standup (30m)──────┤
```

### **Smart Countdown Logic:**
1. **Detects time pressure**: Available time = Required time
2. **Suggests minimum durations**: Shows crunch-time alternatives
3. **Visual indicators**: Orange warning colors, adjusted time estimates
4. **Automatic recalculation**: Uses minDurationMinutes for mandatory tasks

---

## 📝 **7:30 AM - Adding Urgent Task**

During breakfast, Sarah remembers she needs to prepare slides for the client presentation. She taps the empty 8:30 AM slot.

### **User Action:**
- **Tap empty timeline slot** → Task creation modal opens

### **App Response:**
```
📱 FULL-SCREEN MODAL (Mobile)
┌─────────────────────────────────────┐
│           ✕ New Task               │
├─────────────────────────────────────┤
│ Task Name                           │
│ ┌─────────────────────────────────┐ │
│ │ Prepare presentation slides     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Description (optional)              │
│ ┌─────────────────────────────────┐ │
│ │ Update slides for client demo   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Duration                            │
│ ┌─────┐ Normal  ┌─────┐ Minimum     │
│ │ 30  │ minutes │ 20  │ minutes     │
│ └─────┘         └─────┘             │
│                                     │
│ ⚡ Auto-detected from tap:          │
│ • Time: 8:30 AM (editable)         │
│ • Window: Morning                   │
│ • Type: Fixed (you picked a time)  │
│                                     │
│ Priority: ●●●●○ (4/5)              │
│ Mandatory: ✅ Yes  ○ No            │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │         💾 Save Task            │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### **Smart Pre-Population:**
- **defaultTime**: "8:30" (from tapped slot)
- **schedulingType**: "fixed" (user selected specific time)
- **timeWindow**: "morning" (auto-detected from 8:30 AM)
- **duration**: Suggests 30 min (available space before next task)

---

## ⚡ **7:32 AM - Conflict Detection & Resolution**

Sarah saves the new urgent task. The scheduling engine detects a conflict.

### **App Response:**
```
📱 CONFLICT RESOLUTION
┌─────────────────────────────────────┐
│ ⚠️ Schedule Conflict Detected       │
├─────────────────────────────────────┤
│ New task conflicts with:            │
│ • Email responses (8:30-9:00)      │
│                                     │
│ Auto-Resolution Applied:            │
│ ✅ Moved "Email responses" to       │
│    10:00 AM (after standup)        │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │           Continue              │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### **Behind the Scenes:**
1. **Conflict Detection**: New fixed task overlaps with flexible "Email responses"
2. **Automatic Rescheduling**: Moves flexible task to next available slot
3. **Priority Consideration**: Urgent task (Priority 4) takes precedence over emails (Priority 2)
4. **User Notification**: Clear explanation of what changed

---

## 📅 **9:00 AM - Anchor Task Arrival**

The red timeline indicator reaches the Team Standup meeting.

### **App State:**
```
📱 ANCHOR TASK ACTIVE
┌─────────────────────────────────────┐
│ 9:00 ├─🔴 Current Time (9:00 AM)───┤
│      │ 📅 Team standup (30m)      │
│      │    [ACTIVE NOW]             │
│      │    ▶️ Join Meeting           │
│ 9:30 ├─────────────────────────────┤
│      │ 📧 Email responses (30m)    │
│      │ 💼 Update documentation     │
│      │     (45m)                   │
```

### **Real-Time Behavior:**
- **Visual emphasis**: Current task highlighted with animated border
- **Action button**: "Join Meeting" link appears (if configured)
- **Overdue logic**: If tasks before 9:00 AM weren't completed, they'd move to current time or grey out

---

## 📱 **11:00 AM - Mobile Task Management**

Sarah finishes the standup and checks the app during her coffee break.

### **User Actions:**
1. **Marks standup complete** (tap → checkmark animation)
2. **Starts email responses** (task turns blue "in progress")
3. **Swipes to Tuesday** to check tomorrow's schedule
4. **Swipes back to today**

### **App Response:**
```
📱 TASK COMPLETION & NAVIGATION
┌─────────────────────────────────────┐
│ ← Today, Mon Aug 19 →    🕕 11:05 AM│
├─────────────────────────────────────┤
│ 10:00├─────────────────────────────┤
│ 10:30├─────────────────────────────┤
│ 11:00├─🔴 Current Time (11:05 AM)──┤
│      │ 📧 Email responses (30m)    │
│      │    [IN PROGRESS] 🔵         │
│      │ 💼 Update documentation     │
│      │     (45m)                   │
│ 12:00├─🍽️ Eat lunch (45m)─────────┤
│ 1:00 ├─────────────────────────────┤
│ 2:00 ├─📊 Client presentation──────┤
│      │    (60m) [ANCHOR]           │
```

### **Mobile Interaction Features:**
- **Swipe navigation**: Smooth day switching with momentum
- **Touch feedback**: Subtle haptic feedback on task interactions
- **Status indicators**: Color-coded task states (completed ✅, in-progress 🔵, pending ⚪)

---

## 🚨 **1:45 PM - Last-Minute Crisis**

Sarah gets an urgent call that will run until 2:10 PM, overlapping with her 2:00 PM client presentation.

### **User Action:**
- **Taps client presentation** → Task editor modal
- **Modifies start time** from 2:00 PM to 2:15 PM

### **App Response:**
```
📱 URGENT TASK EDIT
┌─────────────────────────────────────┐
│ ⚠️ Important Change Detected        │
├─────────────────────────────────────┤
│ Moving "Client presentation"        │
│ from 2:00 PM → 2:15 PM             │
│                                     │
│ This affects your schedule:         │
│ • Later finish (3:15 PM vs 3:00)   │
│ • Tighter evening timeline         │
│                                     │
│ Automatically adjusted:             │
│ ✅ Moved "Update documentation"     │
│    to tomorrow (no time today)     │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │        💾 Save Changes          │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### **Intelligent Rescheduling:**
1. **Impact Analysis**: Calculates ripple effects of time change
2. **Automatic Adjustments**: Moves conflicting flexible tasks
3. **Future Planning**: Reschedules displaced tasks to next available day
4. **User Notification**: Clear explanation of all changes

---

## 🍽️ **5:30 PM - Smart Countdown in Action**

Sarah checks the app before her 6:00 PM gym class.

### **App State:**
```
📱 SMART COUNTDOWN DISPLAY
┌─────────────────────────────────────┐
│ ← Today, Mon Aug 19 →    🕕 5:30 PM │
├─────────────────────────────────────┤
│ ⏰ NEXT ANCHOR: Gym class (6:00 PM) │
│ Time until anchor: 30 minutes       │
│ Time needed for tasks: 45 minutes   │
│ 🔴 TIME CRUNCH: -15 minutes!       │
├─────────────────────────────────────┤
│ 5:30 ├─🔴 Current Time (5:30 PM)───┤
│      │ 🥘 Cook dinner (30m→20m)    │
│      │    [SKIPPABLE] ⚠️           │
│      │ 🍽️ Eat dinner (15m)        │
│      │    [QUICK VERSION]          │
│ 6:00 ├─🏋️ Gym class (60m)─────────┤
│      │    [ANCHOR - MANDATORY]     │
```

### **Smart Countdown Features:**
- **Real-time calculation**: Updates every 30 seconds
- **Crunch detection**: Warns when timeline is impossible
- **Minimum duration suggestions**: Shows faster alternatives
- **Visual hierarchy**: Red for urgent, orange for tight, green for comfortable

---

## 📚 **8:30 PM - Task Library Access**

After gym, Sarah wants to review her task management. She navigates to Task Library.

### **User Action:**
- **Tap menu** → **Task Library** (mobile: bottom tab navigation)

### **App Response:**
```
📱 TASK LIBRARY VIEW
┌─────────────────────────────────────┐
│ 🔍 Search tasks...                  │
├─────────────────────────────────────┤
│ 🚨 OVERDUE TASKS (2)               │
│ ┌─────────────────────────────────┐ │
│ │ 🥘 Cook dinner                  │ │
│ │    Scheduled: 5:30 PM           │ │
│ │    Status: Skippable overdue    │ │
│ │ 🛒 Grocery shopping             │ │
│ │    Priority 4 • 60 min         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ✅ COMPLETED TODAY (4)             │
│ ┌─────────────────────────────────┐ │
│ │ 💧 Drink water AM               │ │
│ │ 📅 Team standup meeting         │ │
│ │ 📧 Email responses              │ │
│ │ 🏋️ Gym class                   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 📋 ACTIVE TASKS (6)                │
│ ┌─────────────────────────────────┐ │
│ │ 🚿 Shower (P4) • Morning       │ │
│ │ 🦷 Brush teeth AM (P2) • Morn  │ │
│ │ 🍳 Eat breakfast (P3) • Morn   │ │
│ └─────────────────────────────────┘ │
```

### **Enhanced Task Library Features:**
- **Overdue Section**: Prominently displays missed tasks with count
- **Priority Indicators**: P1-P5 shown for quick scanning
- **Time Window Tags**: Morning/Afternoon/Evening/Anytime
- **Completion Timestamps**: Recently completed items at top
- **Search Functionality**: Multi-field search across name and description

---

## 🌙 **10:45 PM - Evening Wrap-up**

Sarah does her final check before bed.

### **User Actions:**
1. **Marks remaining tasks**: Brush teeth PM (complete), Call mom (skip for today)
2. **Reviews tomorrow**: Swipes to Tuesday to see auto-generated schedule
3. **Quick add**: Adds "Pick up dry cleaning" for tomorrow afternoon

### **App State:**
```
📱 EVENING TASK COMPLETION
┌─────────────────────────────────────┐
│ ← Today, Mon Aug 19 →    🕕 10:45 PM│
├─────────────────────────────────────┤
│ 10:30├─────────────────────────────┤
│ 10:45├─🔴 Current Time (10:45 PM)──┤
│      │ 🦷 Brush teeth PM (3m)      │
│      │ 📞 Call mom (20m)           │
│      │    [Mark as skipped?]       │
│ 11:00├─Sleep Block─────────────────┤
│      │ (Sleep time: 11:00 PM)      │
│ 11:30├─Sleep Block─────────────────┤
│                                     │
│ ➕ Quick Add for Tomorrow:          │
│ "Pick up dry cleaning"              │
└─────────────────────────────────────┘
```

### **End-of-Day Interaction (Current Implementation):**
- **Task completion**: Mark remaining tasks complete/skip
- **Next day navigation**: Swipe to tomorrow to see scheduled tasks
- **Quick task addition**: Add new tasks for future days

> **Note**: Daily Summary Features (completion statistics, efficiency metrics, sleep reminders) are planned for **future development** and not included in the MVP implementation.

---

## 🔧 **Behind-the-Scenes Technical Behavior**

### **Real-Time Updates (Every 30 Seconds):**
```javascript
// Pseudocode for real-time engine
function updateTimelineReal() {
  // 1. Update current time indicator
  moveRedLine(getCurrentTime());
  
  // 2. Check for newly overdue tasks
  checkOverdueTasks(getCurrentTime());
  
  // 3. Update smart countdowns
  updateAnchorCountdowns();
  
  // 4. Batch DOM updates
  renderTimelineChanges();
}
```

### **Scheduling Engine Logic:**
```javascript
// Pseudocode for scheduling engine
function scheduleDay(tasks, settings) {
  // 1. Place fixed anchors first
  const anchors = placeFixedTasks(tasks);
  
  // 2. Resolve dependencies
  const orderedTasks = resolveDependencies(tasks);
  
  // 3. Slot flexible tasks by priority
  const scheduled = slotFlexibleTasks(orderedTasks, anchors);
  
  // 4. Check for impossibilities
  const conflicts = detectConflicts(scheduled, settings);
  
  return { scheduled, conflicts };
}
```

### **Offline Synchronization:**
```javascript
// Pseudocode for offline handling
function handleOfflineActions() {
  // Store in IndexedDB queue
  indexedDB.store(action, timestamp);
  
  // Show optimistic UI
  updateUIOptimistically(action);
  
  // Sync when online
  if (navigator.onLine) {
    syncPendingActions();
  }
}
```

---

## 📊 **Key App Behaviors Demonstrated**

### **✅ Scheduling Intelligence:**
- Fixed anchors take precedence
- Flexible tasks automatically reschedule around conflicts
- Priority-based placement within time windows
- Minimum duration alternatives during time crunches

### **✅ Real-Time Responsiveness:**
- 30-second update cycles for smooth timeline movement
- Immediate visual feedback on all interactions
- Smart countdown warnings for tight schedules
- Automatic overdue task handling

### **✅ User Experience Excellence:**
- Mobile-first responsive design with touch optimization
- Intuitive task creation with smart pre-population
- Clear conflict resolution with automatic suggestions
- Comprehensive task library with enhanced organization

### **✅ Offline-First Reliability:**
- All actions work offline with local caching
- Automatic synchronization when connection restored
- Graceful degradation when storage is limited
- Consistent experience across all devices

---

This walkthrough demonstrates how the Daily AI app provides intelligent, real-time task management that adapts to user behavior and schedule changes throughout the day, maintaining a balance between automation and user control.