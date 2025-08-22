# Cross-Midnight Task Implementation Spec

## 🔥 **Critical Requirement**
**Priority**: HIGH  
**Phase**: Phase 9 - Advanced Scheduling Engine  
**Impact**: Tasks spanning midnight won't display/function correctly

---

## 📋 **Problem Definition**

### **Issue**: 
Tasks that start before midnight and end after midnight (e.g., 11:30 PM - 1:30 AM) need special handling for:
- Data representation
- Timeline rendering 
- Day navigation
- Scheduling engine integration

---

## 🎯 **Implementation Strategy**

### **1. Data Model for Cross-Midnight Tasks**

```javascript
// Enhanced task instance structure
const crossMidnightTaskInstance = {
    instanceId: "task_2024_08_17_cross",
    templateId: "late_work_session", 
    date: "2024-08-17", // Primary date (start date)
    startTime: "23:30", // 11:30 PM
    endTime: "01:30",   // 1:30 AM (next day)
    duration: 120,      // 2 hours total
    
    // Cross-midnight specific fields
    crossesMidnight: true,
    endDate: "2024-08-18", // End date (next day)
    
    // Split segments for rendering
    segments: [
        {
            date: "2024-08-17",
            startTime: "23:30",
            endTime: "23:59",
            duration: 30, // 30 minutes on first day
            segment: "primary"
        },
        {
            date: "2024-08-18", 
            startTime: "00:00",
            endTime: "01:30",
            duration: 90, // 90 minutes on second day
            segment: "continuation"
        }
    ]
};
```

### **2. Task Creation & Validation**

```javascript
// Detect cross-midnight tasks during creation
function validateTaskTime(startTime, endTime, duration) {
    const start = parseTime(startTime); // e.g., 23:30 -> 23.5 hours
    const end = parseTime(endTime);     // e.g., 01:30 -> 1.5 hours
    
    // Detect cross-midnight scenario
    if (end < start) {
        return {
            crossesMidnight: true,
            endDate: getNextDate(currentDate),
            segments: createTaskSegments(startTime, endTime, currentDate)
        };
    }
    
    return {
        crossesMidnight: false,
        endDate: currentDate,
        segments: [createSingleSegment(startTime, endTime, currentDate)]
    };
}

function createTaskSegments(startTime, endTime, startDate) {
    const segments = [];
    const start = parseTime(startTime);
    const end = parseTime(endTime);
    
    // First segment: start time to midnight
    const firstSegmentDuration = (24 - start) * 60; // minutes until midnight
    segments.push({
        date: startDate,
        startTime: startTime,
        endTime: "23:59",
        duration: firstSegmentDuration,
        segment: "primary"
    });
    
    // Second segment: midnight to end time
    const secondSegmentDuration = end * 60; // minutes from midnight
    segments.push({
        date: getNextDate(startDate),
        startTime: "00:00", 
        endTime: endTime,
        duration: secondSegmentDuration,
        segment: "continuation"
    });
    
    return segments;
}
```

### **3. Timeline Rendering**

```javascript
// Enhanced timeline rendering for cross-midnight tasks
function renderTaskOnTimeline(taskInstance) {
    if (!taskInstance.crossesMidnight) {
        // Standard single-day rendering
        return renderSingleDayTask(taskInstance);
    }
    
    // Cross-midnight task rendering
    const renderedSegments = [];
    
    taskInstance.segments.forEach(segment => {
        const element = createTaskElement(taskInstance, segment);
        
        // Style segments differently
        if (segment.segment === "primary") {
            element.classList.add('task-cross-midnight-primary');
            element.style.borderBottomRightRadius = '0';
            element.setAttribute('data-continues', 'true');
        } else {
            element.classList.add('task-cross-midnight-continuation');
            element.style.borderTopLeftRadius = '0';
            element.setAttribute('data-continued-from', segment.date);
        }
        
        // Position on appropriate day's timeline
        const dayTimeline = getTimelineForDate(segment.date);
        positionTaskElement(element, segment, dayTimeline);
        
        renderedSegments.push(element);
    });
    
    return renderedSegments;
}
```

### **4. Navigation Handling**

```javascript
// Enhanced day navigation for cross-midnight tasks
function navigateToDate(targetDate) {
    const currentTasks = getCurrentDayTasks(targetDate);
    
    // Include cross-midnight tasks from previous day
    const crossMidnightFromPrevious = getCrossMidnightTasksEndingOnDate(targetDate);
    
    // Include cross-midnight tasks starting today
    const crossMidnightStartingToday = getCrossMidnightTasksStartingOnDate(targetDate);
    
    const allTasks = [
        ...currentTasks,
        ...crossMidnightFromPrevious,
        ...crossMidnightStartingToday
    ];
    
    renderTimelineForDate(targetDate, allTasks);
}

function getCrossMidnightTasksEndingOnDate(date) {
    const previousDate = getPreviousDate(date);
    return getTasksForDate(previousDate).filter(task => 
        task.crossesMidnight && task.endDate === date
    );
}
```

