/**
 * Application State Management
 * Single source of truth for all application data
 */

import { taskTemplates, taskInstances, dataUtils } from './dataOffline.js';
import { dailySchedules } from './data.js'; // Keep this from original data.js as it doesn't need offline support
import { userSettingsManager } from './userSettings.js';
import { taskTemplateManager } from './taskLogic.js';

/**
 * Global Application State
 */
let appState = {
  // User authentication
  user: null,
  isAuthenticated: false,
  
  // User settings
  settings: {
    desiredSleepDuration: 7.5,
    defaultWakeTime: "06:30",
    defaultSleepTime: "23:00"
  },
  
  // Current view
  currentView: 'today', // 'today', 'library', 'settings'
  currentDate: dataUtils.getTodayDateString(),
  
  // Task template data with enhanced caching
  taskTemplates: {
    data: [],
    cache: new Map(), // Template ID -> template object for fast lookups
    lastLoaded: null,
    metadata: {
      total: 0,
      active: 0,
      inactive: 0,
      byPriority: {},
      byTimeWindow: {},
      lastUpdated: null
    },
    filters: {
      includeInactive: false,
      timeWindow: null,
      priority: null,
      isMandatory: null,
      schedulingType: null
    },
    pagination: {
      limit: 50,
      offset: 0,
      hasMore: false,
      total: 0
    },
    searchResults: {
      query: '',
      results: [],
      lastSearch: null
    }
  },
  
  // Task instance data with enhanced date-based management
  taskInstances: {
    data: new Map(), // Date string -> array of instances for fast date lookups
    cache: new Map(), // Instance ID -> instance object for fast instance lookups
    dateRange: {
      startDate: null,
      endDate: null,
      loadedDates: new Set() // Track which dates have been loaded
    },
    metadata: {
      totalInstances: 0,
      dateCount: 0,
      byStatus: {},
      byDate: {},
      completionRate: 0,
      averageCompletionTime: null,
      lastUpdated: null
    },
    filters: {
      status: null, // 'pending', 'completed', 'skipped', 'postponed'
      templateId: null,
      dateRange: {
        start: null,
        end: null
      }
    },
    searchResults: {
      query: '',
      results: [],
      dateFilter: null,
      lastSearch: null
    },
    currentDate: dataUtils.getTodayDateString(), // Currently viewed date for instances
    navigationHistory: [], // For date navigation history
    preloadDates: [], // Dates to preload for performance
    stats: {
      daily: new Map(), // Date -> daily stats
      weekly: new Map(), // Week -> weekly stats  
      monthly: new Map() // Month -> monthly stats
    }
  },
  dailySchedules: new Map(), // Date string -> schedule override
  
  // UI state
  loading: {
    tasks: false,
    settings: false,
    saving: false
  },
  
  // Offline state
  isOnline: navigator.onLine,
  pendingSyncActions: [],
  templateOperationQueue: [], // Queue for offline template operations
  instanceOperationQueue: [], // Queue for offline instance operations
  
  // Multi-tab synchronization
  tabSyncEnabled: true,
  lastSyncTimestamp: new Date().toISOString(),
  
  // Real-time updates
  lastUpdated: new Date().toISOString(),
  
  // Search and filters
  searchQuery: '',
  activeFilters: {
    showCompleted: true,
    showSkipped: true,
    timeWindow: 'all', // 'all', 'morning', 'afternoon', 'evening'
    mandatory: 'all' // 'all', 'mandatory', 'skippable'
  }
};

/**
 * State Management Functions
 */
