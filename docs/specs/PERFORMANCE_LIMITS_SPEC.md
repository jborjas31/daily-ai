# Performance Limits Implementation Spec

## ⚡ **Medium Priority Requirement**
**Priority**: MEDIUM  
**Phase**: Phase 9 - Advanced Scheduling Engine  
**Impact**: App slowdown with hundreds of tasks, poor scheduling performance

---

## 📋 **Problem Definition**

### **Issue**: 
Without performance limits and optimization:
- Scheduling engine becomes slow with many tasks (O(n²) complexity)
- Timeline rendering lags with 100+ task blocks
- UI becomes unresponsive during complex operations
- No user guidance on optimal task limits

---

## 🎯 **Performance Limits & Thresholds**

### **Recommended Limits**
```javascript
const PerformanceLimits = {
    tasks: {
        maxActive: 100,        // Maximum active tasks
        warningThreshold: 80,   // Show warning at 80 tasks
        maxPerDay: 20,         // Maximum tasks per day
        maxRecurring: 50       // Maximum recurring tasks
    },
    
    scheduling: {
        maxCalculationTime: 500,  // 500ms max for scheduling
        complexityThreshold: 200, // Tasks × dependencies threshold
        maxDependencyDepth: 10    // Maximum dependency chain length
    },
    
    ui: {
        maxTimelineBlocks: 50,    // Max task blocks per timeline view
        maxOverlappingTasks: 5,   // Max overlapping tasks to display
        renderBatchSize: 20,      // Tasks to render per batch
        scrollThrottleMs: 16      // 60fps scroll throttling
    },
    
    memory: {
        maxCacheSize: 1000,       // Max cached calculations
        cacheCleanupThreshold: 1200, // Clean cache when exceeded
        maxUndoHistory: 50        // Maximum undo operations
    }
};
```

### **Performance Benchmarks**
```javascript
const PerformanceBenchmarks = {
    scheduling: {
        target: '<100ms',         // Scheduling calculation time
        acceptable: '<500ms',     // Acceptable under load
        maximum: '<1000ms'        // Never exceed 1 second
    },
    
    rendering: {
        timelineRender: '<50ms',  // Timeline render time
        taskUpdate: '<16ms',      // Single task update (60fps)
        modalOpen: '<100ms',      // Modal open animation
        navigation: '<200ms'      // View navigation
    },
    
    memory: {
        baselineUsage: '<10MB',   // App baseline memory
        maxGrowth: '<50MB',       // Maximum memory growth
        gcTrigger: '80%'          // Trigger cleanup at 80% limit
    }
};
```

---

## 🚀 **Performance Optimization Implementation**

### **1. Task Limit Enforcement**

```javascript
class TaskLimitManager {
    constructor() {
        this.limits = PerformanceLimits.tasks;
        this.currentCounts = {
            active: 0,
            recurring: 0,
            total: 0
        };
    }
    
    async updateTaskCounts() {
        const tasks = await getAllTasks();
        
        this.currentCounts = {
            active: tasks.filter(t => t.isActive).length,
            recurring: tasks.filter(t => t.recurrenceRule.frequency !== 'none').length,
            total: tasks.length
        };
        
        this.checkLimits();
    }
    
    checkLimits() {
        const warnings = [];
        
        // Check active task limit
        if (this.currentCounts.active >= this.limits.warningThreshold) {
            warnings.push({
                type: 'active_tasks_high',
                current: this.currentCounts.active,
                limit: this.limits.maxActive,
                severity: this.currentCounts.active >= this.limits.maxActive ? 'critical' : 'warning'
            });
        }
        
        // Check recurring task limit
        if (this.currentCounts.recurring >= this.limits.maxRecurring) {
            warnings.push({
                type: 'recurring_tasks_limit',
                current: this.currentCounts.recurring,
                limit: this.limits.maxRecurring,
                severity: 'critical'
            });
        }
        
        this.handleLimitWarnings(warnings);
    }
    
    canCreateTask(taskType = 'normal') {
        const wouldExceedActive = this.currentCounts.active >= this.limits.maxActive;
        const wouldExceedRecurring = taskType === 'recurring' && 
                                   this.currentCounts.recurring >= this.limits.maxRecurring;
        
        return {
            canCreate: !wouldExceedActive && !wouldExceedRecurring,
            reasons: [
                ...(wouldExceedActive ? ['Active task limit reached'] : []),
                ...(wouldExceedRecurring ? ['Recurring task limit reached'] : [])
            ],
            suggestions: this.getLimitSuggestions()
        };
    }
    
    getLimitSuggestions() {
        return [
            'Archive completed one-time tasks',
            'Review and delete unused tasks',
            'Convert similar tasks into recurring patterns',
            'Use task dependencies instead of creating many small tasks'
        ];
    }
    
    handleLimitWarnings(warnings) {
        warnings.forEach(warning => {
            if (warning.severity === 'critical') {
                this.showCriticalLimitDialog(warning);
            } else {
                this.showLimitWarning(warning);
            }
        });
    }
}
```

