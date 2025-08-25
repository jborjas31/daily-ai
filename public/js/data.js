/**
 * Data Service Module
 * Handles all Firestore CRUD operations and data structure management
 */

import { auth, db } from './firebase.js';
import { taskValidation } from './utils/TaskValidation.js';

/**
 * Get current user ID
 */
function getCurrentUserId() {
  const user = auth.currentUser;
  console.log('🔍 getCurrentUserId - auth.currentUser:', user ? user.uid : 'null');
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
 * Enhanced CRUD operations with batch operations, search, filtering, and offline support
 */
export const taskTemplates = {
  // Get all task templates for user with advanced filtering
  async getAll(userId = null, options = {}) {
    try {
      const uid = userId || getCurrentUserId();
      console.log('🔍 taskTemplates.getAll - Using userId:', uid);
      const {
        includeInactive = false,
        limit = null,
        orderBy = 'priority',
        orderDirection = 'desc',
        filters = {}
      } = options;
      
      let query = db
        .collection('users')
        .doc(uid)
        .collection('tasks');
      
      // Apply active filter unless includeInactive is true
      if (!includeInactive) {
        query = query.where('isActive', '==', true);
      }
      
      // Apply additional filters
      if (filters.timeWindow) {
        query = query.where('timeWindow', '==', filters.timeWindow);
      }
      
      if (filters.isMandatory !== undefined) {
        query = query.where('isMandatory', '==', filters.isMandatory);
      }
      
      if (filters.schedulingType) {
        query = query.where('schedulingType', '==', filters.schedulingType);
      }
      
      if (filters.priority) {
        query = query.where('priority', '==', filters.priority);
      }
      
      // Apply ordering
      query = query.orderBy(orderBy, orderDirection);
      
      // Add secondary sort by taskName for consistency
      if (orderBy !== 'taskName') {
        query = query.orderBy('taskName');
      }
      
      // Apply limit if specified
      if (limit) {
        query = query.limit(limit);
      }
      
      console.log('🔍 About to execute Firestore query...');
      const snapshot = await query.get();
      console.log('🔍 Query executed successfully, processing results...');
      
      const tasks = [];
      snapshot.forEach(doc => {
        tasks.push({ id: doc.id, ...doc.data() });
      });
      
      console.log(`✅ Retrieved ${tasks.length} task templates${includeInactive ? ' (including inactive)' : ''}`);
      return tasks;
    } catch (error) {
      console.error('❌ Error getting task templates:', error);
      console.error('❌ Error details:', error.message, error.code);
      throw error;
    }
  },

  // Get single task template by ID
  async get(templateId) {
    try {
      const userId = getCurrentUserId();
      const doc = await db
        .collection('users')
        .doc(userId)
        .collection('tasks')
        .doc(templateId)
        .get();
      
      if (doc.exists) {
        return { id: doc.id, ...doc.data() };
      } else {
        throw new Error(`Task template not found: ${templateId}`);
      }
    } catch (error) {
      console.error('❌ Error getting task template:', error);
      throw error;
    }
  },

  // Search task templates by name or description
  async search(userId = null, searchQuery, options = {}) {
    try {
      const uid = userId || getCurrentUserId();
      
      // Get all templates first (Firestore doesn't support text search natively)
      const allTemplates = await this.getAll(uid, options);
      
      // Filter by search query
      const query = searchQuery.toLowerCase().trim();
      const filteredTemplates = allTemplates.filter(template => 
        template.taskName.toLowerCase().includes(query) ||
        (template.description && template.description.toLowerCase().includes(query))
      );
      
      console.log(`✅ Found ${filteredTemplates.length} templates matching "${searchQuery}"`);
      return filteredTemplates;
    } catch (error) {
      console.error('❌ Error searching task templates:', error);
      throw error;
    }
  },

  // Get templates by specific criteria with pagination
  async getByFilters(userId = null, filters = {}, pagination = {}) {
    try {
      const uid = userId || getCurrentUserId();
      const { limit = 50, startAfter = null } = pagination;
      
      let query = db
        .collection('users')
        .doc(uid)
        .collection('tasks');
      
      // Apply filters
      Object.entries(filters).forEach(([field, value]) => {
        if (value !== null && value !== undefined) {
          query = query.where(field, '==', value);
        }
      });
      
      // Add ordering for pagination
      query = query.orderBy('createdAt', 'desc');
      
      // Add pagination
      if (startAfter) {
        query = query.startAfter(startAfter);
      }
      
      query = query.limit(limit);
      
      const snapshot = await query.get();
      
      const templates = [];
      let lastDoc = null;
      
      snapshot.forEach(doc => {
        templates.push({ id: doc.id, ...doc.data() });
        lastDoc = doc;
      });
      
      return {
        templates,
        hasMore: snapshot.size === limit,
        lastDoc,
        total: snapshot.size
      };
    } catch (error) {
      console.error('❌ Error getting filtered templates:', error);
      throw error;
    }
  },

  // Create new task template
  async create(userId, templateData) {
    try {
      const uid = userId || getCurrentUserId();
      
      // Remove any existing ID and metadata
      const cleanData = { ...templateData };
      delete cleanData.id;
      delete cleanData.createdAt;
      delete cleanData.updatedAt;
      
      const task = {
        ...cleanData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const docRef = await db
        .collection('users')
        .doc(uid)
        .collection('tasks')
        .add(task);
      
      const createdTemplate = { id: docRef.id, ...task };
      console.log('✅ Task template created:', docRef.id);
      return createdTemplate;
    } catch (error) {
      console.error('❌ Error creating task template:', error);
      throw error;
    }
  },

  // Update task template
  async update(templateId, updates) {
    try {
      const userId = getCurrentUserId();
      
      // Remove ID from updates and add timestamp
      const cleanUpdates = { ...updates };
      delete cleanUpdates.id;
      
      const updateData = {
        ...cleanUpdates,
        updatedAt: new Date().toISOString()
      };
      
      await db
        .collection('users')
        .doc(userId)
        .collection('tasks')
        .doc(templateId)
        .update(updateData);
      
      // Get the updated template to return
      const updatedTemplate = await this.get(templateId);
      
      console.log('✅ Task template updated:', templateId);
      return updatedTemplate;
    } catch (error) {
      console.error('❌ Error updating task template:', error);
      throw error;
    }
  },

  // Soft delete task template
  async delete(templateId) {
    try {
      const userId = getCurrentUserId();
      
      await db
        .collection('users')
        .doc(userId)
        .collection('tasks')
        .doc(templateId)
        .update({
          isActive: false,
          deletedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      
      console.log('✅ Task template soft deleted:', templateId);
    } catch (error) {
      console.error('❌ Error deleting task template:', error);
      throw error;
    }
  },

  // Permanently delete task template
  async permanentDelete(templateId) {
    try {
      const userId = getCurrentUserId();
      
      await db
        .collection('users')
        .doc(userId)
        .collection('tasks')
        .doc(templateId)
        .delete();
      
      console.log('✅ Task template permanently deleted:', templateId);
    } catch (error) {
      console.error('❌ Error permanently deleting task template:', error);
      throw error;
    }
  },

  // Batch operations for multiple templates
  async batchUpdate(templateIds, updates) {
    try {
      const userId = getCurrentUserId();
      const batch = db.batch();
      
      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      templateIds.forEach(templateId => {
        const templateRef = db
          .collection('users')
          .doc(userId)
          .collection('tasks')
          .doc(templateId);
        
        batch.update(templateRef, updateData);
      });
      
      await batch.commit();
      
      console.log(`✅ Batch updated ${templateIds.length} templates`);
      return { updatedCount: templateIds.length, updates: updateData };
    } catch (error) {
      console.error('❌ Error in batch update:', error);
      throw error;
    }
  },

  // Batch activate templates
  async batchActivate(templateIds) {
    try {
      return await this.batchUpdate(templateIds, { 
        isActive: true, 
        deletedAt: null 
      });
    } catch (error) {
      console.error('❌ Error in batch activate:', error);
      throw error;
    }
  },

  // Batch deactivate templates
  async batchDeactivate(templateIds) {
    try {
      return await this.batchUpdate(templateIds, { 
        isActive: false, 
        deactivatedAt: new Date().toISOString() 
      });
    } catch (error) {
      console.error('❌ Error in batch deactivate:', error);
      throw error;
    }
  },

  // Batch create templates
  async batchCreate(userId, templatesData) {
    try {
      const uid = userId || getCurrentUserId();
      const batch = db.batch();
      const createdTemplates = [];
      
      templatesData.forEach(templateData => {
        const templateRef = db
          .collection('users')
          .doc(uid)
          .collection('tasks')
          .doc(); // Auto-generate ID
        
        const cleanData = { ...templateData };
        delete cleanData.id;
        
        const task = {
          ...cleanData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        batch.set(templateRef, task);
        createdTemplates.push({ id: templateRef.id, ...task });
      });
      
      await batch.commit();
      
      console.log(`✅ Batch created ${createdTemplates.length} templates`);
      return createdTemplates;
    } catch (error) {
      console.error('❌ Error in batch create:', error);
      throw error;
    }
  },

  // Get template statistics
  async getStats(userId = null) {
    try {
      const uid = userId || getCurrentUserId();
      
      const [activeTemplates, allTemplates] = await Promise.all([
        this.getAll(uid, { includeInactive: false }),
        this.getAll(uid, { includeInactive: true })
      ]);
      
      const stats = {
        total: allTemplates.length,
        active: activeTemplates.length,
        inactive: allTemplates.length - activeTemplates.length,
        byTimeWindow: {},
        byPriority: {},
        mandatory: activeTemplates.filter(t => t.isMandatory).length,
        flexible: activeTemplates.filter(t => t.schedulingType === 'flexible').length,
        fixed: activeTemplates.filter(t => t.schedulingType === 'fixed').length
      };
      
      // Calculate distribution by time window
      activeTemplates.forEach(template => {
        const timeWindow = template.timeWindow || 'anytime';
        stats.byTimeWindow[timeWindow] = (stats.byTimeWindow[timeWindow] || 0) + 1;
      });
      
      // Calculate distribution by priority
      activeTemplates.forEach(template => {
        const priority = template.priority || 3;
        stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;
      });
      
      console.log('✅ Template statistics calculated');
      return stats;
    } catch (error) {
      console.error('❌ Error getting template statistics:', error);
      throw error;
    }
  },

  // Export templates for backup/migration
  async exportTemplates(userId = null, includeInactive = false) {
    try {
      const uid = userId || getCurrentUserId();
      const templates = await this.getAll(uid, { includeInactive });
      
      const exportData = {
        exportedAt: new Date().toISOString(),
        userId: uid,
        templateCount: templates.length,
        includeInactive,
        templates
      };
      
      console.log(`✅ Exported ${templates.length} templates`);
      return exportData;
    } catch (error) {
      console.error('❌ Error exporting templates:', error);
      throw error;
    }
  },

  // Import templates from backup
  async importTemplates(userId, importData, options = {}) {
    try {
      const uid = userId || getCurrentUserId();
      const { overwriteExisting = false, skipDuplicates = true } = options;
      
      if (!importData.templates || !Array.isArray(importData.templates)) {
        throw new Error('Invalid import data: templates array is required');
      }
      
      let importedCount = 0;
      let skippedCount = 0;
      
      // Get existing templates for duplicate checking
      const existingTemplates = skipDuplicates 
        ? await this.getAll(uid, { includeInactive: true })
        : [];
      
      const existingNames = new Set(existingTemplates.map(t => t.taskName));
      
      const templatesToImport = [];
      
      for (const template of importData.templates) {
        const templateName = template.taskName;
        
        if (skipDuplicates && existingNames.has(templateName)) {
          skippedCount++;
          continue;
        }
        
        // Clean up template data
        const cleanTemplate = { ...template };
        delete cleanTemplate.id;
        delete cleanTemplate.createdAt;
        delete cleanTemplate.updatedAt;
        
        templatesToImport.push(cleanTemplate);
        importedCount++;
      }
      
      if (templatesToImport.length > 0) {
        await this.batchCreate(uid, templatesToImport);
      }
      
      console.log(`✅ Import completed: ${importedCount} imported, ${skippedCount} skipped`);
      return { importedCount, skippedCount, total: importData.templates.length };
    } catch (error) {
      console.error('❌ Error importing templates:', error);
      throw error;
    }
  }
};

/**
 * Task Instance Operations
 * Enhanced CRUD operations with date-based queries, batch operations, and cleanup
 */
export const taskInstances = {
  // Get single task instance by ID
  async get(instanceId) {
    try {
      const userId = getCurrentUserId();
      const doc = await db
        .collection('users')
        .doc(userId)
        .collection('task_instances')
        .doc(instanceId)
        .get();
      
      if (doc.exists) {
        return { id: doc.id, ...doc.data() };
      } else {
        throw new Error(`Task instance not found: ${instanceId}`);
      }
    } catch (error) {
      console.error('❌ Error getting task instance:', error);
      throw error;
    }
  },

  // Get task instances for specific date with filtering
  async getForDate(date, options = {}) {
    try {
      const userId = getCurrentUserId();
      const {
        status = null,
        templateId = null,
        orderBy = 'createdAt',
        orderDirection = 'asc'
      } = options;
      
      let query = db
        .collection('users')
        .doc(userId)
        .collection('task_instances')
        .where('date', '==', date);
      
      // Apply filters
      if (status) {
        query = query.where('status', '==', status);
      }
      
      if (templateId) {
        query = query.where('templateId', '==', templateId);
      }
      
      // Apply ordering
      query = query.orderBy(orderBy, orderDirection);
      
      const snapshot = await query.get();
      
      const instances = [];
      snapshot.forEach(doc => {
        instances.push({ id: doc.id, ...doc.data() });
      });
      
      console.log(`✅ Retrieved ${instances.length} task instances for ${date}`);
      return instances;
    } catch (error) {
      console.error('❌ Error getting task instances for date:', error);
      throw error;
    }
  },

  // Get task instances for date range
  async getForDateRange(startDate, endDate, options = {}) {
    try {
      const userId = getCurrentUserId();
      const {
        status = null,
        templateId = null,
        limit = null,
        orderBy = 'date',
        orderDirection = 'asc'
      } = options;
      
      let query = db
        .collection('users')
        .doc(userId)
        .collection('task_instances')
        .where('date', '>=', startDate)
        .where('date', '<=', endDate);
      
      // Apply additional filters
      if (status) {
        query = query.where('status', '==', status);
      }
      
      if (templateId) {
        query = query.where('templateId', '==', templateId);
      }
      
      // Apply ordering
      query = query.orderBy(orderBy, orderDirection);
      
      // Add secondary sort by createdAt for consistency
      if (orderBy !== 'createdAt') {
        query = query.orderBy('createdAt');
      }
      
      // Apply limit if specified
      if (limit) {
        query = query.limit(limit);
      }
      
      const snapshot = await query.get();
      
      const instances = [];
      snapshot.forEach(doc => {
        instances.push({ id: doc.id, ...doc.data() });
      });
      
      console.log(`✅ Retrieved ${instances.length} task instances for range ${startDate} to ${endDate}`);
      return instances;
    } catch (error) {
      console.error('❌ Error getting task instances for date range:', error);
      throw error;
    }
  },

  // Get instances by template ID across all dates
  async getByTemplateId(templateId, options = {}) {
    try {
      const userId = getCurrentUserId();
      const {
        startDate = null,
        endDate = null,
        status = null,
        limit = null,
        orderBy = 'date',
        orderDirection = 'desc'
      } = options;
      
      let query = db
        .collection('users')
        .doc(userId)
        .collection('task_instances')
        .where('templateId', '==', templateId);
      
      // Apply date range filters
      if (startDate) {
        query = query.where('date', '>=', startDate);
      }
      
      if (endDate) {
        query = query.where('date', '<=', endDate);
      }
      
      // Apply status filter
      if (status) {
        query = query.where('status', '==', status);
      }
      
      // Apply ordering
      query = query.orderBy(orderBy, orderDirection);
      
      // Apply limit
      if (limit) {
        query = query.limit(limit);
      }
      
      const snapshot = await query.get();
      
      const instances = [];
      snapshot.forEach(doc => {
        instances.push({ id: doc.id, ...doc.data() });
      });
      
      console.log(`✅ Retrieved ${instances.length} instances for template ${templateId}`);
      return instances;
    } catch (error) {
      console.error('❌ Error getting instances by template ID:', error);
      throw error;
    }
  },

  // Create task instance with validation
  async create(instanceData) {
    try {
      const userId = getCurrentUserId();
      
      // Clean and validate instance data
      const cleanData = dataUtils.cleanObjectData(instanceData);
      
      const instance = {
        templateId: cleanData.templateId,
        date: cleanData.date,
        status: cleanData.status || 'pending',
        
        // Optional fields for modifications
        modifiedStartTime: cleanData.modifiedStartTime || null,
        modifiedDuration: cleanData.modifiedDuration || null,
        modifiedPriority: cleanData.modifiedPriority || null,
        
        // Status-specific fields
        completedAt: cleanData.completedAt || null,
        actualDuration: cleanData.actualDuration || null,
        skippedReason: cleanData.skippedReason || null,
        postponedToDate: cleanData.postponedToDate || null,
        
        // Modification tracking
        modificationReason: cleanData.modificationReason || null,
        modifiedAt: cleanData.modifiedAt || null,
        
        // Notes and metadata
        notes: cleanData.notes || null,
        
        // Timestamps
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const docRef = await db
        .collection('users')
        .doc(userId)
        .collection('task_instances')
        .add(instance);
      
      const createdInstance = { id: docRef.id, ...instance };
      console.log('✅ Task instance created:', docRef.id);
      return createdInstance;
    } catch (error) {
      console.error('❌ Error creating task instance:', error);
      throw error;
    }
  },

  // Update task instance with modification tracking
  async update(instanceId, updates) {
    try {
      const userId = getCurrentUserId();
      
      // Clean updates and add modification tracking
      const cleanUpdates = dataUtils.cleanObjectData(updates);
      delete cleanUpdates.id;
      delete cleanUpdates.createdAt;
      
      const updateData = {
        ...cleanUpdates,
        modifiedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await db
        .collection('users')
        .doc(userId)
        .collection('task_instances')
        .doc(instanceId)
        .update(updateData);
      
      // Get the updated instance to return
      const updatedInstance = await this.get(instanceId);
      
      console.log('✅ Task instance updated:', instanceId);
      return updatedInstance;
    } catch (error) {
      console.error('❌ Error updating task instance:', error);
      throw error;
    }
  },

  // Delete task instance
  async delete(instanceId) {
    try {
      const userId = getCurrentUserId();
      
      await db
        .collection('users')
        .doc(userId)
        .collection('task_instances')
        .doc(instanceId)
        .delete();
      
      console.log('✅ Task instance deleted:', instanceId);
    } catch (error) {
      console.error('❌ Error deleting task instance:', error);
      throw error;
    }
  },

  // Batch operations for multiple instances
  async batchUpdate(instanceIds, updates) {
    try {
      const userId = getCurrentUserId();
      const batch = db.batch();
      
      const updateData = {
        ...updates,
        modifiedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      instanceIds.forEach(instanceId => {
        const instanceRef = db
          .collection('users')
          .doc(userId)
          .collection('task_instances')
          .doc(instanceId);
        
        batch.update(instanceRef, updateData);
      });
      
      await batch.commit();
      
      console.log(`✅ Batch updated ${instanceIds.length} instances`);
      return { updatedCount: instanceIds.length, updates: updateData };
    } catch (error) {
      console.error('❌ Error in batch update:', error);
      throw error;
    }
  },

  // Batch create instances
  async batchCreate(instancesData) {
    try {
      const userId = getCurrentUserId();
      const batch = db.batch();
      const createdInstances = [];
      
      instancesData.forEach(instanceData => {
        const instanceRef = db
          .collection('users')
          .doc(userId)
          .collection('task_instances')
          .doc(); // Auto-generate ID
        
        const cleanData = dataUtils.cleanObjectData(instanceData);
        delete cleanData.id;
        
        const instance = {
          templateId: cleanData.templateId,
          date: cleanData.date,
          status: cleanData.status || 'pending',
          modifiedStartTime: cleanData.modifiedStartTime || null,
          modifiedDuration: cleanData.modifiedDuration || null,
          completedAt: cleanData.completedAt || null,
          skippedReason: cleanData.skippedReason || null,
          notes: cleanData.notes || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        batch.set(instanceRef, instance);
        createdInstances.push({ id: instanceRef.id, ...instance });
      });
      
      await batch.commit();
      
      console.log(`✅ Batch created ${createdInstances.length} instances`);
      return createdInstances;
    } catch (error) {
      console.error('❌ Error in batch create:', error);
      throw error;
    }
  },

  // Batch delete instances
  async batchDelete(instanceIds) {
    try {
      const userId = getCurrentUserId();
      const batch = db.batch();
      
      instanceIds.forEach(instanceId => {
        const instanceRef = db
          .collection('users')
          .doc(userId)
          .collection('task_instances')
          .doc(instanceId);
        
        batch.delete(instanceRef);
      });
      
      await batch.commit();
      
      console.log(`✅ Batch deleted ${instanceIds.length} instances`);
      return { deletedCount: instanceIds.length };
    } catch (error) {
      console.error('❌ Error in batch delete:', error);
      throw error;
    }
  },

  // Cleanup old instances (data retention management)
  async cleanupOldInstances(retentionDays = 365) {
    try {
      const userId = getCurrentUserId();
      const cutoffDate = dataUtils.addDaysToDate(new Date(), -retentionDays);
      
      console.log(`🧹 Starting cleanup of instances older than ${cutoffDate}`);
      
      // Query for old instances
      const snapshot = await db
        .collection('users')
        .doc(userId)
        .collection('task_instances')
        .where('date', '<', cutoffDate)
        .get();
      
      if (snapshot.empty) {
        console.log('✅ No old instances to cleanup');
        return { deletedCount: 0 };
      }
      
      // Delete in batches to avoid hitting Firestore limits
      const batchSize = 500;
      const instanceIds = [];
      
      snapshot.forEach(doc => {
        instanceIds.push(doc.id);
      });
      
      let totalDeleted = 0;
      
      for (let i = 0; i < instanceIds.length; i += batchSize) {
        const batchIds = instanceIds.slice(i, i + batchSize);
        const result = await this.batchDelete(batchIds);
        totalDeleted += result.deletedCount;
      }
      
      console.log(`✅ Cleanup completed: ${totalDeleted} old instances deleted`);
      return { deletedCount: totalDeleted, cutoffDate };
    } catch (error) {
      console.error('❌ Error in cleanup old instances:', error);
      throw error;
    }
  },

  // Get instance statistics for a date range
  async getStats(startDate, endDate) {
    try {
      const instances = await this.getForDateRange(startDate, endDate);
      
      const stats = {
        total: instances.length,
        byStatus: {},
        byDate: {},
        completionRate: 0,
        averageCompletionTime: null
      };
      
      let completedCount = 0;
      let totalCompletionTime = 0;
      let completionTimeCount = 0;
      
      instances.forEach(instance => {
        // Count by status
        const status = instance.status || 'pending';
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
        
        // Count by date
        const date = instance.date;
        stats.byDate[date] = (stats.byDate[date] || 0) + 1;
        
        // Calculate completion metrics
        if (status === 'completed') {
          completedCount++;
          
          if (instance.actualDuration) {
            totalCompletionTime += instance.actualDuration;
            completionTimeCount++;
          }
        }
      });
      
      // Calculate completion rate
      stats.completionRate = stats.total > 0 ? 
        Math.round((completedCount / stats.total) * 100) : 0;
      
      // Calculate average completion time
      stats.averageCompletionTime = completionTimeCount > 0 ? 
        Math.round(totalCompletionTime / completionTimeCount) : null;
      
      console.log('✅ Instance statistics calculated');
      return stats;
    } catch (error) {
      console.error('❌ Error getting instance statistics:', error);
      throw error;
    }
  },

  // Offline-first operations with retry logic
  async createWithRetry(instanceData, maxAttempts = 3) {
    try {
      return await dataUtils.withRetry(
        () => this.create(instanceData),
        maxAttempts
      );
    } catch (error) {
      console.error('❌ Error creating instance with retry:', error);
      throw error;
    }
  },

  async updateWithRetry(instanceId, updates, maxAttempts = 3) {
    try {
      return await dataUtils.withRetry(
        () => this.update(instanceId, updates),
        maxAttempts
      );
    } catch (error) {
      console.error('❌ Error updating instance with retry:', error);
      throw error;
    }
  },

  async batchCreateWithRetry(instancesData, maxAttempts = 3) {
    try {
      return await dataUtils.withRetry(
        () => this.batchCreate(instancesData),
        maxAttempts
      );
    } catch (error) {
      console.error('❌ Error batch creating instances with retry:', error);
      throw error;
    }
  },

  async batchUpdateWithRetry(instanceIds, updates, maxAttempts = 3) {
    try {
      return await dataUtils.withRetry(
        () => this.batchUpdate(instanceIds, updates),
        maxAttempts
      );
    } catch (error) {
      console.error('❌ Error batch updating instances with retry:', error);
      throw error;
    }
  },

  // Get cached instances for offline support (would work with state management)
  getCachedForDate(date) {
    // This would integrate with the state management cache
    // For now, returns empty array if offline
    if (dataUtils.isOffline()) {
      console.log(`⚠️ Offline mode: returning empty instances for date ${date}`);
      return [];
    }
    return null; // Indicates cache not available, should fetch from server
  },

  // Sync pending offline operations when back online
  async syncOfflineOperations() {
    try {
      if (dataUtils.isOffline()) {
        console.log('⚠️ Still offline, cannot sync operations');
        return { synced: 0, failed: 0 };
      }

      // This would integrate with a proper offline queue system
      // For now, just log that sync capability is available
      console.log('✅ Offline sync capabilities available for task instances');
      
      return { synced: 0, failed: 0, message: 'Offline sync system ready' };
    } catch (error) {
      console.error('❌ Error syncing offline operations:', error);
      throw error;
    }
  },

  // Export instances for backup/migration
  async exportInstances(startDate, endDate, options = {}) {
    try {
      const { includeCompleted = true, includeSkipped = false } = options;
      
      let instances = await this.getForDateRange(startDate, endDate);
      
      // Apply status filters
      if (!includeCompleted) {
        instances = instances.filter(i => i.status !== 'completed');
      }
      
      if (!includeSkipped) {
        instances = instances.filter(i => i.status !== 'skipped');
      }
      
      const exportData = {
        exportedAt: new Date().toISOString(),
        dateRange: { startDate, endDate },
        instanceCount: instances.length,
        filters: { includeCompleted, includeSkipped },
        instances
      };
      
      console.log(`✅ Exported ${instances.length} instances for range ${startDate} to ${endDate}`);
      return exportData;
    } catch (error) {
      console.error('❌ Error exporting instances:', error);
      throw error;
    }
  },

  // Import instances from backup
  async importInstances(importData, options = {}) {
    try {
      const { overwriteExisting = false } = options;
      
      if (!importData.instances || !Array.isArray(importData.instances)) {
        throw new Error('Invalid import data: instances array is required');
      }
      
      let importedCount = 0;
      let skippedCount = 0;
      
      // Get existing instances for duplicate checking if needed
      const existingInstances = overwriteExisting ? [] : await this.getForDateRange(
        importData.dateRange.startDate, 
        importData.dateRange.endDate
      );
      
      const existingMap = new Map();
      existingInstances.forEach(instance => {
        const key = `${instance.templateId}-${instance.date}`;
        existingMap.set(key, instance);
      });
      
      const instancesToImport = [];
      
      for (const instance of importData.instances) {
        const key = `${instance.templateId}-${instance.date}`;
        
        if (!overwriteExisting && existingMap.has(key)) {
          skippedCount++;
          continue;
        }
        
        // Clean up instance data
        const cleanInstance = { ...instance };
        delete cleanInstance.id;
        delete cleanInstance.createdAt;
        delete cleanInstance.updatedAt;
        
        instancesToImport.push(cleanInstance);
        importedCount++;
      }
      
      if (instancesToImport.length > 0) {
        await this.batchCreate(instancesToImport);
      }
      
      console.log(`✅ Import completed: ${importedCount} imported, ${skippedCount} skipped`);
      return { importedCount, skippedCount, total: importData.instances.length };
    } catch (error) {
      console.error('❌ Error importing instances:', error);
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

  // Get current timestamp in ISO format
  getCurrentTimestamp() {
    return new Date().toISOString();
  },

  // Add days to date and return formatted string
  addDaysToDate(date, days) {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    return this.formatDate(newDate);
  },

  // Get date range (start, end) as array of date strings
  getDateRange(startDate, endDate) {
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    while (start <= end) {
      dates.push(this.formatDate(start));
      start.setDate(start.getDate() + 1);
    }
    
    return dates;
  },

  // Validate task template data using comprehensive validation system
  validateTask(taskData, existingTemplates = []) {
    const validationResult = taskValidation.validateTemplate(taskData, existingTemplates);
    return validationResult.getErrorMessages();
  },

  // Quick validation for UI feedback
  quickValidateTask(taskData) {
    const validationResult = taskValidation.quickValidateTemplate(taskData);
    return validationResult.getErrorMessages();
  },

  // Validate task instance data
  validateTaskInstance(instanceData, templateData = null) {
    const validationResult = taskValidation.validateInstance(instanceData, templateData);
    return validationResult.getErrorMessages();
  },


  // Sanitize user input (remove HTML tags, trim whitespace)
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .trim(); // Remove leading/trailing whitespace
  },

  // Deep clean object data (sanitize strings, remove empty values)
  cleanObjectData(obj, options = {}) {
    const { removeEmpty = true, sanitizeStrings = true } = options;
    const cleaned = {};

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        if (!removeEmpty) cleaned[key] = value;
        continue;
      }

      if (typeof value === 'string') {
        const cleanedString = sanitizeStrings ? this.sanitizeInput(value) : value;
        if (!removeEmpty || cleanedString.length > 0) {
          cleaned[key] = cleanedString;
        }
      } else if (Array.isArray(value)) {
        if (!removeEmpty || value.length > 0) {
          cleaned[key] = value;
        }
      } else if (typeof value === 'object') {
        const cleanedObject = this.cleanObjectData(value, options);
        if (!removeEmpty || Object.keys(cleanedObject).length > 0) {
          cleaned[key] = cleanedObject;
        }
      } else {
        cleaned[key] = value;
      }
    }

    return cleaned;
  },

  // Check if operation should be retried (for offline support)
  shouldRetryOperation(error, attempt = 1, maxAttempts = 3) {
    if (attempt >= maxAttempts) return false;

    // Retry on network errors or temporary Firebase issues
    const retryableErrors = [
      'network-request-failed',
      'temporarily-unavailable', 
      'deadline-exceeded',
      'unavailable'
    ];

    const errorCode = error.code || error.message;
    return retryableErrors.some(code => errorCode.includes(code));
  },

  // Execute operation with retry logic
  async withRetry(operation, maxAttempts = 3, delayMs = 1000) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (!this.shouldRetryOperation(error, attempt, maxAttempts)) {
          throw error;
        }
        
        // Wait before retrying with exponential backoff
        const delay = delayMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.warn(`Retrying operation (attempt ${attempt + 1}/${maxAttempts}) after ${delay}ms delay`);
      }
    }
    
    throw lastError;
  },

  // Convert Firestore timestamp to ISO string
  timestampToISO(timestamp) {
    if (!timestamp) return null;
    return timestamp.toDate ? timestamp.toDate().toISOString() : timestamp;
  },

  // Check if running in offline mode
  isOffline() {
    return !navigator.onLine;
  },

  // Generate a simple hash for data integrity checking
  simpleHash(data) {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }
};