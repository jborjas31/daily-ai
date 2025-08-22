/**
 * Application State Management
 * Single source of truth for all application data
 */

import { userSettings, taskTemplates, taskInstances, dailySchedules, dataUtils } from './data.js';

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
  
  // Task data
  taskTemplates: [],
  taskInstances: new Map(), // Date string -> array of instances
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
  getTaskTemplates: () => [...appState.taskTemplates],
  getTaskInstancesForDate: (date) => appState.taskInstances.get(date) || [],
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
  
  // Set task templates
  setTaskTemplates: (templates) => {
    appState.taskTemplates = [...templates];
    appState.lastUpdated = new Date().toISOString();
    notifyStateChange('taskTemplates', templates);
  },
  
  // Add/update single task template
  updateTaskTemplate: (task) => {
    const index = appState.taskTemplates.findIndex(t => t.id === task.id);
    if (index >= 0) {
      appState.taskTemplates[index] = { ...task };
    } else {
      appState.taskTemplates.push({ ...task });
    }
    appState.lastUpdated = new Date().toISOString();
    notifyStateChange('taskTemplates', appState.taskTemplates);
  },
  
  // Remove task template
  removeTaskTemplate: (taskId) => {
    appState.taskTemplates = appState.taskTemplates.filter(t => t.id !== taskId);
    appState.lastUpdated = new Date().toISOString();
    notifyStateChange('taskTemplates', appState.taskTemplates);
  },
  
  // Set task instances for date
  setTaskInstancesForDate: (date, instances) => {
    appState.taskInstances.set(date, [...instances]);
    appState.lastUpdated = new Date().toISOString();
    notifyStateChange('taskInstances', { date, instances });
  },
  
  // Add/update task instance
  updateTaskInstance: (instance) => {
    const date = instance.date;
    const instances = appState.taskInstances.get(date) || [];
    const index = instances.findIndex(i => i.id === instance.id);
    
    if (index >= 0) {
      instances[index] = { ...instance };
    } else {
      instances.push({ ...instance });
    }
    
    appState.taskInstances.set(date, instances);
    appState.lastUpdated = new Date().toISOString();
    notifyStateChange('taskInstances', { date, instances });
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
      
      // Initialize default settings if needed
      const settings = await userSettings.initialize();
      state.setSettings(settings);
      
      console.log('✅ User data initialized');
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
      
      const settings = await userSettings.get();
      state.setSettings(settings);
      
      console.log('✅ Settings loaded');
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
      
      const savedSettings = await userSettings.save(newSettings);
      state.setSettings(savedSettings);
      
      console.log('✅ Settings saved');
      return savedSettings;
    } catch (error) {
      console.error('❌ Error saving settings:', error);
      throw error;
    } finally {
      state.setLoading('saving', false);
    }
  },
  
  // Load task templates
  async loadTaskTemplates() {
    try {
      state.setLoading('tasks', true);
      
      const templates = await taskTemplates.getAll();
      state.setTaskTemplates(templates);
      
      console.log('✅ Task templates loaded');
    } catch (error) {
      console.error('❌ Error loading task templates:', error);
      throw error;
    } finally {
      state.setLoading('tasks', false);
    }
  },
  
  // Load task instances for date
  async loadTaskInstancesForDate(date) {
    try {
      const instances = await taskInstances.getForDate(date);
      state.setTaskInstancesForDate(date, instances);
      
      console.log(`✅ Task instances loaded for ${date}`);
    } catch (error) {
      console.error(`❌ Error loading task instances for ${date}:`, error);
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
window.addEventListener('online', () => state.setOnline(true));
window.addEventListener('offline', () => state.setOnline(false));

console.log('✅ State management initialized');