### **2. Scheduling Performance Optimization**

```javascript
class OptimizedSchedulingEngine {
    constructor() {
        this.cache = new Map();
        this.complexityThreshold = PerformanceLimits.scheduling.complexityThreshold;
        this.maxCalculationTime = PerformanceLimits.scheduling.maxCalculationTime;
    }
    
    async scheduleTasksOptimized(date, tasks) {
        const startTime = performance.now();
        const cacheKey = this.generateCacheKey(date, tasks);
        
        // Check cache first
        const cached = this.cache.get(cacheKey);
        if (cached && this.isCacheValid(cached)) {
            return cached.result;
        }
        
        // Assess complexity and choose algorithm
        const complexity = this.assessComplexity(tasks);
        let result;
        
        if (complexity < this.complexityThreshold) {
            // Standard algorithm for simple schedules
            result = await this.standardScheduling(date, tasks);
        } else {
            // Optimized algorithm for complex schedules
            result = await this.optimizedScheduling(date, tasks);
        }
        
        const calculationTime = performance.now() - startTime;
        
        // Warn if calculation took too long
        if (calculationTime > this.maxCalculationTime) {
            console.warn(`Scheduling took ${calculationTime}ms (>${this.maxCalculationTime}ms threshold)`);
            this.suggestOptimization(tasks.length, calculationTime);
        }
        
        // Cache result
        this.cache.set(cacheKey, {
            result,
            timestamp: Date.now(),
            complexity,
            calculationTime
        });
        
        return result;
    }
    
    assessComplexity(tasks) {
        const activeTasks = tasks.filter(t => t.isActive).length;
        const dependencies = tasks.filter(t => t.dependsOn).length;
        const flexibleTasks = tasks.filter(t => t.schedulingType === 'flexible').length;
        
        // Complexity score based on multiple factors
        return (activeTasks * 2) + (dependencies * 5) + (flexibleTasks * 3);
    }
    
    async optimizedScheduling(date, tasks) {
        // Use more efficient algorithms for complex schedules
        const batches = this.batchTasksByTimeWindow(tasks);
        const results = [];
        
        // Process each time window independently
        for (const [timeWindow, windowTasks] of batches) {
            const windowResult = await this.scheduleTimeWindow(date, timeWindow, windowTasks);
            results.push(...windowResult);
        }
        
        return this.mergeSchedulingResults(results);
    }
    
    batchTasksByTimeWindow(tasks) {
        const batches = new Map();
        
        tasks.forEach(task => {
            const timeWindow = task.timeWindow || 'anytime';
            if (!batches.has(timeWindow)) {
                batches.set(timeWindow, []);
            }
            batches.get(timeWindow).push(task);
        });
        
        return batches;
    }
}
```

### **3. UI Performance Optimization**

```javascript
class TimelinePerformanceManager {
    constructor() {
        this.renderBatchSize = PerformanceLimits.ui.renderBatchSize;
        this.visibleTasks = new Set();
        this.renderQueue = [];
        this.isRendering = false;
    }
    
    async renderTimelineOptimized(tasks) {
        // Virtualize timeline for large datasets
        if (tasks.length > PerformanceLimits.ui.maxTimelineBlocks) {
            return this.renderVirtualizedTimeline(tasks);
        }
        
        // Standard rendering for normal datasets
        return this.renderStandardTimeline(tasks);
    }
    
    renderVirtualizedTimeline(tasks) {
        const container = document.getElementById('timeline-container');
        const viewport = this.calculateViewport(container);
        
        // Only render tasks in viewport + buffer
        const visibleTasks = this.getTasksInViewport(tasks, viewport);
        const bufferedTasks = this.addViewportBuffer(visibleTasks, tasks);
        
        // Batch render for smooth performance
        this.batchRenderTasks(bufferedTasks);
        
        // Setup intersection observer for dynamic loading
        this.setupVirtualScrolling(tasks);
    }
    
    batchRenderTasks(tasks) {
        if (this.isRendering) return;
        
        this.isRendering = true;
        this.renderQueue = [...tasks];
        
        const renderBatch = () => {
            const batch = this.renderQueue.splice(0, this.renderBatchSize);
            
            if (batch.length === 0) {
                this.isRendering = false;
                return;
            }
            
            // Render batch in single frame
            requestAnimationFrame(() => {
                batch.forEach(task => this.renderSingleTask(task));
                
                // Schedule next batch
                if (this.renderQueue.length > 0) {
                    setTimeout(renderBatch, 0); // Allow browser to breathe
                } else {
                    this.isRendering = false;
                }
            });
        };
        
        renderBatch();
    }
    
    setupScrollThrottling() {
        let scrollTimeout = null;
        const container = document.getElementById('timeline-container');
        
        container.addEventListener('scroll', () => {
            // Throttle scroll updates to 60fps
            if (scrollTimeout) return;
            
            scrollTimeout = setTimeout(() => {
                this.updateVisibleTasks();
                scrollTimeout = null;
            }, PerformanceLimits.ui.scrollThrottleMs);
        });
    }
}
```

