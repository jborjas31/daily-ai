/**
 * Task Modal Component
 * 
 * Unified task creation and editing modal component
 * Handles all task properties and actions (create, edit, copy, delete, etc.)
 */

import { state } from '../state.js';
import { taskTemplateManager, taskInstanceManager, TIME_WINDOWS } from '../taskLogic.js';
import { SimpleValidation } from '../utils/SimpleValidation.js';
import { SimpleErrorHandler } from '../utils/SimpleErrorHandler.js';
import { dataUtils } from '../dataOffline.js';
import { SafeTimeout, SafeEventListener, ComponentManager } from '../utils/MemoryLeakPrevention.js';
import { taskValidation } from '../utils/TaskValidation.js';

/**
 * Task Modal Controller
 */
export class TaskModal {
  constructor() {
    this.modalElement = null;
    this.currentTask = null;
    this.mode = 'create'; // 'create' or 'edit'
    this.onSave = null;
    this.onCancel = null;
    
    // Enhanced features
    this.showPreview = false;
    this.selectedDependencies = new Set();
    this.recurrenceWeekdays = new Set();
    this.validationResult = null;
    this.previewInstances = [];
    
    // Memory leak prevention tracking
    this.eventListeners = [];
    this.timeouts = [];
    
    // Register with memory manager
    ComponentManager.register(this);
  }

  /**
   * Show modal for creating new task
   */
  showCreate(defaultValues = {}, onSave = null) {
    this.mode = 'create';
    this.currentTask = null;
    this.onSave = onSave;
    
    // Reset enhanced features
    this.showPreview = false;
    this.selectedDependencies.clear();
    this.recurrenceWeekdays.clear();
    this.validationResult = null;
    this.previewInstances = [];
    
    const taskData = {
      taskName: '',
      description: '',
      durationMinutes: 30,
      minDurationMinutes: 15,
      priority: 3,
      isMandatory: false,
      schedulingType: 'flexible',
      defaultTime: '',
      timeWindow: 'anytime',
      dependsOn: [],
      recurrenceRule: {
        frequency: 'none',
        interval: 1,
        startDate: null,
        endDate: null,
        endAfterOccurrences: null,
        daysOfWeek: [],
        dayOfMonth: null,
        month: null,
        customPattern: null
      },
      isActive: true,
      ...defaultValues
    };
    
    // Initialize selected dependencies
    if (taskData.dependsOn && Array.isArray(taskData.dependsOn)) {
      taskData.dependsOn.forEach(depId => this.selectedDependencies.add(depId));
    }
    
    // Initialize recurrence weekdays
    if (taskData.recurrenceRule.daysOfWeek && Array.isArray(taskData.recurrenceRule.daysOfWeek)) {
      taskData.recurrenceRule.daysOfWeek.forEach(day => this.recurrenceWeekdays.add(day));
    }
    
    this.render(taskData);
    this.show();
  }

  /**
   * Show modal for editing existing task
   */
  showEdit(task, onSave = null) {
    this.mode = 'edit';
    this.currentTask = task;
    this.onSave = onSave;
    
    // Reset enhanced features
    this.showPreview = false;
    this.selectedDependencies.clear();
    this.recurrenceWeekdays.clear();
    this.validationResult = null;
    this.previewInstances = [];
    
    // Initialize selected dependencies from task
    if (task.dependsOn) {
      if (Array.isArray(task.dependsOn)) {
        task.dependsOn.forEach(depId => this.selectedDependencies.add(depId));
      } else if (task.dependsOn) {
        this.selectedDependencies.add(task.dependsOn);
      }
    }
    
    // Initialize recurrence weekdays from task
    if (task.recurrenceRule && task.recurrenceRule.daysOfWeek && Array.isArray(task.recurrenceRule.daysOfWeek)) {
      task.recurrenceRule.daysOfWeek.forEach(day => this.recurrenceWeekdays.add(day));
    }
    
    this.render(task);
    this.show();
  }

  /**
   * Show modal for copying task
   */
  showCopy(task, onSave = null) {
    this.mode = 'create';
    this.currentTask = null;
    this.onSave = onSave;
    
    const copyData = {
      ...task,
      taskName: `${task.taskName} (Copy)`,
      id: undefined
    };
    
    this.render(copyData);
    this.show();
  }

  /**
   * Render modal HTML
   */
  render(taskData) {
    // Remove existing modal if present
    this.destroy();
    
    // Create modal element
    this.modalElement = document.createElement('div');
    this.modalElement.className = 'modal-overlay';
    this.modalElement.innerHTML = this.getModalHTML(taskData);
    
    // Add to DOM
    document.body.appendChild(this.modalElement);
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Auto-focus first input
    const focusTimeout = SafeTimeout.set(() => {
      const firstInput = this.modalElement.querySelector('#task-name');
      if (firstInput) firstInput.focus();
    }, 100, 'TaskModal auto-focus');
    this.timeouts.push(focusTimeout);
  }

