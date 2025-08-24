/**
 * Task Modal Component
 * 
 * Unified task creation and editing modal component
 * Handles all task properties and actions (create, edit, copy, delete, etc.)
 */

import { state } from '../state.js';
import { taskTemplateManager, TIME_WINDOWS } from '../taskLogic.js';
import { SimpleValidation } from '../utils/SimpleValidation.js';
import { SimpleErrorHandler } from '../utils/SimpleErrorHandler.js';
import { dataUtils } from '../data.js';
import { SafeTimeout, SafeEventListener, ComponentManager } from '../utils/MemoryLeakPrevention.js';

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
      dependsOn: null,
      recurrenceRule: {
        frequency: 'none',
        interval: 1,
        endDate: null,
        endAfterOccurrences: null,
        daysOfWeek: []
      },
      ...defaultValues
    };
    
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
   * Get modal HTML template
   */
  getModalHTML(taskData) {
    const isEdit = this.mode === 'edit';
    const modalTitle = isEdit ? 'Edit Task' : 'Create Task';
    const saveButtonText = isEdit ? 'Save Changes' : 'Create Task';
    
    return `
      <div class="modal">
        <div class="modal-header">
          <h2>${modalTitle}</h2>
          <button type="button" class="modal-close" id="modal-close">×</button>
        </div>
        
        <form id="task-form" class="modal-form">
          <!-- Basic Information -->
          <div class="form-section">
            <h3>Task Information</h3>
            
            <div class="form-group">
              <label for="task-name" class="label required">Task Name</label>
              <input 
                type="text" 
                id="task-name" 
                class="input" 
                value="${taskData.taskName || ''}"
                placeholder="Enter task name"
                required
              />
              <div class="validation-error" id="task-name-error"></div>
            </div>
            
            <div class="form-group">
              <label for="task-description" class="label">Description (Optional)</label>
              <textarea 
                id="task-description" 
                class="input textarea"
                placeholder="Add notes or details about this task"
                rows="3"
              >${taskData.description || ''}</textarea>
            </div>
          </div>
          
          <!-- Duration and Priority -->
          <div class="form-section">
            <h3>Duration and Priority</h3>
            
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
              </div>
              
              <div class="form-group">
                <label for="min-duration" class="label">Minimum Duration</label>
                <input 
                  type="number" 
                  id="min-duration" 
                  class="input" 
                  value="${taskData.minDurationMinutes || 15}"
                  min="1" 
                  max="480"
                />
                <small class="form-help">For time crunch situations</small>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label for="priority" class="label required">Priority</label>
                <select id="priority" class="input">
                  ${[1,2,3,4,5].map(p => `
                    <option value="${p}" ${taskData.priority === p ? 'selected' : ''}>
                      ${p} ${p === 1 ? '(Lowest)' : p === 5 ? '(Highest)' : ''}
                    </option>
                  `).join('')}
                </select>
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
          
          <!-- Scheduling -->
          <div class="form-section">
            <h3>Scheduling</h3>
            
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
                  <span class="radio-text">Flexible (Smart scheduling)</span>
                </label>
                <label class="radio-label">
                  <input 
                    type="radio" 
                    name="scheduling-type" 
                    value="fixed"
                    ${taskData.schedulingType === 'fixed' ? 'checked' : ''}
                  />
                  <span class="radio-text">Fixed time</span>
                </label>
              </div>
            </div>
            
            <div class="form-group" id="fixed-time-group" style="display: ${taskData.schedulingType === 'fixed' ? 'block' : 'none'}">
              <label for="default-time" class="label">Fixed Time</label>
              <input 
                type="time" 
                id="default-time" 
                class="input" 
                value="${taskData.defaultTime || ''}"
              />
            </div>
            
            <div class="form-group" id="time-window-group" style="display: ${taskData.schedulingType !== 'fixed' ? 'block' : 'none'}">
              <label for="time-window" class="label">Preferred Time Window</label>
              <select id="time-window" class="input">
                ${Object.entries(TIME_WINDOWS).map(([key, window]) => `
                  <option value="${key}" ${taskData.timeWindow === key ? 'selected' : ''}>
                    ${window.label}
                  </option>
                `).join('')}
              </select>
            </div>
          </div>
          
          <!-- Dependencies -->
          <div class="form-section">
            <h3>Dependencies</h3>
            
            <div class="form-group">
              <label for="depends-on" class="label">Depends On</label>
              <select id="depends-on" class="input">
                <option value="">No dependency</option>
                ${this.getDependencyOptions(taskData)}
              </select>
              <small class="form-help">This task must wait for another task to complete</small>
            </div>
          </div>
          
          <!-- Recurrence -->
          <div class="form-section">
            <h3>Recurrence</h3>
            
            <div class="form-group">
              <label for="recurrence-frequency" class="label">Repeat</label>
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
              </select>
            </div>
            
            <div class="form-group" id="recurrence-details" style="display: ${taskData.recurrenceRule.frequency !== 'none' ? 'block' : 'none'}">
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
          </div>
          
          <!-- Modal Actions -->
          <div class="modal-actions">
            <div class="action-buttons-left">
              ${isEdit ? `
                <button type="button" id="copy-task-btn" class="btn btn-secondary">
                  📄 Copy Task
                </button>
                <button type="button" id="delete-task-btn" class="btn" style="background: #EF4444; color: white;">
                  🗑️ Delete
                </button>
              ` : ''}
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
    `;
  }

  /**
   * Get dependency options (other tasks that can be dependencies)
   */
  getDependencyOptions(currentTaskData) {
    const allTasks = state.getTaskTemplates();
    return allTasks
      .filter(task => task.id !== currentTaskData.id) // Exclude current task
      .map(task => `
        <option value="${task.id}" ${currentTaskData.dependsOn === task.id ? 'selected' : ''}>
          ${task.taskName}
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
   * Setup event listeners
   */
  setupEventListeners() {
    if (!this.modalElement) return;
    
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
    
    // Recurrence frequency change
    const recurrenceSelect = this.modalElement.querySelector('#recurrence-frequency');
    const recurrenceListener = SafeEventListener.add(
      recurrenceSelect,
      'change',
      () => this.handleRecurrenceChange(),
      { description: 'TaskModal recurrence frequency select' }
    );
    this.eventListeners.push(recurrenceListener);
    
    // Duration validation
    const durationInput = this.modalElement.querySelector('#duration');
    const durationBlurListener = SafeEventListener.add(
      durationInput,
      'blur',
      () => this.validateDuration(),
      { description: 'TaskModal duration validation' }
    );
    this.eventListeners.push(durationBlurListener);
    
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
    
    // Auto-update minimum duration
    const durationInputListener = SafeEventListener.add(
      durationInput,
      'input',
      () => {
        const duration = parseInt(durationInput.value) || 30;
        const minDurationInput = this.modalElement.querySelector('#min-duration');
        if (!minDurationInput.value || parseInt(minDurationInput.value) > duration) {
          minDurationInput.value = Math.max(5, Math.floor(duration * 0.5));
        }
      },
      { description: 'TaskModal duration input auto-update' }
    );
    this.eventListeners.push(durationInputListener);
    
    // Escape key to close
    const keydownListener = SafeEventListener.add(
      document,
      'keydown',
      this.handleKeydown.bind(this),
      { description: 'TaskModal escape key handler' }
    );
    this.eventListeners.push(keydownListener);
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
   * Get form data as object
   */
  getFormData() {
    const form = this.modalElement.querySelector('#task-form');
    const formData = new FormData(form);
    
    return {
      taskName: this.modalElement.querySelector('#task-name').value.trim(),
      description: this.modalElement.querySelector('#task-description').value.trim(),
      durationMinutes: parseInt(this.modalElement.querySelector('#duration').value),
      minDurationMinutes: parseInt(this.modalElement.querySelector('#min-duration').value),
      priority: parseInt(this.modalElement.querySelector('#priority').value),
      isMandatory: this.modalElement.querySelector('#is-mandatory').checked,
      schedulingType: this.modalElement.querySelector('input[name="scheduling-type"]:checked').value,
      defaultTime: this.modalElement.querySelector('#default-time').value,
      timeWindow: this.modalElement.querySelector('#time-window').value,
      dependsOn: this.modalElement.querySelector('#depends-on').value || null,
      recurrenceRule: {
        frequency: this.modalElement.querySelector('#recurrence-frequency').value,
        interval: parseInt(this.modalElement.querySelector('#recurrence-interval').value) || 1,
        endDate: null,
        endAfterOccurrences: null,
        daysOfWeek: []
      }
    };
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