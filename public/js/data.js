/**
 * Data Service Module
 * Handles all Firestore CRUD operations and data structure management
 */

import { auth, db } from './firebase.js';

/**
 * Get current user ID
 */
function getCurrentUserId() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No authenticated user');
  }
  return user.uid;
}

/**
 * User Settings Operations
 */
export const userSettings = {
  // Get user settings (with defaults)
  async get() {
    try {
      const userId = getCurrentUserId();
      const userDoc = await db.collection('users').doc(userId).get();
      
      if (userDoc.exists) {
        return userDoc.data();
      } else {
        // Return default settings if user document doesn't exist
        return {
          desiredSleepDuration: 7.5,
          defaultWakeTime: "06:30",
          defaultSleepTime: "23:00"
        };
      }
    } catch (error) {
      console.error('Error getting user settings:', error);
      throw error;
    }
  },

  // Save user settings
  async save(settings) {
    try {
      const userId = getCurrentUserId();
      await db.collection('users').doc(userId).set(settings, { merge: true });
      console.log('✅ User settings saved');
      return settings;
    } catch (error) {
      console.error('❌ Error saving user settings:', error);
      throw error;
    }
  },

  // Initialize default settings for new user
  async initialize() {
    try {
      const userId = getCurrentUserId();
      const userDoc = await db.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        const defaultSettings = {
          desiredSleepDuration: 7.5,
          defaultWakeTime: "06:30",
          defaultSleepTime: "23:00",
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        };
        
        await db.collection('users').doc(userId).set(defaultSettings);
        console.log('✅ Default user settings initialized');
        return defaultSettings;
      }
      
      return userDoc.data();
    } catch (error) {
      console.error('❌ Error initializing user settings:', error);
      throw error;
    }
  }
};

/**
 * Task Template Operations
 */
