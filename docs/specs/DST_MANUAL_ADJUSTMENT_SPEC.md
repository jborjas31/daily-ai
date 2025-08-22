# DST Manual Time Adjustment Implementation Spec

## 🟢 **Low Priority Requirement**  
**Priority**: LOW  
**Phase**: Phase 12 - PWA Features & Polish  
**Impact**: Schedule conflicts during time changes, regional compatibility

---

## 📋 **Problem Definition**

### **Issue**: 
Traditional DST handling is complex and error-prone. Instead of automatic DST detection:
- Provide simple manual time adjustment setting
- Allow users to shift entire schedule forward/backward
- Give users full control over time changes
- Avoid timezone complexity entirely

---

## 🎯 **Manual Time Adjustment Strategy**

### **User-Controlled Approach**
```javascript
// Instead of automatic DST detection, provide manual controls
const TimeAdjustmentSettings = {
    // Manual offset in hours (can be positive or negative)
    manualOffset: 0,        // Default: no adjustment
    
    // Common presets for user convenience
    commonAdjustments: {
        springForward: 1,     // "Spring forward" - lose 1 hour
        fallBack: -1,         // "Fall back" - gain 1 hour
        none: 0               // No adjustment
    },
    
    // Settings persistence
    offsetHistory: [],        // Track previous adjustments
    adjustmentReason: '',     // User's note about why they adjusted
    lastModified: null        // When adjustment was made
};
```

---

## 🔧 **Implementation Details**

### **1. Time Adjustment Settings UI**

```javascript
class TimeAdjustmentManager {
    constructor() {
        this.currentOffset = 0;
        this.settings = this.loadSettings();
        this.initializeUI();
    }
    
    initializeUI() {
        const settingsContainer = document.getElementById('time-adjustment-settings');
        
        settingsContainer.innerHTML = `
            <div class="time-adjustment-panel">
                <h3>Time Adjustment</h3>
                <p class="description">
                    Manually adjust all times in your schedule. Use this for daylight saving 
                    time changes or when traveling across time zones.
                </p>
                
                <div class="adjustment-controls">
                    <label for="manual-offset">Time Offset (hours):</label>
                    <div class="offset-input-group">
                        <button type="button" class="offset-btn" data-offset="-1">-1h</button>
                        <input 
                            type="number" 
                            id="manual-offset" 
                            min="-12" 
                            max="12" 
                            step="0.5" 
                            value="${this.currentOffset}"
                            class="offset-input"
                        >
                        <button type="button" class="offset-btn" data-offset="1">+1h</button>
                    </div>
                </div>
                
                <div class="preset-buttons">
                    <button type="button" class="preset-btn" data-offset="-1">
                        Fall Back (-1h)
                    </button>
                    <button type="button" class="preset-btn" data-offset="1">
                        Spring Forward (+1h)
                    </button>
                    <button type="button" class="preset-btn" data-offset="0">
                        Reset to Normal
                    </button>
                </div>
                
                <div class="adjustment-reason">
                    <label for="adjustment-reason">Reason (optional):</label>
                    <input 
                        type="text" 
                        id="adjustment-reason" 
                        placeholder="e.g., Daylight Saving Time, Travel to EST"
                        value="${this.settings.adjustmentReason || ''}"
                        class="reason-input"
                    >
                </div>
                
                <div class="adjustment-preview">
                    <h4>Preview of Changes:</h4>
                    <div id="time-preview-list"></div>
                </div>
                
                <div class="adjustment-actions">
                    <button type="button" id="apply-adjustment" class="btn-primary">
                        Apply Time Adjustment
                    </button>
                    <button type="button" id="cancel-adjustment" class="btn-secondary">
                        Cancel
                    </button>
                </div>
            </div>
        `;
        
        this.setupEventListeners();
        this.updatePreview();
    }
    
    setupEventListeners() {
        // Offset input change
        const offsetInput = document.getElementById('manual-offset');
        offsetInput.addEventListener('input', (e) => {
            this.currentOffset = parseFloat(e.target.value);
            this.updatePreview();
        });
        
        // Preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const offset = parseFloat(e.target.dataset.offset);
                this.setOffset(offset);
            });
        });
        
        // Offset adjustment buttons
        document.querySelectorAll('.offset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const adjustment = parseFloat(e.target.dataset.offset);
                this.adjustOffset(adjustment);
            });
        });
        
        // Apply adjustment
        document.getElementById('apply-adjustment').addEventListener('click', () => {
            this.applyAdjustment();
        });
        
        // Cancel
        document.getElementById('cancel-adjustment').addEventListener('click', () => {
            this.cancelAdjustment();
        });
    }
    
    setOffset(offset) {
        this.currentOffset = Math.max(-12, Math.min(12, offset));
        document.getElementById('manual-offset').value = this.currentOffset;
        this.updatePreview();
    }
    
    adjustOffset(adjustment) {
        this.setOffset(this.currentOffset + adjustment);
    }
    
    updatePreview() {
        const previewContainer = document.getElementById('time-preview-list');
        const sampleTimes = this.getSampleTimes();
        
        previewContainer.innerHTML = sampleTimes.map(time => {
            const adjusted = this.adjustTime(time.original, this.currentOffset);
            const change = this.currentOffset > 0 ? '+' : '';
            
            return `
                <div class="time-preview-item">
                    <span class="original-time">${time.original}</span>
                    <span class="arrow">→</span>
                    <span class="adjusted-time">${adjusted}</span>
                    <span class="change-indicator">(${change}${this.currentOffset}h)</span>
                    <span class="time-label">${time.label}</span>
                </div>
            `;
        }).join('');
    }
    
    getSampleTimes() {
        const userSettings = getUserSettings();
        const today = getCurrentDate();
        const sampleTasks = getSampleTasksForPreview();
        
        return [
            {
                original: userSettings.defaultWakeTime,
                label: 'Wake Time'
            },
            {
                original: userSettings.defaultSleepTime, 
                label: 'Sleep Time'
            },
            ...sampleTasks.map(task => ({
                original: task.defaultTime || task.suggestedTime,
                label: task.taskName
            }))
        ].filter(item => item.original);
    }
}
```