export const state = {
  // Get current state (read-only)
  get: () => ({ ...appState }),
  
  // Get specific part of state
  getUser: () => appState.user,
  getSettings: () => ({ ...appState.settings }),
  getCurrentDate: () => appState.currentDate,
  getCurrentView: () => appState.currentView,
  getTaskTemplates: () => [...appState.taskTemplates.data],
  getTaskTemplateById: (templateId) => appState.taskTemplates.cache.get(templateId) || null,
  getTaskTemplateMetadata: () => ({ ...appState.taskTemplates.metadata }),
  getTaskTemplateFilters: () => ({ ...appState.taskTemplates.filters }),
  getTaskTemplatePagination: () => ({ ...appState.taskTemplates.pagination }),
  getTaskTemplateSearchResults: () => ({ ...appState.taskTemplates.searchResults }),
  getTemplateOperationQueue: () => [...appState.templateOperationQueue],
  
  // Enhanced task instance getters
  getTaskInstancesForDate: (date) => appState.taskInstances.data.get(date) || [],
  getTaskInstanceById: (instanceId) => appState.taskInstances.cache.get(instanceId) || null,
  getTaskInstanceMetadata: () => ({ ...appState.taskInstances.metadata }),
  getTaskInstanceFilters: () => ({ ...appState.taskInstances.filters }),
  getTaskInstanceSearchResults: () => ({ ...appState.taskInstances.searchResults }),
  getTaskInstanceCurrentDate: () => appState.taskInstances.currentDate,
  getTaskInstanceNavigationHistory: () => [...appState.taskInstances.navigationHistory],
  getTaskInstanceStats: (period = 'daily', identifier = null) => {
    const statsMap = appState.taskInstances.stats[period];
    return identifier ? (statsMap?.get(identifier) || null) : new Map(statsMap);
  },
  getLoadedInstanceDates: () => new Set(appState.taskInstances.dateRange.loadedDates),
  getInstanceDateRange: () => ({ ...appState.taskInstances.dateRange }),
  getInstancesForDateRange: (startDate, endDate) => {
    const instances = [];
    const dates = dataUtils.getDateRange(startDate, endDate);
    dates.forEach(date => {
      const dateInstances = appState.taskInstances.data.get(date) || [];
      instances.push(...dateInstances);
    });
    return instances;
  },
  getInstancesByTemplateId: (templateId) => {
    const instances = [];
    appState.taskInstances.data.forEach(dateInstances => {
      const templateInstances = dateInstances.filter(inst => inst.templateId === templateId);
      instances.push(...templateInstances);
    });
    return instances;
  },
  getInstancesByStatus: (status, dateFilter = null) => {
    const instances = [];
    appState.taskInstances.data.forEach((dateInstances, date) => {
      if (dateFilter && date !== dateFilter) return;
      const statusInstances = dateInstances.filter(inst => inst.status === status);
      instances.push(...statusInstances);
    });
    return instances;
  },
  getInstanceOperationQueue: () => [...appState.instanceOperationQueue],
  
  getDailyScheduleForDate: (date) => appState.dailySchedules.get(date) || null,
  isLoading: (type) => appState.loading[type] || false,
  isOnline: () => appState.isOnline,
  getSearchQuery: () => appState.searchQuery,
  getActiveFilters: () => ({ ...appState.activeFilters }),
  
  // Set user authentication
  setUser: (user) => {
    appState.user = user;
    appState.isAuthenticated = !!user;
    notifyStateChange('user', user);
  },
  
  // Set user settings
  setSettings: (settings) => {
    appState.settings = { ...settings };
    appState.lastUpdated = new Date().toISOString();
    notifyStateChange('settings', settings);
  },
  
  // Set current view
  setCurrentView: (view) => {
    appState.currentView = view;
    notifyStateChange('view', view);
  },
  
  // Set current date
  setCurrentDate: (date) => {
    appState.currentDate = date;
    notifyStateChange('date', date);
  },
  
  // Set task templates with caching and metadata update
  setTaskTemplates: (templates) => {
    appState.taskTemplates.data = [...templates];
    
    // Update cache
    appState.taskTemplates.cache.clear();
    templates.forEach(template => {
      appState.taskTemplates.cache.set(template.id, { ...template });
    });
    
    // Update metadata
    updateTaskTemplateMetadata(templates);
    
    appState.taskTemplates.lastLoaded = new Date().toISOString();
    appState.lastUpdated = new Date().toISOString();
    appState.lastSyncTimestamp = new Date().toISOString();
    
    notifyStateChange('taskTemplates', templates);
    notifyStateChange('taskTemplateMetadata', appState.taskTemplates.metadata);
  },
  
  // Add/update single task template with caching
  updateTaskTemplate: (task) => {
    const index = appState.taskTemplates.data.findIndex(t => t.id === task.id);
    const taskCopy = { ...task };
    
    if (index >= 0) {
      appState.taskTemplates.data[index] = taskCopy;
    } else {
      appState.taskTemplates.data.push(taskCopy);
    }
    
    // Update cache
    appState.taskTemplates.cache.set(task.id, taskCopy);
    
    // Update metadata
    updateTaskTemplateMetadata(appState.taskTemplates.data);
    
    appState.lastUpdated = new Date().toISOString();
    appState.lastSyncTimestamp = new Date().toISOString();
    
    notifyStateChange('taskTemplates', appState.taskTemplates.data);
    notifyStateChange('templateUpdate', task);
    notifyStateChange('taskTemplateMetadata', appState.taskTemplates.metadata);
  },
  
  // Remove task template with cache cleanup
  removeTaskTemplate: (taskId) => {
    appState.taskTemplates.data = appState.taskTemplates.data.filter(t => t.id !== taskId);
    appState.taskTemplates.cache.delete(taskId);
    
    // Update metadata
    updateTaskTemplateMetadata(appState.taskTemplates.data);
    
    appState.lastUpdated = new Date().toISOString();
    appState.lastSyncTimestamp = new Date().toISOString();
    
    notifyStateChange('taskTemplates', appState.taskTemplates.data);
    notifyStateChange('templateRemove', taskId);
    notifyStateChange('taskTemplateMetadata', appState.taskTemplates.metadata);
  },

  // Set template filters
  setTaskTemplateFilters: (filters) => {
    appState.taskTemplates.filters = { ...appState.taskTemplates.filters, ...filters };
    notifyStateChange('taskTemplateFilters', appState.taskTemplates.filters);
  },

  // Set template pagination
  setTaskTemplatePagination: (pagination) => {
    appState.taskTemplates.pagination = { ...appState.taskTemplates.pagination, ...pagination };
    notifyStateChange('taskTemplatePagination', appState.taskTemplates.pagination);
  },

  // Set template search results
  setTaskTemplateSearchResults: (query, results) => {
    appState.taskTemplates.searchResults = {
      query,
      results: [...results],
      lastSearch: new Date().toISOString()
    };
    notifyStateChange('taskTemplateSearch', appState.taskTemplates.searchResults);
  },

  // Clear template cache
  clearTaskTemplateCache: () => {
    appState.taskTemplates.cache.clear();
    appState.taskTemplates.lastLoaded = null;
    notifyStateChange('taskTemplateCacheCleared', true);
  },

  // Add template operation to queue (for offline mode)
  addTemplateOperation: (operation) => {
    appState.templateOperationQueue.push({
      ...operation,
      timestamp: new Date().toISOString(),
      id: Date.now() + Math.random() // Simple unique ID
    });
    notifyStateChange('templateOperationQueued', operation);
  },

  // Clear template operation queue
  clearTemplateOperationQueue: () => {
    appState.templateOperationQueue = [];
    notifyStateChange('templateOperationQueueCleared', true);
  },
  
  // Enhanced task instance setters with caching and metadata updates
  
  // Set task instances for date with caching and metadata update
  setTaskInstancesForDate: (date, instances) => {
    appState.taskInstances.data.set(date, [...instances]);
    
    // Update instance cache
    instances.forEach(instance => {
      appState.taskInstances.cache.set(instance.id, { ...instance });
    });
    
    // Mark date as loaded
    appState.taskInstances.dateRange.loadedDates.add(date);
    
    // Update date range tracking
    if (!appState.taskInstances.dateRange.startDate || date < appState.taskInstances.dateRange.startDate) {
      appState.taskInstances.dateRange.startDate = date;
    }
    if (!appState.taskInstances.dateRange.endDate || date > appState.taskInstances.dateRange.endDate) {
      appState.taskInstances.dateRange.endDate = date;
    }
    
    // Update metadata
    updateTaskInstanceMetadata();
    
    appState.lastUpdated = new Date().toISOString();
    appState.lastSyncTimestamp = new Date().toISOString();
    
    notifyStateChange('taskInstances', { date, instances });
    notifyStateChange('taskInstanceMetadata', appState.taskInstances.metadata);
  },
  
  // Add/update single task instance with caching
  updateTaskInstance: (instance) => {
    const date = instance.date;
    const instances = appState.taskInstances.data.get(date) || [];
    const index = instances.findIndex(i => i.id === instance.id);
    const instanceCopy = { ...instance };
    
    if (index >= 0) {
      instances[index] = instanceCopy;
    } else {
      instances.push(instanceCopy);
    }
    
    // Update data and cache
    appState.taskInstances.data.set(date, instances);
    appState.taskInstances.cache.set(instance.id, instanceCopy);
    
    // Mark date as loaded if not already
    appState.taskInstances.dateRange.loadedDates.add(date);
    
    // Update metadata
    updateTaskInstanceMetadata();
    
    appState.lastUpdated = new Date().toISOString();
    appState.lastSyncTimestamp = new Date().toISOString();
    
    notifyStateChange('taskInstances', { date, instances });
    notifyStateChange('instanceUpdate', instance);
    notifyStateChange('taskInstanceMetadata', appState.taskInstances.metadata);
  },
  
  // Remove task instance with cache cleanup
  removeTaskInstance: (instanceId) => {
    const instance = appState.taskInstances.cache.get(instanceId);
    if (!instance) return;
    
    const date = instance.date;
    const instances = appState.taskInstances.data.get(date) || [];
    const filteredInstances = instances.filter(i => i.id !== instanceId);
    
    appState.taskInstances.data.set(date, filteredInstances);
    appState.taskInstances.cache.delete(instanceId);
    
    // Update metadata
    updateTaskInstanceMetadata();
    
    appState.lastUpdated = new Date().toISOString();
    appState.lastSyncTimestamp = new Date().toISOString();
    
    notifyStateChange('taskInstances', { date, instances: filteredInstances });
    notifyStateChange('instanceRemove', instanceId);
    notifyStateChange('taskInstanceMetadata', appState.taskInstances.metadata);
  },

  // Set instance filters
  setTaskInstanceFilters: (filters) => {
    appState.taskInstances.filters = { ...appState.taskInstances.filters, ...filters };
    notifyStateChange('taskInstanceFilters', appState.taskInstances.filters);
  },

  // Set instance search results
  setTaskInstanceSearchResults: (query, results, dateFilter = null) => {
    appState.taskInstances.searchResults = {
      query,
      results: [...results],
      dateFilter,
      lastSearch: new Date().toISOString()
    };
    notifyStateChange('taskInstanceSearch', appState.taskInstances.searchResults);
  },

  // Set current instance date for navigation
  setTaskInstanceCurrentDate: (date) => {
    const previousDate = appState.taskInstances.currentDate;
    appState.taskInstances.currentDate = date;
    
    // Add to navigation history if different
    if (previousDate !== date) {
      appState.taskInstances.navigationHistory.push({
        from: previousDate,
        to: date,
        timestamp: new Date().toISOString()
      });
      
      // Limit history to last 50 entries
      if (appState.taskInstances.navigationHistory.length > 50) {
        appState.taskInstances.navigationHistory = appState.taskInstances.navigationHistory.slice(-50);
      }
    }
    
    notifyStateChange('taskInstanceCurrentDate', date);
    notifyStateChange('taskInstanceNavigation', { from: previousDate, to: date });
  },

  // Set preload dates for performance
  setTaskInstancePreloadDates: (dates) => {
    appState.taskInstances.preloadDates = [...dates];
    notifyStateChange('taskInstancePreloadDates', dates);
  },

  // Clear instance cache
  clearTaskInstanceCache: () => {
    appState.taskInstances.data.clear();
    appState.taskInstances.cache.clear();
    appState.taskInstances.dateRange.loadedDates.clear();
    appState.taskInstances.dateRange.startDate = null;
    appState.taskInstances.dateRange.endDate = null;
    updateTaskInstanceMetadata(); // Reset metadata
    notifyStateChange('taskInstanceCacheCleared', true);
  },

  // Add instance operation to queue (for offline mode)
  addInstanceOperation: (operation) => {
    appState.instanceOperationQueue.push({
      ...operation,
      timestamp: new Date().toISOString(),
      id: Date.now() + Math.random() // Simple unique ID
    });
    notifyStateChange('instanceOperationQueued', operation);
  },

  // Clear instance operation queue
  clearInstanceOperationQueue: () => {
    appState.instanceOperationQueue = [];
    notifyStateChange('instanceOperationQueueCleared', true);
  },

  // Update instance statistics
  updateTaskInstanceStats: (period, identifier, stats) => {
    appState.taskInstances.stats[period].set(identifier, { ...stats });
    notifyStateChange('taskInstanceStats', { period, identifier, stats });
  },

  // Batch update multiple instances (for performance)
  batchUpdateTaskInstances: (updates) => {
    const affectedDates = new Set();
    
    updates.forEach(({ instanceId, updates: instanceUpdates }) => {
      const instance = appState.taskInstances.cache.get(instanceId);
      if (instance) {
        const updatedInstance = { ...instance, ...instanceUpdates };
        const date = updatedInstance.date;
        
        // Update cache
        appState.taskInstances.cache.set(instanceId, updatedInstance);
        
        // Update date data
        const instances = appState.taskInstances.data.get(date) || [];
        const index = instances.findIndex(i => i.id === instanceId);
        if (index >= 0) {
          instances[index] = updatedInstance;
          appState.taskInstances.data.set(date, instances);
          affectedDates.add(date);
        }
      }
    });
    
    // Update metadata once after all changes
    updateTaskInstanceMetadata();
    
    appState.lastUpdated = new Date().toISOString();
    appState.lastSyncTimestamp = new Date().toISOString();
    
    // Notify for each affected date
    affectedDates.forEach(date => {
      const instances = appState.taskInstances.data.get(date) || [];
      notifyStateChange('taskInstances', { date, instances });
    });
    
    notifyStateChange('instanceBatchUpdate', { updates, affectedDates: Array.from(affectedDates) });
    notifyStateChange('taskInstanceMetadata', appState.taskInstances.metadata);
  },
  
  // Set daily schedule for date
  setDailyScheduleForDate: (date, schedule) => {
    if (schedule) {
      appState.dailySchedules.set(date, { ...schedule });
    } else {
      appState.dailySchedules.delete(date);
    }
    appState.lastUpdated = new Date().toISOString();
    notifyStateChange('dailySchedules', { date, schedule });
  },
  
  // Set loading state
  setLoading: (type, isLoading) => {
    appState.loading[type] = isLoading;
    notifyStateChange('loading', { type, isLoading });
  },
  
  // Set online state
  setOnline: (isOnline) => {
    appState.isOnline = isOnline;
    notifyStateChange('online', isOnline);
  },
  
  // Set search query
  setSearchQuery: (query) => {
    appState.searchQuery = query;
    notifyStateChange('search', query);
  },
  
  // Set filters
  setFilter: (filterType, value) => {
    appState.activeFilters[filterType] = value;
    notifyStateChange('filters', appState.activeFilters);
  },
  
  // Add pending sync action (for offline mode)
  addPendingSyncAction: (action) => {
    appState.pendingSyncActions.push({
      ...action,
      timestamp: new Date().toISOString()
    });
    notifyStateChange('pendingSync', appState.pendingSyncActions);
  },
  
  // Clear pending sync actions
  clearPendingSyncActions: () => {
    appState.pendingSyncActions = [];
    notifyStateChange('pendingSync', []);
  }
};

