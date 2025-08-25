# Storage Limits & Fallback Thresholds Implementation Spec

## ⚡ **Medium Priority Requirement**
**Priority**: MEDIUM  
**Phase**: Phase 7 - Offline Functionality  
**Impact**: Silent data loss when storage full, poor user experience

---

## 📋 **Problem Definition**

### **Issue**: 
Without storage monitoring and fallback strategies:
- Users can lose data when storage limits are reached
- App fails silently without clear error messages  
- No graceful degradation when IndexedDB fails
- No warning system for approaching limits

---

## 🎯 **Storage Capacity Planning**

### **Expected Storage Requirements**
```javascript
// Estimated storage usage per user
const StorageEstimates = {
    // Task templates (100 tasks max)
    tasks: {
        singleTask: 0.5, // KB per task template
        maxTasks: 100,
        totalEstimate: 50 // KB
    },
    
    // Task instances (30-day rolling window)
    taskInstances: {
        singleInstance: 0.3, // KB per instance
        dailyInstances: 20, // estimated instances per day
        retentionDays: 30,
        totalEstimate: 180 // KB (20 * 30 * 0.3)
    },
    
    // User settings and daily schedules
    settings: {
        userSettings: 1, // KB
        dailySchedules: 30, // KB (30 days * 1KB each)
        totalEstimate: 31 // KB
    },
    
    // Total estimated usage per user: ~261 KB
    totalEstimate: 261,
    
    // Safety margin (4x for growth)
    recommendedQuota: 1048 // KB (~1MB)
};
```

### **Browser Storage Limits**
```javascript
const StorageLimits = {
    indexedDB: {
        typical: 50 * 1024 * 1024, // 50MB typical minimum
        chrome: 1024 * 1024 * 1024, // 1GB+ on desktop
        firefox: 2 * 1024 * 1024 * 1024, // 2GB+
        safari: 1024 * 1024 * 1024 // 1GB+
    },
    
    localStorage: {
        typical: 5 * 1024 * 1024, // 5-10MB typical
        perOrigin: 10 * 1024 * 1024 // 10MB max per origin
    },
    
    // Warning thresholds
    warningThreshold: 0.8, // 80% of available storage
    criticalThreshold: 0.95 // 95% of available storage
};
```

---

## 💾 **Storage Monitoring Implementation**

### **1. Storage Usage Tracking**

```javascript
class StorageMonitor {
    constructor() {
        this.quotaAPI = navigator.storage && navigator.storage.estimate;
        this.fallbackEstimate = 0;
    }
    
    async getStorageUsage() {
        try {
            if (this.quotaAPI) {
                const estimate = await navigator.storage.estimate();
                return {
                    used: estimate.usage || 0,
                    total: estimate.quota || StorageLimits.indexedDB.typical,
                    available: (estimate.quota || StorageLimits.indexedDB.typical) - (estimate.usage || 0),
                    method: 'StorageAPI'
                };
            } else {
                // Fallback estimation for older browsers
                return await this.estimateStorageUsage();
            }
        } catch (error) {
            console.warn('Storage estimation failed:', error);
            return this.getFallbackEstimate();
        }
    }
    
    async estimateStorageUsage() {
        try {
            // Estimate IndexedDB usage
            const dbSize = await this.estimateIndexedDBSize();
            const totalQuota = StorageLimits.indexedDB.typical;
            
            return {
                used: dbSize,
                total: totalQuota,
                available: totalQuota - dbSize,
                method: 'Estimation'
            };
        } catch (error) {
            return this.getFallbackEstimate();
        }
    }
    
    async estimateIndexedDBSize() {
        // Count records and estimate size
        const taskCount = await this.countRecords('tasks');
        const instanceCount = await this.countRecords('task_instances');
        const settingsSize = 1024; // 1KB for settings
        
        const estimatedSize = 
            (taskCount * StorageEstimates.tasks.singleTask * 1024) +
            (instanceCount * StorageEstimates.taskInstances.singleInstance * 1024) +
            settingsSize;
            
        return estimatedSize;
    }
    
    getFallbackEstimate() {
        return {
            used: this.fallbackEstimate,
            total: StorageLimits.indexedDB.typical,
            available: StorageLimits.indexedDB.typical - this.fallbackEstimate,
            method: 'Fallback'
        };
    }
    
    updateFallbackEstimate(operation, size) {
        switch (operation) {
            case 'add':
                this.fallbackEstimate += size;
                break;
            case 'delete':
                this.fallbackEstimate = Math.max(0, this.fallbackEstimate - size);
                break;
            case 'update':
                // Size change handled in calling code
                break;
        }
    }
}
```