  /**
   * Get enhanced modal HTML template with advanced features
   */
  getModalHTML(taskData) {
    const isEdit = this.mode === 'edit';
    const modalTitle = isEdit ? 'Edit Task Template' : 'Create Task Template';
    const saveButtonText = isEdit ? 'Save Changes' : 'Create Template';
    
    return `
      <div class="modal enhanced-modal" style="max-width: 1000px;">
        <div class="modal-header">
          <div class="modal-title-section">
            <h2>${modalTitle}</h2>
            <div class="modal-tabs">
              <button type="button" class="modal-tab active" id="form-tab">✏️ Configure</button>
              <button type="button" class="modal-tab" id="preview-tab">👁️ Preview</button>
            </div>
          </div>
          <button type="button" class="modal-close" id="modal-close">×</button>
        </div>
        
        <!-- Form View -->
        <div id="form-view" class="modal-view active">
          <form id="task-form" class="modal-form enhanced-form">
            <!-- Enhanced Validation Status -->
            <div id="validation-status" class="validation-status" style="display: none;"></div>
            
            <!-- Basic Information -->
            <div class="form-section">
              <h3>📝 Task Information</h3>
              
              <div class="form-group">
                <label for="task-name" class="label required">Task Name</label>
                <input 
                  type="text" 
                  id="task-name" 
                  class="input" 
                  value="${this.escapeHtml(taskData.taskName || '')}"
                  placeholder="Enter a clear, descriptive task name"
                  required
                />
                <div class="validation-error" id="task-name-error"></div>
              </div>
              
              <div class="form-group">
                <label for="task-description" class="label">Description (Optional)</label>
                <textarea 
                  id="task-description" 
                  class="input textarea"
                  placeholder="Add detailed notes, context, or instructions for this task"
                  rows="3"
                >${this.escapeHtml(taskData.description || '')}</textarea>
                <small class="form-help">Rich descriptions help with better scheduling and execution</small>
              </div>
              
              <div class="form-group">
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    id="is-active"
                    ${taskData.isActive !== false ? 'checked' : ''}
                  />
                  <span class="checkbox-text">Template is Active</span>
                </label>
                <small class="form-help">Inactive templates won't generate daily instances</small>
              </div>
            </div>
            
            <!-- Duration and Priority -->
            <div class="form-section">
              <h3>⏱️ Duration and Priority</h3>
              
              <div class="form-row">
                <div class="form-group">
                  <label for="duration" class="label required">Duration (minutes)</label>
                  <input 
                    type="number" 
                    id="duration" 
                    class="input" 
                    value="${taskData.durationMinutes || 30}"
                    min="1" 
                    max="480"
                    required
                  />
                  <div class="validation-error" id="duration-error"></div>
                  <small class="form-help">How long this task typically takes</small>
                </div>
                
                <div class="form-group">
                  <label for="min-duration" class="label">Minimum Duration</label>
                  <input 
                    type="number" 
                    id="min-duration" 
                    class="input" 
                    value="${taskData.minDurationMinutes || Math.max(5, Math.floor((taskData.durationMinutes || 30) * 0.5))}"
                    min="1" 
                    max="480"
                  />
                  <small class="form-help">Shortest acceptable version for time crunch situations</small>
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label for="priority" class="label required">Priority</label>
                  <select id="priority" class="input">
                    ${[1,2,3,4,5].map(p => `
                      <option value="${p}" ${taskData.priority === p ? 'selected' : ''}>
                        ${p} ${this.getPriorityLabel(p)}
                      </option>
                    `).join('')}
                  </select>
                  <small class="form-help">Higher priority tasks are scheduled first</small>
                </div>
                
                <div class="form-group">
                  <label class="checkbox-label">
                    <input 
                      type="checkbox" 
                      id="is-mandatory"
                      ${taskData.isMandatory ? 'checked' : ''}
                    />
                    <span class="checkbox-text">Mandatory Task</span>
                  </label>
                  <small class="form-help">Cannot be skipped or postponed</small>
                </div>
              </div>
            </div>
            
            <!-- Enhanced Scheduling -->
            <div class="form-section">
              <h3>📅 Scheduling</h3>
              
              <div class="form-group">
                <label class="label">Scheduling Type</label>
                <div class="radio-group">
                  <label class="radio-label">
                    <input 
                      type="radio" 
                      name="scheduling-type" 
                      value="flexible"
                      ${taskData.schedulingType !== 'fixed' ? 'checked' : ''}
                    />
                    <span class="radio-text">🤖 Flexible (Smart scheduling)</span>
                  </label>
                  <label class="radio-label">
                    <input 
                      type="radio" 
                      name="scheduling-type" 
                      value="fixed"
                      ${taskData.schedulingType === 'fixed' ? 'checked' : ''}
                    />
                    <span class="radio-text">🕒 Fixed time</span>
                  </label>
                </div>
              </div>
              
              <div class="form-group" id="fixed-time-group" style="display: ${taskData.schedulingType === 'fixed' ? 'block' : 'none'}">
                <label for="default-time" class="label required">Fixed Time</label>
                <input 
                  type="time" 
                  id="default-time" 
                  class="input" 
                  value="${taskData.defaultTime || ''}"
                />
                <div class="validation-error" id="default-time-error"></div>
                <small class="form-help">Task will always be scheduled at this time</small>
              </div>
              
              <div class="form-group" id="time-window-group" style="display: ${taskData.schedulingType !== 'fixed' ? 'block' : 'none'}">
                <label for="time-window" class="label">Preferred Time Window</label>
                <select id="time-window" class="input">
                  ${Object.entries(TIME_WINDOWS).map(([key, window]) => `
                    <option value="${key}" ${taskData.timeWindow === key ? 'selected' : ''}>
                      ${window.label} ${window.description ? `(${window.description})` : ''}
                    </option>
                  `).join('')}
                </select>
                <small class="form-help">AI will try to schedule within this window</small>
              </div>
            </div>
            
            <!-- Enhanced Dependencies -->
            <div class="form-section">
              <h3>🔗 Dependencies</h3>
              
              <div class="form-group">
                <label class="label">Task Dependencies</label>
                <div class="dependency-selector">
                  <select id="dependency-select" class="input">
                    <option value="">Select a task to add as dependency...</option>
                    ${this.getAvailableDependencyOptions(taskData)}
                  </select>
                  <button type="button" id="add-dependency-btn" class="btn btn-secondary" style="margin-left: 10px;">
                    Add Dependency
                  </button>
                </div>
                
                <div id="selected-dependencies" class="selected-dependencies">
                  ${this.renderSelectedDependencies()}
                </div>
                
                <div class="validation-error" id="dependencies-error"></div>
                <small class="form-help">This task will wait for selected dependencies to complete</small>
              </div>
            </div>
            
            <!-- Enhanced Recurrence -->
            <div class="form-section">
              <h3>🔄 Recurrence</h3>
              
              <div class="form-group">
                <label for="recurrence-frequency" class="label">Repeat Pattern</label>
                <select id="recurrence-frequency" class="input">
                  <option value="none" ${taskData.recurrenceRule.frequency === 'none' ? 'selected' : ''}>
                    One-time task
                  </option>
                  <option value="daily" ${taskData.recurrenceRule.frequency === 'daily' ? 'selected' : ''}>
                    Daily
                  </option>
                  <option value="weekly" ${taskData.recurrenceRule.frequency === 'weekly' ? 'selected' : ''}>
                    Weekly
                  </option>
                  <option value="monthly" ${taskData.recurrenceRule.frequency === 'monthly' ? 'selected' : ''}>
                    Monthly
                  </option>
                  <option value="yearly" ${taskData.recurrenceRule.frequency === 'yearly' ? 'selected' : ''}>
                    Yearly
                  </option>
                  <option value="custom" ${taskData.recurrenceRule.frequency === 'custom' ? 'selected' : ''}>
                    Custom Pattern
                  </option>
                </select>
              </div>
              
              <!-- Recurrence Details -->
              <div id="recurrence-details" style="display: ${taskData.recurrenceRule.frequency !== 'none' ? 'block' : 'none'}">
                
                <!-- Interval Settings -->
                <div class="form-group">
                  <label for="recurrence-interval" class="label">Every</label>
                  <div class="form-row">
                    <input 
                      type="number" 
                      id="recurrence-interval" 
                      class="input" 
                      value="${taskData.recurrenceRule.interval || 1}"
                      min="1" 
                      max="365"
                      style="width: 80px;"
                    />
                    <span id="interval-label" class="form-text">
                      ${this.getIntervalLabel(taskData.recurrenceRule.frequency)}
                    </span>
                  </div>
                </div>
                
                <!-- Weekly Days Selection -->
                <div id="weekly-days" class="form-group" style="display: ${taskData.recurrenceRule.frequency === 'weekly' ? 'block' : 'none'}">
                  <label class="label">Days of Week</label>
                  <div class="weekday-selector">
                    ${this.renderWeekdaySelector(taskData.recurrenceRule.daysOfWeek)}
                  </div>
                  <small class="form-help">Select which days of the week to repeat</small>
                </div>
                
                <!-- Monthly Options -->
                <div id="monthly-options" class="form-group" style="display: ${taskData.recurrenceRule.frequency === 'monthly' ? 'block' : 'none'}">
                  <label for="day-of-month" class="label">Day of Month</label>
                  <select id="day-of-month" class="input">
                    <option value="">Same day as created</option>
                    ${Array.from({length: 31}, (_, i) => i + 1).map(day => `
                      <option value="${day}" ${taskData.recurrenceRule.dayOfMonth === day ? 'selected' : ''}>
                        ${day}${this.getOrdinalSuffix(day)}
                      </option>
                    `).join('')}
                    <option value="-1" ${taskData.recurrenceRule.dayOfMonth === -1 ? 'selected' : ''}>
                      Last day of month
                    </option>
                  </select>
                </div>
                
                <!-- Yearly Options -->
                <div id="yearly-options" class="form-group" style="display: ${taskData.recurrenceRule.frequency === 'yearly' ? 'block' : 'none'}">
                  <div class="form-row">
                    <div class="form-group">
                      <label for="recurrence-month" class="label">Month</label>
                      <select id="recurrence-month" class="input">
                        <option value="">Same month as created</option>
                        ${this.getMonthOptions(taskData.recurrenceRule.month)}
                      </select>
                    </div>
                    <div class="form-group">
                      <label for="yearly-day" class="label">Day</label>
                      <select id="yearly-day" class="input">
                        <option value="">Same day as created</option>
                        ${Array.from({length: 31}, (_, i) => i + 1).map(day => `
                          <option value="${day}" ${taskData.recurrenceRule.dayOfMonth === day ? 'selected' : ''}>
                            ${day}${this.getOrdinalSuffix(day)}
                          </option>
                        `).join('')}
                      </select>
                    </div>
                  </div>
                </div>
                
                <!-- Custom Pattern -->
                <div id="custom-pattern" class="form-group" style="display: ${taskData.recurrenceRule.frequency === 'custom' ? 'block' : 'none'}">
                  <label for="custom-pattern-type" class="label">Pattern Type</label>
                  <select id="custom-pattern-type" class="input">
                    <option value="weekdays" ${taskData.recurrenceRule.customPattern?.type === 'weekdays' ? 'selected' : ''}>
                      Weekdays only (Mon-Fri)
                    </option>
                    <option value="weekends" ${taskData.recurrenceRule.customPattern?.type === 'weekends' ? 'selected' : ''}>
                      Weekends only (Sat-Sun)
                    </option>
                    <option value="nth_weekday" ${taskData.recurrenceRule.customPattern?.type === 'nth_weekday' ? 'selected' : ''}>
                      Nth weekday of month
                    </option>
                  </select>
                </div>
                
                <!-- Date Range -->
                <div class="form-row">
                  <div class="form-group">
                    <label for="recurrence-start" class="label">Start Date</label>
                    <input 
                      type="date" 
                      id="recurrence-start" 
                      class="input" 
                      value="${taskData.recurrenceRule.startDate || ''}"
                    />
                    <small class="form-help">Leave empty to start immediately</small>
                  </div>
                  
                  <div class="form-group">
                    <label for="recurrence-end" class="label">End Date</label>
                    <input 
                      type="date" 
                      id="recurrence-end" 
                      class="input" 
                      value="${taskData.recurrenceRule.endDate || ''}"
                    />
                    <small class="form-help">Leave empty for no end date</small>
                  </div>
                </div>
                
                <div class="form-group">
                  <label for="end-after-occurrences" class="label">End After Occurrences</label>
                  <input 
                    type="number" 
                    id="end-after-occurrences" 
                    class="input" 
                    value="${taskData.recurrenceRule.endAfterOccurrences || ''}"
                    min="1" 
                    placeholder="Leave empty for unlimited"
                    style="width: 120px;"
                  />
                  <small class="form-help">Stop after this many occurrences</small>
                </div>
                
              </div>
            </div>
            
            <!-- Modal Actions -->
            <div class="modal-actions">
              <div class="action-buttons-left">
                ${isEdit ? `
                  <button type="button" id="copy-task-btn" class="btn btn-secondary">
                    📄 Copy Template
                  </button>
                  <button type="button" id="delete-task-btn" class="btn btn-danger">
                    🗑️ Delete
                  </button>
                ` : ''}
                <button type="button" id="validate-btn" class="btn btn-secondary">
                  ✅ Validate
                </button>
              </div>
              
              <div class="action-buttons-right">
                <button type="button" id="cancel-btn" class="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" id="save-btn" class="btn btn-primary">
                  ${saveButtonText}
                </button>
              </div>
            </div>
          </form>
        </div>
        
        <!-- Preview View -->
        <div id="preview-view" class="modal-view" style="display: none;">
          <div class="preview-container">
            <div class="preview-header">
              <h3>📋 Template Preview</h3>
              <p class="preview-description">See how this template will appear and behave</p>
            </div>
            
            <div id="preview-content" class="preview-content">
              <!-- Preview content will be rendered here -->
            </div>
            
            <div class="preview-actions">
              <button type="button" id="refresh-preview-btn" class="btn btn-secondary">
                🔄 Refresh Preview
              </button>
              <button type="button" id="generate-test-instances-btn" class="btn btn-secondary">
                🧪 Generate Test Instances
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Enhanced helper methods for the new functionality
   */
  
  // HTML escaping utility
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Get priority label with description
  getPriorityLabel(priority) {
    const labels = {
      1: '(Lowest - Background tasks)',
      2: '(Low - Nice to do)',
      3: '(Medium - Regular tasks)',
      4: '(High - Important tasks)',
      5: '(Highest - Critical tasks)'
    };
    return labels[priority] || '';
  }

  // Get available dependency options (excludes current task and prevents circular deps)
  getAvailableDependencyOptions(currentTaskData) {
    const allTasks = state.getTaskTemplates();
    return allTasks
      .filter(task => task.id !== currentTaskData.id) // Exclude current task
      .filter(task => !this.wouldCreateCircularDependency(task.id, currentTaskData.id)) // Exclude circular deps
      .map(task => `
        <option value="${task.id}">
          ${this.escapeHtml(task.taskName)}
        </option>
      `).join('');
  }

  // Check if adding a dependency would create a circular reference
  wouldCreateCircularDependency(newDepId, currentTaskId) {
    const allTasks = state.getTaskTemplates();
    const visited = new Set();
    
    const checkCircular = (taskId) => {
      if (taskId === currentTaskId) return true;
      if (visited.has(taskId)) return false;
      
      visited.add(taskId);
      const task = allTasks.find(t => t.id === taskId);
      
      if (task && task.dependsOn) {
        const deps = Array.isArray(task.dependsOn) ? task.dependsOn : [task.dependsOn];
        return deps.some(depId => checkCircular(depId));
      }
      
      return false;
    };
    
    return checkCircular(newDepId);
  }

  // Render selected dependencies
  renderSelectedDependencies() {
    if (this.selectedDependencies.size === 0) {
      return '<div class="no-dependencies">No dependencies selected</div>';
    }
    
    const allTasks = state.getTaskTemplates();
    const dependencyHtml = Array.from(this.selectedDependencies).map(depId => {
      const task = allTasks.find(t => t.id === depId);
      if (!task) return '';
      
      return `
        <div class="dependency-item" data-dependency-id="${depId}">
          <span class="dependency-name">${this.escapeHtml(task.taskName)}</span>
          <button type="button" class="remove-dependency-btn" data-dependency-id="${depId}">×</button>
        </div>
      `;
    }).join('');
    
    return dependencyHtml;
  }

  // Render weekday selector for weekly recurrence
  renderWeekdaySelector(selectedDays = []) {
    const days = [
      { value: 0, label: 'Sun' },
      { value: 1, label: 'Mon' },
      { value: 2, label: 'Tue' },
      { value: 3, label: 'Wed' },
      { value: 4, label: 'Thu' },
      { value: 5, label: 'Fri' },
      { value: 6, label: 'Sat' }
    ];
    
    return days.map(day => `
      <label class="weekday-option">
        <input 
          type="checkbox" 
          value="${day.value}" 
          class="weekday-checkbox"
          ${this.recurrenceWeekdays.has(day.value) || selectedDays.includes(day.value) ? 'checked' : ''}
        />
        <span class="weekday-label">${day.label}</span>
      </label>
    `).join('');
  }

  // Get ordinal suffix (1st, 2nd, 3rd, etc.)
  getOrdinalSuffix(num) {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const value = num % 100;
    return suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0];
  }

  // Get month options for yearly recurrence
  getMonthOptions(selectedMonth) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    return months.map((month, index) => `
      <option value="${index + 1}" ${selectedMonth === (index + 1) ? 'selected' : ''}>
        ${month}
      </option>
    `).join('');
  }

  /**
   * Legacy dependency options method (kept for backward compatibility)
   */
  getDependencyOptions(currentTaskData) {
    const allTasks = state.getTaskTemplates();
    const currentDep = Array.isArray(currentTaskData.dependsOn) ? 
      currentTaskData.dependsOn[0] : currentTaskData.dependsOn;
    
    return allTasks
      .filter(task => task.id !== currentTaskData.id)
      .map(task => `
        <option value="${task.id}" ${currentDep === task.id ? 'selected' : ''}>
          ${this.escapeHtml(task.taskName)}
        </option>
      `).join('');
  }

  /**
   * Get interval label for recurrence
   */
  getIntervalLabel(frequency) {
    switch (frequency) {
      case 'daily': return 'day(s)';
      case 'weekly': return 'week(s)';
      case 'monthly': return 'month(s)';
      default: return '';
    }
  }

  /**
   * Enhanced setup event listeners for all new functionality
   */
  setupEventListeners() {
    if (!this.modalElement) return;
    
    // === Core Modal Events ===
    
    // Close modal events
    const closeListener = SafeEventListener.add(
      this.modalElement.querySelector('#modal-close'),
      'click',
      () => this.hide(),
      { description: 'TaskModal close button' }
    );
    this.eventListeners.push(closeListener);
    
    const cancelListener = SafeEventListener.add(
      this.modalElement.querySelector('#cancel-btn'),
      'click',
      () => this.hide(),
      { description: 'TaskModal cancel button' }
    );
    this.eventListeners.push(cancelListener);
    
    // Click outside to close
    const clickOutsideListener = SafeEventListener.add(
      this.modalElement,
      'click',
      (e) => {
        if (e.target === this.modalElement) this.hide();
      },
      { description: 'TaskModal click outside to close' }
    );
    this.eventListeners.push(clickOutsideListener);
    
    // Escape key to close
    const keydownListener = SafeEventListener.add(
      document,
      'keydown',
      this.handleKeydown.bind(this),
      { description: 'TaskModal escape key handler' }
    );
    this.eventListeners.push(keydownListener);
    
    // === Tab Navigation ===
    
    // Form tab
    const formTabBtn = this.modalElement.querySelector('#form-tab');
    if (formTabBtn) {
      const formTabListener = SafeEventListener.add(
        formTabBtn,
        'click',
        () => this.switchTab('form'),
        { description: 'TaskModal form tab' }
      );
      this.eventListeners.push(formTabListener);
    }
    
    // Preview tab
    const previewTabBtn = this.modalElement.querySelector('#preview-tab');
    if (previewTabBtn) {
      const previewTabListener = SafeEventListener.add(
        previewTabBtn,
        'click',
        () => this.switchTab('preview'),
        { description: 'TaskModal preview tab' }
      );
      this.eventListeners.push(previewTabListener);
    }
    
    // === Form Input Events ===
    
    // Task name validation on input
    const taskNameInput = this.modalElement.querySelector('#task-name');
    const taskNameListener = SafeEventListener.add(
      taskNameInput,
      'input',
      () => this.validateFieldRealTime('task-name'),
      { description: 'TaskModal task name validation' }
    );
    this.eventListeners.push(taskNameListener);
    
    // Duration validation and auto-update minimum duration
    const durationInput = this.modalElement.querySelector('#duration');
    const durationInputListener = SafeEventListener.add(
      durationInput,
      'input',
      () => {
        const duration = parseInt(durationInput.value) || 30;
        const minDurationInput = this.modalElement.querySelector('#min-duration');
        if (!minDurationInput.value || parseInt(minDurationInput.value) > duration) {
          minDurationInput.value = Math.max(5, Math.floor(duration * 0.5));
        }
        this.validateFieldRealTime('duration');
      },
      { description: 'TaskModal duration input and validation' }
    );
    this.eventListeners.push(durationInputListener);
    
    // Scheduling type change
    const schedulingRadios = this.modalElement.querySelectorAll('input[name="scheduling-type"]');
    schedulingRadios.forEach(radio => {
      const radioListener = SafeEventListener.add(
        radio,
        'change',
        () => this.handleSchedulingTypeChange(),
        { description: 'TaskModal scheduling type radio' }
      );
      this.eventListeners.push(radioListener);
    });
    
    // === Enhanced Dependency Management ===
    
    // Add dependency button
    const addDepBtn = this.modalElement.querySelector('#add-dependency-btn');
    if (addDepBtn) {
      const addDepListener = SafeEventListener.add(
        addDepBtn,
        'click',
        () => this.handleAddDependency(),
        { description: 'TaskModal add dependency button' }
      );
      this.eventListeners.push(addDepListener);
    }
    
    // Remove dependency buttons (delegated event handling)
    const dependenciesContainer = this.modalElement.querySelector('#selected-dependencies');
    if (dependenciesContainer) {
      const removeDepsListener = SafeEventListener.add(
        dependenciesContainer,
        'click',
        (e) => {
          if (e.target.classList.contains('remove-dependency-btn')) {
            const depId = e.target.dataset.dependencyId;
            this.handleRemoveDependency(depId);
          }
        },
        { description: 'TaskModal remove dependency buttons' }
      );
      this.eventListeners.push(removeDepsListener);
    }
    
    // === Enhanced Recurrence Management ===
    
    // Recurrence frequency change
    const recurrenceSelect = this.modalElement.querySelector('#recurrence-frequency');
    const recurrenceListener = SafeEventListener.add(
      recurrenceSelect,
      'change',
      () => this.handleRecurrenceChange(),
      { description: 'TaskModal recurrence frequency select' }
    );
    this.eventListeners.push(recurrenceListener);
    
    // Weekly days checkboxes
    const weekdayCheckboxes = this.modalElement.querySelectorAll('.weekday-checkbox');
    weekdayCheckboxes.forEach(checkbox => {
      const checkboxListener = SafeEventListener.add(
        checkbox,
        'change',
        () => this.handleWeekdayChange(),
        { description: 'TaskModal weekday checkbox' }
      );
      this.eventListeners.push(checkboxListener);
    });
    
    // Recurrence interval validation
    const intervalInput = this.modalElement.querySelector('#recurrence-interval');
    if (intervalInput) {
      const intervalListener = SafeEventListener.add(
        intervalInput,
        'input',
        () => this.validateFieldRealTime('recurrence-interval'),
        { description: 'TaskModal recurrence interval validation' }
      );
      this.eventListeners.push(intervalListener);
    }
    
    // Date range validation
    const startDateInput = this.modalElement.querySelector('#recurrence-start');
    const endDateInput = this.modalElement.querySelector('#recurrence-end');
    
    if (startDateInput) {
      const startDateListener = SafeEventListener.add(
        startDateInput,
        'change',
        () => this.validateDateRange(),
        { description: 'TaskModal start date validation' }
      );
      this.eventListeners.push(startDateListener);
    }
    
    if (endDateInput) {
      const endDateListener = SafeEventListener.add(
        endDateInput,
        'change',
        () => this.validateDateRange(),
        { description: 'TaskModal end date validation' }
      );
      this.eventListeners.push(endDateListener);
    }
    
    // === Action Buttons ===
    
    // Validate button
    const validateBtn = this.modalElement.querySelector('#validate-btn');
    if (validateBtn) {
      const validateListener = SafeEventListener.add(
        validateBtn,
        'click',
        () => this.handleValidateTemplate(),
        { description: 'TaskModal validate button' }
      );
      this.eventListeners.push(validateListener);
    }
    
    // Form submission
    const formListener = SafeEventListener.add(
      this.modalElement.querySelector('#task-form'),
      'submit',
      (e) => {
        e.preventDefault();
        this.handleSubmit();
      },
      { description: 'TaskModal form submission' }
    );
    this.eventListeners.push(formListener);
    
    // Edit mode specific actions
    if (this.mode === 'edit') {
      const copyBtn = this.modalElement.querySelector('#copy-task-btn');
      if (copyBtn) {
        const copyListener = SafeEventListener.add(
          copyBtn,
          'click',
          () => this.handleCopyTask(),
          { description: 'TaskModal copy task button' }
        );
        this.eventListeners.push(copyListener);
      }
      
      const deleteBtn = this.modalElement.querySelector('#delete-task-btn');
      if (deleteBtn) {
        const deleteListener = SafeEventListener.add(
          deleteBtn,
          'click',
          () => this.handleDeleteTask(),
          { description: 'TaskModal delete task button' }
        );
        this.eventListeners.push(deleteListener);
      }
    }
    
    // === Preview Events ===
    
    // Refresh preview button
    const refreshPreviewBtn = this.modalElement.querySelector('#refresh-preview-btn');
    if (refreshPreviewBtn) {
      const refreshListener = SafeEventListener.add(
        refreshPreviewBtn,
        'click',
        () => this.refreshPreview(),
        { description: 'TaskModal refresh preview button' }
      );
      this.eventListeners.push(refreshListener);
    }
    
    // Generate test instances button
    const generateTestBtn = this.modalElement.querySelector('#generate-test-instances-btn');
    if (generateTestBtn) {
      const generateListener = SafeEventListener.add(
        generateTestBtn,
        'click',
        () => this.handleGenerateTestInstances(),
        { description: 'TaskModal generate test instances button' }
      );
      this.eventListeners.push(generateListener);
    }
  }

  /**
   * Handle scheduling type change
   */
  handleSchedulingTypeChange() {
    const flexibleChecked = this.modalElement.querySelector('input[value="flexible"]').checked;
    const fixedTimeGroup = this.modalElement.querySelector('#fixed-time-group');
    const timeWindowGroup = this.modalElement.querySelector('#time-window-group');
    
    if (flexibleChecked) {
      fixedTimeGroup.style.display = 'none';
      timeWindowGroup.style.display = 'block';
    } else {
      fixedTimeGroup.style.display = 'block';
      timeWindowGroup.style.display = 'none';
    }
  }

  /**
   * Handle recurrence frequency change
   */
  handleRecurrenceChange() {
    const frequency = this.modalElement.querySelector('#recurrence-frequency').value;
    const detailsGroup = this.modalElement.querySelector('#recurrence-details');
    const intervalLabel = this.modalElement.querySelector('#interval-label');
    
    if (frequency === 'none') {
      detailsGroup.style.display = 'none';
    } else {
      detailsGroup.style.display = 'block';
      intervalLabel.textContent = this.getIntervalLabel(frequency);
    }
  }

  /**
   * Validate duration input
   */
  validateDuration() {
    const durationInput = this.modalElement.querySelector('#duration');
    const duration = parseInt(durationInput.value);
    
    if (!duration || duration < 1 || duration > 480) {
      this.showValidationError('duration', 'Duration must be between 1 and 480 minutes.');
      return false;
    }
    
    this.clearValidationError('duration');
    return true;
  }

  /**
   * Handle form submission
   */
  async handleSubmit() {
    try {
      // Clear previous validation errors
      this.clearAllValidationErrors();
      
      // Get form data
      const formData = this.getFormData();
      
      // Validate form data
      if (!this.validateFormData(formData)) {
        return; // Validation failed
      }
      
      // Show loading state
      const saveBtn = this.modalElement.querySelector('#save-btn');
      const originalText = saveBtn.textContent;
      saveBtn.textContent = 'Saving...';
      saveBtn.disabled = true;
      
      let result;
      if (this.mode === 'edit') {
        result = await taskTemplateManager.updateTemplate(this.currentTask.id, formData);
      } else {
        result = await taskTemplateManager.createTemplate(formData);
      }
      
      // Success
      SimpleErrorHandler.showSuccess(`Task ${this.mode === 'edit' ? 'updated' : 'created'} successfully!`);
      
      // Call onSave callback if provided
      if (this.onSave) {
        this.onSave(result);
      }
      
      // Hide modal
      this.hide();
      
    } catch (error) {
      console.error('Error saving task:', error);
      SimpleErrorHandler.showError(`Failed to ${this.mode} task. ${error.message}`, error);
      
      // Restore button state
      const saveBtn = this.modalElement.querySelector('#save-btn');
      saveBtn.textContent = this.mode === 'edit' ? 'Save Changes' : 'Create Task';
      saveBtn.disabled = false;
    }
  }

  /**
   * Get form data as object (legacy compatibility method)
   */
  getFormData() {
    // Use enhanced form data for full compatibility
    return this.getEnhancedFormData();
  }

  /**
   * Get enhanced form data including all new fields
   */
  getEnhancedFormData() {
    return {
      taskName: this.modalElement.querySelector('#task-name').value.trim(),
      description: this.modalElement.querySelector('#task-description').value.trim(),
      durationMinutes: parseInt(this.modalElement.querySelector('#duration').value) || 30,
      minDurationMinutes: parseInt(this.modalElement.querySelector('#min-duration').value) || 15,
      priority: parseInt(this.modalElement.querySelector('#priority').value) || 3,
      isMandatory: this.modalElement.querySelector('#is-mandatory').checked,
      schedulingType: this.modalElement.querySelector('input[name="scheduling-type"]:checked')?.value || 'flexible',
      defaultTime: this.modalElement.querySelector('#default-time').value,
      timeWindow: this.modalElement.querySelector('#time-window').value || 'anytime',
      dependsOn: Array.from(this.selectedDependencies),
      isActive: this.modalElement.querySelector('#is-active').checked,
      recurrenceRule: {
        frequency: this.modalElement.querySelector('#recurrence-frequency').value || 'none',
        interval: parseInt(this.modalElement.querySelector('#recurrence-interval')?.value) || 1,
        startDate: this.modalElement.querySelector('#recurrence-start')?.value || null,
        endDate: this.modalElement.querySelector('#recurrence-end')?.value || null,
        endAfterOccurrences: parseInt(this.modalElement.querySelector('#end-after-occurrences')?.value) || null,
        daysOfWeek: Array.from(this.recurrenceWeekdays),
        dayOfMonth: parseInt(this.modalElement.querySelector('#day-of-month')?.value) || null,
        month: parseInt(this.modalElement.querySelector('#recurrence-month')?.value) || null,
        customPattern: {
          type: this.modalElement.querySelector('#custom-pattern-type')?.value || null
        }
      }
    };
  }

  /**
   * Get human-readable recurrence description
   */
  getRecurrenceDescription(recurrenceRule) {
    if (!recurrenceRule || recurrenceRule.frequency === 'none') {
      return 'One-time task';
    }
    
    const { frequency, interval, daysOfWeek, dayOfMonth, month, customPattern } = recurrenceRule;
    
    let description = '';
    
    switch (frequency) {
      case 'daily':
        description = interval === 1 ? 'Daily' : `Every ${interval} days`;
        break;
        
      case 'weekly':
        if (daysOfWeek && daysOfWeek.length > 0) {
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const selectedDays = daysOfWeek.map(day => dayNames[day]).join(', ');
          description = interval === 1 ? 
            `Weekly on ${selectedDays}` : 
            `Every ${interval} weeks on ${selectedDays}`;
        } else {
          description = interval === 1 ? 'Weekly' : `Every ${interval} weeks`;
        }
        break;
        
      case 'monthly':
        if (dayOfMonth === -1) {
          description = interval === 1 ? 
            'Monthly on the last day' : 
            `Every ${interval} months on the last day`;
        } else if (dayOfMonth) {
          description = interval === 1 ? 
            `Monthly on the ${dayOfMonth}${this.getOrdinalSuffix(dayOfMonth)}` : 
            `Every ${interval} months on the ${dayOfMonth}${this.getOrdinalSuffix(dayOfMonth)}`;
        } else {
          description = interval === 1 ? 'Monthly' : `Every ${interval} months`;
        }
        break;
        
      case 'yearly':
        description = interval === 1 ? 'Yearly' : `Every ${interval} years`;
        if (month && dayOfMonth) {
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                             'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          description += ` on ${monthNames[month - 1]} ${dayOfMonth}${this.getOrdinalSuffix(dayOfMonth)}`;
        }
        break;
        
      case 'custom':
        if (customPattern?.type === 'weekdays') {
          description = 'Weekdays only (Mon-Fri)';
        } else if (customPattern?.type === 'weekends') {
          description = 'Weekends only (Sat-Sun)';
        } else if (customPattern?.type === 'nth_weekday') {
          description = 'Custom nth weekday pattern';
        } else {
          description = 'Custom pattern';
        }
        break;
        
      default:
        description = 'Unknown pattern';
    }
    
    // Add date range information
    if (recurrenceRule.startDate || recurrenceRule.endDate) {
      const startText = recurrenceRule.startDate ? 
        ` starting ${new Date(recurrenceRule.startDate).toLocaleDateString()}` : '';
      const endText = recurrenceRule.endDate ? 
        ` until ${new Date(recurrenceRule.endDate).toLocaleDateString()}` : '';
      description += startText + endText;
    }
    
    if (recurrenceRule.endAfterOccurrences) {
      description += ` (${recurrenceRule.endAfterOccurrences} occurrences)`;
    }
    
    return description;
  }

  /**
   * Get dependency names from IDs
   */
  getDependencyNames(depIds) {
    const allTasks = state.getTaskTemplates();
    return depIds
      .map(id => {
        const task = allTasks.find(t => t.id === id);
        return task ? task.taskName : `Unknown Task (${id})`;
      })
      .filter(name => name);
  }

  /**
   * Generate test task instances for preview
   */
  async generateTestTaskInstances(formData, days = 7) {
    const instances = [];
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    
    try {
      // If it's a one-time task, just create one instance
      if (formData.recurrenceRule.frequency === 'none') {
        const instance = {
          id: 'test-' + Date.now(),
          taskName: formData.taskName,
          description: formData.description,
          durationMinutes: formData.durationMinutes,
          priority: formData.priority,
          isMandatory: formData.isMandatory,
          schedulingType: formData.schedulingType,
          defaultTime: formData.defaultTime,
          timeWindow: formData.timeWindow,
          dependsOn: formData.dependsOn,
          date: new Date().toISOString().split('T')[0],
          isActive: true,
          isTest: true
        };
        instances.push(instance);
      } else {
        // Generate recurring instances
        for (let i = 0; i < days; i++) {
          const currentDate = new Date(startDate);
          currentDate.setDate(currentDate.getDate() + i);
          
          if (this.shouldGenerateInstanceForDate(currentDate, formData.recurrenceRule)) {
            const instance = {
              id: 'test-' + Date.now() + '-' + i,
              taskName: formData.taskName,
              description: formData.description,
              durationMinutes: formData.durationMinutes,
              priority: formData.priority,
              isMandatory: formData.isMandatory,
              schedulingType: formData.schedulingType,
              defaultTime: formData.defaultTime,
              timeWindow: formData.timeWindow,
              dependsOn: formData.dependsOn,
              date: currentDate.toISOString().split('T')[0],
              isActive: true,
              isTest: true
            };
            instances.push(instance);
          }
        }
      }
      
    } catch (error) {
      console.error('Error generating test instances:', error);
    }
    
    return instances;
  }

  /**
   * Check if an instance should be generated for a specific date
   */
  shouldGenerateInstanceForDate(date, recurrenceRule) {
    if (!recurrenceRule || recurrenceRule.frequency === 'none') {
      return false;
    }
    
    const dayOfWeek = date.getDay();
    
    switch (recurrenceRule.frequency) {
      case 'daily':
        return true; // For simplicity, generate daily for test
        
      case 'weekly':
        if (recurrenceRule.daysOfWeek && recurrenceRule.daysOfWeek.length > 0) {
          return recurrenceRule.daysOfWeek.includes(dayOfWeek);
        }
        return dayOfWeek === new Date().getDay(); // Same day as today
        
      case 'monthly':
        return date.getDate() === new Date().getDate(); // Same day of month
        
      case 'yearly':
        const today = new Date();
        return date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
        
      case 'custom':
        if (recurrenceRule.customPattern?.type === 'weekdays') {
          return dayOfWeek >= 1 && dayOfWeek <= 5; // Mon-Fri
        } else if (recurrenceRule.customPattern?.type === 'weekends') {
          return dayOfWeek === 0 || dayOfWeek === 6; // Sat-Sun
        }
        return false;
        
      default:
        return false;
    }
  }

  /**
   * Display test instances in the preview
   */
  displayTestInstances(testInstances) {
    const previewContent = this.modalElement.querySelector('#preview-content');
    if (!previewContent) return;
    
    if (testInstances.length === 0) {
      previewContent.innerHTML += `
        <div class="test-instances">
          <h4>🧪 Test Instances</h4>
          <div class="no-instances">No instances would be generated for the next 7 days.</div>
        </div>
      `;
      return;
    }
    
    const instancesHtml = `
      <div class="test-instances">
        <h4>🧪 Test Instances (Next 7 Days)</h4>
        <div class="instances-list">
          ${testInstances.map(instance => `
            <div class="instance-item">
              <div class="instance-date">📅 ${new Date(instance.date).toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
              })}</div>
              <div class="instance-details">
                <div class="instance-name">${this.escapeHtml(instance.taskName)}</div>
                <div class="instance-meta">
                  ${instance.durationMinutes}min • Priority ${instance.priority} • 
                  ${instance.schedulingType === 'fixed' ? 
                    `Fixed at ${instance.defaultTime}` : 
                    `Flexible (${TIME_WINDOWS[instance.timeWindow]?.label})`}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    
    // Add or update test instances section
    const existingTestSection = previewContent.querySelector('.test-instances');
    if (existingTestSection) {
      existingTestSection.outerHTML = instancesHtml;
    } else {
      previewContent.innerHTML += instancesHtml;
    }
  }

  /**
   * Validate form data
   */
  validateFormData(formData) {
    let isValid = true;
    
    // Validate task name
    if (!formData.taskName) {
      this.showValidationError('task-name', 'Task name is required.');
      isValid = false;
    }
    
    // Validate duration
    if (!formData.durationMinutes || formData.durationMinutes < 1 || formData.durationMinutes > 480) {
      this.showValidationError('duration', 'Duration must be between 1 and 480 minutes.');
      isValid = false;
    }
    
    // Validate priority
    if (!formData.priority || formData.priority < 1 || formData.priority > 5) {
      this.showValidationError('priority', 'Priority must be between 1 and 5.');
      isValid = false;
    }
    
    // Validate fixed time if scheduling type is fixed
    if (formData.schedulingType === 'fixed' && !formData.defaultTime) {
      this.showValidationError('default-time', 'Fixed time is required for fixed scheduling.');
      isValid = false;
    }
    
    return isValid;
  }

  /**
   * Show validation error
   */
  showValidationError(fieldId, message) {
    const field = this.modalElement.querySelector(`#${fieldId}`);
    const errorDiv = this.modalElement.querySelector(`#${fieldId}-error`);
    
    if (field) {
      field.classList.add('error');
    }
    
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
    }
  }

  /**
   * Clear validation error
   */
  clearValidationError(fieldId) {
    const field = this.modalElement.querySelector(`#${fieldId}`);
    const errorDiv = this.modalElement.querySelector(`#${fieldId}-error`);
    
    if (field) {
      field.classList.remove('error');
    }
    
    if (errorDiv) {
      errorDiv.style.display = 'none';
      errorDiv.textContent = '';
    }
  }

  /**
   * Clear all validation errors
   */
  clearAllValidationErrors() {
    this.modalElement.querySelectorAll('.validation-error').forEach(errorDiv => {
      errorDiv.style.display = 'none';
      errorDiv.textContent = '';
    });
    
    this.modalElement.querySelectorAll('.input.error').forEach(input => {
      input.classList.remove('error');
    });
  }

  /**
   * Handle copy task button
   */
  async handleCopyTask() {
    try {
      const copiedTask = await taskTemplateManager.duplicateTemplate(this.currentTask.id);
      SimpleErrorHandler.showSuccess('Task copied successfully!');
      
      if (this.onSave) {
        this.onSave(copiedTask);
      }
      
      this.hide();
    } catch (error) {
      console.error('Error copying task:', error);
      SimpleErrorHandler.showError('Failed to copy task. Please try again.', error);
    }
  }

  /**
   * Handle delete task button
   */
  async handleDeleteTask() {
    const confirmed = confirm('Are you sure you want to delete this task? This action cannot be undone.');
    
    if (confirmed) {
      try {
        await taskTemplateManager.deleteTemplate(this.currentTask.id);
        SimpleErrorHandler.showSuccess('Task deleted successfully!');
        
        if (this.onSave) {
          this.onSave(null, 'deleted');
        }
        
        this.hide();
      } catch (error) {
        console.error('Error deleting task:', error);
        SimpleErrorHandler.showError('Failed to delete task. Please try again.', error);
      }
    }
  }

  /**
   * Switch between form and preview tabs
   */
  switchTab(tabName) {
    const formTab = this.modalElement.querySelector('#form-tab');
    const previewTab = this.modalElement.querySelector('#preview-tab');
    const formView = this.modalElement.querySelector('#form-view');
    const previewView = this.modalElement.querySelector('#preview-view');
    
    if (tabName === 'form') {
      formTab.classList.add('active');
      previewTab.classList.remove('active');
      formView.style.display = 'block';
      previewView.style.display = 'none';
      this.showPreview = false;
    } else if (tabName === 'preview') {
      formTab.classList.remove('active');
      previewTab.classList.add('active');
      formView.style.display = 'none';
      previewView.style.display = 'block';
      this.showPreview = true;
      
      // Generate preview when switching to preview tab
      this.refreshPreview();
    }
  }

  /**
   * Real-time field validation
   */
  async validateFieldRealTime(fieldId) {
    const field = this.modalElement.querySelector(`#${fieldId}`);
    if (!field) return;
    
    const value = field.value.trim();
    let isValid = true;
    let errorMessage = '';
    
    try {
      switch (fieldId) {
        case 'task-name':
          if (!value) {
            isValid = false;
            errorMessage = 'Task name is required.';
          } else if (value.length > 100) {
            isValid = false;
            errorMessage = 'Task name must be 100 characters or less.';
          } else {
            // Check for existing task names (only in create mode)
            if (this.mode === 'create') {
              const existingTasks = state.getTaskTemplates();
              const nameExists = existingTasks.some(task => 
                task.taskName.toLowerCase() === value.toLowerCase()
              );
              if (nameExists) {
                isValid = false;
                errorMessage = 'A task with this name already exists.';
              }
            }
          }
          break;
          
        case 'duration':
          const duration = parseInt(value);
          if (!duration || isNaN(duration)) {
            isValid = false;
            errorMessage = 'Duration is required.';
          } else if (duration < 1) {
            isValid = false;
            errorMessage = 'Duration must be at least 1 minute.';
          } else if (duration > 480) {
            isValid = false;
            errorMessage = 'Duration cannot exceed 8 hours (480 minutes).';
          }
          break;
          
        case 'recurrence-interval':
          const interval = parseInt(value);
          if (interval && (isNaN(interval) || interval < 1)) {
            isValid = false;
            errorMessage = 'Interval must be a positive number.';
          } else if (interval > 365) {
            isValid = false;
            errorMessage = 'Interval cannot exceed 365.';
          }
          break;
      }
      
      // Apply validation result
      if (isValid) {
        this.clearValidationError(fieldId);
      } else {
        this.showValidationError(fieldId, errorMessage);
      }
      
    } catch (error) {
      console.error('Real-time validation error:', error);
    }
  }

  /**
   * Handle adding a dependency
   */
  handleAddDependency() {
    const dependencySelect = this.modalElement.querySelector('#dependency-select');
    const selectedValue = dependencySelect.value;
    
    if (!selectedValue) {
      SimpleErrorHandler.showWarning('Please select a task to add as dependency.');
      return;
    }
    
    // Check if dependency already exists
    if (this.selectedDependencies.has(selectedValue)) {
      SimpleErrorHandler.showWarning('This dependency is already added.');
      return;
    }
    
    // Check for circular dependency
    const currentTaskId = this.currentTask?.id;
    if (this.wouldCreateCircularDependency(selectedValue, currentTaskId)) {
      SimpleErrorHandler.showError('Cannot add this dependency as it would create a circular reference.');
      return;
    }
    
    // Add dependency
    this.selectedDependencies.add(selectedValue);
    
    // Update UI
    const dependenciesContainer = this.modalElement.querySelector('#selected-dependencies');
    dependenciesContainer.innerHTML = this.renderSelectedDependencies();
    
    // Reset select
    dependencySelect.value = '';
    
    // Clear any existing validation errors
    this.clearValidationError('dependencies');
  }

  /**
   * Handle removing a dependency
   */
  handleRemoveDependency(depId) {
    if (!depId) return;
    
    // Remove from selected dependencies
    this.selectedDependencies.delete(depId);
    
    // Update UI
    const dependenciesContainer = this.modalElement.querySelector('#selected-dependencies');
    dependenciesContainer.innerHTML = this.renderSelectedDependencies();
  }

  /**
   * Handle weekday selection changes for weekly recurrence
   */
  handleWeekdayChange() {
    // Update the internal state based on checkbox selections
    this.recurrenceWeekdays.clear();
    
    const checkboxes = this.modalElement.querySelectorAll('.weekday-checkbox:checked');
    checkboxes.forEach(checkbox => {
      this.recurrenceWeekdays.add(parseInt(checkbox.value));
    });
  }

  /**
   * Validate date range for recurrence
   */
  validateDateRange() {
    const startDateInput = this.modalElement.querySelector('#recurrence-start');
    const endDateInput = this.modalElement.querySelector('#recurrence-end');
    
    const startDate = startDateInput?.value;
    const endDate = endDateInput?.value;
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (end <= start) {
        this.showValidationError('recurrence-end', 'End date must be after start date.');
        return false;
      } else {
        this.clearValidationError('recurrence-end');
      }
    }
    
    return true;
  }