### **5. Scheduling Engine Integration**

```javascript
// Enhanced scheduling engine for cross-midnight tasks
function scheduleTasksForDay(date, tasks) {
    const timeSlots = createDayTimeSlots(date);
    
    // Handle cross-midnight tasks first (they have fixed time constraints)
    const crossMidnightTasks = tasks.filter(t => t.crossesMidnight);
    crossMidnightTasks.forEach(task => {
        task.segments.forEach(segment => {
            if (segment.date === date) {
                reserveTimeSlots(timeSlots, segment);
            }
        });
    });
    
    // Schedule remaining tasks in available slots
    const remainingTasks = tasks.filter(t => !t.crossesMidnight);
    scheduleFlexibleTasks(timeSlots, remainingTasks);
}

function reserveTimeSlots(timeSlots, segment) {
    const startSlot = timeToSlotIndex(segment.startTime);
    const endSlot = timeToSlotIndex(segment.endTime);
    
    for (let i = startSlot; i <= endSlot; i++) {
        timeSlots[i].occupied = true;
        timeSlots[i].task = segment;
    }
}
```

---

## 🧪 **Testing Scenarios**

### **Test Case 1: Simple Cross-Midnight Task**
- **Setup**: Create task 11:30 PM - 1:30 AM
- **Expected**: Task appears on both days, properly segmented
- **Verify**: Navigation between days shows continuity

### **Test Case 2: Multiple Cross-Midnight Tasks**  
- **Setup**: Multiple overlapping cross-midnight tasks
- **Expected**: All segments render without conflicts
- **Verify**: Timeline remains readable and accurate

### **Test Case 3: Cross-Midnight Task Editing**
- **Setup**: Edit cross-midnight task duration 
- **Expected**: Both segments update correctly
- **Verify**: Data consistency maintained

### **Test Case 4: Day Navigation**
- **Setup**: Navigate between days with cross-midnight tasks
- **Expected**: Task continuity visible, no duplicates
- **Verify**: Both segments clickable and functional

---

## 💻 **UI/UX Considerations**

### **Visual Indicators**
```css
/* Cross-midnight task styling */
.task-cross-midnight-primary {
    background: linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%);
    border-bottom-right-radius: 0;
    position: relative;
}

.task-cross-midnight-primary::after {
    content: "→";
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    color: white;
    font-weight: bold;
}

.task-cross-midnight-continuation {
    background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%);
    border-top-left-radius: 0;
    position: relative;
}

.task-cross-midnight-continuation::before {
    content: "←";
    position: absolute;
    left: 8px;
    top: 50%;
    transform: translateY(-50%);
    color: white;
    font-weight: bold;
}
```

### **Mobile Considerations**
- Cross-midnight indicators must be visible on small screens
- Swipe navigation should maintain task continuity
- Touch targets remain 44px minimum for both segments

---

## 🔄 **Edge Cases to Handle**

1. **Task Spanning Multiple Days**: Tasks longer than 24 hours
2. **Midnight Exactly**: Tasks ending at exactly 00:00
3. **DST Transitions**: Cross-midnight during time changes
4. **Recurring Cross-Midnight**: Weekly tasks that cross midnight
5. **Task Completion**: Marking cross-midnight tasks complete

---

## 📊 **Performance Considerations**

- Cache cross-midnight task calculations
- Optimize timeline rendering for multiple segments  
- Minimize DOM updates when navigating between days
- Index cross-midnight tasks for faster queries

---

## ✅ **Success Criteria**

- [ ] Tasks spanning midnight display correctly on both days
- [ ] Visual continuity indicators show task flow
- [ ] Navigation between days maintains task visibility  
- [ ] Editing cross-midnight tasks updates both segments
- [ ] Scheduling engine accounts for cross-midnight time blocks
- [ ] Mobile experience remains intuitive and usable
- [ ] Performance impact minimal (<100ms additional render time)

---

## 🔗 **Related Files**

- Task data models: `public/js/utils/TaskModel.js`
- Timeline rendering: `public/js/components/Timeline.js`
- Scheduling engine: `public/js/scheduling/SchedulingEngine.js`
- Navigation system: `public/js/components/DayNavigation.js`
- CSS styling: `public/css/timeline.css`

---

## 📝 **Implementation Notes**

- Always treat start date as the "primary" date for the task
- Cross-midnight detection should be automatic during task creation
- Visual indicators (arrows) help users understand task continuity
- Consider timezone implications for future international users
- Test thoroughly with various time ranges and edge cases