/**
 * Utility Functions for State Management
 */
function updateTaskTemplateMetadata(templates) {
  const metadata = {
    total: templates.length,
    active: templates.filter(t => t.isActive !== false).length,
    inactive: templates.filter(t => t.isActive === false).length,
    byPriority: {},
    byTimeWindow: {},
    mandatory: templates.filter(t => t.isMandatory === true).length,
    flexible: templates.filter(t => t.schedulingType === 'flexible').length,
    fixed: templates.filter(t => t.schedulingType === 'fixed').length,
    lastUpdated: new Date().toISOString()
  };

  // Calculate distribution by priority
  templates.forEach(template => {
    const priority = template.priority || 3;
    metadata.byPriority[priority] = (metadata.byPriority[priority] || 0) + 1;
  });

  // Calculate distribution by time window
  templates.forEach(template => {
    const timeWindow = template.timeWindow || 'anytime';
    metadata.byTimeWindow[timeWindow] = (metadata.byTimeWindow[timeWindow] || 0) + 1;
  });

  appState.taskTemplates.metadata = metadata;
}

/**
 * Update task instance metadata based on current data
 */
function updateTaskInstanceMetadata() {
  let totalInstances = 0;
  const byStatus = {};
  const byDate = {};
  let completedCount = 0;
  let totalCompletionTime = 0;
  let completionTimeCount = 0;

  // Iterate through all instances in all dates
  appState.taskInstances.data.forEach((instances, date) => {
    byDate[date] = instances.length;
    totalInstances += instances.length;

    instances.forEach(instance => {
      // Count by status
      const status = instance.status || 'pending';
      byStatus[status] = (byStatus[status] || 0) + 1;

      // Calculate completion metrics
      if (status === 'completed') {
        completedCount++;
        
        if (instance.actualDuration) {
          totalCompletionTime += instance.actualDuration;
          completionTimeCount++;
        }
      }
    });
  });

  // Calculate completion rate
  const completionRate = totalInstances > 0 ? 
    Math.round((completedCount / totalInstances) * 100) : 0;

  // Calculate average completion time
  const averageCompletionTime = completionTimeCount > 0 ? 
    Math.round(totalCompletionTime / completionTimeCount) : null;

  const metadata = {
    totalInstances,
    dateCount: appState.taskInstances.data.size,
    byStatus,
    byDate,
    completionRate,
    averageCompletionTime,
    lastUpdated: new Date().toISOString()
  };

  appState.taskInstances.metadata = metadata;
}

