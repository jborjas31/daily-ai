/**
 * Timeline Component
 * 
 * Responsive timeline grid component for displaying daily schedule
 * Handles hourly grid, time indicator, sleep blocks, and task blocks
 */

import { state } from '../state.js';
import { schedulingEngine, realTimeTaskLogic } from '../taskLogic.js';
import { taskModal } from './TaskModal.js';
import { dataUtils } from '../dataOffline.js';
import { SafeInterval, SafeEventListener, ComponentManager } from '../utils/MemoryLeakPrevention.js';

/**
 * Timeline Component Class
 */
export class Timeline {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = {
      hourHeight: 80, // Default hour height in pixels
      showSeconds: false,
      enableClickToCreate: true,
      enableRealTimeIndicator: true,
      ...options
    };
    
    this.currentDate = dataUtils.getTodayDateString();
    this.scheduleData = null;
    this.realTimeInterval = null;
    this.lastRenderTime = 0;
    this.renderThrottleMs = 1000; // Throttle renders to once per second max
    
    // Memory leak prevention tracking
    this.eventListeners = [];
    
    // Register with memory manager
    ComponentManager.register(this);
    
    this.init();
  }

  /**
   * Initialize timeline component
   */
  init() {
    if (!this.container) {
      console.error('Timeline container not found');
      return;
    }
    
    this.setupEventListeners();
    this.render();
    this.startRealTimeUpdates();
    
    console.log('✅ Timeline component initialized');
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for date changes
    state.stateListeners?.on('date', (newDate) => {
      this.setDate(newDate);
    });
    
    // Listen for task changes
    state.stateListeners?.on('taskTemplates', () => {
      this.refresh();
    });
    
    state.stateListeners?.on('taskInstances', () => {
      this.refresh();
    });
    
    // Window resize for responsive updates
    const resizeListener = SafeEventListener.add(
      window, 
      'resize', 
      this.handleResize.bind(this),
      { description: 'Timeline window resize' }
    );
    this.eventListeners.push(resizeListener);
    
    // Page visibility for performance optimization
    const visibilityListener = SafeEventListener.add(
      document, 
      'visibilitychange', 
      () => {
        if (document.hidden) {
          this.pauseRealTimeUpdates();
        } else {
          this.resumeRealTimeUpdates();
        }
      },
      { description: 'Timeline page visibility' }
    );
    this.eventListeners.push(visibilityListener);
  }

  /**
   * Set current date and refresh timeline
   */
  setDate(date) {
    this.currentDate = date;
    this.refresh();
  }

  /**
   * Refresh timeline data and re-render
   */
  refresh() {
    // Throttle renders to prevent excessive updates
    const now = Date.now();
    if (now - this.lastRenderTime < this.renderThrottleMs) {
      return;
    }
    
    this.lastRenderTime = now;
    this.loadScheduleData();
    this.render();
  }

  /**
   * Load schedule data for current date
   */
  loadScheduleData() {
    try {
      this.scheduleData = schedulingEngine.generateScheduleForDate(this.currentDate);
      console.log('📅 Schedule loaded for', this.currentDate);
    } catch (error) {
      console.error('❌ Error loading schedule data:', error);
      this.scheduleData = {
        success: false,
        error: 'loading_error',
        message: 'Failed to load schedule',
        schedule: []
      };
    }
  }

  /**
   * Render complete timeline
   */
  render() {
    if (!this.container) return;
    
    // Load schedule data if not loaded
    if (!this.scheduleData) {
      this.loadScheduleData();
    }
    
    // Clear container
    this.container.innerHTML = '';
    
    // Create timeline structure
    const timelineHTML = `
      <div class="timeline-wrapper" id="timeline-wrapper">
        <div class="timeline-header">
          ${this.renderTimelineHeader()}
        </div>
        <div class="timeline-grid" id="timeline-grid">
          ${this.renderTimelineGrid()}
        </div>
      </div>
    `;
    
    this.container.innerHTML = timelineHTML;
    
    // Setup timeline-specific event listeners
    this.setupTimelineEventListeners();
    
    // Update responsive sizing
    this.updateResponsiveSizing();
  }

  /**
   * Render timeline header with date navigation and current time
   */
  renderTimelineHeader() {
    const currentTime = new Date().toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      ...(this.options.showSeconds && { second: '2-digit' })
    });
    
    const dateDisplay = new Date(this.currentDate + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    return `
      <div class="timeline-header-content">
        <div class="timeline-date">
          <button id="timeline-prev-day" class="timeline-nav-btn" aria-label="Previous day">‹</button>
          <h2 class="timeline-date-text">${dateDisplay}</h2>
          <button id="timeline-next-day" class="timeline-nav-btn" aria-label="Next day">›</button>
        </div>
        <div class="timeline-time">
          <div class="current-time" id="timeline-current-time">${currentTime}</div>
          <button id="timeline-today-btn" class="btn btn-primary btn-sm">Today</button>
        </div>
      </div>
    `;
  }

  /**
   * Render timeline grid with hours and tasks
   */
  renderTimelineGrid() {
    if (!this.scheduleData) {
      return '<div class="timeline-error">Failed to load schedule data</div>';
    }
    
    if (!this.scheduleData.success) {
      return `
        <div class="timeline-error">
          <h3>⚠️ Schedule Conflict</h3>
          <p>${this.scheduleData.message}</p>
          ${this.scheduleData.suggestions ? `
            <div class="conflict-suggestions">
              <h4>Suggestions:</h4>
              <ul>
                ${this.scheduleData.suggestions.map(s => `<li>${s}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      `;
    }
    
    let gridHTML = '<div class="timeline-hours">';
    
    // Generate 24-hour grid
    for (let hour = 0; hour < 24; hour++) {
      gridHTML += this.renderHourRow(hour);
    }
    
    gridHTML += '</div>';
    
    // Add real-time indicator
    if (this.options.enableRealTimeIndicator) {
      gridHTML += this.renderTimeIndicator();
    }
    
    // Add sleep blocks
    if (this.scheduleData.sleepSchedule) {
      gridHTML += this.renderSleepBlocks(this.scheduleData.sleepSchedule);
    }
    
    // Add task blocks
    if (this.scheduleData.schedule && this.scheduleData.schedule.length > 0) {
      gridHTML += this.renderTaskBlocks(this.scheduleData.schedule);
    }
    
    return gridHTML;
  }

  /**
   * Render single hour row
   */
  renderHourRow(hour) {
    const hourString = hour.toString().padStart(2, '0') + ':00';
    const hourDisplay = new Date(`2000-01-01T${hourString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      hour12: true
    });
    
    return `
      <div class="timeline-hour" data-hour="${hour}" style="height: ${this.options.hourHeight}px;">
        <div class="hour-marker">
          <span class="hour-label">${hourDisplay}</span>
          <span class="hour-time">${hourString}</span>
        </div>
        <div class="hour-content" data-hour="${hour}">
          ${this.options.enableClickToCreate ? 
            `<div class="click-to-create" data-hour="${hour}" title="Click to create task at ${hourString}">+</div>` : 
            ''
          }
        </div>
      </div>
    `;
  }

  /**
   * Render real-time indicator
   */
  renderTimeIndicator() {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const topPosition = (currentMinutes / 60) * this.options.hourHeight;
    
    return `
      <div class="time-indicator" id="time-indicator" style="top: ${topPosition}px;">
        <div class="time-indicator-dot"></div>
        <div class="time-indicator-line"></div>
      </div>
    `;
  }

  /**
   * Render sleep blocks
   */
  renderSleepBlocks(sleepSchedule) {
    const sleepStart = this.timeStringToMinutes(sleepSchedule.sleepTime);
    const sleepEnd = this.timeStringToMinutes(sleepSchedule.wakeTime);
    
    // Handle sleep that crosses midnight
    if (sleepStart > sleepEnd) {
      // Sleep from sleepTime to midnight, then from midnight to wakeTime
      return `
        <div class="sleep-block" style="
          top: ${(sleepStart / 60) * this.options.hourHeight}px;
          height: ${((1440 - sleepStart) / 60) * this.options.hourHeight}px;
        ">
          <div class="sleep-label">💤 Sleep</div>
        </div>
        <div class="sleep-block" style="
          top: 0px;
          height: ${(sleepEnd / 60) * this.options.hourHeight}px;
        ">
          <div class="sleep-label">💤 Sleep</div>
        </div>
      `;
    } else {
      // Normal sleep within same day
      return `
        <div class="sleep-block" style="
          top: ${(sleepStart / 60) * this.options.hourHeight}px;
          height: ${((sleepEnd - sleepStart) / 60) * this.options.hourHeight}px;
        ">
          <div class="sleep-label">💤 Sleep</div>
        </div>
      `;
    }
  }

  /**
   * Render task blocks
   */
  renderTaskBlocks(scheduledTasks) {
    return scheduledTasks.map(task => {
      const startMinutes = this.timeStringToMinutes(task.scheduledTime);
      const topPosition = (startMinutes / 60) * this.options.hourHeight;
      const height = (task.durationMinutes / 60) * this.options.hourHeight;
      
      // Get task status for styling
      const status = this.getTaskStatus(task);
      
      return `
        <div class="task-block ${status.className}" 
             data-task-id="${task.id}"
             style="
               top: ${topPosition}px;
               height: ${height}px;
               z-index: 20;
             ">
          <div class="task-block-content">
            <div class="task-block-header">
              <span class="task-name">${task.taskName}</span>
              <span class="task-time">${task.scheduledTime}</span>
            </div>
            ${task.description ? `
              <div class="task-description">${task.description}</div>
            ` : ''}
            <div class="task-meta">
              <span class="task-duration">${task.durationMinutes}min</span>
              ${task.isMandatory ? '<span class="task-mandatory">🔒</span>' : ''}
              ${task.isAnchor ? '<span class="task-anchor">⚓</span>' : ''}
            </div>
          </div>
          <div class="task-actions">
            <button class="task-action-btn complete-btn" title="Mark complete">✓</button>
            <button class="task-action-btn edit-btn" title="Edit task">✏️</button>
          </div>
          ${status.isOverdue ? `
            <div class="overdue-indicator" title="Task is overdue by ${status.overdueMinutes} minutes">
              ⚠️
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  /**
   * Get task status for styling and indicators
   */
  getTaskStatus(task) {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const taskStartMinutes = this.timeStringToMinutes(task.scheduledTime);
    const taskEndMinutes = taskStartMinutes + task.durationMinutes;
    
    // Check if task is completed
    const currentInstances = state.getTaskInstancesForDate(this.currentDate);
    const instance = currentInstances.find(i => i.templateId === task.id);
    const isCompleted = instance && instance.status === 'completed';
    
    if (isCompleted) {
      return { className: 'completed', isOverdue: false };
    }
    
    // Check if task is overdue
    if (currentMinutes > taskEndMinutes) {
      const overdueMinutes = currentMinutes - taskEndMinutes;
      return { 
        className: task.isMandatory ? 'overdue mandatory' : 'overdue skippable',
        isOverdue: true,
        overdueMinutes
      };
    }
    
    // Check if task is in progress
    if (currentMinutes >= taskStartMinutes && currentMinutes <= taskEndMinutes) {
      return { className: 'in-progress', isOverdue: false };
    }
    
    return { className: 'normal', isOverdue: false };
  }

  /**
   * Setup timeline-specific event listeners
   */
  setupTimelineEventListeners() {
    // Date navigation
    const prevBtn = document.getElementById('timeline-prev-day');
    const nextBtn = document.getElementById('timeline-next-day');
    const todayBtn = document.getElementById('timeline-today-btn');
    
    if (prevBtn) {
      const listener = SafeEventListener.add(
        prevBtn, 
        'click', 
        () => this.navigateDate(-1),
        { description: 'Timeline previous day button' }
      );
      this.eventListeners.push(listener);
    }
    
    if (nextBtn) {
      const listener = SafeEventListener.add(
        nextBtn, 
        'click', 
        () => this.navigateDate(1),
        { description: 'Timeline next day button' }
      );
      this.eventListeners.push(listener);
    }
    
    if (todayBtn) {
      const listener = SafeEventListener.add(
        todayBtn, 
        'click', 
        () => this.goToToday(),
        { description: 'Timeline today button' }
      );
      this.eventListeners.push(listener);
    }
    
    // Click to create tasks
    if (this.options.enableClickToCreate) {
      const createListener = SafeEventListener.add(
        this.container, 
        'click', 
        (e) => {
          if (e.target.classList.contains('click-to-create') || e.target.classList.contains('hour-content')) {
            const hour = parseInt(e.target.dataset.hour);
            this.handleClickToCreate(hour);
          }
        },
        { description: 'Timeline click to create' }
      );
      this.eventListeners.push(createListener);
    }
    
    // Task interactions
    const taskListener = SafeEventListener.add(
      this.container, 
      'click', 
      (e) => {
        const taskBlock = e.target.closest('.task-block');
        if (!taskBlock) return;
        
        const taskId = taskBlock.dataset.taskId;
        
        if (e.target.classList.contains('complete-btn')) {
          this.handleTaskComplete(taskId);
        } else if (e.target.classList.contains('edit-btn')) {
          this.handleTaskEdit(taskId);
        } else if (e.target === taskBlock || e.target.closest('.task-block-content')) {
          this.handleTaskClick(taskId);
        }
      },
      { description: 'Timeline task interactions' }
    );
    this.eventListeners.push(taskListener);
  }

  /**
   * Navigate date by number of days
   */
  navigateDate(days) {
    const currentDate = new Date(this.currentDate + 'T00:00:00');
    currentDate.setDate(currentDate.getDate() + days);
    const newDate = dataUtils.formatDate(currentDate);
    state.setCurrentDate(newDate);
  }

  /**
   * Go to today's date
   */
  goToToday() {
    const today = dataUtils.getTodayDateString();
    state.setCurrentDate(today);
  }

  /**
   * Handle click to create task
   */
  handleClickToCreate(hour) {
    const defaultTime = `${hour.toString().padStart(2, '0')}:00`;
    
    taskModal.showCreate({
      schedulingType: 'fixed',
      defaultTime: defaultTime
    }, (savedTask) => {
      // Refresh timeline after task creation
      this.refresh();
    });
  }

  /**
   * Handle task completion toggle
   */
  async handleTaskComplete(taskId) {
    try {
      await window.toggleTaskCompletion(taskId);
      this.refresh();
    } catch (error) {
      console.error('Error toggling task completion:', error);
    }
  }

  /**
   * Handle task edit
   */
  handleTaskEdit(taskId) {
    const taskTemplates = state.getTaskTemplates();
    const task = taskTemplates.find(t => t.id === taskId);
    
    if (task) {
      taskModal.showEdit(task, () => {
        this.refresh();
      });
    }
  }

  /**
   * Handle general task click
   */
  handleTaskClick(taskId) {
    // For now, same as edit - can be customized later
    this.handleTaskEdit(taskId);
  }

  /**
   * Handle window resize
   */
  handleResize() {
    this.updateResponsiveSizing();
  }

  /**
   * Update responsive sizing based on screen size
   */
  updateResponsiveSizing() {
    const screenWidth = window.innerWidth;
    
    // Adjust hour height based on screen size
    if (screenWidth < 768) {
      // Mobile
      this.options.hourHeight = 60;
    } else if (screenWidth < 1024) {
      // Tablet
      this.options.hourHeight = 70;
    } else {
      // Desktop
      this.options.hourHeight = 80;
    }
    
    // Update existing hour elements
    const hourElements = this.container.querySelectorAll('.timeline-hour');
    hourElements.forEach(element => {
      element.style.height = `${this.options.hourHeight}px`;
    });
    
    // Refresh time indicator position
    this.updateTimeIndicator();
  }

  /**
   * Start real-time updates
   */
  startRealTimeUpdates() {
    if (this.options.enableRealTimeIndicator && !this.realTimeInterval) {
      this.realTimeInterval = SafeInterval.set(() => {
        this.updateTimeIndicator();
        this.updateCurrentTime();
        this.checkTaskStates();
      }, 30000, 'Timeline real-time updates'); // Update every 30 seconds as per spec
    }
  }

  /**
   * Pause real-time updates
   */
  pauseRealTimeUpdates() {
    if (this.realTimeInterval) {
      SafeInterval.clear(this.realTimeInterval);
      this.realTimeInterval = null;
    }
  }

  /**
   * Resume real-time updates
   */
  resumeRealTimeUpdates() {
    this.startRealTimeUpdates();
    this.refresh(); // Refresh on resume to catch up
  }

  /**
   * Update time indicator position
   */
  updateTimeIndicator() {
    const indicator = document.getElementById('time-indicator');
    if (!indicator) return;
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const topPosition = (currentMinutes / 60) * this.options.hourHeight;
    
    indicator.style.top = `${topPosition}px`;
  }

  /**
   * Update current time display
   */
  updateCurrentTime() {
    const timeElement = document.getElementById('timeline-current-time');
    if (!timeElement) return;
    
    const currentTime = new Date().toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      ...(this.options.showSeconds && { second: '2-digit' })
    });
    
    timeElement.textContent = currentTime;
  }

  /**
   * Check and update task states (overdue, in-progress, etc.)
   */
  checkTaskStates() {
    const taskBlocks = this.container.querySelectorAll('.task-block');
    
    taskBlocks.forEach(taskBlock => {
      const taskId = taskBlock.dataset.taskId;
      const scheduleTask = this.scheduleData.schedule?.find(t => t.id === taskId);
      
      if (scheduleTask) {
        const status = this.getTaskStatus(scheduleTask);
        
        // Update classes
        taskBlock.className = `task-block ${status.className}`;
        
        // Update overdue indicator
        const existingIndicator = taskBlock.querySelector('.overdue-indicator');
        if (status.isOverdue && !existingIndicator) {
          const indicator = document.createElement('div');
          indicator.className = 'overdue-indicator';
          indicator.innerHTML = '⚠️';
          indicator.title = `Task is overdue by ${status.overdueMinutes} minutes`;
          taskBlock.appendChild(indicator);
        } else if (!status.isOverdue && existingIndicator) {
          existingIndicator.remove();
        }
      }
    });
  }

  /**
   * Convert time string (HH:MM) to minutes since midnight
   */
  timeStringToMinutes(timeString) {
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
   * Destroy timeline component
   */
  destroy() {
    this.pauseRealTimeUpdates();
    
    if (this.container) {
      this.container.innerHTML = '';
    }
    
    // Remove all tracked event listeners
    this.eventListeners.forEach(listenerId => {
      SafeEventListener.remove(listenerId);
    });
    this.eventListeners = [];
    
    // Unregister from memory manager
    ComponentManager.unregister(this);
    
    console.log('✅ Timeline component destroyed');
  }
}

export default Timeline;

console.log('✅ Timeline component initialized');