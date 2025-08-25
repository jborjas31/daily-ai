/**
 * Task Logic and Scheduling Engine
 * 
 * This module contains the core "Secret Sauce" intelligent scheduling logic
 * and all task-related business logic operations.
 */

import { state } from './state.js';
import { taskTemplates, taskInstances, dataUtils } from './dataOffline.js';
import { taskValidation } from './utils/TaskValidation.js';

/**
 * Time Window Definitions
 */
export const TIME_WINDOWS = {
  morning: { start: '06:00', end: '12:00', label: 'Morning (6:00-12:00)' },
  afternoon: { start: '12:00', end: '18:00', label: 'Afternoon (12:00-18:00)' },
  evening: { start: '18:00', end: '23:00', label: 'Evening (18:00-23:00)' },
  anytime: { start: '06:00', end: '23:00', label: 'Anytime (6:00-23:00)' }
};

/**
 * Task Template Manager - Core CRUD Operations for Task Templates
 * 
 * Handles all operations for recurring task patterns with comprehensive
 * validation, error handling, and business logic.
 */
export class TaskTemplateManager {
  constructor() {
    this.templates = new Map(); // Local cache for performance
    this.initialized = false;
  }

  /**
   * Initialize the manager (load existing templates)
   */
  async initialize() {
    try {
      const templates = await taskTemplates.getAll();
      templates.forEach(template => {
        this.templates.set(template.id, template);
      });
      this.initialized = true;
      console.log(`✅ TaskTemplateManager initialized with ${templates.length} templates`);
    } catch (error) {
      console.error('❌ Error initializing TaskTemplateManager:', error);
      throw error;
    }
  }