### **2. Time Calculation with Offset**

```javascript
class TimeCalculator {
    constructor(manualOffset = 0) {
        this.manualOffset = manualOffset; // Hours
    }
    
    // Apply manual offset to any time string
    adjustTime(timeString, offsetHours = this.manualOffset) {
        if (!timeString || offsetHours === 0) return timeString;
        
        const [hours, minutes] = timeString.split(':').map(Number);
        let adjustedHours = hours + offsetHours;
        
        // Handle day overflow/underflow
        while (adjustedHours >= 24) {
            adjustedHours -= 24;
        }
        while (adjustedHours < 0) {
            adjustedHours += 24;
        }
        
        return `${String(adjustedHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    
    // Apply offset to user settings
    adjustUserSettings(settings) {
        return {
            ...settings,
            defaultWakeTime: this.adjustTime(settings.defaultWakeTime),
            defaultSleepTime: this.adjustTime(settings.defaultSleepTime)
        };
    }
    
    // Apply offset to task times
    adjustTaskTimes(tasks) {
        return tasks.map(task => ({
            ...task,
            defaultTime: task.defaultTime ? this.adjustTime(task.defaultTime) : null,
            // Adjust any cached scheduled times
            scheduledTime: task.scheduledTime ? this.adjustTime(task.scheduledTime) : null
        }));
    }
    
    // Apply offset to daily schedule overrides
    adjustDailySchedules(schedules) {
        const adjusted = {};
        
        Object.entries(schedules).forEach(([date, schedule]) => {
            adjusted[date] = {
                ...schedule,
                wakeTime: schedule.wakeTime ? this.adjustTime(schedule.wakeTime) : null,
                sleepTime: schedule.sleepTime ? this.adjustTime(schedule.sleepTime) : null
            };
        });
        
        return adjusted;
    }
    
    // Get current system time with offset applied
    getCurrentTimeWithOffset() {
        const now = new Date();
        const offsetMs = this.manualOffset * 60 * 60 * 1000;
        const adjustedTime = new Date(now.getTime() + offsetMs);
        
        const hours = String(adjustedTime.getHours()).padStart(2, '0');
        const minutes = String(adjustedTime.getMinutes()).padStart(2, '0');
        
        return `${hours}:${minutes}`;
    }
}
```

### **3. Application-Wide Time Offset Management**

```javascript
class GlobalTimeManager {
    constructor() {
        this.timeOffset = this.loadTimeOffset();
        this.calculator = new TimeCalculator(this.timeOffset);
        this.observers = [];
    }
    
    loadTimeOffset() {
        const saved = localStorage.getItem('dailyai_time_offset');
        return saved ? parseFloat(saved) : 0;
    }
    
    saveTimeOffset(offset) {
        localStorage.setItem('dailyai_time_offset', offset.toString());
        this.saveOffsetHistory(offset);
    }
    
    saveOffsetHistory(offset) {
        const history = JSON.parse(localStorage.getItem('dailyai_offset_history') || '[]');
        const reason = document.getElementById('adjustment-reason')?.value || '';
        
        history.push({
            offset,
            reason,
            timestamp: Date.now(),
            previousOffset: this.timeOffset
        });
        
        // Keep last 10 adjustments
        const trimmedHistory = history.slice(-10);
        localStorage.setItem('dailyai_offset_history', JSON.stringify(trimmedHistory));
    }
    
    async applyTimeOffset(newOffset) {
        const oldOffset = this.timeOffset;
        this.timeOffset = newOffset;
        this.calculator = new TimeCalculator(newOffset);
        
        try {
            // Update user settings
            const userSettings = await getUserSettings();
            const adjustedSettings = this.calculator.adjustUserSettings(userSettings);
            await updateUserSettings(adjustedSettings);
            
            // Update all task times
            const tasks = await getAllTasks();
            const adjustedTasks = this.calculator.adjustTaskTimes(tasks);
            await updateMultipleTasks(adjustedTasks);
            
            // Update daily schedule overrides
            const dailySchedules = await getAllDailySchedules();
            const adjustedSchedules = this.calculator.adjustDailySchedules(dailySchedules);
            await updateDailySchedules(adjustedSchedules);
            
            // Save the new offset
            this.saveTimeOffset(newOffset);
            
            // Notify observers
            this.notifyObservers({ oldOffset, newOffset });
            
            // Refresh the UI
            this.refreshApplicationUI();
            
            return { success: true };
        } catch (error) {
            // Rollback on error
            this.timeOffset = oldOffset;
            this.calculator = new TimeCalculator(oldOffset);
            
            return { 
                success: false, 
                error: error.message 
            };
        }
    }
    
    registerObserver(callback) {
        this.observers.push(callback);
    }
    
    notifyObservers(data) {
        this.observers.forEach(callback => callback(data));
    }
    
    refreshApplicationUI() {
        // Trigger re-render of timeline
        if (window.timelineManager) {
            window.timelineManager.renderCurrentDay();
        }
        
        // Update clock display
        if (window.clockManager) {
            window.clockManager.updateClock();
        }
        
        // Update all time displays
        document.querySelectorAll('[data-time]').forEach(element => {
            const originalTime = element.dataset.time;
            const adjustedTime = this.calculator.adjustTime(originalTime);
            element.textContent = adjustedTime;
        });
        
        // Show success notification
        showNotification({
            type: 'success',
            title: 'Time Adjustment Applied',
            message: `All times adjusted by ${this.timeOffset > 0 ? '+' : ''}${this.timeOffset} hours`,
            duration: 3000
        });
    }
}
```

### **4. Integration with Real-Time Features**

```javascript
// Update real-time clock to use offset
class OffsetAwareClock {
    constructor(timeManager) {
        this.timeManager = timeManager;
        this.clockElement = document.getElementById('current-time');
        this.updateClock();
        setInterval(() => this.updateClock(), 30000); // Update every 30 seconds
    }
    
    updateClock() {
        const adjustedTime = this.timeManager.calculator.getCurrentTimeWithOffset();
        const [hours, minutes] = adjustedTime.split(':');
        
        // Format for display
        const displayTime = this.formatTimeForDisplay(hours, minutes);
        
        if (this.clockElement) {
            this.clockElement.textContent = displayTime;
            
            // Add offset indicator if active
            if (this.timeManager.timeOffset !== 0) {
                const offsetText = this.timeManager.timeOffset > 0 ? 
                    `+${this.timeManager.timeOffset}h` : 
                    `${this.timeManager.timeOffset}h`;
                this.clockElement.innerHTML = `${displayTime} <span class="time-offset">(${offsetText})</span>`;
            }
        }
    }
    
    formatTimeForDisplay(hours, minutes) {
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        
        return `${displayHour}:${minutes} ${ampm}`;
    }
}
```

---

## 🧪 **Testing Scenarios**

### **Test Case 1: Spring Forward (+1 hour)**
- **Setup**: Apply +1 hour adjustment
- **Expected**: All times shifted forward by 1 hour
- **Verify**: 9:00 AM becomes 10:00 AM, sleep/wake times adjusted

### **Test Case 2: Fall Back (-1 hour)**  
- **Setup**: Apply -1 hour adjustment
- **Expected**: All times shifted backward by 1 hour
- **Verify**: 10:00 AM becomes 9:00 AM, no scheduling conflicts

### **Test Case 3: Fractional Adjustments**
- **Setup**: Apply +0.5 hour adjustment
- **Expected**: All times shifted forward by 30 minutes
- **Verify**: 9:00 AM becomes 9:30 AM

### **Test Case 4: Reset to Normal**
- **Setup**: Apply adjustment, then reset to 0
- **Expected**: All times return to original values
- **Verify**: No residual offset effects

### **Test Case 5: Real-time Clock**
- **Setup**: Apply any offset
- **Expected**: Current time display shows adjusted time with offset indicator
- **Verify**: Timeline indicator moves based on adjusted time

---

## 💻 **UI Styling**

```css
.time-adjustment-panel {
    background: var(--neutral-50);
    border: 1px solid var(--neutral-200);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
    margin: var(--space-4) 0;
}

.offset-input-group {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin: var(--space-3) 0;
}

.offset-input {
    width: 80px;
    text-align: center;
    font-family: var(--font-mono);
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
}

.preset-buttons {
    display: flex;
    gap: var(--space-2);
    margin: var(--space-4) 0;
    flex-wrap: wrap;
}

.preset-btn {
    background: var(--primary-light);
    color: var(--primary-dark);
    border: 1px solid var(--primary);
    border-radius: var(--radius-md);
    padding: var(--space-2) var(--space-4);
    font-size: var(--text-sm);
    cursor: pointer;
    transition: all 0.2s ease;
}

.preset-btn:hover {
    background: var(--primary);
    color: white;
}

.time-preview-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
}