  /**
   * Handle template validation
   */
  async handleValidateTemplate() {
    try {
      const validateBtn = this.modalElement.querySelector('#validate-btn');
      const originalText = validateBtn.textContent;
      
      // Show loading state
      validateBtn.textContent = '⏳ Validating...';
      validateBtn.disabled = true;
      
      // Get current form data
      const formData = this.getEnhancedFormData();
      
      // Use TaskValidation utility
      this.validationResult = taskValidation.validateTemplate(formData);
      
      // Show validation status
      this.showValidationStatus();
      
      // Restore button
      validateBtn.textContent = originalText;
      validateBtn.disabled = false;
      
    } catch (error) {
      console.error('Template validation error:', error);
      SimpleErrorHandler.showError('Validation failed. Please try again.', error);
      
      // Restore button
      const validateBtn = this.modalElement.querySelector('#validate-btn');
      validateBtn.textContent = '✅ Validate';
      validateBtn.disabled = false;
    }
  }

  /**
   * Show validation status in the UI
   */
  showValidationStatus() {
    const statusDiv = this.modalElement.querySelector('#validation-status');
    if (!statusDiv || !this.validationResult) return;
    
    const { isValid, errors, warnings } = this.validationResult;
    
    let statusHtml = '';
    let statusClass = '';
    
    if (isValid) {
      statusClass = 'validation-success';
      statusHtml = `
        <div class="validation-message">
          ✅ Template validation passed successfully!
        </div>
      `;
    } else {
      statusClass = 'validation-error';
      statusHtml = `
        <div class="validation-message">
          ❌ Template validation failed
        </div>
      `;
      
      if (errors.length > 0) {
        statusHtml += `
          <div class="validation-errors">
            <strong>Errors:</strong>
            <ul>
              ${errors.map(error => `<li>${this.escapeHtml(error)}</li>`).join('')}
            </ul>
          </div>
        `;
      }
    }
    
    if (warnings.length > 0) {
      statusHtml += `
        <div class="validation-warnings">
          <strong>Warnings:</strong>
          <ul>
            ${warnings.map(warning => `<li>${this.escapeHtml(warning)}</li>`).join('')}
          </ul>
        </div>
      `;
    }
    
    statusDiv.className = `validation-status ${statusClass}`;
    statusDiv.innerHTML = statusHtml;
    statusDiv.style.display = 'block';
  }