  /**
   * Create new task template with defaults and validation
   */
  async create(userId, taskData) {
    try {
      if (!userId) {
        throw new Error('User ID is required to create task template');
      }

      // Apply smart defaults based on creation context
      const templateWithDefaults = this.applySmartDefaults(taskData);
      
      // Comprehensive validation using new validation system
      const existingTemplates = await taskTemplates.getAll(userId);
      const validationResult = taskValidation.validateTemplate(templateWithDefaults, existingTemplates);
      if (!validationResult.isValid) {
        throw new Error(`Template validation failed: ${validationResult.getErrorMessages().join(', ')}`);
      }
      
      // Add metadata
      const templateData = {
        ...templateWithDefaults,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Create task template in database
      const newTemplate = await taskTemplates.create(userId, templateData);
      
      // Cache locally
      this.templates.set(newTemplate.id, newTemplate);
      
      // Update application state
      state.updateTaskTemplate(newTemplate);
      
      console.log('✅ Task template created:', newTemplate.taskName);
      return newTemplate;
    } catch (error) {
      console.error('❌ Error creating task template:', error);
      throw error;
    }
  }

  /**
   * Read/Get task template by ID
   */
  async get(templateId) {
    try {
      if (!templateId) {
        throw new Error('Template ID is required');
      }

      // Check local cache first
      if (this.templates.has(templateId)) {
        return this.templates.get(templateId);
      }

      // Fetch from database if not cached
      const template = await taskTemplates.get(templateId);
      if (template) {
        this.templates.set(templateId, template);
      }
      
      return template;
    } catch (error) {
      console.error('❌ Error retrieving task template:', error);
      throw error;
    }
  }

  /**
   * Get all active task templates for a user
   */
  async getAll(userId, includeInactive = false) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const templates = await taskTemplates.getAll(userId);
      
      // Filter by active status unless includeInactive is true
      const filteredTemplates = includeInactive 
        ? templates 
        : templates.filter(template => template.isActive !== false);
      
      // Update local cache
      filteredTemplates.forEach(template => {
        this.templates.set(template.id, template);
      });
      
      return filteredTemplates;
    } catch (error) {
      console.error('❌ Error retrieving task templates:', error);
      throw error;
    }
  }

  /**
   * Update existing task template with validation
   */
  async update(templateId, updates) {
    try {
      if (!templateId) {
        throw new Error('Template ID is required');
      }

      // Get current template for merging
      const currentTemplate = await this.get(templateId);
      if (!currentTemplate) {
        throw new Error(`Template not found: ${templateId}`);
      }

      // Merge updates with current template
      const updatedData = {
        ...currentTemplate,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      // Validate merged data using comprehensive validation system
      const existingTemplates = await taskTemplates.getAll();
      const validationResult = taskValidation.validateTemplate(updatedData, existingTemplates);
      if (!validationResult.isValid) {
        throw new Error(`Template validation failed: ${validationResult.getErrorMessages().join(', ')}`);
      }
      
      // Update in database
      const updatedTemplate = await taskTemplates.update(templateId, updatedData);
      
      // Update local cache
      this.templates.set(templateId, updatedTemplate);
      
      // Update application state
      state.updateTaskTemplate(updatedTemplate);
      
      console.log('✅ Task template updated:', templateId);
      return updatedTemplate;
    } catch (error) {
      console.error('❌ Error updating task template:', error);
      throw error;
    }
  }

  /**
   * Delete task template (soft delete - deactivate)
   */
  async delete(templateId) {
    try {
      if (!templateId) {
        throw new Error('Template ID is required');
      }

      // Soft delete by deactivating
      const updatedTemplate = await this.update(templateId, { 
        isActive: false,
        deletedAt: new Date().toISOString()
      });
      
      // Remove from local cache
      this.templates.delete(templateId);
      
      // Remove from application state
      state.removeTaskTemplate(templateId);
      
      console.log('✅ Task template deleted (deactivated):', templateId);
      return updatedTemplate;
    } catch (error) {
      console.error('❌ Error deleting task template:', error);
      throw error;
    }
  }

  /**
   * Permanently delete task template (hard delete)
   */
  async permanentDelete(templateId) {
    try {
      if (!templateId) {
        throw new Error('Template ID is required');
      }

      await taskTemplates.permanentDelete(templateId);
      
      // Remove from local cache
      this.templates.delete(templateId);
      
      // Remove from application state
      state.removeTaskTemplate(templateId);
      
      console.log('✅ Task template permanently deleted:', templateId);
    } catch (error) {
      console.error('❌ Error permanently deleting task template:', error);
      throw error;
    }
  }

  /**
   * Duplicate task template with modified name
   */
  async duplicate(userId, templateId, customName = null) {
    try {
      if (!templateId) {
        throw new Error('Template ID is required');
      }

      const originalTemplate = await this.get(templateId);
      if (!originalTemplate) {
        throw new Error(`Template not found: ${templateId}`);
      }
      
      // Create duplicate data
      const duplicateData = {
        ...originalTemplate,
        taskName: customName || `${originalTemplate.taskName} (Copy)`,
        // Remove metadata that should not be copied
        id: undefined,
        createdAt: undefined,
        updatedAt: undefined,
        deletedAt: undefined
      };
      
      return await this.create(userId, duplicateData);
    } catch (error) {
      console.error('❌ Error duplicating task template:', error);
      throw error;
    }
  }

  /**
   * Activate task template
   */
  async activate(templateId) {
    try {
      return await this.update(templateId, { 
        isActive: true,
        deletedAt: null
      });
    } catch (error) {
      console.error('❌ Error activating task template:', error);
      throw error;
    }
  }

  /**
   * Deactivate task template
   */
  async deactivate(templateId) {
    try {
      return await this.update(templateId, { 
        isActive: false,
        deactivatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error deactivating task template:', error);
      throw error;
    }
  }

  /**
   * Bulk operations for multiple templates
   */
  async bulkActivate(templateIds) {
    try {
      const results = [];
      for (const templateId of templateIds) {
        const result = await this.activate(templateId);
        results.push(result);
      }
      console.log(`✅ Bulk activated ${results.length} templates`);
      return results;
    } catch (error) {
      console.error('❌ Error in bulk activate:', error);
      throw error;
    }
  }

  async bulkDeactivate(templateIds) {
    try {
      const results = [];
      for (const templateId of templateIds) {
        const result = await this.deactivate(templateId);
        results.push(result);
      }
      console.log(`✅ Bulk deactivated ${results.length} templates`);
      return results;
    } catch (error) {
      console.error('❌ Error in bulk deactivate:', error);
      throw error;
    }
  }

  /**
   * Template validation using comprehensive validation system
   */
  validateTemplate(templateData, existingTemplates = []) {
    return taskValidation.validateTemplate(templateData, existingTemplates);
  }

  /**
   * Quick validation for real-time UI feedback
   */
  quickValidateTemplate(templateData) {
    return taskValidation.quickValidateTemplate(templateData);
  }

  /**
   * Apply smart defaults based on creation context
   */
  applySmartDefaults(taskData) {
    const now = new Date();
    const currentHour = now.getHours();
    
    // Auto-detect time window based on current time
    let defaultTimeWindow = 'anytime';
    if (currentHour >= 6 && currentHour < 12) {
      defaultTimeWindow = 'morning';
    } else if (currentHour >= 12 && currentHour < 18) {
      defaultTimeWindow = 'afternoon';
    } else if (currentHour >= 18 && currentHour < 23) {
      defaultTimeWindow = 'evening';
    }
    
    return {
      // Task basics
      taskName: taskData.taskName || '',
      description: taskData.description || '',
      
      // Priority and mandatory status
      priority: taskData.priority || 3,
      isMandatory: taskData.isMandatory || false,
      
      // Duration (normal and minimum for crunch time)
      durationMinutes: taskData.durationMinutes || 30,
      minDurationMinutes: taskData.minDurationMinutes || Math.max(15, Math.floor((taskData.durationMinutes || 30) * 0.5)),
      
      // Scheduling
      schedulingType: taskData.schedulingType || 'flexible',
      defaultTime: taskData.defaultTime || null,
      timeWindow: taskData.timeWindow || defaultTimeWindow,
      
      // Dependencies
      dependsOn: taskData.dependsOn || null,
      
      // Recurrence
      recurrenceRule: taskData.recurrenceRule || {
        frequency: 'none',
        interval: 1,
        endDate: null,
        endAfterOccurrences: null,
        daysOfWeek: []
      },
      
      // Status
      isActive: taskData.isActive !== undefined ? taskData.isActive : true
    };
  }

  /**
   * Clear local cache (useful for testing or forced refresh)
   */
  clearCache() {
    this.templates.clear();
    console.log('✅ TaskTemplateManager cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      cachedTemplates: this.templates.size,
      initialized: this.initialized
    };
  }
}

// Create singleton instance
export const taskTemplateManager = new TaskTemplateManager();

/**
 * Task Instance Manager - Singleton Instance
 * Will be instantiated after class definition to avoid initialization errors
 */

/**
 * Intelligent Scheduling Engine - "Secret Sauce"
 * 
 * This is the core scheduling logic that automatically arranges tasks
 * based on priorities, dependencies, and time constraints.
 */
export const schedulingEngine = {
  /**
   * Generate schedule for a specific date
   */
  generateScheduleForDate(date) {
    try {
      const settings = state.getSettings();
      const templates = state.getTaskTemplates();
      const instances = state.getTaskInstancesForDate(date);
      const dailySchedule = state.getDailyScheduleForDate(date);
      
      // Get effective sleep schedule (daily override or default)
      const sleepSchedule = this.getEffectiveSleepSchedule(settings, dailySchedule);
      
      // Filter active tasks for this date
      const activeTasks = this.getActiveTasksForDate(templates, instances, date);
      
      // Run impossibility check first
      const impossibilityCheck = this.checkScheduleImpossibility(activeTasks, sleepSchedule);
      if (!impossibilityCheck.possible) {
        return {
          success: false,
          error: 'impossible_schedule',
          message: impossibilityCheck.message,
          suggestions: impossibilityCheck.suggestions,
          schedule: []
        };
      }
      
      // Generate schedule using the 5-step process
      const schedule = this.runSchedulingAlgorithm(activeTasks, sleepSchedule);
      
      return {
        success: true,
        schedule: schedule,
        sleepSchedule: sleepSchedule,
        totalTasks: activeTasks.length,
        scheduledTasks: schedule.length
      };
      
    } catch (error) {
      console.error('❌ Error generating schedule:', error);
      return {
        success: false,
        error: 'scheduling_error',
        message: 'Failed to generate schedule',
        schedule: []
      };
    }
  },

  /**
   * Get effective sleep schedule (daily override or default)
   */
  getEffectiveSleepSchedule(settings, dailySchedule) {
    if (dailySchedule) {
      return {
        wakeTime: dailySchedule.wakeTime,
        sleepTime: dailySchedule.sleepTime,
        duration: settings.desiredSleepDuration // Keep the same duration
      };
    }
    
    return {
      wakeTime: settings.defaultWakeTime,
      sleepTime: settings.defaultSleepTime,
      duration: settings.desiredSleepDuration
    };
  },

  /**
   * Get active tasks for specific date (excluding completed/skipped)
   */
  getActiveTasksForDate(templates, instances, date) {
    const completedTaskIds = new Set();
    const skippedTaskIds = new Set();
    
    // Track which tasks are completed or skipped for this date
    instances.forEach(instance => {
      if (instance.status === 'completed') {
        completedTaskIds.add(instance.templateId);
      } else if (instance.status === 'skipped') {
        skippedTaskIds.add(instance.templateId);
      }
    });
    
    // Return only active tasks (not completed or skipped)
    return templates.filter(task => {
      // Check if task should occur on this date (recurrence logic would go here)
      const shouldOccur = this.shouldTaskOccurOnDate(task, date);
      
      return shouldOccur && 
             !completedTaskIds.has(task.id) && 
             !skippedTaskIds.has(task.id);
    });
  },

  /**
   * Check if task should occur on specific date (basic recurrence logic)
   */
  shouldTaskOccurOnDate(task, date) {
    // For now, assume all tasks occur daily unless specifically configured
    // TODO: Implement full recurrence logic in future phases
    
    if (task.recurrenceRule.frequency === 'none') {
      return true; // One-time tasks always available
    }
    
    if (task.recurrenceRule.frequency === 'daily') {
      return true; // Daily tasks always occur
    }
    
    // For weekly/monthly/yearly, we'll implement in later phases
    return true;
  },

  /**
   * Check if schedule is impossible (mandatory tasks exceed available time)
   */
  checkScheduleImpossibility(tasks, sleepSchedule) {
    const mandatoryTasks = tasks.filter(task => task.isMandatory);
    const totalMandatoryMinutes = mandatoryTasks.reduce((sum, task) => sum + task.durationMinutes, 0);
    
    // Calculate available waking hours (assume 24 - sleep duration)
    const availableMinutes = (24 - sleepSchedule.duration) * 60;
    
    if (totalMandatoryMinutes > availableMinutes) {
      return {
        possible: false,
        message: `${mandatoryTasks.length} mandatory tasks require ${Math.round(totalMandatoryMinutes/60)} hours, but only ${Math.round(availableMinutes/60)} hours available.`,
        suggestions: [
          'Reduce sleep duration in settings',
          'Make some tasks skippable instead of mandatory',
          'Reduce duration of mandatory tasks',
          'Postpone some tasks to another day'
        ]
      };
    }
    
    return { possible: true };
  },

  /**
   * Run the 5-step scheduling algorithm
   */
  runSchedulingAlgorithm(tasks, sleepSchedule) {
    // Step 1: Place Anchors (mandatory fixed-time tasks)
    const anchors = this.placeAnchors(tasks);
    
    // Step 2: Resolve Dependencies
    const dependencyOrder = this.resolveDependencies(tasks);
    
    // Step 3: Slot Flexible Tasks
    const schedule = this.slotFlexibleTasks(tasks, anchors, dependencyOrder, sleepSchedule);
    
    // Step 4: Crunch-Time Adjustments (will be implemented in later phases)
    // Step 5: Conflict Detection (will be implemented in later phases)
    
    return schedule;
  },

  /**
   * Step 1: Place mandatory fixed-time tasks (anchors)
   */
  placeAnchors(tasks) {
    const anchors = tasks
      .filter(task => task.isMandatory && task.schedulingType === 'fixed' && task.defaultTime)
      .map(task => ({
        ...task,
        scheduledTime: task.defaultTime,
        isAnchor: true
      }))
      .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
    
    console.log(`📍 Placed ${anchors.length} anchor tasks`);
    return anchors;
  },

  /**
   * Step 2: Resolve task dependencies and determine order
   */
  resolveDependencies(tasks) {
    // Create dependency graph
    const dependencyMap = new Map();
    tasks.forEach(task => {
      if (task.dependsOn) {
        if (!dependencyMap.has(task.dependsOn)) {
          dependencyMap.set(task.dependsOn, []);
        }
        dependencyMap.get(task.dependsOn).push(task.id);
      }
    });
    
    // For now, return simple priority order
    // TODO: Implement proper topological sort for complex dependencies
    const ordered = [...tasks].sort((a, b) => {
      // Dependencies first, then by priority
      if (a.dependsOn && !b.dependsOn) return 1;
      if (!a.dependsOn && b.dependsOn) return -1;
      return b.priority - a.priority;
    });
    
    console.log('🔗 Resolved task dependencies');
    return ordered;
  },

  /**
   * Step 3: Slot flexible tasks into available time windows
   */
  slotFlexibleTasks(tasks, anchors, orderedTasks, sleepSchedule) {
    const schedule = [...anchors];
    const flexibleTasks = orderedTasks.filter(task => 
      task.schedulingType === 'flexible' || (!task.isMandatory || !task.defaultTime)
    );
    
    // For each flexible task, find best available slot
    flexibleTasks.forEach(task => {
      const timeWindow = TIME_WINDOWS[task.timeWindow] || TIME_WINDOWS.anytime;
      const bestSlot = this.findBestTimeSlot(task, schedule, timeWindow, sleepSchedule);
      
      if (bestSlot) {
        schedule.push({
          ...task,
          scheduledTime: bestSlot,
          isFlexible: true
        });
      }
    });
    
    // Sort final schedule by time
    return schedule.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  },

  /**
   * Find best available time slot for flexible task
   */
  findBestTimeSlot(task, existingSchedule, timeWindow, sleepSchedule) {
    // Simple slot finding - start at beginning of time window
    // TODO: Implement more sophisticated slot finding algorithm
    
    // For now, just return the start of the time window as a placeholder
    return timeWindow.start;
  }
};

/**
 * Search and Filter Logic
 */
export const searchAndFilter = {
  /**
   * Filter tasks based on search query and filters
   */
  filterTasks(tasks, searchQuery, filters) {
    let filteredTasks = [...tasks];
    
    // Apply search query
    if (searchQuery && searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      filteredTasks = filteredTasks.filter(task => 
        task.taskName.toLowerCase().includes(query) ||
        (task.description && task.description.toLowerCase().includes(query))
      );
    }
    
    // Apply time window filter
    if (filters.timeWindow && filters.timeWindow !== 'all') {
      filteredTasks = filteredTasks.filter(task => 
        task.timeWindow === filters.timeWindow
      );
    }
    
    // Apply mandatory filter
    if (filters.mandatory && filters.mandatory !== 'all') {
      const isMandatory = filters.mandatory === 'mandatory';
      filteredTasks = filteredTasks.filter(task => 
        task.isMandatory === isMandatory
      );
    }
    
    return filteredTasks;
  },

  /**
   * Sort tasks by priority and other criteria
   */
  sortTasks(tasks, sortBy = 'priority') {
    const sorted = [...tasks];
    
    switch (sortBy) {
      case 'priority':
        return sorted.sort((a, b) => b.priority - a.priority);
      case 'name':
        return sorted.sort((a, b) => a.taskName.localeCompare(b.taskName));
      case 'duration':
        return sorted.sort((a, b) => a.durationMinutes - b.durationMinutes);
      case 'created':
        return sorted.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
      default:
        return sorted;
    }
  }
};

/**
 * Real-time Task State Logic
 */
export const realTimeTaskLogic = {
  /**
   * Check for overdue tasks based on current time
   */
  checkOverdueTasks(schedule, currentTime) {
    const overdueTasks = [];
    const currentTimeMinutes = this.timeStringToMinutes(currentTime);
    
    schedule.forEach(task => {
      const taskStartMinutes = this.timeStringToMinutes(task.scheduledTime);
      const taskEndMinutes = taskStartMinutes + task.durationMinutes;
      
      if (currentTimeMinutes > taskEndMinutes) {
        overdueTasks.push({
          ...task,
          isOverdue: true,
          overdueMinutes: currentTimeMinutes - taskEndMinutes
        });
      }
    });
    
    return overdueTasks;
  },

  /**
   * Convert time string (HH:MM) to minutes since midnight
   */
  timeStringToMinutes(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  },

  /**
   * Convert minutes since midnight to time string (HH:MM)
   */
  minutesToTimeString(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  },

  /**
   * Get current time as HH:MM string
   */
  getCurrentTimeString() {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  }
};

/**
 * Task Instance Manager - Core Operations for Daily Task Modifications
 * 
 * Manages task instances which are daily modifications of templates.
 * Handles status changes, date-based operations, and instance generation.
 */
export class TaskInstanceManager {
  constructor() {
    this.instances = new Map(); // Local cache organized by date: Map<date, Map<instanceId, instance>>
    this.initialized = false;
  }

  /**
   * Initialize the manager (load existing instances for current date range)
   */
  async initialize(userId, dateRange = 7) {
    try {
      if (!userId) {
        throw new Error('User ID is required for TaskInstanceManager initialization');
      }

      // Load instances for the current date plus dateRange days
      const today = dataUtils.getTodayDateString();
      const dates = this.getDateRange(today, dateRange);
      
      for (const date of dates) {
        const instances = await taskInstances.getByDate(userId, date);
        if (instances.length > 0) {
          const dateMap = new Map();
          instances.forEach(instance => {
            dateMap.set(instance.id, instance);
          });
          this.instances.set(date, dateMap);
        }
      }
      
      this.initialized = true;
      console.log(`✅ TaskInstanceManager initialized with instances for ${dates.length} dates`);
    } catch (error) {
      console.error('❌ Error initializing TaskInstanceManager:', error);
      throw error;
    }
  }

  /**
   * Generate instance from template for specific date
   */
  async generateFromTemplate(userId, template, date) {
    try {
      if (!userId || !template || !date) {
        throw new Error('User ID, template, and date are required');
      }

      // Check if template should generate an instance for this date
      if (!this.shouldGenerateForDate(template, date)) {
        return null;
      }

      // Create instance data from template
      const instanceData = {
        templateId: template.id,
        date: date,
        status: 'pending',
        taskName: template.taskName,
        description: template.description,
        durationMinutes: template.durationMinutes,
        minDurationMinutes: template.minDurationMinutes,
        priority: template.priority,
        isMandatory: template.isMandatory,
        schedulingType: template.schedulingType,
        defaultTime: template.defaultTime,
        timeWindow: template.timeWindow,
        dependsOn: template.dependsOn,
        scheduledTime: null, // Will be set by scheduling engine
        actualDuration: null,
        completedAt: null,
        notes: null,
        modificationReason: null,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString()
      };

      // Create instance in database
      const newInstance = await taskInstances.create(userId, instanceData);
      
      // Cache locally
      this.cacheInstance(date, newInstance);
      
      // Update application state
      state.updateTaskInstance(newInstance);
      
      console.log(`✅ Task instance generated from template: ${template.taskName} for ${date}`);
      return newInstance;
    } catch (error) {
      console.error('❌ Error generating task instance from template:', error);
      throw error;
    }
  }

  /**
   * Get task instance by ID
   */
  async get(instanceId, date = null) {
    try {
      if (!instanceId) {
        throw new Error('Instance ID is required');
      }

      // If date provided, check cache for that date
      if (date && this.instances.has(date)) {
        const dateMap = this.instances.get(date);
        if (dateMap.has(instanceId)) {
          return dateMap.get(instanceId);
        }
      }

      // If no date or not in cache, search all cached dates
      for (const [, dateMap] of this.instances) {
        if (dateMap.has(instanceId)) {
          return dateMap.get(instanceId);
        }
      }

      // Not in cache, fetch from database
      const instance = await taskInstances.get(instanceId);
      if (instance) {
        this.cacheInstance(instance.date, instance);
      }
      
      return instance;
    } catch (error) {
      console.error('❌ Error retrieving task instance:', error);
      throw error;
    }
  }

  /**
   * Get all task instances for a specific date
   */
  async getByDate(userId, date) {
    try {
      if (!userId || !date) {
        throw new Error('User ID and date are required');
      }

      // Check cache first
      if (this.instances.has(date)) {
        const dateMap = this.instances.get(date);
        return Array.from(dateMap.values());
      }

      // Fetch from database if not cached
      const instances = await taskInstances.getByDate(userId, date);
      
      // Update cache
      if (instances.length > 0) {
        const dateMap = new Map();
        instances.forEach(instance => {
          dateMap.set(instance.id, instance);
        });
        this.instances.set(date, dateMap);
      }
      
      return instances;
    } catch (error) {
      console.error('❌ Error retrieving task instances for date:', error);
      throw error;
    }
  }

  /**
   * Update task instance with modification tracking
   */
  async update(instanceId, updates, modificationReason = null) {
    try {
      if (!instanceId) {
        throw new Error('Instance ID is required');
      }

      // Get current instance
      const currentInstance = await this.get(instanceId);
      if (!currentInstance) {
        throw new Error(`Task instance not found: ${instanceId}`);
      }

      // Merge updates with modification tracking
      const updatedData = {
        ...currentInstance,
        ...updates,
        modificationReason: modificationReason,
        modifiedAt: new Date().toISOString()
      };

      // Validate instance data  
      const validationResult = taskValidation.validateInstance(updatedData);
      if (!validationResult.isValid) {
        throw new Error(`Instance validation failed: ${validationResult.getErrorMessages().join(', ')}`);
      }
      
      // Update in database
      const updatedInstance = await taskInstances.update(instanceId, updatedData);
      
      // Update cache
      this.cacheInstance(updatedInstance.date, updatedInstance);
      
      // Update application state
      state.updateTaskInstance(updatedInstance);
      
      console.log(`✅ Task instance updated: ${instanceId}`);
      return updatedInstance;
    } catch (error) {
      console.error('❌ Error updating task instance:', error);
      throw error;
    }
  }

  /**
   * Mark task instance as completed
   */
  async markCompleted(instanceId, actualDuration = null, notes = null) {
    try {
      const updates = {
        status: 'completed',
        completedAt: new Date().toISOString(),
        actualDuration: actualDuration,
        notes: notes
      };

      return await this.update(instanceId, updates, 'Marked as completed by user');
    } catch (error) {
      console.error('❌ Error marking task instance as completed:', error);
      throw error;
    }
  }

  /**
   * Mark task instance as skipped
   */
  async markSkipped(instanceId, reason = null) {
    try {
      const updates = {
        status: 'skipped',
        notes: reason
      };

      return await this.update(instanceId, updates, 'Skipped by user');
    } catch (error) {
      console.error('❌ Error marking task instance as skipped:', error);
      throw error;
    }
  }

  /**
   * Postpone task instance to another date
   */
  async postpone(instanceId, newDate, reason = null) {
    try {
      if (!newDate) {
        throw new Error('New date is required for postponing');
      }

      const updates = {
        date: newDate,
        status: 'pending', // Reset to pending on new date
        notes: reason
      };

      const updatedInstance = await this.update(instanceId, updates, `Postponed to ${newDate}`);
      
      // Move in cache from old date to new date
      const currentInstance = await this.get(instanceId);
      if (currentInstance) {
        this.removeCachedInstance(currentInstance.date, instanceId);
        this.cacheInstance(newDate, updatedInstance);
      }

      return updatedInstance;
    } catch (error) {
      console.error('❌ Error postponing task instance:', error);
      throw error;
    }
  }

  /**
   * Delete task instance (soft delete)
   */
  async delete(instanceId) {
    try {
      if (!instanceId) {
        throw new Error('Instance ID is required');
      }

      const currentInstance = await this.get(instanceId);
      if (!currentInstance) {
        throw new Error(`Task instance not found: ${instanceId}`);
      }

      await taskInstances.delete(instanceId);
      
      // Remove from cache
      this.removeCachedInstance(currentInstance.date, instanceId);
      
      // Remove from application state
      state.removeTaskInstance(instanceId);
      
      console.log(`✅ Task instance deleted: ${instanceId}`);
    } catch (error) {
      console.error('❌ Error deleting task instance:', error);
      throw error;
    }
  }

  /**
   * Check if template should generate instance for given date based on recurrence rules
   */
  shouldGenerateForDate(template, date) {
    if (!template.recurrenceRule || template.recurrenceRule.frequency === 'none') {
      return false; // One-time tasks don't auto-generate
    }

    const targetDate = new Date(date);
    const frequency = template.recurrenceRule.frequency;

    switch (frequency) {
      case 'daily':
        return true; // Daily tasks generate every day

      case 'weekly':
        const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
        return template.recurrenceRule.daysOfWeek && 
               template.recurrenceRule.daysOfWeek.includes(dayOfWeek);

      case 'monthly':
        const dayOfMonth = targetDate.getDate();
        return template.recurrenceRule.dayOfMonth === dayOfMonth;

      case 'yearly':
        const month = targetDate.getMonth() + 1; // JavaScript months are 0-indexed
        const day = targetDate.getDate();
        return template.recurrenceRule.month === month && 
               template.recurrenceRule.dayOfMonth === day;

      default:
        return false;
    }
  }

  /**
   * Generate date range array
   */
  getDateRange(startDate, days) {
    const dates = [];
    const start = new Date(startDate);
    
    for (let i = 0; i < days; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(dataUtils.formatDateString(date));
    }
    
    return dates;
  }

  /**
   * Cache instance locally for performance
   */
  cacheInstance(date, instance) {
    if (!this.instances.has(date)) {
      this.instances.set(date, new Map());
    }
    this.instances.get(date).set(instance.id, instance);
  }

  /**
   * Remove instance from cache
   */
  removeCachedInstance(date, instanceId) {
    if (this.instances.has(date)) {
      const dateMap = this.instances.get(date);
      dateMap.delete(instanceId);
      if (dateMap.size === 0) {
        this.instances.delete(date);
      }
    }
  }

  /**
   * Clear all cached instances (useful for memory management)
   */
  clearCache() {
    this.instances.clear();
    console.log('✅ Task instance cache cleared');
  }

  /**
   * ========================================================================
   * ENHANCED INSTANCE GENERATION SYSTEM - STEP 9 IMPLEMENTATION
   * ========================================================================
   */

  /**
   * Automatically generate daily instances for all active templates for a specific date
   */
  async generateDailyInstances(userId, date) {
    try {
      console.log(`🔄 Starting automatic instance generation for ${date}`);
      
      // Get all active templates
      const templates = await taskTemplates.getAll(userId, { includeInactive: false });
      
      // Get existing instances for the date to avoid duplicates
      const existingInstances = await this.getByDate(userId, date);
      const existingTemplateIds = new Set(existingInstances.map(instance => instance.templateId));
      
      const generatedInstances = [];
      const skippedTemplates = [];
      const errors = [];
      
      // Process each template
      for (const template of templates) {
        try {
          // Skip if instance already exists for this template and date
          if (existingTemplateIds.has(template.id)) {
            skippedTemplates.push({
              templateId: template.id,
              templateName: template.taskName,
              reason: 'Instance already exists'
            });
            continue;
          }
          
          // Check if template should generate for this date based on recurrence rules
          if (!this.shouldGenerateForDate(template, date)) {
            skippedTemplates.push({
              templateId: template.id,
              templateName: template.taskName,
              reason: 'Does not match recurrence pattern'
            });
            continue;
          }
          
          // Check template end date conditions
          if (!this.isTemplateActiveForDate(template, date)) {
            skippedTemplates.push({
              templateId: template.id,
              templateName: template.taskName,
              reason: 'Template ended or not yet active'
            });
            continue;
          }
          
          // Generate instance from template
          const instance = await this.generateFromTemplate(userId, template, date);
          if (instance) {
            generatedInstances.push(instance);
            console.log(`✅ Generated instance for template: ${template.taskName}`);
          }
          
        } catch (error) {
          console.error(`❌ Error generating instance for template ${template.taskName}:`, error);
          errors.push({
            templateId: template.id,
            templateName: template.taskName,
            error: error.message
          });
        }
      }
      
      // Resolve dependencies for generated instances
      if (generatedInstances.length > 0) {
        await this.resolveDependenciesForDate(userId, date, generatedInstances);
      }
      
      // Detect and resolve conflicts
      const allInstances = await this.getByDate(userId, date);
      const conflictResolution = await this.detectAndResolveConflicts(allInstances, date);
      
      const result = {
        date,
        totalTemplates: templates.length,
        generated: generatedInstances.length,
        skipped: skippedTemplates.length,
        errors: errors.length,
        generatedInstances,
        skippedTemplates,
        errors,
        conflictResolution
      };
      
      console.log(`✅ Daily instance generation completed for ${date}: ${generatedInstances.length} generated, ${skippedTemplates.length} skipped, ${errors.length} errors`);
      return result;
      
    } catch (error) {
      console.error('❌ Error in automatic daily instance generation:', error);
      throw error;
    }
  }

  /**
   * Generate instances for multiple dates (bulk operation)
   */
  async generateInstancesForDateRange(userId, startDate, endDate) {
    try {
      console.log(`🔄 Generating instances for date range: ${startDate} to ${endDate}`);
      
      const dates = this.getDateRangeArray(startDate, endDate);
      const results = [];
      
      for (const date of dates) {
        try {
          const dayResult = await this.generateDailyInstances(userId, date);
          results.push(dayResult);
        } catch (error) {
          console.error(`❌ Error generating instances for ${date}:`, error);
          results.push({
            date,
            error: error.message,
            generated: 0,
            skipped: 0,
            errors: 1
          });
        }
      }
      
      // Calculate summary
      const summary = {
        startDate,
        endDate,
        totalDays: dates.length,
        totalGenerated: results.reduce((sum, r) => sum + (r.generated || 0), 0),
        totalSkipped: results.reduce((sum, r) => sum + (r.skipped || 0), 0),
        totalErrors: results.reduce((sum, r) => sum + (r.errors || 0), 0),
        dailyResults: results
      };
      
      console.log(`✅ Bulk instance generation completed: ${summary.totalGenerated} generated across ${summary.totalDays} days`);
      return summary;
      
    } catch (error) {
      console.error('❌ Error in bulk instance generation:', error);
      throw error;
    }
  }

  /**
   * Enhanced recurrence rule processing with comprehensive pattern support
   */
  shouldGenerateForDate(template, date) {
    if (!template.recurrenceRule || template.recurrenceRule.frequency === 'none') {
      return false; // One-time tasks don't auto-generate
    }

    const targetDate = new Date(date);
    const recurrenceRule = template.recurrenceRule;
    
    // Check if template has start/end date restrictions
    if (!this.isWithinRecurrenceDateRange(recurrenceRule, targetDate)) {
      return false;
    }
    
    // Check occurrence limits
    if (!this.isWithinOccurrenceLimits(recurrenceRule, template.id, targetDate)) {
      return false;
    }

    switch (recurrenceRule.frequency) {
      case 'daily':
        return this.shouldGenerateDaily(recurrenceRule, targetDate);
        
      case 'weekly':
        return this.shouldGenerateWeekly(recurrenceRule, targetDate);
        
      case 'monthly':
        return this.shouldGenerateMonthly(recurrenceRule, targetDate);
        
      case 'yearly':
        return this.shouldGenerateYearly(recurrenceRule, targetDate);
        
      case 'custom':
        return this.shouldGenerateCustom(recurrenceRule, targetDate);
        
      default:
        console.warn(`Unknown recurrence frequency: ${recurrenceRule.frequency}`);
        return false;
    }
  }

  /**
   * Check if template is active for the given date (considering start/end dates)
   */
  isTemplateActiveForDate(template, date) {
    const targetDate = new Date(date);
    
    // Check template activation date
    if (template.createdAt) {
      const createdDate = new Date(template.createdAt);
      if (targetDate < createdDate) {
        return false;
      }
    }
    
    // Check if template is deactivated
    if (template.isActive === false) {
      return false;
    }
    
    // Check recurrence rule end conditions
    if (template.recurrenceRule) {
      const rule = template.recurrenceRule;
      
      // Check end date
      if (rule.endDate) {
        const endDate = new Date(rule.endDate);
        if (targetDate > endDate) {
          return false;
        }
      }
      
      // Check start date
      if (rule.startDate) {
        const startDate = new Date(rule.startDate);
        if (targetDate < startDate) {
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * Daily recurrence pattern processing
   */
  shouldGenerateDaily(recurrenceRule, targetDate) {
    const interval = recurrenceRule.interval || 1;
    
    if (interval === 1) {
      return true; // Every day
    }
    
    // Calculate days since start date for interval checking
    const startDate = recurrenceRule.startDate ? new Date(recurrenceRule.startDate) : new Date();
    const daysDiff = Math.floor((targetDate - startDate) / (1000 * 60 * 60 * 24));
    
    return daysDiff >= 0 && (daysDiff % interval) === 0;
  }

  /**
   * Weekly recurrence pattern processing
   */
  shouldGenerateWeekly(recurrenceRule, targetDate) {
    const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysOfWeek = recurrenceRule.daysOfWeek || [];
    
    if (daysOfWeek.length === 0) {
      return false; // No days specified
    }
    
    if (!daysOfWeek.includes(dayOfWeek)) {
      return false; // Not on specified day of week
    }
    
    const interval = recurrenceRule.interval || 1;
    if (interval === 1) {
      return true; // Every week
    }
    
    // Calculate weeks since start date for interval checking
    const startDate = recurrenceRule.startDate ? new Date(recurrenceRule.startDate) : new Date();
    const weeksDiff = Math.floor((targetDate - startDate) / (1000 * 60 * 60 * 24 * 7));
    
    return weeksDiff >= 0 && (weeksDiff % interval) === 0;
  }

  /**
   * Monthly recurrence pattern processing
   */
  shouldGenerateMonthly(recurrenceRule, targetDate) {
    const interval = recurrenceRule.interval || 1;
    
    // Check day of month
    if (recurrenceRule.dayOfMonth) {
      const targetDayOfMonth = targetDate.getDate();
      
      if (recurrenceRule.dayOfMonth === -1) {
        // Last day of month
        const lastDayOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
        if (targetDayOfMonth !== lastDayOfMonth) {
          return false;
        }
      } else if (recurrenceRule.dayOfMonth !== targetDayOfMonth) {
        return false;
      }
    }
    
    // Check interval
    if (interval === 1) {
      return true;
    }
    
    const startDate = recurrenceRule.startDate ? new Date(recurrenceRule.startDate) : new Date();
    const monthsDiff = (targetDate.getFullYear() - startDate.getFullYear()) * 12 + 
                      (targetDate.getMonth() - startDate.getMonth());
    
    return monthsDiff >= 0 && (monthsDiff % interval) === 0;
  }

  /**
   * Yearly recurrence pattern processing
   */
  shouldGenerateYearly(recurrenceRule, targetDate) {
    const targetMonth = targetDate.getMonth() + 1; // JavaScript months are 0-indexed
    const targetDay = targetDate.getDate();
    
    // Check month and day
    if (recurrenceRule.month && recurrenceRule.month !== targetMonth) {
      return false;
    }
    
    if (recurrenceRule.dayOfMonth && recurrenceRule.dayOfMonth !== targetDay) {
      return false;
    }
    
    const interval = recurrenceRule.interval || 1;
    if (interval === 1) {
      return true;
    }
    
    const startDate = recurrenceRule.startDate ? new Date(recurrenceRule.startDate) : new Date();
    const yearsDiff = targetDate.getFullYear() - startDate.getFullYear();
    
    return yearsDiff >= 0 && (yearsDiff % interval) === 0;
  }

  /**
   * Custom recurrence pattern processing
   */
  shouldGenerateCustom(recurrenceRule, targetDate) {
    // Custom recurrence allows for complex patterns
    // This could be extended to support cron-like expressions or other custom logic
    
    if (recurrenceRule.customPattern) {
      // Example: Parse custom pattern (could be extended)
      const pattern = recurrenceRule.customPattern;
      
      // Simple custom patterns (can be extended)
      if (pattern.type === 'weekdays') {
        const dayOfWeek = targetDate.getDay();
        return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
      }
      
      if (pattern.type === 'weekends') {
        const dayOfWeek = targetDate.getDay();
        return dayOfWeek === 0 || dayOfWeek === 6; // Saturday and Sunday
      }
      
      if (pattern.type === 'nth_weekday') {
        // e.g., "2nd Tuesday of every month"
        const dayOfWeek = targetDate.getDay();
        const nthWeek = Math.ceil(targetDate.getDate() / 7);
        
        return pattern.dayOfWeek === dayOfWeek && pattern.nthWeek === nthWeek;
      }
    }
    
    return false;
  }

  /**
   * Check if date is within recurrence date range
   */
  isWithinRecurrenceDateRange(recurrenceRule, targetDate) {
    if (recurrenceRule.startDate) {
      const startDate = new Date(recurrenceRule.startDate);
      if (targetDate < startDate) {
        return false;
      }
    }
    
    if (recurrenceRule.endDate) {
      const endDate = new Date(recurrenceRule.endDate);
      if (targetDate > endDate) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Check if within occurrence limits
   */
  isWithinOccurrenceLimits(recurrenceRule, templateId, targetDate) {
    if (!recurrenceRule.endAfterOccurrences) {
      return true; // No occurrence limit
    }
    
    // This would require counting existing instances for the template
    // For now, we'll return true and implement counting logic later if needed
    // In a production system, you'd query the database for instance count
    
    return true;
  }

  /**
   * Get date range as array of date strings
   */
  getDateRangeArray(startDate, endDate) {
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    while (start <= end) {
      dates.push(dataUtils.formatDate(new Date(start)));
      start.setDate(start.getDate() + 1);
    }
    
    return dates;
  }

  /**
   * ========================================================================
   * DEPENDENCY RESOLUTION SYSTEM
   * ========================================================================
   */

  /**
   * Resolve dependencies for all instances on a specific date
   */
  async resolveDependenciesForDate(userId, date, instances = null) {
    try {
      console.log(`🔄 Resolving dependencies for date: ${date}`);
      
      // Get all instances for the date if not provided
      const dateInstances = instances || await this.getByDate(userId, date);
      
      if (dateInstances.length === 0) {
        console.log(`ℹ️ No instances found for ${date}, skipping dependency resolution`);
        return { resolved: 0, conflicts: 0, warnings: [] };
      }
      
      // Build dependency graph
      const dependencyGraph = this.buildDependencyGraph(dateInstances);
      
      // Check for circular dependencies
      const circularDependencies = this.detectCircularDependencies(dependencyGraph);
      if (circularDependencies.length > 0) {
        console.warn(`⚠️ Circular dependencies detected for ${date}:`, circularDependencies);
      }
      
      // Resolve dependency order using topological sort
      const sortedInstances = this.topologicalSort(dateInstances, dependencyGraph);
      
      // Apply dependency constraints and update scheduling
      const resolutionResults = await this.applyDependencyConstraints(sortedInstances, dependencyGraph);
      
      const result = {
        date,
        totalInstances: dateInstances.length,
        resolved: resolutionResults.resolved,
        conflicts: resolutionResults.conflicts,
        warnings: resolutionResults.warnings,
        circularDependencies,
        dependencyOrder: sortedInstances.map(i => ({ id: i.id, name: i.taskName }))
      };
      
      console.log(`✅ Dependency resolution completed for ${date}: ${result.resolved} resolved, ${result.conflicts} conflicts`);
      return result;
      
    } catch (error) {
      console.error('❌ Error resolving dependencies:', error);
      throw error;
    }
  }

  /**
   * Build dependency graph from instances
   */
  buildDependencyGraph(instances) {
    const graph = new Map();
    const instanceMap = new Map();
    
    // Create instance lookup map
    instances.forEach(instance => {
      instanceMap.set(instance.id, instance);
      graph.set(instance.id, {
        instance,
        dependencies: [], // Instances this depends on
        dependents: []    // Instances that depend on this
      });
    });
    
    // Build dependency relationships
    instances.forEach(instance => {
      if (instance.dependsOn && instance.dependsOn.length > 0) {
        const node = graph.get(instance.id);
        
        instance.dependsOn.forEach(dependencyId => {
          if (instanceMap.has(dependencyId)) {
            // Add dependency relationship
            node.dependencies.push(dependencyId);
            
            // Add reverse relationship
            const dependencyNode = graph.get(dependencyId);
            if (dependencyNode) {
              dependencyNode.dependents.push(instance.id);
            }
          } else {
            console.warn(`⚠️ Dependency ${dependencyId} not found for instance ${instance.id}`);
          }
        });
      }
    });
    
    return graph;
  }

  /**
   * Detect circular dependencies using DFS
   */
  detectCircularDependencies(dependencyGraph) {
    const visited = new Set();
    const recursionStack = new Set();
    const circularDependencies = [];
    
    const dfsVisit = (nodeId, path = []) => {
      if (recursionStack.has(nodeId)) {
        // Found a cycle
        const cycleStart = path.indexOf(nodeId);
        const cycle = path.slice(cycleStart).concat(nodeId);
        circularDependencies.push(cycle);
        return;
      }
      
      if (visited.has(nodeId)) {
        return;
      }
      
      visited.add(nodeId);
      recursionStack.add(nodeId);
      
      const node = dependencyGraph.get(nodeId);
      if (node) {
        node.dependencies.forEach(depId => {
          dfsVisit(depId, path.concat(nodeId));
        });
      }
      
      recursionStack.delete(nodeId);
    };
    
    // Visit all nodes
    for (const nodeId of dependencyGraph.keys()) {
      if (!visited.has(nodeId)) {
        dfsVisit(nodeId);
      }
    }
    
    return circularDependencies;
  }

  /**
   * Topological sort to determine dependency order
   */
  topologicalSort(instances, dependencyGraph) {
    const sorted = [];
    const visited = new Set();
    const temp = new Set();
    
    const visit = (nodeId) => {
      if (temp.has(nodeId)) {
        // Circular dependency - return early to avoid infinite recursion
        return;
      }
      
      if (visited.has(nodeId)) {
        return;
      }
      
      temp.add(nodeId);
      
      const node = dependencyGraph.get(nodeId);
      if (node) {
        // Visit all dependencies first
        node.dependencies.forEach(depId => {
          visit(depId);
        });
      }
      
      temp.delete(nodeId);
      visited.add(nodeId);
      
      // Add to sorted list (dependencies come first)
      const instance = instances.find(i => i.id === nodeId);
      if (instance) {
        sorted.unshift(instance);
      }
    };
    
    // Visit all instances
    instances.forEach(instance => {
      visit(instance.id);
    });
    
    return sorted;
  }

  /**
   * Apply dependency constraints to instances
   */
  async applyDependencyConstraints(sortedInstances, dependencyGraph) {
    let resolved = 0;
    let conflicts = 0;
    const warnings = [];
    
    for (const instance of sortedInstances) {
      try {
        const node = dependencyGraph.get(instance.id);
        
        if (node && node.dependencies.length > 0) {
          // Check if all dependencies are satisfied
          const dependencyResults = this.checkDependencyConstraints(instance, node, dependencyGraph);
          
          if (dependencyResults.canSchedule) {
            // Apply dependency-based scheduling adjustments
            const schedulingUpdate = this.calculateDependencyScheduling(instance, dependencyResults);
            
            if (schedulingUpdate.needsUpdate) {
              await this.update(instance.id, schedulingUpdate.updates, 'Dependency constraint applied');
              resolved++;
            }
          } else {
            conflicts++;
            warnings.push({
              instanceId: instance.id,
              instanceName: instance.taskName,
              issue: 'dependency_conflict',
              details: dependencyResults.conflictReason
            });
          }
        } else {
          // No dependencies, mark as resolved
          resolved++;
        }
        
      } catch (error) {
        conflicts++;
        warnings.push({
          instanceId: instance.id,
          instanceName: instance.taskName,
          issue: 'resolution_error',
          details: error.message
        });
      }
    }
    
    return { resolved, conflicts, warnings };
  }

  /**
   * Check dependency constraints for an instance
   */
  checkDependencyConstraints(instance, node, dependencyGraph) {
    const result = {
      canSchedule: true,
      conflictReason: null,
      dependencyInfo: []
    };
    
    for (const depId of node.dependencies) {
      const depNode = dependencyGraph.get(depId);
      if (!depNode) {
        result.canSchedule = false;
        result.conflictReason = `Dependency ${depId} not found`;
        break;
      }
      
      const depInstance = depNode.instance;
      
      // Check dependency status
      if (depInstance.status === 'skipped') {
        result.canSchedule = false;
        result.conflictReason = `Dependency "${depInstance.taskName}" was skipped`;
        break;
      }
      
      // Check dependency completion requirement
      if (instance.isMandatory && depInstance.status !== 'completed') {
        // For mandatory tasks, dependencies must be completed
        result.canSchedule = false;
        result.conflictReason = `Mandatory task requires completed dependency "${depInstance.taskName}"`;
        break;
      }
      
      result.dependencyInfo.push({
        id: depId,
        name: depInstance.taskName,
        status: depInstance.status,
        scheduledTime: depInstance.scheduledTime
      });
    }
    
    return result;
  }

  /**
   * Calculate dependency-based scheduling adjustments
   */
  calculateDependencyScheduling(instance, dependencyResults) {
    const updates = {};
    let needsUpdate = false;
    
    // Find the latest dependency end time
    let latestEndTime = null;
    
    for (const dep of dependencyResults.dependencyInfo) {
      if (dep.scheduledTime) {
        const depStartTime = new Date(`${instance.date}T${dep.scheduledTime}`);
        const depEndTime = new Date(depStartTime.getTime() + (dep.durationMinutes || 30) * 60000);
        
        if (!latestEndTime || depEndTime > latestEndTime) {
          latestEndTime = depEndTime;
        }
      }
    }
    
    // Adjust scheduling if needed
    if (latestEndTime && instance.schedulingType === 'flexible') {
      const suggestedStartTime = new Date(latestEndTime.getTime() + 5 * 60000); // 5-minute buffer
      const suggestedTimeString = suggestedStartTime.toTimeString().slice(0, 5);
      
      // Only update if current scheduled time is earlier than suggested time
      if (!instance.scheduledTime || instance.scheduledTime < suggestedTimeString) {
        updates.scheduledTime = suggestedTimeString;
        updates.modificationReason = 'Adjusted for dependency constraints';
        needsUpdate = true;
      }
    }
    
    return { needsUpdate, updates };
  }

  /**
   * ========================================================================
   * CONFLICT DETECTION AND RESOLUTION SYSTEM
   * ========================================================================
   */

  /**
   * Detect and resolve scheduling conflicts for instances on a date
   */
  async detectAndResolveConflicts(instances, date) {
    try {
      console.log(`🔄 Detecting and resolving conflicts for ${date}`);
      
      if (!instances || instances.length === 0) {
        return { totalConflicts: 0, resolved: 0, unresolved: 0, conflicts: [] };
      }
      
      // Detect different types of conflicts
      const timeConflicts = this.detectTimeConflicts(instances);
      const resourceConflicts = this.detectResourceConflicts(instances);
      const capacityConflicts = this.detectCapacityConflicts(instances, date);
      
      const allConflicts = [
        ...timeConflicts.map(c => ({ ...c, type: 'time_overlap' })),
        ...resourceConflicts.map(c => ({ ...c, type: 'resource_conflict' })),
        ...capacityConflicts.map(c => ({ ...c, type: 'capacity_exceeded' }))
      ];
      
      // Attempt to resolve conflicts
      const resolutionResults = await this.resolveConflicts(allConflicts, instances, date);
      
      const result = {
        date,
        totalInstances: instances.length,
        totalConflicts: allConflicts.length,
        resolved: resolutionResults.resolved,
        unresolved: resolutionResults.unresolved,
        conflicts: allConflicts,
        resolutions: resolutionResults.resolutions
      };
      
      console.log(`✅ Conflict resolution completed for ${date}: ${result.resolved} resolved, ${result.unresolved} unresolved`);
      return result;
      
    } catch (error) {
      console.error('❌ Error in conflict detection and resolution:', error);
      throw error;
    }
  }

  /**
   * Detect time overlap conflicts
   */
  detectTimeConflicts(instances) {
    const conflicts = [];
    const scheduledInstances = instances.filter(i => 
      i.scheduledTime && i.durationMinutes && i.status === 'pending'
    );
    
    for (let i = 0; i < scheduledInstances.length; i++) {
      const instance1 = scheduledInstances[i];
      const start1 = this.parseTimeToMinutes(instance1.scheduledTime);
      const end1 = start1 + (instance1.durationMinutes || 30);
      
      for (let j = i + 1; j < scheduledInstances.length; j++) {
        const instance2 = scheduledInstances[j];
        const start2 = this.parseTimeToMinutes(instance2.scheduledTime);
        const end2 = start2 + (instance2.durationMinutes || 30);
        
        // Check for overlap
        if ((start1 < end2) && (end1 > start2)) {
          conflicts.push({
            conflictId: `time_${instance1.id}_${instance2.id}`,
            instances: [instance1, instance2],
            severity: this.calculateConflictSeverity(instance1, instance2),
            details: {
              overlap: {
                start: Math.max(start1, start2),
                end: Math.min(end1, end2),
                duration: Math.min(end1, end2) - Math.max(start1, start2)
              }
            }
          });
        }
      }
    }
    
    return conflicts;
  }

  /**
   * Detect resource conflicts (conceptual - could be extended)
   */
  detectResourceConflicts(instances) {
    // This is a placeholder for resource conflict detection
    // Could be extended to detect conflicts based on:
    // - Required equipment/tools
    // - Location constraints
    // - Energy/focus requirements
    
    return []; // No resource conflicts detected in basic implementation
  }

  /**
   * Detect daily capacity conflicts
   */
  detectCapacityConflicts(instances, date) {
    const conflicts = [];
    const activeInstances = instances.filter(i => i.status === 'pending');
    
    // Calculate total scheduled time
    const totalScheduledMinutes = activeInstances.reduce((total, instance) => {
      return total + (instance.durationMinutes || 30);
    }, 0);
    
    // Assume reasonable daily capacity (could be configurable)
    const dailyCapacityMinutes = 14 * 60; // 14 hours
    
    if (totalScheduledMinutes > dailyCapacityMinutes) {
      conflicts.push({
        conflictId: `capacity_${date}`,
        instances: activeInstances,
        severity: 'high',
        details: {
          totalScheduled: totalScheduledMinutes,
          dailyCapacity: dailyCapacityMinutes,
          excess: totalScheduledMinutes - dailyCapacityMinutes
        }
      });
    }
    
    return conflicts;
  }

  /**
   * Calculate conflict severity
   */
  calculateConflictSeverity(instance1, instance2) {
    // Higher severity for mandatory tasks
    if (instance1.isMandatory && instance2.isMandatory) {
      return 'critical';
    }
    
    if (instance1.isMandatory || instance2.isMandatory) {
      return 'high';
    }
    
    // Higher severity for higher priority tasks
    const avgPriority = ((instance1.priority || 3) + (instance2.priority || 3)) / 2;
    if (avgPriority >= 4) {
      return 'high';
    } else if (avgPriority >= 3) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Resolve detected conflicts
   */
  async resolveConflicts(conflicts, instances, date) {
    let resolved = 0;
    let unresolved = 0;
    const resolutions = [];
    
    // Sort conflicts by severity (critical first)
    const sortedConflicts = conflicts.sort((a, b) => {
      const severityOrder = { 'critical': 3, 'high': 2, 'medium': 1, 'low': 0 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
    
    for (const conflict of sortedConflicts) {
      try {
        const resolution = await this.resolveConflict(conflict, instances, date);
        
        if (resolution.resolved) {
          resolved++;
          resolutions.push(resolution);
        } else {
          unresolved++;
        }
        
      } catch (error) {
        console.error('❌ Error resolving conflict:', error);
        unresolved++;
      }
    }
    
    return { resolved, unresolved, resolutions };
  }

  /**
   * Resolve individual conflict
   */
  async resolveConflict(conflict, instances, date) {
    const resolution = {
      conflictId: conflict.conflictId,
      type: conflict.type,
      resolved: false,
      strategy: null,
      changes: []
    };
    
    switch (conflict.type) {
      case 'time_overlap':
        return await this.resolveTimeOverlapConflict(conflict, resolution);
        
      case 'capacity_exceeded':
        return await this.resolveCapacityConflict(conflict, resolution);
        
      case 'resource_conflict':
        return await this.resolveResourceConflict(conflict, resolution);
        
      default:
        console.warn(`Unknown conflict type: ${conflict.type}`);
        return resolution;
    }
  }

  /**
   * Resolve time overlap conflicts
   */
  async resolveTimeOverlapConflict(conflict, resolution) {
    const [instance1, instance2] = conflict.instances;
    
    // Strategy 1: Reschedule flexible task
    if (instance1.schedulingType === 'flexible' && instance2.schedulingType === 'fixed') {
      const newTime = this.findAlternativeTime(instance1, conflict.instances);
      if (newTime) {
        await this.update(instance1.id, { 
          scheduledTime: newTime,
          modificationReason: 'Resolved scheduling conflict'
        });
        resolution.resolved = true;
        resolution.strategy = 'reschedule_flexible';
        resolution.changes.push({
          instanceId: instance1.id,
          field: 'scheduledTime',
          newValue: newTime
        });
      }
    } else if (instance2.schedulingType === 'flexible' && instance1.schedulingType === 'fixed') {
      const newTime = this.findAlternativeTime(instance2, conflict.instances);
      if (newTime) {
        await this.update(instance2.id, { 
          scheduledTime: newTime,
          modificationReason: 'Resolved scheduling conflict'
        });
        resolution.resolved = true;
        resolution.strategy = 'reschedule_flexible';
        resolution.changes.push({
          instanceId: instance2.id,
          field: 'scheduledTime',
          newValue: newTime
        });
      }
    }
    
    // Strategy 2: Priority-based rescheduling
    if (!resolution.resolved && instance1.priority !== instance2.priority) {
      const lowerPriorityInstance = instance1.priority < instance2.priority ? instance1 : instance2;
      const newTime = this.findAlternativeTime(lowerPriorityInstance, conflict.instances);
      
      if (newTime) {
        await this.update(lowerPriorityInstance.id, { 
          scheduledTime: newTime,
          modificationReason: 'Resolved conflict by priority'
        });
        resolution.resolved = true;
        resolution.strategy = 'priority_based';
        resolution.changes.push({
          instanceId: lowerPriorityInstance.id,
          field: 'scheduledTime',
          newValue: newTime
        });
      }
    }
    
    return resolution;
  }

  /**
   * Resolve capacity conflicts
   */
  async resolveCapacityConflict(conflict, resolution) {
    // Strategy: Mark lowest priority, non-mandatory tasks as postponed
    const instances = conflict.instances
      .filter(i => !i.isMandatory)
      .sort((a, b) => (a.priority || 3) - (b.priority || 3)); // Lowest priority first
    
    const excessMinutes = conflict.details.excess;
    let reducedMinutes = 0;
    
    for (const instance of instances) {
      if (reducedMinutes >= excessMinutes) break;
      
      await this.update(instance.id, { 
        status: 'postponed',
        modificationReason: 'Postponed due to daily capacity limits'
      });
      
      reducedMinutes += instance.durationMinutes || 30;
      resolution.changes.push({
        instanceId: instance.id,
        field: 'status',
        newValue: 'postponed'
      });
    }
    
    if (reducedMinutes >= excessMinutes) {
      resolution.resolved = true;
      resolution.strategy = 'postpone_low_priority';
    }
    
    return resolution;
  }

  /**
   * Resolve resource conflicts (placeholder)
   */
  async resolveResourceConflict(conflict, resolution) {
    // Placeholder for resource conflict resolution
    // Could implement strategies like:
    // - Equipment sharing/scheduling
    // - Location-based rescheduling
    // - Resource substitution
    
    return resolution;
  }

  /**
   * Find alternative scheduling time for an instance
   */
  findAlternativeTime(instance, conflictingInstances) {
    const timeWindow = instance.timeWindow || 'anytime';
    const duration = instance.durationMinutes || 30;
    
    // Define time windows
    const windows = {
      'morning': { start: 6 * 60, end: 12 * 60 },      // 6:00 - 12:00
      'afternoon': { start: 12 * 60, end: 18 * 60 },   // 12:00 - 18:00
      'evening': { start: 18 * 60, end: 22 * 60 },     // 18:00 - 22:00
      'anytime': { start: 6 * 60, end: 22 * 60 }       // 6:00 - 22:00
    };
    
    const window = windows[timeWindow] || windows.anytime;
    
    // Try to find a free slot
    for (let startTime = window.start; startTime <= window.end - duration; startTime += 15) {
      const endTime = startTime + duration;
      
      // Check if this time conflicts with any existing instances
      const hasConflict = conflictingInstances.some(conflictInstance => {
        if (!conflictInstance.scheduledTime) return false;
        
        const conflictStart = this.parseTimeToMinutes(conflictInstance.scheduledTime);
        const conflictEnd = conflictStart + (conflictInstance.durationMinutes || 30);
        
        return (startTime < conflictEnd) && (endTime > conflictStart);
      });
      
      if (!hasConflict) {
        return this.minutesToTimeString(startTime);
      }
    }
    
    return null; // No alternative time found
  }

  /**
   * Parse time string (HH:MM) to minutes since midnight
   */
  parseTimeToMinutes(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Convert minutes since midnight to time string (HH:MM)
   */
  minutesToTimeString(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * ========================================================================
   * INSTANCE SCHEDULING OPTIMIZATION SYSTEM
   * ========================================================================
   */

  /**
   * Optimize instance scheduling for a date to maximize efficiency and satisfaction
   */
  async optimizeSchedulingForDate(userId, date, optimizationOptions = {}) {
    try {
      console.log(`🔄 Optimizing instance scheduling for ${date}`);
      
      const {
        prioritizeEnergy = true,
        respectTimeWindows = true,
        minimizeGaps = true,
        optimizeTransitions = true,
        considerDependencies = true
      } = optimizationOptions;
      
      // Get all instances for the date
      const instances = await this.getByDate(userId, date);
      
      if (instances.length === 0) {
        console.log(`ℹ️ No instances found for ${date}, skipping optimization`);
        return { optimized: 0, improvements: [] };
      }
      
      // Apply different optimization strategies
      const optimizations = [];
      
      if (prioritizeEnergy) {
        const energyOptimization = await this.optimizeEnergyLevels(instances, date);
        optimizations.push(...energyOptimization);
      }
      
      if (respectTimeWindows) {
        const windowOptimization = await this.optimizeTimeWindows(instances, date);
        optimizations.push(...windowOptimization);
      }
      
      if (minimizeGaps) {
        const gapOptimization = await this.minimizeSchedulingGaps(instances, date);
        optimizations.push(...gapOptimization);
      }
      
      if (optimizeTransitions) {
        const transitionOptimization = await this.optimizeTaskTransitions(instances, date);
        optimizations.push(...transitionOptimization);
      }
      
      if (considerDependencies) {
        const dependencyOptimization = await this.optimizeDependencySequencing(instances, date);
        optimizations.push(...dependencyOptimization);
      }
      
      // Apply optimizations
      let appliedCount = 0;
      const improvements = [];
      
      for (const optimization of optimizations) {
        try {
          await this.update(optimization.instanceId, optimization.updates, optimization.reason);
          appliedCount++;
          improvements.push(optimization);
          console.log(`✅ Applied optimization: ${optimization.strategy} for ${optimization.instanceName}`);
        } catch (error) {
          console.warn(`⚠️ Failed to apply optimization for ${optimization.instanceName}:`, error);
        }
      }
      
      const result = {
        date,
        totalInstances: instances.length,
        optimized: appliedCount,
        improvements,
        strategies: optimizationOptions
      };
      
      console.log(`✅ Scheduling optimization completed for ${date}: ${appliedCount} optimizations applied`);
      return result;
      
    } catch (error) {
      console.error('❌ Error optimizing instance scheduling:', error);
      throw error;
    }
  }

  /**
   * Optimize based on energy levels throughout the day
   */
  async optimizeEnergyLevels(instances, date) {
    const optimizations = [];
    
    // Define energy curve throughout the day (0-100 scale)
    const energyCurve = {
      6: 60,   // 6:00 AM - Morning startup
      8: 85,   // 8:00 AM - Morning peak
      10: 90,  // 10:00 AM - Peak focus
      12: 75,  // 12:00 PM - Pre-lunch dip
      14: 65,  // 2:00 PM - Post-lunch low
      16: 80,  // 4:00 PM - Afternoon recovery
      18: 70,  // 6:00 PM - Evening decline
      20: 50,  // 8:00 PM - Evening low
      22: 30   // 10:00 PM - End of day
    };
    
    for (const instance of instances) {
      if (instance.schedulingType !== 'flexible' || !instance.scheduledTime) {
        continue; // Skip fixed tasks or unscheduled tasks
      }
      
      const currentHour = Math.floor(this.parseTimeToMinutes(instance.scheduledTime) / 60);
      const currentEnergy = this.getEnergyAtHour(energyCurve, currentHour);
      
      // Find better energy slots for high-priority or demanding tasks
      if (instance.priority >= 4 || (instance.durationMinutes && instance.durationMinutes > 60)) {
        const optimalHour = this.findOptimalEnergySlot(energyCurve, instance.durationMinutes || 30);
        
        if (optimalHour && optimalHour !== currentHour) {
          const newTime = `${optimalHour.toString().padStart(2, '0')}:00`;
          
          optimizations.push({
            instanceId: instance.id,
            instanceName: instance.taskName,
            strategy: 'energy_optimization',
            updates: { scheduledTime: newTime },
            reason: `Moved to optimal energy time (${currentEnergy}% → ${this.getEnergyAtHour(energyCurve, optimalHour)}%)`,
            improvement: {
              from: { time: instance.scheduledTime, energy: currentEnergy },
              to: { time: newTime, energy: this.getEnergyAtHour(energyCurve, optimalHour) }
            }
          });
        }
      }
    }
    
    return optimizations;
  }

  /**
   * Optimize time window compliance
   */
  async optimizeTimeWindows(instances, date) {
    const optimizations = [];
    
    const timeWindows = {
      'morning': { start: 6, end: 12 },
      'afternoon': { start: 12, end: 18 },
      'evening': { start: 18, end: 22 },
      'anytime': { start: 6, end: 22 }
    };
    
    for (const instance of instances) {
      if (!instance.scheduledTime || !instance.timeWindow) {
        continue;
      }
      
      const window = timeWindows[instance.timeWindow];
      if (!window) continue;
      
      const scheduledHour = Math.floor(this.parseTimeToMinutes(instance.scheduledTime) / 60);
      
      // Check if task is outside its preferred time window
      if (scheduledHour < window.start || scheduledHour >= window.end) {
        // Find a better time within the window
        const optimalTime = this.findTimeWithinWindow(window, instance.durationMinutes || 30, instances);
        
        if (optimalTime) {
          optimizations.push({
            instanceId: instance.id,
            instanceName: instance.taskName,
            strategy: 'time_window_optimization',
            updates: { scheduledTime: optimalTime },
            reason: `Moved to preferred ${instance.timeWindow} time window`,
            improvement: {
              from: { time: instance.scheduledTime, inWindow: false },
              to: { time: optimalTime, inWindow: true }
            }
          });
        }
      }
    }
    
    return optimizations;
  }

  /**
   * Minimize gaps between scheduled tasks
   */
  async minimizeSchedulingGaps(instances, date) {
    const optimizations = [];
    
    // Sort instances by scheduled time
    const scheduledInstances = instances
      .filter(i => i.scheduledTime && i.status === 'pending')
      .sort((a, b) => this.parseTimeToMinutes(a.scheduledTime) - this.parseTimeToMinutes(b.scheduledTime));
    
    if (scheduledInstances.length < 2) {
      return optimizations; // Need at least 2 tasks to optimize gaps
    }
    
    // Find large gaps and suggest optimizations
    for (let i = 0; i < scheduledInstances.length - 1; i++) {
      const currentTask = scheduledInstances[i];
      const nextTask = scheduledInstances[i + 1];
      
      const currentEnd = this.parseTimeToMinutes(currentTask.scheduledTime) + (currentTask.durationMinutes || 30);
      const nextStart = this.parseTimeToMinutes(nextTask.scheduledTime);
      const gap = nextStart - currentEnd;
      
      // If gap is longer than 60 minutes and both tasks are flexible, try to close the gap
      if (gap > 60 && nextTask.schedulingType === 'flexible') {
        const newStartTime = this.minutesToTimeString(currentEnd + 15); // 15-minute buffer
        
        // Check if the new time still respects the task's time window
        if (this.isTimeWithinWindow(newStartTime, nextTask.timeWindow)) {
          optimizations.push({
            instanceId: nextTask.id,
            instanceName: nextTask.taskName,
            strategy: 'gap_minimization',
            updates: { scheduledTime: newStartTime },
            reason: `Reduced ${gap}-minute gap to improve schedule flow`,
            improvement: {
              from: { gap: gap },
              to: { gap: 15 }
            }
          });
        }
      }
    }
    
    return optimizations;
  }

  /**
   * Optimize task transitions for better flow
   */
  async optimizeTaskTransitions(instances, date) {
    const optimizations = [];
    
    // Define task categories for better transitions
    const taskCategories = {
      'focus': ['work', 'study', 'planning', 'analysis'],
      'physical': ['exercise', 'cleaning', 'errands', 'maintenance'],
      'creative': ['design', 'writing', 'art', 'music'],
      'social': ['meeting', 'call', 'social', 'family'],
      'admin': ['email', 'paperwork', 'organization', 'finance']
    };
    
    // Sort instances by scheduled time
    const scheduledInstances = instances
      .filter(i => i.scheduledTime && i.status === 'pending')
      .sort((a, b) => this.parseTimeToMinutes(a.scheduledTime) - this.parseTimeToMinutes(b.scheduledTime));
    
    // Analyze transitions and suggest improvements
    for (let i = 0; i < scheduledInstances.length - 1; i++) {
      const currentTask = scheduledInstances[i];
      const nextTask = scheduledInstances[i + 1];
      
      if (nextTask.schedulingType !== 'flexible') continue;
      
      const currentCategory = this.categorizeTask(currentTask, taskCategories);
      const nextCategory = this.categorizeTask(nextTask, taskCategories);
      
      // Check for difficult transitions (e.g., physical to focus)
      if (this.isDifficultTransition(currentCategory, nextCategory)) {
        // Add buffer time for difficult transitions
        const currentEnd = this.parseTimeToMinutes(currentTask.scheduledTime) + (currentTask.durationMinutes || 30);
        const buffer = this.getTransitionBuffer(currentCategory, nextCategory);
        const suggestedStart = this.minutesToTimeString(currentEnd + buffer);
        
        if (this.isTimeWithinWindow(suggestedStart, nextTask.timeWindow)) {
          optimizations.push({
            instanceId: nextTask.id,
            instanceName: nextTask.taskName,
            strategy: 'transition_optimization',
            updates: { scheduledTime: suggestedStart },
            reason: `Added ${buffer}-minute buffer for ${currentCategory} → ${nextCategory} transition`,
            improvement: {
              from: { transition: `${currentCategory} → ${nextCategory}`, buffer: 0 },
              to: { transition: `${currentCategory} → ${nextCategory}`, buffer: buffer }
            }
          });
        }
      }
    }
    
    return optimizations;
  }

  /**
   * Optimize dependency sequencing
   */
  async optimizeDependencySequencing(instances, date) {
    const optimizations = [];
    
    // Build dependency graph
    const dependencyGraph = this.buildDependencyGraph(instances);
    
    // Check if dependencies can be better sequenced
    for (const instance of instances) {
      if (!instance.dependsOn || instance.dependsOn.length === 0) continue;
      
      const node = dependencyGraph.get(instance.id);
      if (!node) continue;
      
      // Find the optimal start time based on dependencies
      let latestDependencyEnd = 0;
      
      for (const depId of node.dependencies) {
        const depNode = dependencyGraph.get(depId);
        if (depNode && depNode.instance.scheduledTime) {
          const depStart = this.parseTimeToMinutes(depNode.instance.scheduledTime);
          const depEnd = depStart + (depNode.instance.durationMinutes || 30);
          latestDependencyEnd = Math.max(latestDependencyEnd, depEnd);
        }
      }
      
      if (latestDependencyEnd > 0 && instance.schedulingType === 'flexible') {
        const optimalStart = this.minutesToTimeString(latestDependencyEnd + 10); // 10-minute buffer
        const currentStart = this.parseTimeToMinutes(instance.scheduledTime || '09:00');
        
        // Only suggest optimization if current timing doesn't respect dependencies
        if (currentStart < latestDependencyEnd) {
          optimizations.push({
            instanceId: instance.id,
            instanceName: instance.taskName,
            strategy: 'dependency_sequencing',
            updates: { scheduledTime: optimalStart },
            reason: 'Optimized start time to respect dependency completion',
            improvement: {
              from: { dependencyRespected: false },
              to: { dependencyRespected: true }
            }
          });
        }
      }
    }
    
    return optimizations;
  }

  /**
   * Helper methods for optimization
   */
  getEnergyAtHour(energyCurve, hour) {
    // Find closest hour in energy curve
    const hours = Object.keys(energyCurve).map(Number).sort((a, b) => a - b);
    
    for (let i = 0; i < hours.length; i++) {
      if (hour <= hours[i]) {
        return energyCurve[hours[i]];
      }
    }
    
    return energyCurve[hours[hours.length - 1]]; // Return last value if hour is beyond range
  }

  findOptimalEnergySlot(energyCurve, duration) {
    let bestHour = null;
    let bestEnergy = 0;
    
    for (const [hour, energy] of Object.entries(energyCurve)) {
      if (energy > bestEnergy && this.canFitTaskAtHour(parseInt(hour), duration)) {
        bestHour = parseInt(hour);
        bestEnergy = energy;
      }
    }
    
    return bestHour;
  }

  canFitTaskAtHour(hour, duration) {
    // Basic check - tasks should fit within reasonable hours
    const endHour = hour + Math.ceil(duration / 60);
    return hour >= 6 && endHour <= 22;
  }

  findTimeWithinWindow(window, duration, existingInstances) {
    for (let hour = window.start; hour < window.end; hour++) {
      const timeString = `${hour.toString().padStart(2, '0')}:00`;
      
      // Check if this slot conflicts with existing instances
      const hasConflict = existingInstances.some(instance => {
        if (!instance.scheduledTime) return false;
        const instanceStart = this.parseTimeToMinutes(instance.scheduledTime);
        const instanceEnd = instanceStart + (instance.durationMinutes || 30);
        const slotStart = hour * 60;
        const slotEnd = slotStart + duration;
        
        return (slotStart < instanceEnd) && (slotEnd > instanceStart);
      });
      
      if (!hasConflict) {
        return timeString;
      }
    }
    
    return null;
  }

  isTimeWithinWindow(timeString, timeWindow) {
    if (!timeWindow || timeWindow === 'anytime') return true;
    
    const windows = {
      'morning': { start: 6, end: 12 },
      'afternoon': { start: 12, end: 18 },
      'evening': { start: 18, end: 22 }
    };
    
    const window = windows[timeWindow];
    if (!window) return true;
    
    const hour = Math.floor(this.parseTimeToMinutes(timeString) / 60);
    return hour >= window.start && hour < window.end;
  }

  categorizeTask(task, categories) {
    const taskName = task.taskName.toLowerCase();
    const description = (task.description || '').toLowerCase();
    const combined = `${taskName} ${description}`;
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => combined.includes(keyword))) {
        return category;
      }
    }
    
    return 'general'; // Default category
  }

  isDifficultTransition(fromCategory, toCategory) {
    // Define difficult transitions (e.g., physical to focus)
    const difficultTransitions = {
      'physical': ['focus', 'creative'],
      'social': ['focus', 'creative'],
      'admin': ['creative']
    };
    
    return difficultTransitions[fromCategory]?.includes(toCategory) || false;
  }

  getTransitionBuffer(fromCategory, toCategory) {
    // Define buffer times for different transitions (in minutes)
    const bufferTimes = {
      'physical->focus': 20,
      'physical->creative': 25,
      'social->focus': 15,
      'social->creative': 15,
      'admin->creative': 10
    };
    
    const key = `${fromCategory}->${toCategory}`;
    return bufferTimes[key] || 10; // Default 10-minute buffer
  }
}

// TaskInstanceManager singleton is exported below after class definition
export const taskInstanceManager = new TaskInstanceManager();

console.log('✅ Task logic and scheduling engine initialized');