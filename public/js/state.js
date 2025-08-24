/**
 * Application State Management
 * Single source of truth for all application data
 */

import { taskTemplates, taskInstances, dailySchedules, dataUtils } from './data.js';
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
  
  // Task instance data
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
  templateOperationQueue: [], // Queue for offline template operations
  
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
 * Multi-tab Synchronization
 */
function broadcastStateChange(type, data) {
  if (appState.tabSyncEnabled && typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel('daily-ai-state');
      channel.postMessage({
        type: `state-${type}`,
        data,
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
window.addEventListener('online', () => {
  state.setOnline(true);
  // Process any queued template operations when coming back online
  stateActions.processTemplateOperationQueue();
});
window.addEventListener('offline', () => state.setOnline(false));

// Initialize multi-tab synchronization
if (typeof BroadcastChannel !== 'undefined') {
  const syncChannel = new BroadcastChannel('daily-ai-state');
  
  syncChannel.addEventListener('message', (event) => {
    const { type, data, timestamp, source } = event.data;
    
    // Ignore messages from this tab
    if (source === 'state-manager') return;
    
    // Process state synchronization messages
    if (type.startsWith('state-')) {
      const stateType = type.replace('state-', '');
      
      switch (stateType) {
        case 'taskTemplates':
          // Sync template data
          state.setTaskTemplates(data);
          break;
        case 'templateUpdate':
          // Sync individual template update
          state.updateTaskTemplate(data);
          break;
        case 'templateRemove':
          // Sync template removal
          state.removeTaskTemplate(data);
          break;
        case 'user':
          // Sync user changes
          state.setUser(data);
          break;
        case 'settings':
          // Sync settings changes
          state.setSettings(data);
          break;
        default:
          // Handle other state changes as needed
          console.log('Received sync message for:', stateType);
      }
      
      console.log(`🔄 Synced ${stateType} from other tab`);
    }
  });
  
  console.log('✅ Multi-tab synchronization initialized');
}

console.log('✅ Enhanced state management initialized with template support');