### **4. Memory Management & Cleanup**

```javascript
class MemoryManager {
    constructor() {
        this.cacheSize = 0;
        this.maxCacheSize = PerformanceLimits.memory.maxCacheSize;
        this.cleanupThreshold = PerformanceLimits.memory.cacheCleanupThreshold;
        this.undoHistory = [];
        this.maxUndoHistory = PerformanceLimits.memory.maxUndoHistory;
    }
    
    addToCache(key, data) {
        // Check if cleanup needed
        if (this.cacheSize >= this.cleanupThreshold) {
            this.performCacheCleanup();
        }
        
        // Add to cache with timestamp
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            accessCount: 1
        });
        
        this.cacheSize++;
    }
    
    performCacheCleanup() {
        const entries = Array.from(this.cache.entries());
        
        // Sort by last access time and access count
        entries.sort((a, b) => {
            const scoreA = this.calculateCacheScore(a[1]);
            const scoreB = this.calculateCacheScore(b[1]);
            return scoreA - scoreB;
        });
        
        // Remove least valuable entries
        const toRemove = Math.floor(entries.length * 0.3); // Remove 30%
        
        for (let i = 0; i < toRemove; i++) {
            this.cache.delete(entries[i][0]);
            this.cacheSize--;
        }
        
        console.log(`Cache cleanup: removed ${toRemove} entries, ${this.cacheSize} remaining`);
    }
    
    calculateCacheScore(entry) {
        const age = Date.now() - entry.timestamp;
        const accessCount = entry.accessCount;
        
        // Lower score = more likely to be removed
        return accessCount / (age / 1000 / 60); // Access per minute
    }
    
    manageUndoHistory(operation) {
        this.undoHistory.push(operation);
        
        // Trim undo history if too long
        if (this.undoHistory.length > this.maxUndoHistory) {
            this.undoHistory = this.undoHistory.slice(-this.maxUndoHistory);
        }
    }
    
    performMemoryCleanup() {
        // Clear unnecessary references
        this.performCacheCleanup();
        
        // Trim undo history
        this.undoHistory = this.undoHistory.slice(-this.maxUndoHistory);
        
        // Clear temporary DOM elements
        this.clearTemporaryElements();
        
        // Suggest garbage collection (if available)
        if (window.gc) {
            window.gc();
        }
    }
}
```

---

## 🧪 **Performance Testing**

### **Benchmarking Suite**
```javascript
class PerformanceBenchmark {
    async runFullBenchmark() {
        const results = {};
        
        // Test scheduling performance
        results.scheduling = await this.benchmarkScheduling();
        
        // Test UI rendering performance  
        results.rendering = await this.benchmarkRendering();
        
        // Test memory usage
        results.memory = await this.benchmarkMemory();
        
        return this.analyzeBenchmarkResults(results);
    }
    
    async benchmarkScheduling() {
        const testSizes = [10, 25, 50, 100, 200];
        const results = [];
        
        for (const size of testSizes) {
            const tasks = this.generateTestTasks(size);
            const startTime = performance.now();
            
            await scheduleTasksForDay('2024-08-19', tasks);
            
            const endTime = performance.now();
            results.push({
                taskCount: size,
                duration: endTime - startTime,
                acceptable: endTime - startTime < PerformanceBenchmarks.scheduling.acceptable
            });
        }
        
        return results;
    }
}
```

---

## ✅ **Success Criteria**

- [ ] App maintains <100ms scheduling time with 100 active tasks
- [ ] Timeline rendering stays <50ms with optimal virtualization
- [ ] Memory usage growth limited to <50MB during extended use
- [ ] Warning system guides users before hitting limits
- [ ] Performance degradation graceful, never causes app freeze
- [ ] Cache cleanup maintains optimal memory usage
- [ ] UI remains responsive during all operations

---

## 🔗 **Related Files**

- Task limits: `public/js/performance/TaskLimitManager.js`
- Scheduling optimization: `public/js/scheduling/OptimizedSchedulingEngine.js`
- UI performance: `public/js/components/TimelinePerformanceManager.js`  
- Memory management: `public/js/performance/MemoryManager.js`
- Benchmarking: `tests/PerformanceBenchmark.js`

---

## 📝 **Implementation Notes**

- Implement task limits with clear user guidance and suggestions
- Use virtualization for timeline rendering with 50+ tasks
- Cache scheduling calculations but implement cleanup to prevent memory bloat
- Monitor performance continuously and alert on degradation
- Provide user-friendly explanations for performance limitations