### **2. Storage Warning System**

```javascript
class StorageWarningSystem {
    constructor(storageMonitor) {
        this.monitor = storageMonitor;
        this.lastWarningLevel = 'normal';
        this.checkInterval = 5 * 60 * 1000; // Check every 5 minutes
        this.startMonitoring();
    }
    
    startMonitoring() {
        // Check storage on app startup
        this.checkStorageLevel();
        
        // Periodic checks
        setInterval(() => {
            this.checkStorageLevel();
        }, this.checkInterval);
        
        // Check before major operations
        this.setupOperationInterceptors();
    }
    
    async checkStorageLevel() {
        const usage = await this.monitor.getStorageUsage();
        const usagePercent = usage.used / usage.total;
        
        let warningLevel = 'normal';
        
        if (usagePercent >= StorageLimits.criticalThreshold) {
            warningLevel = 'critical';
        } else if (usagePercent >= StorageLimits.warningThreshold) {
            warningLevel = 'warning';
        }
        
        // Only show warning if level has changed
        if (warningLevel !== this.lastWarningLevel) {
            this.showStorageWarning(warningLevel, usage, usagePercent);
            this.lastWarningLevel = warningLevel;
        }
        
        return { level: warningLevel, usage, usagePercent };
    }
    
    showStorageWarning(level, usage, percent) {
        const message = this.getWarningMessage(level, usage, percent);
        
        switch (level) {
            case 'warning':
                this.showWarningNotification(message);
                break;
            case 'critical':
                this.showCriticalDialog(message);
                break;
            case 'normal':
                this.clearWarnings();
                break;
        }
    }
    
    getWarningMessage(level, usage, percent) {
        const usedMB = Math.round(usage.used / (1024 * 1024) * 100) / 100;
        const totalMB = Math.round(usage.total / (1024 * 1024) * 100) / 100;
        const percentStr = Math.round(percent * 100);
        
        switch (level) {
            case 'warning':
                return {
                    title: 'Storage Space Low',
                    message: `You're using ${percentStr}% of available storage (${usedMB} MB of ${totalMB} MB). Consider cleaning up old data.`,
                    actions: ['View Cleanup Options', 'Dismiss']
                };
            case 'critical':
                return {
                    title: 'Storage Space Critical',
                    message: `Storage is ${percentStr}% full (${usedMB} MB of ${totalMB} MB). The app may not function properly. Please free up space immediately.`,
                    actions: ['Clean Up Now', 'Export Data', 'Continue Anyway']
                };
        }
    }
}
```

### **3. Graceful Degradation & Fallback**

```javascript
class StorageFallbackSystem {
    constructor() {
        this.primaryStorage = 'IndexedDB';
        this.fallbackStorage = 'localStorage';
        this.currentStorage = null;
        this.fallbackActive = false;
    }
    
    async initializeStorage() {
        try {
            // Test IndexedDB functionality
            await this.testIndexedDB();
            this.currentStorage = 'IndexedDB';
            this.fallbackActive = false;
        } catch (error) {
            console.warn('IndexedDB not available, falling back to localStorage:', error);
            await this.initializeFallback();
        }
    }
    
    async testIndexedDB() {
        return new Promise((resolve, reject) => {
            const testRequest = indexedDB.open('test-db', 1);
            
            testRequest.onerror = () => reject(testRequest.error);
            testRequest.onsuccess = () => {
                testRequest.result.close();
                indexedDB.deleteDatabase('test-db');
                resolve();
            };
            testRequest.onupgradeneeded = () => {
                // Create test object store
                testRequest.result.createObjectStore('test');
            };
        });
    }
    
    async initializeFallback() {
        try {
            // Test localStorage availability and capacity
            const testKey = '__storage_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            
            this.currentStorage = 'localStorage';
            this.fallbackActive = true;
            
            // Show fallback warning
            this.showFallbackWarning();
            
        } catch (error) {
            // Even localStorage failed - very limited functionality
            this.currentStorage = 'memory';
            this.fallbackActive = true;
            this.showCriticalStorageError();
        }
    }
    
    showFallbackWarning() {
        const notification = {
            type: 'info',
            title: 'Limited Storage Mode',
            message: 'Using localStorage as backup storage. Some features may be limited. Data capacity is reduced to ~5MB.',
            persistent: true,
            actions: [
                {
                    text: 'Learn More',
                    action: () => this.showStorageHelp()
                },
                {
                    text: 'Dismiss',
                    action: () => this.dismissNotification()
                }
            ]
        };
        
        showNotification(notification);
    }
    