.original-time {
    color: var(--neutral-600);
}

.adjusted-time {
    color: var(--primary);
    font-weight: var(--font-semibold);
}

.change-indicator {
    color: var(--warning);
    font-size: var(--text-xs);
}

.time-offset {
    font-size: var(--text-xs);
    color: var(--warning);
    font-weight: var(--font-normal);
}
```

---

## ✅ **Success Criteria**

- [ ] Users can easily adjust all times by any amount (-12h to +12h)
- [ ] Clear preview shows exactly how times will change
- [ ] All times (wake, sleep, tasks, current time) adjust consistently
- [ ] Real-time clock displays adjusted time with offset indicator
- [ ] Settings persist across browser sessions
- [ ] Reset function returns all times to normal
- [ ] No complex timezone logic required
- [ ] UI remains simple and intuitive

---

## 🔗 **Related Files**

- Time adjustment UI: `public/js/components/TimeAdjustmentManager.js`
- Global time manager: `public/js/utils/GlobalTimeManager.js`  
- Time calculator: `public/js/utils/TimeCalculator.js`
- Offset-aware clock: `public/js/components/OffsetAwareClock.js`
- Settings integration: `public/js/utils/UserSettings.js`

---

## 📝 **Implementation Notes**

- Keep the interface simple - avoid complex timezone terminology
- Provide common presets (Spring Forward, Fall Back) for convenience  
- Show clear preview of what will change before applying
- Persist offset setting across browser sessions
- Update real-time clock to reflect the offset
- Consider the offset in all time-related calculations throughout the app
- Provide easy reset to normal time functionality