/**
 * Multi-tab Synchronization
 */

/**
 * Sanitize data for BroadcastChannel transmission
 * BroadcastChannel can only handle structured cloneable data
 */
function sanitizeDataForBroadcast(data) {
  if (data === null || data === undefined) {
    return data;
  }
  
  // Handle primitive types
  if (typeof data !== 'object') {
    return data;
  }
  
  // Handle Arrays
  if (Array.isArray(data)) {
    return data.map(item => sanitizeDataForBroadcast(item));
  }
  
  // Handle Firebase User objects
  if (data && typeof data === 'object' && data.uid && data.email !== undefined) {
    return {
      uid: data.uid,
      email: data.email,
      displayName: data.displayName,
      photoURL: data.photoURL,
      emailVerified: data.emailVerified,
      isAnonymous: data.isAnonymous,
      phoneNumber: data.phoneNumber,
      providerId: data.providerId,
      providerData: data.providerData ? data.providerData.map(provider => ({
        uid: provider.uid,
        email: provider.email,
        displayName: provider.displayName,
        photoURL: provider.photoURL,
        providerId: provider.providerId
      })) : []
    };
  }
  
  // Handle Date objects
  if (data instanceof Date) {
    return data.toISOString();
  }
  
  // Handle plain objects
  if (data.constructor === Object) {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      // Skip functions and undefined values
      if (typeof value !== 'function' && value !== undefined) {
        sanitized[key] = sanitizeDataForBroadcast(value);
      }
    }
    return sanitized;
  }
  
  // For other complex objects, try to extract serializable properties
  try {
    JSON.stringify(data);
    return data; // Already serializable
  } catch (error) {
    // Object is not serializable, extract basic properties
    const sanitized = {};
    for (const key in data) {
      try {
        const value = data[key];
        if (typeof value !== 'function' && value !== undefined) {
          const serializedValue = sanitizeDataForBroadcast(value);
          JSON.stringify(serializedValue); // Test serializability
          sanitized[key] = serializedValue;
        }
      } catch (e) {
        // Skip this property if it can't be serialized
        continue;
      }
    }
    return sanitized;
  }
}

function broadcastStateChange(type, data) {
  if (appState.tabSyncEnabled && typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel('daily-ai-state');
      const sanitizedData = sanitizeDataForBroadcast(data);
      
      channel.postMessage({
        type: `state-${type}`,
        data: sanitizedData,
        timestamp: new Date().toISOString(),
        source: 'state-manager'
      });
    } catch (error) {
      console.warn('Failed to broadcast state change:', error);
    }
  }
}

/**
 * State Change Notification System
 */
const stateChangeListeners = new Map();

function notifyStateChange(type, data) {
  const listeners = stateChangeListeners.get(type) || [];
  listeners.forEach(callback => {
    try {
      callback(data);
    } catch (error) {
      console.error(`Error in state change listener for ${type}:`, error);
    }
  });
  
  // Also notify global listeners
  const globalListeners = stateChangeListeners.get('*') || [];
  globalListeners.forEach(callback => {
    try {
      callback({ type, data });
    } catch (error) {
      console.error('Error in global state change listener:', error);
    }
  });

  // Broadcast to other tabs for multi-tab synchronization
  broadcastStateChange(type, data);
}

export const stateListeners = {
  // Add listener for specific state change
  on: (type, callback) => {
    if (!stateChangeListeners.has(type)) {
      stateChangeListeners.set(type, []);
    }
    stateChangeListeners.get(type).push(callback);
  },
  
  // Remove listener
  off: (type, callback) => {
    const listeners = stateChangeListeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    }
  },
  
  // Add global listener (listens to all state changes)
  onAll: (callback) => {
    stateListeners.on('*', callback);
  }
};

/**
 * Data Loading Functions
 */