    async checkStorageCapacity(dataSize) {
        if (this.currentStorage === 'localStorage') {
            const currentUsage = this.calculateLocalStorageUsage();
            const available = StorageLimits.localStorage.typical - currentUsage;
            
            if (dataSize > available) {
                throw new Error(`Insufficient storage: ${dataSize} bytes needed, ${available} bytes available`);
            }
        }
        
        return true;
    }
    
    calculateLocalStorageUsage() {
        let totalSize = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                totalSize += localStorage[key].length + key.length;
            }
        }
        return totalSize * 2; // UTF-16 encoding
    }
}
```

### **4. Data Cleanup Utilities**

```javascript
class DataCleanupManager {
    constructor() {
        this.cleanupOptions = [
            {
                id: 'old_instances',
                name: 'Old Task Instances',
                description: 'Remove task instances older than 30 days',
                estimatedSavings: '50-200 KB',
                safetyLevel: 'safe'
            },
            {
                id: 'completed_tasks',
                name: 'Completed One-time Tasks',
                description: 'Remove completed non-recurring tasks',
                estimatedSavings: '10-50 KB',
                safetyLevel: 'safe'
            },
            {
                id: 'deleted_tasks',
                name: 'Deleted Tasks',
                description: 'Permanently remove soft-deleted tasks',
                estimatedSavings: '20-100 KB',
                safetyLevel: 'medium'
            }
        ];
    }
    
    async analyzeCleanupOptions() {
        const analysis = [];
        
        for (const option of this.cleanupOptions) {
            const data = await this.calculateCleanupImpact(option.id);
            analysis.push({
                ...option,
                actualSavings: data.estimatedBytes,
                itemCount: data.itemCount,
                recommended: data.estimatedBytes > 10240 // Recommend if >10KB savings
            });
        }
        
        return analysis.sort((a, b) => b.actualSavings - a.actualSavings);
    }
    
    async performCleanup(cleanupIds) {
        const results = [];
        
        for (const cleanupId of cleanupIds) {
            try {
                const result = await this.executeCleanup(cleanupId);
                results.push({
                    id: cleanupId,
                    success: true,
                    bytesFreed: result.bytesFreed,
                    itemsRemoved: result.itemsRemoved
                });
            } catch (error) {
                results.push({
                    id: cleanupId,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return results;
    }
}
```

---

## 🧪 **Testing Scenarios**

### **Test Case 1: Warning Threshold**
- **Setup**: Fill storage to 80% capacity
- **Expected**: Warning notification appears
- **Verify**: Cleanup options offered

### **Test Case 2: Critical Threshold**
- **Setup**: Fill storage to 95% capacity  
- **Expected**: Critical dialog blocks further operations
- **Verify**: Must clean up data to continue (data export feature planned for future development)

### **Test Case 3: IndexedDB Failure**
- **Setup**: Disable IndexedDB in browser
- **Expected**: Graceful fallback to localStorage
- **Verify**: User informed about limitations

### **Test Case 4: Storage Full**
- **Setup**: Attempt to save data when storage full
- **Expected**: Clear error message, data not lost
- **Verify**: Options provided to free space

---

## 💻 **UI Components**

### **Storage Warning Notification**
```css
.storage-warning {
    background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
    border: 1px solid #F59E0B;
    border-radius: 8px;
    padding: 16px;
    margin: 16px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
}

.storage-critical {
    background: linear-gradient(135deg, #FEF2F2 0%, #FECACA 100%);
    border: 1px solid #EF4444;
    border-radius: 8px;
    padding: 16px;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1000;
    max-width: 500px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}
```

---

## ✅ **Success Criteria**

- [ ] Storage warnings appear at 80% capacity
- [ ] Critical alerts block operations at 95% capacity
- [ ] Graceful fallback to localStorage when IndexedDB fails
- [ ] Clear error messages when storage operations fail
- [ ] Data cleanup tools effectively free space
- [ ] No silent data loss in any storage scenario
- [ ] Fallback limitations clearly communicated to users

---

## 🔗 **Related Files**

- Storage monitoring: `public/js/storage/StorageMonitor.js`
- Fallback system: `public/js/storage/StorageFallback.js`
- Cleanup utilities: `public/js/storage/DataCleanup.js`
- UI components: `public/js/components/StorageWarnings.js`
- CSS styling: `public/css/storage-warnings.css`

---

## 📝 **Implementation Notes**

- Monitor storage usage every 5 minutes and before major operations
- Use Storage API when available, fallback to estimation for older browsers
- Always test storage capacity before attempting writes
- Provide clear, actionable error messages and cleanup options
- Consider storage usage in app architecture decisions