  /**
   * Refresh the template preview
   */
  async refreshPreview() {
    if (!this.showPreview) return;
    
    try {
      const previewContent = this.modalElement.querySelector('#preview-content');
      if (!previewContent) return;
      
      // Show loading state
      previewContent.innerHTML = '<div class="loading-spinner">🔄 Generating preview...</div>';
      
      // Get current form data
      const formData = this.getEnhancedFormData();
      
      // Generate preview HTML
      const previewHtml = this.generateTemplatePreview(formData);
      
      // Update content
      previewContent.innerHTML = previewHtml;
      
    } catch (error) {
      console.error('Preview generation error:', error);
      const previewContent = this.modalElement.querySelector('#preview-content');
      previewContent.innerHTML = `
        <div class="preview-error">
          ⚠️ Failed to generate preview: ${error.message}
        </div>
      `;
    }
  }

  /**
   * Generate template preview HTML
   */
  generateTemplatePreview(formData) {
    const recurrenceDescription = this.getRecurrenceDescription(formData.recurrenceRule);
    const dependencyNames = this.getDependencyNames(Array.from(this.selectedDependencies));
    
    return `
      <div class="template-preview">
        <div class="preview-section">
          <h4>📝 Basic Information</h4>
          <div class="preview-item">
            <strong>Name:</strong> ${this.escapeHtml(formData.taskName || 'Untitled Task')}
          </div>
          <div class="preview-item">
            <strong>Description:</strong> ${this.escapeHtml(formData.description || 'No description')}
          </div>
          <div class="preview-item">
            <strong>Status:</strong> ${formData.isActive ? '✅ Active' : '⏸️ Inactive'}
          </div>
        </div>
        
        <div class="preview-section">
          <h4>⏱️ Duration & Priority</h4>
          <div class="preview-item">
            <strong>Duration:</strong> ${formData.durationMinutes} minutes
          </div>
          <div class="preview-item">
            <strong>Minimum Duration:</strong> ${formData.minDurationMinutes} minutes
          </div>
          <div class="preview-item">
            <strong>Priority:</strong> ${formData.priority} ${this.getPriorityLabel(formData.priority)}
          </div>
          <div class="preview-item">
            <strong>Type:</strong> ${formData.isMandatory ? '🔒 Mandatory' : '📋 Optional'}
          </div>
        </div>
        
        <div class="preview-section">
          <h4>📅 Scheduling</h4>
          <div class="preview-item">
            <strong>Type:</strong> ${formData.schedulingType === 'fixed' ? '🕒 Fixed Time' : '🤖 Flexible'}
          </div>
          ${formData.schedulingType === 'fixed' ? `
            <div class="preview-item">
              <strong>Fixed Time:</strong> ${formData.defaultTime || 'Not set'}
            </div>
          ` : `
            <div class="preview-item">
              <strong>Preferred Window:</strong> ${TIME_WINDOWS[formData.timeWindow]?.label || formData.timeWindow}
            </div>
          `}
        </div>
        
        ${dependencyNames.length > 0 ? `
          <div class="preview-section">
            <h4>🔗 Dependencies</h4>
            <div class="preview-item">
              <strong>Depends on:</strong>
              <ul class="dependency-list">
                ${dependencyNames.map(name => `<li>${this.escapeHtml(name)}</li>`).join('')}
              </ul>
            </div>
          </div>
        ` : ''}
        
        <div class="preview-section">
          <h4>🔄 Recurrence</h4>
          <div class="preview-item">
            <strong>Pattern:</strong> ${recurrenceDescription}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Handle generating test instances
   */
  async handleGenerateTestInstances() {
    try {
      const generateBtn = this.modalElement.querySelector('#generate-test-instances-btn');
      const originalText = generateBtn.textContent;
      
      // Show loading state
      generateBtn.textContent = '⏳ Generating...';
      generateBtn.disabled = true;
      
      // Get current form data
      const formData = this.getEnhancedFormData();
      
      // Generate test instances for the next 7 days
      const testInstances = await this.generateTestTaskInstances(formData, 7);
      
      // Display test instances
      this.displayTestInstances(testInstances);
      
      // Restore button
      generateBtn.textContent = originalText;
      generateBtn.disabled = false;
      
    } catch (error) {
      console.error('Test instance generation error:', error);
      SimpleErrorHandler.showError('Failed to generate test instances.', error);
      
      // Restore button
      const generateBtn = this.modalElement.querySelector('#generate-test-instances-btn');
      generateBtn.textContent = '🧪 Generate Test Instances';
      generateBtn.disabled = false;
    }
  }

  /**
   * Handle keyboard events
   */
  handleKeydown(e) {
    if (e.key === 'Escape' && this.modalElement) {
      this.hide();
    }
  }

  /**
   * Show modal
   */
  show() {
    if (this.modalElement) {
      this.modalElement.style.display = 'flex';
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
  }

  /**
   * Hide modal
   */
  hide() {
    if (this.modalElement) {
      this.modalElement.style.display = 'none';
      document.body.style.overflow = ''; // Restore scrolling
    }
    
    // Call onCancel if provided
    if (this.onCancel) {
      this.onCancel();
    }
  }

  /**
   * Destroy modal and clean up
   */
  destroy() {
    if (this.modalElement) {
      // Clear all tracked event listeners
      this.eventListeners.forEach(listenerId => {
        SafeEventListener.remove(listenerId);
      });
      this.eventListeners = [];
      
      // Clear all tracked timeouts
      this.timeouts.forEach(timeoutId => {
        SafeTimeout.clear(timeoutId);
      });
      this.timeouts = [];
      
      // Remove element from DOM
      this.modalElement.remove();
      this.modalElement = null;
      document.body.style.overflow = ''; // Restore scrolling
      
      // Unregister from memory manager
      ComponentManager.unregister(this);
    }
  }
}

// Create global instance for easy access
export const taskModal = new TaskModal();

console.log('✅ Task modal component initialized');