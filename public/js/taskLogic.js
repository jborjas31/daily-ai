/**
 * Task Logic and Scheduling Engine
 * 
 * This module contains the core "Secret Sauce" intelligent scheduling logic
 * and all task-related business logic operations.
 */

import { state } from './state.js';
import { taskTemplates, taskInstances, dataUtils } from './data.js';
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
 * Task Instance Management
 */
export const taskInstanceManager = {
  /**
   * Complete task for specific date
   */
  async completeTask(templateId, date) {
    try {
      const instanceData = {
        templateId,
        date,
        status: 'completed',
        completedAt: new Date().toISOString()
      };
      
      const instance = await taskInstances.create(instanceData);
      
      // Update application state
      state.updateTaskInstance(instance);
      
      console.log('✅ Task completed:', templateId, 'for', date);
      return instance;
    } catch (error) {
      console.error('❌ Error completing task:', error);
      throw error;
    }
  },

  /**
   * Skip task for specific date
   */
  async skipTask(templateId, date, reason = null) {
    try {
      const instanceData = {
        templateId,
        date,
        status: 'skipped',
        skippedReason: reason
      };
      
      const instance = await taskInstances.create(instanceData);
      
      // Update application state
      state.updateTaskInstance(instance);
      
      console.log('✅ Task skipped:', templateId, 'for', date);
      return instance;
    } catch (error) {
      console.error('❌ Error skipping task:', error);
      throw error;
    }
  },

  /**
   * Postpone task to next day
   */
  async postponeTask(templateId, currentDate) {
    try {
      // Skip for current date
      await this.skipTask(templateId, currentDate, 'Postponed to next day');
      
      // Note: The task will naturally appear on the next day unless there's another instance
      console.log('✅ Task postponed:', templateId, 'from', currentDate);
    } catch (error) {
      console.error('❌ Error postponing task:', error);
      throw error;
    }
  },

  /**
   * Toggle task completion status
   */
  async toggleTaskCompletion(templateId, date) {
    try {
      const currentInstances = state.getTaskInstancesForDate(date);
      const existingInstance = currentInstances.find(instance => 
        instance.templateId === templateId
      );
      
      if (existingInstance) {
        if (existingInstance.status === 'completed') {
          // Mark as incomplete by updating status
          await taskInstances.update(existingInstance.id, {
            status: 'incomplete',
            completedAt: null
          });
          console.log('✅ Task marked incomplete');
        } else {
          // Mark as complete
          await taskInstances.update(existingInstance.id, {
            status: 'completed',
            completedAt: new Date().toISOString()
          });
          console.log('✅ Task marked complete');
        }
      } else {
        // Create new completed instance
        await this.completeTask(templateId, date);
      }
      
      // Reload task instances for the date to refresh state
      const instances = await taskInstances.getForDate(date);
      state.setTaskInstancesForDate(date, instances);
      
    } catch (error) {
      console.error('❌ Error toggling task completion:', error);
      throw error;
    }
  }
};

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

console.log('✅ Task logic and scheduling engine initialized');