export const stateActions = {
  // Initialize user data
  async initializeUser() {
    try {
      state.setLoading('settings', true);
      
      // Get current user ID
      const user = state.getUser();
      if (!user) {
        throw new Error('No authenticated user');
      }
      
      // Initialize user settings using the new comprehensive settings manager
      const settings = await userSettingsManager.initializeUserSettings(user.uid);
      state.setSettings(settings);
      
      console.log('✅ User data initialized with comprehensive settings');
    } catch (error) {
      console.error('❌ Error initializing user:', error);
      throw error;
    } finally {
      state.setLoading('settings', false);
    }
  },
  
  // Load user settings
  async loadSettings() {
    try {
      state.setLoading('settings', true);
      
      const user = state.getUser();
      if (!user) {
        throw new Error('No authenticated user');
      }
      
      const settings = await userSettingsManager.loadUserSettings(user.uid);
      if (settings) {
        state.setSettings(settings);
        console.log('✅ Settings loaded with comprehensive settings manager');
      } else {
        console.log('⚠️ No settings found, will use defaults');
      }
    } catch (error) {
      console.error('❌ Error loading settings:', error);
      throw error;
    } finally {
      state.setLoading('settings', false);
    }
  },
  
  // Save user settings
  async saveSettings(newSettings) {
    try {
      state.setLoading('saving', true);
      
      const user = state.getUser();
      if (!user) {
        throw new Error('No authenticated user');
      }
      
      const savedSettings = await userSettingsManager.updateSettings(user.uid, newSettings);
      
      console.log('✅ Settings saved with comprehensive settings manager');
      return savedSettings;
    } catch (error) {
      console.error('❌ Error saving settings:', error);
      throw error;
    } finally {
      state.setLoading('saving', false);
    }
  },
  
  // Update sleep schedule settings
  async updateSleepSchedule(sleepSchedule) {
    try {
      const user = state.getUser();
      if (!user) {
        throw new Error('No authenticated user');
      }
      
      const updatedSettings = await userSettingsManager.updateSleepSchedule(user.uid, sleepSchedule);
      console.log('✅ Sleep schedule updated');
      return updatedSettings;
    } catch (error) {
      console.error('❌ Error updating sleep schedule:', error);
      throw error;
    }
  },
  
  // Update time window preferences
  async updateTimeWindows(timeWindows) {
    try {
      const user = state.getUser();
      if (!user) {
        throw new Error('No authenticated user');
      }
      
      const updatedSettings = await userSettingsManager.updateTimeWindows(user.uid, timeWindows);
      console.log('✅ Time windows updated');
      return updatedSettings;
    } catch (error) {
      console.error('❌ Error updating time windows:', error);
      throw error;
    }
  },
  
  // Update application preferences
  async updatePreferences(preferences) {
    try {
      const user = state.getUser();
      if (!user) {
        throw new Error('No authenticated user');
      }
      
      const updatedSettings = await userSettingsManager.updatePreferences(user.uid, preferences);
      console.log('✅ Preferences updated');
      return updatedSettings;
    } catch (error) {
      console.error('❌ Error updating preferences:', error);
      throw error;
    }
  },
  
  // Reset settings to defaults
  async resetSettingsToDefaults() {
    try {
      const user = state.getUser();
      if (!user) {
        throw new Error('No authenticated user');
      }
      
      const defaultSettings = await userSettingsManager.resetToDefaults(user.uid);
      console.log('✅ Settings reset to defaults');
      return defaultSettings;
    } catch (error) {
      console.error('❌ Error resetting settings:', error);
      throw error;
    }
  },
  
  // Enhanced task template management actions
  
  // Initialize task template manager
  async initializeTaskTemplateManager() {
    try {
      await taskTemplateManager.initialize();
      console.log('✅ Task template manager initialized');
    } catch (error) {
      console.error('❌ Error initializing task template manager:', error);
      throw error;
    }
  },

  // Load task templates with options
  async loadTaskTemplates(options = {}) {
    try {
      state.setLoading('tasks', true);
      
      const user = state.getUser();
      if (!user) {
        throw new Error('No authenticated user');
      }

      const templates = await taskTemplateManager.getAll(user.uid, options.includeInactive);
      state.setTaskTemplates(templates);
      
      // Update filters if provided
      if (options.filters) {
        state.setTaskTemplateFilters(options.filters);
      }
      
      console.log(`✅ Task templates loaded (${templates.length} templates)`);
    } catch (error) {
      console.error('❌ Error loading task templates:', error);
      
      // Add to offline queue if network error
      if (!state.isOnline()) {
        state.addTemplateOperation({
          type: 'LOAD_TEMPLATES',
          data: options,
          retry: true
        });
      }
      
      throw error;
    } finally {
      state.setLoading('tasks', false);
    }
  },

  // Create new task template
  async createTaskTemplate(templateData) {
    try {
      state.setLoading('saving', true);
      
      const user = state.getUser();
      if (!user) {
        throw new Error('No authenticated user');
      }

      const newTemplate = await taskTemplateManager.create(user.uid, templateData);
      state.updateTaskTemplate(newTemplate);
      
      console.log('✅ Task template created:', newTemplate.taskName);
      return newTemplate;
    } catch (error) {
      console.error('❌ Error creating task template:', error);
      
      // Add to offline queue if network error
      if (!state.isOnline()) {
        state.addTemplateOperation({
          type: 'CREATE_TEMPLATE',
          data: templateData,
          retry: true
        });
      }
      
      throw error;
    } finally {
      state.setLoading('saving', false);
    }
  },

  // Update task template
  async updateTaskTemplate(templateId, updates) {
    try {
      state.setLoading('saving', true);
      
      const updatedTemplate = await taskTemplateManager.update(templateId, updates);
      state.updateTaskTemplate(updatedTemplate);
      
      console.log('✅ Task template updated:', templateId);
      return updatedTemplate;
    } catch (error) {
      console.error('❌ Error updating task template:', error);
      
      // Add to offline queue if network error
      if (!state.isOnline()) {
        state.addTemplateOperation({
          type: 'UPDATE_TEMPLATE',
          data: { templateId, updates },
          retry: true
        });
      }
      
      throw error;
    } finally {
      state.setLoading('saving', false);
    }
  },

  // Delete task template (soft delete)
  async deleteTaskTemplate(templateId) {
    try {
      state.setLoading('saving', true);
      
      await taskTemplateManager.delete(templateId);
      state.removeTaskTemplate(templateId);
      
      console.log('✅ Task template deleted:', templateId);
    } catch (error) {
      console.error('❌ Error deleting task template:', error);
      
      // Add to offline queue if network error
      if (!state.isOnline()) {
        state.addTemplateOperation({
          type: 'DELETE_TEMPLATE',
          data: { templateId },
          retry: true
        });
      }
      
      throw error;
    } finally {
      state.setLoading('saving', false);
    }
  },

  // Duplicate task template
  async duplicateTaskTemplate(templateId, customName = null) {
    try {
      state.setLoading('saving', true);
      
      const user = state.getUser();
      if (!user) {
        throw new Error('No authenticated user');
      }

      const duplicatedTemplate = await taskTemplateManager.duplicate(user.uid, templateId, customName);
      state.updateTaskTemplate(duplicatedTemplate);
      
      console.log('✅ Task template duplicated:', duplicatedTemplate.taskName);
      return duplicatedTemplate;
    } catch (error) {
      console.error('❌ Error duplicating task template:', error);
      
      // Add to offline queue if network error
      if (!state.isOnline()) {
        state.addTemplateOperation({
          type: 'DUPLICATE_TEMPLATE',
          data: { templateId, customName },
          retry: true
        });
      }
      
      throw error;
    } finally {
      state.setLoading('saving', false);
    }
  },

  // Activate task template
  async activateTaskTemplate(templateId) {
    try {
      const activatedTemplate = await taskTemplateManager.activate(templateId);
      state.updateTaskTemplate(activatedTemplate);
      
      console.log('✅ Task template activated:', templateId);
      return activatedTemplate;
    } catch (error) {
      console.error('❌ Error activating task template:', error);
      throw error;
    }
  },

  // Deactivate task template
  async deactivateTaskTemplate(templateId) {
    try {
      const deactivatedTemplate = await taskTemplateManager.deactivate(templateId);
      state.updateTaskTemplate(deactivatedTemplate);
      
      console.log('✅ Task template deactivated:', templateId);
      return deactivatedTemplate;
    } catch (error) {
      console.error('❌ Error deactivating task template:', error);
      throw error;
    }
  },

  // Bulk activate templates
  async bulkActivateTemplates(templateIds) {
    try {
      state.setLoading('saving', true);
      
      const results = await taskTemplateManager.bulkActivate(templateIds);
      
      // Update each template in state
      for (const templateId of templateIds) {
        const template = state.getTaskTemplateById(templateId);
        if (template) {
          state.updateTaskTemplate({ ...template, isActive: true });
        }
      }
      
      console.log(`✅ Bulk activated ${templateIds.length} templates`);
      return results;
    } catch (error) {
      console.error('❌ Error bulk activating templates:', error);
      throw error;
    } finally {
      state.setLoading('saving', false);
    }
  },

  // Bulk deactivate templates
  async bulkDeactivateTemplates(templateIds) {
    try {
      state.setLoading('saving', true);
      
      const results = await taskTemplateManager.bulkDeactivate(templateIds);
      
      // Update each template in state
      for (const templateId of templateIds) {
        const template = state.getTaskTemplateById(templateId);
        if (template) {
          state.updateTaskTemplate({ ...template, isActive: false });
        }
      }
      
      console.log(`✅ Bulk deactivated ${templateIds.length} templates`);
      return results;
    } catch (error) {
      console.error('❌ Error bulk deactivating templates:', error);
      throw error;
    } finally {
      state.setLoading('saving', false);
    }
  },

  // Search task templates
  async searchTaskTemplates(searchQuery, options = {}) {
    try {
      state.setLoading('tasks', true);
      
      const user = state.getUser();
      if (!user) {
        throw new Error('No authenticated user');
      }

      const results = await taskTemplates.search(user.uid, searchQuery, options);
      state.setTaskTemplateSearchResults(searchQuery, results);
      
      console.log(`✅ Found ${results.length} templates matching "${searchQuery}"`);
      return results;
    } catch (error) {
      console.error('❌ Error searching task templates:', error);
      throw error;
    } finally {
      state.setLoading('tasks', false);
    }
  },

  // Filter task templates
  async filterTaskTemplates(filters, pagination = {}) {
    try {
      state.setLoading('tasks', true);
      
      const user = state.getUser();
      if (!user) {
        throw new Error('No authenticated user');
      }

      const result = await taskTemplates.getByFilters(user.uid, filters, pagination);
      
      // Update state with filtered results
      state.setTaskTemplates(result.templates);
      state.setTaskTemplateFilters(filters);
      state.setTaskTemplatePagination({
        ...pagination,
        hasMore: result.hasMore,
        total: result.total
      });
      
      console.log(`✅ Filtered templates: ${result.templates.length} results`);
      return result;
    } catch (error) {
      console.error('❌ Error filtering task templates:', error);
      throw error;
    } finally {
      state.setLoading('tasks', false);
    }
  },

  // Get template statistics
  async getTaskTemplateStats() {
    try {
      const user = state.getUser();
      if (!user) {
        throw new Error('No authenticated user');
      }

      const stats = await taskTemplates.getStats(user.uid);
      
      // Update metadata in state
      appState.taskTemplates.metadata = {
        ...appState.taskTemplates.metadata,
        ...stats,
        lastUpdated: new Date().toISOString()
      };
      
      notifyStateChange('taskTemplateMetadata', appState.taskTemplates.metadata);
      
      console.log('✅ Template statistics updated');
      return stats;
    } catch (error) {
      console.error('❌ Error getting template statistics:', error);
      throw error;
    }
  },

  // Export templates
  async exportTaskTemplates(includeInactive = false) {
    try {
      const user = state.getUser();
      if (!user) {
        throw new Error('No authenticated user');
      }

      const exportData = await taskTemplates.exportTemplates(user.uid, includeInactive);
      
      console.log(`✅ Exported ${exportData.templateCount} templates`);
      return exportData;
    } catch (error) {
      console.error('❌ Error exporting templates:', error);
      throw error;
    }
  },

  // Import templates
  async importTaskTemplates(importData, options = {}) {
    try {
      state.setLoading('saving', true);
      
      const user = state.getUser();
      if (!user) {
        throw new Error('No authenticated user');
      }

      const result = await taskTemplates.importTemplates(user.uid, importData, options);
      
      // Refresh templates after import
      await this.loadTaskTemplates();
      
      console.log(`✅ Import completed: ${result.importedCount} imported, ${result.skippedCount} skipped`);
      return result;
    } catch (error) {
      console.error('❌ Error importing templates:', error);
      throw error;
    } finally {
      state.setLoading('saving', false);
    }
  },

  // Process offline template operations queue
  async processTemplateOperationQueue() {
    if (state.isOnline() && appState.templateOperationQueue.length > 0) {
      try {
        const operations = [...appState.templateOperationQueue];
        state.clearTemplateOperationQueue();
        
        for (const operation of operations) {
          try {
            switch (operation.type) {
              case 'CREATE_TEMPLATE':
                await this.createTaskTemplate(operation.data);
                break;
              case 'UPDATE_TEMPLATE':
                await this.updateTaskTemplate(operation.data.templateId, operation.data.updates);
                break;
              case 'DELETE_TEMPLATE':
                await this.deleteTaskTemplate(operation.data.templateId);
                break;
              case 'DUPLICATE_TEMPLATE':
                await this.duplicateTaskTemplate(operation.data.templateId, operation.data.customName);
                break;
              case 'LOAD_TEMPLATES':
                await this.loadTaskTemplates(operation.data);
                break;
              default:
                console.warn('Unknown template operation type:', operation.type);
            }
          } catch (error) {
            console.error('Error processing queued operation:', operation, error);
          }
        }
        
        console.log(`✅ Processed ${operations.length} queued template operations`);
      } catch (error) {
        console.error('❌ Error processing template operation queue:', error);
      }
    }
  },

  // Clear template cache and reload
  async refreshTaskTemplates() {
    try {
      state.clearTaskTemplateCache();
      await this.loadTaskTemplates();
      console.log('✅ Task templates refreshed');
    } catch (error) {
      console.error('❌ Error refreshing task templates:', error);
      throw error;
    }
  },
  
  // Enhanced task instance management actions
  
  // Load task instances for specific date with options
  async loadTaskInstancesForDate(date, options = {}) {
    try {
      state.setLoading('tasks', true);
      
      const {
        status = null,
        templateId = null,
        force = false // Force reload even if already cached
      } = options;
      
      // Check if already loaded and not forcing reload
      if (!force && state.getLoadedInstanceDates().has(date)) {
        const cachedInstances = state.getTaskInstancesForDate(date);
        console.log(`✅ Task instances retrieved from cache for ${date} (${cachedInstances.length} instances)`);
        return cachedInstances;
      }
      
      const instances = await taskInstances.getForDate(date, { status, templateId });
      state.setTaskInstancesForDate(date, instances);
      
      console.log(`✅ Task instances loaded for ${date} (${instances.length} instances)`);
      return instances;
    } catch (error) {
      console.error(`❌ Error loading task instances for ${date}:`, error);
      
      // Add to offline queue if network error
      if (!state.isOnline()) {
        state.addInstanceOperation({
          type: 'LOAD_INSTANCES_FOR_DATE',
          data: { date, options },
          retry: true
        });
      }
      
      throw error;
    } finally {
      state.setLoading('tasks', false);
    }
  },
  
  // Load task instances for date range
  async loadTaskInstancesForDateRange(startDate, endDate, options = {}) {
    try {
      state.setLoading('tasks', true);
      
      const instances = await taskInstances.getForDateRange(startDate, endDate, options);
      
      // Group instances by date
      const instancesByDate = {};
      instances.forEach(instance => {
        if (!instancesByDate[instance.date]) {
          instancesByDate[instance.date] = [];
        }
        instancesByDate[instance.date].push(instance);
      });
      
      // Update state for each date
      Object.entries(instancesByDate).forEach(([date, dateInstances]) => {
        state.setTaskInstancesForDate(date, dateInstances);
      });
      
      console.log(`✅ Task instances loaded for range ${startDate} to ${endDate} (${instances.length} total)`);
      return instances;
    } catch (error) {
      console.error(`❌ Error loading task instances for range ${startDate} to ${endDate}:`, error);
      throw error;
    } finally {
      state.setLoading('tasks', false);
    }
  },

  // Load instances by template ID
  async loadTaskInstancesByTemplate(templateId, options = {}) {
    try {
      state.setLoading('tasks', true);
      
      const instances = await taskInstances.getByTemplateId(templateId, options);
      
      // Group instances by date and update state
      const instancesByDate = {};
      instances.forEach(instance => {
        if (!instancesByDate[instance.date]) {
          instancesByDate[instance.date] = [];
        }
        instancesByDate[instance.date].push(instance);
      });
      
      // Update state for each date (merge with existing instances)
      Object.entries(instancesByDate).forEach(([date, templateInstances]) => {
        const existingInstances = state.getTaskInstancesForDate(date);
        const existingIds = new Set(existingInstances.map(i => i.id));
        
        // Add new instances that don't already exist
        const newInstances = templateInstances.filter(i => !existingIds.has(i.id));
        const mergedInstances = [...existingInstances, ...newInstances];
        
        state.setTaskInstancesForDate(date, mergedInstances);
      });
      
      console.log(`✅ Task instances loaded for template ${templateId} (${instances.length} instances)`);
      return instances;
    } catch (error) {
      console.error(`❌ Error loading task instances for template ${templateId}:`, error);
      throw error;
    } finally {
      state.setLoading('tasks', false);
    }
  },

  // Create new task instance
  async createTaskInstance(instanceData) {
    try {
      state.setLoading('saving', true);
      
      const newInstance = await taskInstances.create(instanceData);
      state.updateTaskInstance(newInstance);
      
      console.log('✅ Task instance created:', newInstance.id);
      return newInstance;
    } catch (error) {
      console.error('❌ Error creating task instance:', error);
      
      // Add to offline queue if network error
      if (!state.isOnline()) {
        state.addInstanceOperation({
          type: 'CREATE_INSTANCE',
          data: instanceData,
          retry: true
        });
      }
      
      throw error;
    } finally {
      state.setLoading('saving', false);
    }
  },

  // Update task instance
  async updateTaskInstance(instanceId, updates) {
    try {
      state.setLoading('saving', true);
      
      const updatedInstance = await taskInstances.update(instanceId, updates);
      state.updateTaskInstance(updatedInstance);
      
      console.log('✅ Task instance updated:', instanceId);
      return updatedInstance;
    } catch (error) {
      console.error('❌ Error updating task instance:', error);
      
      // Add to offline queue if network error
      if (!state.isOnline()) {
        state.addInstanceOperation({
          type: 'UPDATE_INSTANCE',
          data: { instanceId, updates },
          retry: true
        });
      }
      
      throw error;
    } finally {
      state.setLoading('saving', false);
    }
  },

  // Delete task instance
  async deleteTaskInstance(instanceId) {
    try {
      state.setLoading('saving', true);
      
      await taskInstances.delete(instanceId);
      state.removeTaskInstance(instanceId);
      
      console.log('✅ Task instance deleted:', instanceId);
    } catch (error) {
      console.error('❌ Error deleting task instance:', error);
      
      // Add to offline queue if network error
      if (!state.isOnline()) {
        state.addInstanceOperation({
          type: 'DELETE_INSTANCE',
          data: { instanceId },
          retry: true
        });
      }
      
      throw error;
    } finally {
      state.setLoading('saving', false);
    }
  },

  // Batch update multiple instances
  async batchUpdateTaskInstances(updates) {
    try {
      state.setLoading('saving', true);
      
      const instanceIds = updates.map(u => u.instanceId);
      const updateData = updates.reduce((acc, u) => ({ ...acc, ...u.updates }), {});
      
      await taskInstances.batchUpdate(instanceIds, updateData);
      
      // Update state for each instance
      const stateUpdates = updates.map(({ instanceId, updates: instanceUpdates }) => ({
        instanceId,
        updates: instanceUpdates
      }));
      state.batchUpdateTaskInstances(stateUpdates);
      
      console.log(`✅ Batch updated ${instanceIds.length} instances`);
      return { updatedCount: instanceIds.length };
    } catch (error) {
      console.error('❌ Error batch updating instances:', error);
      throw error;
    } finally {
      state.setLoading('saving', false);
    }
  },

  // Batch create multiple instances
  async batchCreateTaskInstances(instancesData) {
    try {
      state.setLoading('saving', true);
      
      const createdInstances = await taskInstances.batchCreate(instancesData);
      
      // Update state for each created instance
      createdInstances.forEach(instance => {
        state.updateTaskInstance(instance);
      });
      
      console.log(`✅ Batch created ${createdInstances.length} instances`);
      return createdInstances;
    } catch (error) {
      console.error('❌ Error batch creating instances:', error);
      throw error;
    } finally {
      state.setLoading('saving', false);
    }
  },

  // Get instance statistics for date range
  async getTaskInstanceStats(startDate, endDate) {
    try {
      const stats = await taskInstances.getStats(startDate, endDate);
      
      // Update state metadata with stats
      appState.taskInstances.metadata = {
        ...appState.taskInstances.metadata,
        ...stats,
        lastUpdated: new Date().toISOString()
      };
      
      notifyStateChange('taskInstanceMetadata', appState.taskInstances.metadata);
      
      console.log('✅ Instance statistics updated');
      return stats;
    } catch (error) {
      console.error('❌ Error getting instance statistics:', error);
      throw error;
    }
  },

  // Export instances for backup
  async exportTaskInstances(startDate, endDate, options = {}) {
    try {
      const exportData = await taskInstances.exportInstances(startDate, endDate, options);
      
      console.log(`✅ Exported ${exportData.instanceCount} instances for range ${startDate} to ${endDate}`);
      return exportData;
    } catch (error) {
      console.error('❌ Error exporting instances:', error);
      throw error;
    }
  },

  // Import instances from backup
  async importTaskInstances(importData, options = {}) {
    try {
      state.setLoading('saving', true);
      
      const result = await taskInstances.importInstances(importData, options);
      
      // Refresh instances for affected date range
      if (importData.dateRange) {
        await this.loadTaskInstancesForDateRange(
          importData.dateRange.startDate,
          importData.dateRange.endDate,
          { force: true }
        );
      }
      
      console.log(`✅ Import completed: ${result.importedCount} imported, ${result.skippedCount} skipped`);
      return result;
    } catch (error) {
      console.error('❌ Error importing instances:', error);
      throw error;
    } finally {
      state.setLoading('saving', false);
    }
  },

  // Cleanup old instances
  async cleanupOldInstances(retentionDays = 365) {
    try {
      state.setLoading('saving', true);
      
      const result = await taskInstances.cleanupOldInstances(retentionDays);
      
      // Clear cache for dates that were cleaned up
      const cutoffDate = result.cutoffDate;
      const loadedDates = state.getLoadedInstanceDates();
      
      loadedDates.forEach(date => {
        if (date < cutoffDate) {
          const instances = state.getTaskInstancesForDate(date);
          instances.forEach(instance => {
            appState.taskInstances.cache.delete(instance.id);
          });
          appState.taskInstances.data.delete(date);
          appState.taskInstances.dateRange.loadedDates.delete(date);
        }
      });
      
      // Update metadata after cleanup
      updateTaskInstanceMetadata();
      notifyStateChange('taskInstanceMetadata', appState.taskInstances.metadata);
      
      console.log(`✅ Cleanup completed: ${result.deletedCount} old instances deleted`);
      return result;
    } catch (error) {
      console.error('❌ Error cleaning up old instances:', error);
      throw error;
    } finally {
      state.setLoading('saving', false);
    }
  },

  // Navigate to different date with preloading
  async navigateToInstanceDate(date, preloadDays = 7) {
    try {
      // Update current date
      state.setTaskInstanceCurrentDate(date);
      
      // Load instances for the target date
      await this.loadTaskInstancesForDate(date);
      
      // Preload surrounding dates for smooth navigation
      const preloadDates = [];
      for (let i = -preloadDays; i <= preloadDays; i++) {
        if (i !== 0) { // Skip current date (already loaded)
          const preloadDate = dataUtils.addDaysToDate(date, i);
          preloadDates.push(preloadDate);
        }
      }
      
      state.setTaskInstancePreloadDates(preloadDates);
      
      // Load preload dates in background (non-blocking)
      preloadDates.forEach(async (preloadDate) => {
        try {
          await this.loadTaskInstancesForDate(preloadDate);
        } catch (error) {
          console.warn(`Failed to preload instances for ${preloadDate}:`, error);
        }
      });
      
      console.log(`✅ Navigated to ${date} with preloading`);
      return date;
    } catch (error) {
      console.error(`❌ Error navigating to instance date ${date}:`, error);
      throw error;
    }
  },

  // Process offline instance operations queue
  async processInstanceOperationQueue() {
    if (state.isOnline() && appState.instanceOperationQueue.length > 0) {
      try {
        const operations = [...appState.instanceOperationQueue];
        state.clearInstanceOperationQueue();
        
        for (const operation of operations) {
          try {
            switch (operation.type) {
              case 'CREATE_INSTANCE':
                await this.createTaskInstance(operation.data);
                break;
              case 'UPDATE_INSTANCE':
                await this.updateTaskInstance(operation.data.instanceId, operation.data.updates);
                break;
              case 'DELETE_INSTANCE':
                await this.deleteTaskInstance(operation.data.instanceId);
                break;
              case 'LOAD_INSTANCES_FOR_DATE':
                await this.loadTaskInstancesForDate(operation.data.date, operation.data.options);
                break;
              default:
                console.warn('Unknown instance operation type:', operation.type);
            }
          } catch (error) {
            console.error('Error processing queued instance operation:', operation, error);
          }
        }
        
        console.log(`✅ Processed ${operations.length} queued instance operations`);
      } catch (error) {
        console.error('❌ Error processing instance operation queue:', error);
      }
    }
  },

  // Clear instance cache and reload current date
  async refreshTaskInstances() {
    try {
      const currentDate = state.getTaskInstanceCurrentDate();
      state.clearTaskInstanceCache();
      await this.loadTaskInstancesForDate(currentDate, { force: true });
      console.log('✅ Task instances refreshed');
    } catch (error) {
      console.error('❌ Error refreshing task instances:', error);
      throw error;
    }
  },
  
  // Load daily schedule for date
  async loadDailyScheduleForDate(date) {
    try {
      const schedule = await dailySchedules.getForDate(date);
      state.setDailyScheduleForDate(date, schedule);
      
      console.log(`✅ Daily schedule loaded for ${date}`);
    } catch (error) {
      console.error(`❌ Error loading daily schedule for ${date}:`, error);
      throw error;
    }
  }
};