export const taskTemplates = {
  // Get all active task templates for user
  async getAll() {
    try {
      const userId = getCurrentUserId();
      const snapshot = await db
        .collection('users')
        .doc(userId)
        .collection('tasks')
        .where('isActive', '==', true)
        .orderBy('priority', 'desc')
        .orderBy('taskName')
        .get();
      
      const tasks = [];
      snapshot.forEach(doc => {
        tasks.push({ id: doc.id, ...doc.data() });
      });
      
      console.log(`✅ Retrieved ${tasks.length} task templates`);
      return tasks;
    } catch (error) {
      console.error('❌ Error getting task templates:', error);
      throw error;
    }
  },

  // Get single task template
  async get(taskId) {
    try {
      const userId = getCurrentUserId();
      const doc = await db
        .collection('users')
        .doc(userId)
        .collection('tasks')
        .doc(taskId)
        .get();
      
      if (doc.exists) {
        return { id: doc.id, ...doc.data() };
      } else {
        throw new Error('Task template not found');
      }
    } catch (error) {
      console.error('❌ Error getting task template:', error);
      throw error;
    }
  },

  // Create new task template
  async create(taskData) {
    try {
      const userId = getCurrentUserId();
      
      // Set default values
      const task = {
        taskName: taskData.taskName || '',
        description: taskData.description || '',
        isMandatory: taskData.isMandatory || false,
        priority: taskData.priority || 3,
        isActive: true,
        durationMinutes: taskData.durationMinutes || 30,
        minDurationMinutes: taskData.minDurationMinutes || taskData.durationMinutes || 15,
        schedulingType: taskData.schedulingType || 'flexible',
        defaultTime: taskData.defaultTime || null,
        timeWindow: taskData.timeWindow || 'anytime',
        dependsOn: taskData.dependsOn || null,
        recurrenceRule: taskData.recurrenceRule || {
          frequency: 'none',
          interval: 1,
          endDate: null,
          endAfterOccurrences: null,
          daysOfWeek: []
        },
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
      
      const docRef = await db
        .collection('users')
        .doc(userId)
        .collection('tasks')
        .add(task);
      
      console.log('✅ Task template created:', docRef.id);
      return { id: docRef.id, ...task };
    } catch (error) {
      console.error('❌ Error creating task template:', error);
      throw error;
    }
  },

  // Update task template
  async update(taskId, updates) {
    try {
      const userId = getCurrentUserId();
      
      const updateData = {
        ...updates,
        lastUpdated: new Date().toISOString()
      };
      
      await db
        .collection('users')
        .doc(userId)
        .collection('tasks')
        .doc(taskId)
        .update(updateData);
      
      console.log('✅ Task template updated:', taskId);
      return { id: taskId, ...updateData };
    } catch (error) {
      console.error('❌ Error updating task template:', error);
      throw error;
    }
  },

  // Soft delete task template
  async delete(taskId) {
    try {
      const userId = getCurrentUserId();
      
      await db
        .collection('users')
        .doc(userId)
        .collection('tasks')
        .doc(taskId)
        .update({
          isActive: false,
          deletedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        });
      
      console.log('✅ Task template soft deleted:', taskId);
    } catch (error) {
      console.error('❌ Error deleting task template:', error);
      throw error;
    }
  }
};

/**
 * Task Instance Operations
 */
export const taskInstances = {
  // Get task instances for specific date
  async getForDate(date) {
    try {
      const userId = getCurrentUserId();
      const snapshot = await db
        .collection('users')
        .doc(userId)
        .collection('task_instances')
        .where('date', '==', date)
        .get();
      
      const instances = [];
      snapshot.forEach(doc => {
        instances.push({ id: doc.id, ...doc.data() });
      });
      
      return instances;
    } catch (error) {
      console.error('❌ Error getting task instances:', error);
      throw error;
    }
  },

  // Create task instance
  async create(instanceData) {
    try {
      const userId = getCurrentUserId();
      
      const instance = {
        templateId: instanceData.templateId,
        date: instanceData.date,
        status: instanceData.status,
        modifiedStartTime: instanceData.modifiedStartTime || null,
        completedAt: instanceData.completedAt || null,
        skippedReason: instanceData.skippedReason || null,
        createdAt: new Date().toISOString()
      };
      
      const docRef = await db
        .collection('users')
        .doc(userId)
        .collection('task_instances')
        .add(instance);
      
      console.log('✅ Task instance created:', docRef.id);
      return { id: docRef.id, ...instance };
    } catch (error) {
      console.error('❌ Error creating task instance:', error);
      throw error;
    }
  },

  // Update task instance
  async update(instanceId, updates) {
    try {
      const userId = getCurrentUserId();
      
      await db
        .collection('users')
        .doc(userId)
        .collection('task_instances')
        .doc(instanceId)
        .update(updates);
      
      console.log('✅ Task instance updated:', instanceId);
      return { id: instanceId, ...updates };
    } catch (error) {
      console.error('❌ Error updating task instance:', error);
      throw error;
    }
  }
};

/**
 * Daily Schedule Operations
 */
export const dailySchedules = {
  // Get daily schedule for specific date
  async getForDate(date) {
    try {
      const userId = getCurrentUserId();
      const doc = await db
        .collection('users')
        .doc(userId)
        .collection('daily_schedules')
        .doc(date)
        .get();
      
      if (doc.exists) {
        return { date, ...doc.data() };
      } else {
        return null; // No override for this date
      }
    } catch (error) {
      console.error('❌ Error getting daily schedule:', error);
      throw error;
    }
  },

  // Save daily schedule override
  async save(date, scheduleData) {
    try {
      const userId = getCurrentUserId();
      
      const schedule = {
        wakeTime: scheduleData.wakeTime,
        sleepTime: scheduleData.sleepTime,
        lastUpdated: new Date().toISOString()
      };
      
      await db
        .collection('users')
        .doc(userId)
        .collection('daily_schedules')
        .doc(date)
        .set(schedule);
      
      console.log('✅ Daily schedule saved for:', date);
      return { date, ...schedule };
    } catch (error) {
      console.error('❌ Error saving daily schedule:', error);
      throw error;
    }
  },

  // Delete daily schedule override
  async delete(date) {
    try {
      const userId = getCurrentUserId();
      
      await db
        .collection('users')
        .doc(userId)
        .collection('daily_schedules')
        .doc(date)
        .delete();
      
      console.log('✅ Daily schedule override deleted for:', date);
    } catch (error) {
      console.error('❌ Error deleting daily schedule:', error);
      throw error;
    }
  }
};

/**
 * Utility Functions
 */
export const dataUtils = {
  // Format date as YYYY-MM-DD
  formatDate(date = new Date()) {
    return date.toISOString().split('T')[0];
  },

  // Get today's date string
  getTodayDateString() {
    return this.formatDate();
  },

  // Validate task data before saving
  validateTask(taskData) {
    const errors = [];
    
    if (!taskData.taskName || taskData.taskName.trim() === '') {
      errors.push('Task name is required.');
    }
    
    if (taskData.durationMinutes < 1 || taskData.durationMinutes > 480) {
      errors.push('Duration must be between 1 and 480 minutes.');
    }
    
    if (taskData.priority < 1 || taskData.priority > 5) {
      errors.push('Priority must be between 1 and 5.');
    }
    
    return errors;
  }
};