// Initialize online/offline detection
window.addEventListener('online', () => {
  state.setOnline(true);
  // Process any queued operations when coming back online
  stateActions.processTemplateOperationQueue();
  stateActions.processInstanceOperationQueue();
});
window.addEventListener('offline', () => state.setOnline(false));

// Initialize multi-tab synchronization
if (typeof BroadcastChannel !== 'undefined') {
  const syncChannel = new BroadcastChannel('daily-ai-state');
  
  syncChannel.addEventListener('message', (event) => {
    const { type, data } = event.data;
    
    // Ignore messages from this tab
    if (event.data.source === 'state-manager') return;
    
    // Process state synchronization messages
    if (type.startsWith('state-')) {
      const stateType = type.replace('state-', '');
      
      switch (stateType) {
        // Template synchronization
        case 'taskTemplates':
          state.setTaskTemplates(data);
          break;
        case 'templateUpdate':
          state.updateTaskTemplate(data);
          break;
        case 'templateRemove':
          state.removeTaskTemplate(data);
          break;
        case 'taskTemplateMetadata':
          appState.taskTemplates.metadata = { ...data };
          notifyStateChange('taskTemplateMetadata', data);
          break;
          
        // Instance synchronization  
        case 'taskInstances':
          state.setTaskInstancesForDate(data.date, data.instances);
          break;
        case 'instanceUpdate':
          state.updateTaskInstance(data);
          break;
        case 'instanceRemove':
          state.removeTaskInstance(data);
          break;
        case 'taskInstanceMetadata':
          appState.taskInstances.metadata = { ...data };
          notifyStateChange('taskInstanceMetadata', data);
          break;
        case 'taskInstanceCurrentDate':
          state.setTaskInstanceCurrentDate(data);
          break;
        case 'instanceBatchUpdate':
          // Sync batch update from other tab
          data.affectedDates.forEach(date => {
            const instances = state.getTaskInstancesForDate(date);
            notifyStateChange('taskInstances', { date, instances });
          });
          break;
          
        // User and settings synchronization
        case 'user':
          state.setUser(data);
          break;
        case 'settings':
          state.setSettings(data);
          break;
          
        // Daily schedule synchronization
        case 'dailySchedules':
          state.setDailyScheduleForDate(data.date, data.schedule);
          break;
          
        default:
          console.log('Received sync message for:', stateType, data);
      }
      
      console.log(`🔄 Synced ${stateType} from other tab`);
    }
  });
  
  console.log('✅ Multi-tab synchronization initialized');
}

console.log('✅ Enhanced state management initialized with comprehensive template and instance support');