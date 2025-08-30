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
import { performanceMonitor } from '../utils/PerformanceMonitor.js';

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
    this.timeFilter = 'all'; // 'all', 'morning', 'afternoon', 'evening'
    
    // Memory leak prevention tracking
    this.eventListeners = [];
    
    // Performance monitoring
    this.componentId = `timeline-${Date.now()}`;
    this.performanceMetrics = {
      renderCount: 0,
      refreshCount: 0,
      eventHandlerCount: 0
    };
    
    // Register with memory manager
    ComponentManager.register(this);
    
    // Track component initialization
    performanceMonitor.startTimer(`${this.componentId}-init`, 'initialization');
    
    this.init();
    
    performanceMonitor.endTimer(`${this.componentId}-init`, {
      containerId,
      optionsCount: Object.keys(options).length
    });
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
    const timerId = `${this.componentId}-refresh-${this.performanceMetrics.refreshCount}`;
    performanceMonitor.startTimer(timerId, 'refreshes');
    
    // Throttle renders to prevent excessive updates
    const now = Date.now();
    if (now - this.lastRenderTime < this.renderThrottleMs) {
      performanceMonitor.endTimer(timerId, { 
        throttled: true,
        timeSinceLastRender: now - this.lastRenderTime 
      });
      return;
    }
    
    this.lastRenderTime = now;
    this.performanceMetrics.refreshCount++;
    
    this.loadScheduleData();
    this.render();
    
    performanceMonitor.endTimer(timerId, {
      refreshCount: this.performanceMetrics.refreshCount,
      scheduleTaskCount: this.scheduleData?.schedule?.length || 0,
      throttled: false
    });
  }

  /**
   * Load schedule data for current date
   */
  loadScheduleData() {
    const timerId = `${this.componentId}-loadScheduleData`;
    performanceMonitor.startTimer(timerId, 'dataLoading');
    
    try {
      this.scheduleData = schedulingEngine.generateScheduleForDate(this.currentDate);
      
      performanceMonitor.endTimer(timerId, {
        date: this.currentDate,
        taskCount: this.scheduleData?.schedule?.length || 0,
        success: this.scheduleData?.success || false,
        hasConflicts: this.scheduleData?.schedule?.some(task => task.hasConflicts) || false
      });
      
      console.log('📅 Schedule loaded for', this.currentDate);
    } catch (error) {
      console.error('❌ Error loading schedule data:', error);
      this.scheduleData = {
        success: false,
        error: 'loading_error',
        message: 'Failed to load schedule',
        schedule: []
      };
      
      performanceMonitor.endTimer(timerId, {
        date: this.currentDate,
        error: error.message,
        success: false
      });
    }
  }

  /**
   * Render complete timeline
   */
  render() {
    if (!this.container) return;
    
    const timerId = `${this.componentId}-render-${this.performanceMetrics.renderCount}`;
    performanceMonitor.startTimer(timerId, 'renders');
    
    const renderMetadata = {
      renderCount: ++this.performanceMetrics.renderCount,
      hasContainer: !!this.container,
      hasScheduleData: !!this.scheduleData
    };
    
    // Load schedule data if not loaded
    if (!this.scheduleData) {
      this.loadScheduleData();
      renderMetadata.loadedScheduleData = true;
    }
    
    // Track DOM manipulation start
    const domManipulationStart = performance.now();
    
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
    
    const domManipulationTime = performance.now() - domManipulationStart;
    renderMetadata.domManipulationTime = domManipulationTime;
    
    // Setup timeline-specific event listeners
    const eventSetupStart = performance.now();
    this.setupTimelineEventListeners();
    renderMetadata.eventSetupTime = performance.now() - eventSetupStart;
    
    // Update responsive sizing
    const responsiveUpdateStart = performance.now();
    this.updateResponsiveSizing();
    renderMetadata.responsiveUpdateTime = performance.now() - responsiveUpdateStart;
    
    // Calculate elements created
    const timelineElements = this.container.querySelectorAll('.timeline-hour, .task-block, .sleep-block');
    renderMetadata.elementsCreated = timelineElements.length;
    renderMetadata.taskCount = this.scheduleData?.schedule?.length || 0;
    renderMetadata.timeFilter = this.timeFilter;
    
    performanceMonitor.endTimer(timerId, renderMetadata);
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
        <div class="timeline-filters">
          <div class="time-block-filters">
            <button id="filter-all" class="filter-btn ${this.timeFilter === 'all' ? 'active' : ''}" data-filter="all">All Day</button>
            <button id="filter-morning" class="filter-btn ${this.timeFilter === 'morning' ? 'active' : ''}" data-filter="morning">Morning</button>
            <button id="filter-afternoon" class="filter-btn ${this.timeFilter === 'afternoon' ? 'active' : ''}" data-filter="afternoon">Afternoon</button>
            <button id="filter-evening" class="filter-btn ${this.timeFilter === 'evening' ? 'active' : ''}" data-filter="evening">Evening</button>
          </div>
          ${this.renderFilterStats()}
        </div>
      </div>
    `;
  }

  /**
   * Render filter statistics
   */
  renderFilterStats() {
    if (!this.scheduleData || !this.scheduleData.schedule) {
      return '<div class="filter-stats">No tasks to analyze</div>';
    }

    const stats = this.getTimeBlockStats();
    
    if (this.timeFilter === 'all') {
      return `
        <div class="filter-stats">
          <span class="stat-item">Morning: ${stats.morning.count} tasks (${stats.morning.duration}h)</span>
          <span class="stat-item">Afternoon: ${stats.afternoon.count} tasks (${stats.afternoon.duration}h)</span>
          <span class="stat-item">Evening: ${stats.evening.count} tasks (${stats.evening.duration}h)</span>
        </div>
      `;
    }
    
    const currentStats = stats[this.timeFilter];
    return `
      <div class="filter-stats">
        <span class="stat-item">${currentStats.count} tasks</span>
        <span class="stat-item">${currentStats.duration}h total</span>
        <span class="stat-item">${currentStats.range}</span>
      </div>
    `;
  }

  /**
   * Get statistics for time blocks
   */
  getTimeBlockStats() {
    const schedule = this.scheduleData.schedule || [];
    
    const stats = {
      morning: { count: 0, duration: 0, range: '6:00 - 12:00' },
      afternoon: { count: 0, duration: 0, range: '12:00 - 18:00' },
      evening: { count: 0, duration: 0, range: '18:00 - 24:00' }
    };

    schedule.forEach(task => {
      const hour = parseInt(task.scheduledTime.split(':')[0]);
      const duration = (task.durationMinutes || 0) / 60;
      
      if (hour >= 6 && hour < 12) {
        stats.morning.count++;
        stats.morning.duration += duration;
      } else if (hour >= 12 && hour < 18) {
        stats.afternoon.count++;
        stats.afternoon.duration += duration;
      } else if (hour >= 18) {
        stats.evening.count++;
        stats.evening.duration += duration;
      }
    });

    // Round durations to 1 decimal place
    Object.keys(stats).forEach(period => {
      stats[period].duration = Math.round(stats[period].duration * 10) / 10;
    });

    return stats;
  }

  /**
   * Check if hour is in the current time block filter
   */
  isHourInTimeBlock(hour) {
    if (this.timeFilter === 'all') return true;
    
    switch (this.timeFilter) {
      case 'morning': return hour >= 6 && hour < 12;
      case 'afternoon': return hour >= 12 && hour < 18;
      case 'evening': return hour >= 18;
      default: return true;
    }
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
    
    // Generate 24-hour grid with time filtering
    for (let hour = 0; hour < 24; hour++) {
      gridHTML += this.renderHourRow(hour, this.isHourInTimeBlock(hour));
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
  renderHourRow(hour, isHighlighted = true) {
    const hourString = hour.toString().padStart(2, '0') + ':00';
    const hourDisplay = new Date(`2000-01-01T${hourString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      hour12: true
    });
    
    const filterClass = isHighlighted ? 'hour-highlighted' : 'hour-dimmed';
    
    return `
      <div class="timeline-hour ${filterClass}" data-hour="${hour}" style="height: ${this.options.hourHeight}px;">
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
      
      // Get conflict styling
      const conflictClasses = this.getConflictClasses(task);
      
      // Get priority styling
      const priorityClasses = this.getPriorityClasses(task);
      
      // Get filter styling
      const filterClasses = this.getFilterClasses(task);
      
      // Get category styling
      const categoryClasses = this.getCategoryClasses(task);
      
      return `
        <div class="task-block ${status.className} ${conflictClasses} ${priorityClasses} ${filterClasses} ${categoryClasses}" 
             data-task-id="${task.id}"
             data-has-conflicts="${task.hasConflicts || false}"
             data-conflict-severity="${task.conflictSeverity || 'none'}"
             data-priority="${task.priority || 0}"
             data-category="${this.determineTaskCategory(task)}"
             data-scheduled-time="${task.scheduledTime}"
             data-duration-minutes="${task.durationMinutes}"
             draggable="true"
             style="
               top: ${topPosition}px;
               height: ${height}px;
               z-index: 20;
               cursor: grab;
             ">
          <div class="task-block-content">
            <div class="task-block-header">
              <span class="task-name">${task.taskName}</span>
              <span class="task-time">${task.scheduledTime}</span>
            </div>
            ${task.description ? `
              <div class="task-description">${task.description}</div>
            ` : ''}
            ${this.renderProgressBar(task)}
            <div class="task-meta">
              <span class="task-duration">${task.durationMinutes}min</span>
              ${task.isMandatory ? '<span class="task-mandatory">🔒</span>' : ''}
              ${task.isAnchor ? '<span class="task-anchor">⚓</span>' : ''}
              ${task.hasConflicts ? `<span class="task-conflict ${task.conflictSeverity}" title="Scheduling conflict: ${task.conflicts?.length || 0} overlapping task(s)">⚠️</span>` : ''}
              ${this.getPriorityIndicator(task)}
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
   * Get conflict-related CSS classes for a task
   */
  getConflictClasses(task) {
    if (!task.hasConflicts) {
      return '';
    }

    const classes = ['has-conflicts'];
    
    // Add severity class
    if (task.conflictSeverity) {
      classes.push(`conflict-${task.conflictSeverity}`);
    }

    // Add conflict type class
    if (task.conflictType) {
      classes.push(`conflict-type-${task.conflictType}`);
    }

    return classes.join(' ');
  }

  /**
   * Get priority-related CSS classes for a task
   */
  getPriorityClasses(task) {
    const classes = [];
    
    // Add priority level class
    if (task.priority !== undefined && task.priority !== null) {
      if (task.priority >= 8) {
        classes.push('priority-critical');
      } else if (task.priority >= 6) {
        classes.push('priority-high');
      } else if (task.priority >= 4) {
        classes.push('priority-medium');
      } else if (task.priority >= 2) {
        classes.push('priority-low');
      } else {
        classes.push('priority-minimal');
      }
    }

    return classes.join(' ');
  }

  /**
   * Get priority indicator HTML for a task
   */
  getPriorityIndicator(task) {
    if (task.priority === undefined || task.priority === null || task.priority === 0) {
      return '';
    }

    const priorityConfig = {
      critical: { threshold: 8, icon: '🔥', label: 'Critical Priority', class: 'critical' },
      high: { threshold: 6, icon: '⬆️', label: 'High Priority', class: 'high' },
      medium: { threshold: 4, icon: '➡️', label: 'Medium Priority', class: 'medium' },
      low: { threshold: 2, icon: '⬇️', label: 'Low Priority', class: 'low' },
      minimal: { threshold: 0, icon: '🔽', label: 'Minimal Priority', class: 'minimal' }
    };

    let priorityLevel = 'minimal';
    for (const [level, config] of Object.entries(priorityConfig)) {
      if (task.priority >= config.threshold) {
        priorityLevel = level;
        break;
      }
    }

    const config = priorityConfig[priorityLevel];
    return `<span class="task-priority priority-${config.class}" title="${config.label} (${task.priority})">${config.icon}</span>`;
  }

  /**
   * Get filter-related CSS classes for a task
   */
  getFilterClasses(task) {
    if (this.timeFilter === 'all') {
      return '';
    }

    const hour = parseInt(task.scheduledTime.split(':')[0]);
    const isInTimeBlock = this.isHourInTimeBlock(hour);
    
    return isInTimeBlock ? 'task-highlighted' : 'task-dimmed';
  }

  /**
   * Get category-related CSS classes for a task
   */
  getCategoryClasses(task) {
    const category = this.determineTaskCategory(task);
    return `category-${category}`;
  }

  /**
   * Determine task category based on name and description
   */
  determineTaskCategory(task) {
    const categories = {
      work: ['meeting', 'call', 'email', 'report', 'project', 'deadline', 'presentation', 'review'],
      health: ['exercise', 'workout', 'gym', 'run', 'walk', 'yoga', 'meditation', 'doctor', 'appointment'],
      personal: ['grocery', 'shopping', 'chore', 'clean', 'laundry', 'cook', 'meal', 'family', 'friend'],
      creative: ['write', 'design', 'create', 'art', 'music', 'paint', 'draw', 'blog', 'video'],
      learning: ['read', 'study', 'course', 'tutorial', 'learn', 'practice', 'research', 'book'],
      social: ['dinner', 'party', 'social', 'visit', 'hangout', 'date', 'event', 'celebration'],
      admin: ['bill', 'tax', 'document', 'organize', 'plan', 'schedule', 'budget', 'bank']
    };

    const taskName = (task.taskName || '').toLowerCase();
    const description = (task.description || '').toLowerCase();
    const combined = `${taskName} ${description}`;

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => combined.includes(keyword))) {
        return category;
      }
    }

    return 'general'; // Default category
  }

  /**
   * Get task completion progress (0-100)
   */
  getTaskProgress(task) {
    // Check if task instance exists and has progress information
    const currentInstances = state.getTaskInstancesForDate(this.currentDate);
    const instance = currentInstances.find(i => i.templateId === task.id);
    
    if (instance && instance.status === 'completed') {
      return 100;
    }
    
    if (instance && instance.progress !== undefined) {
      return Math.max(0, Math.min(100, instance.progress));
    }
    
    // Calculate progress based on time if task is in progress
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const taskStartMinutes = this.timeStringToMinutes(task.scheduledTime);
    const taskEndMinutes = taskStartMinutes + task.durationMinutes;
    
    if (currentMinutes >= taskStartMinutes && currentMinutes <= taskEndMinutes) {
      const elapsed = currentMinutes - taskStartMinutes;
      const progress = (elapsed / task.durationMinutes) * 100;
      return Math.max(0, Math.min(100, progress));
    }
    
    return 0;
  }

  /**
   * Render completion progress bar for a task
   */
  renderProgressBar(task) {
    const progress = this.getTaskProgress(task);
    
    if (progress <= 0) {
      return '';
    }
    
    return `
      <div class="task-progress-container">
        <div class="task-progress-bar">
          <div class="task-progress-fill" style="width: ${progress}%"></div>
        </div>
        <span class="task-progress-text">${Math.round(progress)}%</span>
      </div>
    `;
  }

  /**
   * Set time block filter and re-render timeline
   */
  setTimeFilter(filter) {
    this.timeFilter = filter;
    this.render(); // Re-render timeline with new filter
  }

  /**
   * Setup drag and drop functionality for task rescheduling
   */
  setupDragAndDrop() {
    let draggedTask = null;
    let dropIndicator = null;
    
    // Dragstart event - capture the dragged task
    const dragStartListener = SafeEventListener.add(
      this.container,
      'dragstart',
      (e) => {
        const taskBlock = e.target.closest('.task-block');
        if (!taskBlock) return;
        
        draggedTask = {
          element: taskBlock,
          taskId: taskBlock.dataset.taskId,
          originalTime: taskBlock.dataset.scheduledTime,
          durationMinutes: parseInt(taskBlock.dataset.durationMinutes)
        };
        
        // Add dragging state
        taskBlock.classList.add('dragging');
        taskBlock.style.cursor = 'grabbing';
        
        // Set drag data
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedTask.taskId);
        
        // Create drag preview
        this.createDragPreview(e, taskBlock);
      },
      { description: 'Task drag start' }
    );
    this.eventListeners.push(dragStartListener);
    
    // Dragover event - allow drop on timeline hours
    const dragOverListener = SafeEventListener.add(
      this.container,
      'dragover',
      (e) => {
        if (!draggedTask) return;
        
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const hourElement = e.target.closest('.timeline-hour');
        if (hourElement) {
          this.showDropIndicator(hourElement, e.clientY);
        }
      },
      { description: 'Task drag over' }
    );
    this.eventListeners.push(dragOverListener);
    
    // Drop event - handle task rescheduling
    const dropListener = SafeEventListener.add(
      this.container,
      'drop',
      async (e) => {
        e.preventDefault();
        
        if (!draggedTask) return;
        
        const hourElement = e.target.closest('.timeline-hour');
        if (hourElement) {
          const targetHour = parseInt(hourElement.dataset.hour);
          const newTime = this.calculateDropTime(targetHour, e.clientY, hourElement);
          
          if (this.validateDrop(newTime, draggedTask)) {
            await this.rescheduleTask(draggedTask.taskId, newTime);
          }
        }
        
        this.cleanupDragOperation();
      },
      { description: 'Task drop' }
    );
    this.eventListeners.push(dropListener);
    
    // Dragend event - cleanup
    const dragEndListener = SafeEventListener.add(
      this.container,
      'dragend',
      () => {
        this.cleanupDragOperation();
      },
      { description: 'Task drag end' }
    );
    this.eventListeners.push(dragEndListener);
  }

  /**
   * Create drag preview for visual feedback
   */
  createDragPreview(e, taskBlock) {
    // Create a preview element
    const preview = taskBlock.cloneNode(true);
    preview.style.opacity = '0.8';
    preview.style.transform = 'rotate(3deg)';
    preview.style.pointerEvents = 'none';
    preview.style.position = 'absolute';
    preview.style.zIndex = '1000';
    
    document.body.appendChild(preview);
    e.dataTransfer.setDragImage(preview, 50, 20);
    
    // Remove preview after drag starts
    setTimeout(() => {
      if (document.body.contains(preview)) {
        document.body.removeChild(preview);
      }
    }, 0);
  }

  /**
   * Show drop indicator at the target location
   */
  showDropIndicator(hourElement, clientY) {
    // Remove existing indicator
    const existingIndicator = this.container.querySelector('.drop-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }

    // Calculate position within the hour
    const rect = hourElement.getBoundingClientRect();
    const relativeY = clientY - rect.top;
    const quarterHeight = rect.height / 4;
    
    // Snap to 15-minute intervals
    let snapPosition = 0;
    if (relativeY < quarterHeight) {
      snapPosition = 0;
    } else if (relativeY < quarterHeight * 2) {
      snapPosition = quarterHeight;
    } else if (relativeY < quarterHeight * 3) {
      snapPosition = quarterHeight * 2;
    } else {
      snapPosition = quarterHeight * 3;
    }

    // Create drop indicator
    const indicator = document.createElement('div');
    indicator.className = 'drop-indicator';
    indicator.style.position = 'absolute';
    indicator.style.left = '0';
    indicator.style.right = '0';
    indicator.style.top = `${snapPosition}px`;
    indicator.style.height = '2px';
    indicator.style.background = '#10b981';
    indicator.style.zIndex = '100';
    indicator.style.boxShadow = '0 0 4px rgba(16, 185, 129, 0.5)';

    hourElement.appendChild(indicator);
  }

  /**
   * Calculate precise drop time based on position
   */
  calculateDropTime(targetHour, clientY, hourElement) {
    const rect = hourElement.getBoundingClientRect();
    const relativeY = clientY - rect.top;
    const quarterHeight = rect.height / 4;
    
    // Determine 15-minute increment
    let minutes = 0;
    if (relativeY >= quarterHeight * 3) {
      minutes = 45;
    } else if (relativeY >= quarterHeight * 2) {
      minutes = 30;
    } else if (relativeY >= quarterHeight) {
      minutes = 15;
    }

    return `${targetHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  /**
   * Validate if the drop is allowed
   */
  validateDrop(newTime, draggedTask) {
    // Don't allow dropping on same time
    if (newTime === draggedTask.originalTime) {
      return false;
    }

    // Check for conflicts (basic validation)
    const newStartMinutes = this.timeStringToMinutes(newTime);
    const newEndMinutes = newStartMinutes + draggedTask.durationMinutes;

    // Validate within business hours (6 AM to 11 PM)
    if (newStartMinutes < 360 || newEndMinutes > 1380) {
      this.showValidationError('Cannot schedule outside business hours (6 AM - 11 PM)');
      return false;
    }

    return true;
  }

  /**
   * Reschedule a task to a new time
   */
  async rescheduleTask(taskId, newTime) {
    try {
      // Find the task template
      const taskTemplate = await state.getTaskTemplate(taskId);
      if (!taskTemplate) {
        throw new Error('Task template not found');
      }

      // Update the scheduled time
      const updatedTemplate = {
        ...taskTemplate,
        scheduledTime: newTime
      };

      // Save the updated template
      await state.updateTaskTemplate(taskId, updatedTemplate);

      // Show success feedback
      this.showRescheduleSuccess(taskTemplate.taskName, newTime);

      // Re-render timeline to reflect changes
      await this.loadScheduleData();
      this.render();

    } catch (error) {
      console.error('Error rescheduling task:', error);
      this.showValidationError('Failed to reschedule task. Please try again.');
    }
  }

  /**
   * Show validation error message
   */
  showValidationError(message) {
    // Create temporary error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'drag-error-message';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #ef4444;
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      font-size: 14px;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;

    document.body.appendChild(errorDiv);

    // Remove after 3 seconds
    setTimeout(() => {
      if (document.body.contains(errorDiv)) {
        errorDiv.style.opacity = '0';
        errorDiv.style.transition = 'opacity 0.3s ease';
        setTimeout(() => document.body.removeChild(errorDiv), 300);
      }
    }, 3000);
  }

  /**
   * Show reschedule success message
   */
  showRescheduleSuccess(taskName, newTime) {
    // Create temporary success message
    const successDiv = document.createElement('div');
    successDiv.className = 'drag-success-message';
    successDiv.textContent = `"${taskName}" rescheduled to ${newTime}`;
    successDiv.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #10b981;
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      font-size: 14px;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;

    document.body.appendChild(successDiv);

    // Remove after 2 seconds
    setTimeout(() => {
      if (document.body.contains(successDiv)) {
        successDiv.style.opacity = '0';
        successDiv.style.transition = 'opacity 0.3s ease';
        setTimeout(() => document.body.removeChild(successDiv), 300);
      }
    }, 2000);
  }

  /**
   * Clean up after drag operation
   */
  cleanupDragOperation() {
    // Remove dragging state from all task blocks
    const draggingBlocks = this.container.querySelectorAll('.task-block.dragging');
    draggingBlocks.forEach(block => {
      block.classList.remove('dragging');
      block.style.cursor = 'grab';
    });

    // Remove drop indicators
    const dropIndicators = this.container.querySelectorAll('.drop-indicator');
    dropIndicators.forEach(indicator => indicator.remove());
  }

  /**
   * Setup context menu for task actions
   */
  setupContextMenu() {
    let activeContextMenu = null;
    let longPressTimer = null;
    let longPressThreshold = 500; // 500ms for long press

    // Right-click context menu
    const contextMenuListener = SafeEventListener.add(
      this.container,
      'contextmenu',
      (e) => {
        const taskBlock = e.target.closest('.task-block');
        if (!taskBlock) return;

        e.preventDefault();
        e.stopPropagation();

        const taskId = taskBlock.dataset.taskId;
        this.showContextMenu(e.clientX, e.clientY, taskId, taskBlock);
      },
      { description: 'Task context menu' }
    );
    this.eventListeners.push(contextMenuListener);

    // Touch start for long press detection
    const touchStartListener = SafeEventListener.add(
      this.container,
      'touchstart',
      (e) => {
        const taskBlock = e.target.closest('.task-block');
        if (!taskBlock) return;

        const taskId = taskBlock.dataset.taskId;
        const touch = e.touches[0];

        longPressTimer = setTimeout(() => {
          // Add haptic feedback if available
          if (navigator.vibrate) {
            navigator.vibrate(50);
          }

          this.showContextMenu(touch.clientX, touch.clientY, taskId, taskBlock);
          longPressTimer = null;
        }, longPressThreshold);
      },
      { description: 'Long press detection', passive: true }
    );
    this.eventListeners.push(touchStartListener);

    // Cancel long press on touch move or end
    const touchCancelListener = SafeEventListener.add(
      this.container,
      'touchmove touchend touchcancel',
      () => {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      },
      { description: 'Long press cancel', passive: true }
    );
    this.eventListeners.push(touchCancelListener);

    // Click outside to dismiss context menu
    const documentClickListener = SafeEventListener.add(
      document,
      'click',
      (e) => {
        if (activeContextMenu && !e.target.closest('.context-menu')) {
          this.hideContextMenu();
        }
      },
      { description: 'Dismiss context menu' }
    );
    this.eventListeners.push(documentClickListener);
  }

  /**
   * Show context menu at specified position
   */
  showContextMenu(x, y, taskId, taskBlock) {
    // Hide any existing context menu
    this.hideContextMenu();

    // Get task information
    const task = this.getTaskById(taskId);
    if (!task) return;

    const currentInstances = state.getTaskInstancesForDate(this.currentDate);
    const instance = currentInstances.find(i => i.templateId === taskId);
    const isCompleted = instance && instance.status === 'completed';

    // Create context menu
    const contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    contextMenu.innerHTML = `
      <div class="context-menu-header">
        <span class="context-menu-title">${task.taskName}</span>
        <span class="context-menu-time">${task.scheduledTime}</span>
      </div>
      <div class="context-menu-actions">
        <button class="context-menu-item" data-action="complete" ${isCompleted ? 'disabled' : ''}>
          <span class="context-menu-icon">${isCompleted ? '✅' : '✓'}</span>
          ${isCompleted ? 'Completed' : 'Mark Complete'}
        </button>
        <button class="context-menu-item" data-action="skip" ${isCompleted ? 'disabled' : ''}>
          <span class="context-menu-icon">⏭️</span>
          Skip Task
        </button>
        <div class="context-menu-separator"></div>
        <button class="context-menu-item" data-action="edit">
          <span class="context-menu-icon">✏️</span>
          Edit Task
        </button>
        <button class="context-menu-item" data-action="reschedule">
          <span class="context-menu-icon">🕒</span>
          Quick Reschedule
        </button>
        <button class="context-menu-item" data-action="duplicate">
          <span class="context-menu-icon">📋</span>
          Duplicate Task
        </button>
        <div class="context-menu-separator"></div>
        <button class="context-menu-item danger" data-action="delete">
          <span class="context-menu-icon">🗑️</span>
          Delete Task
        </button>
      </div>
    `;

    // Position context menu
    contextMenu.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      z-index: 2000;
      min-width: 200px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
      font-size: 14px;
      overflow: hidden;
    `;

    document.body.appendChild(contextMenu);

    // Adjust position if menu goes off-screen
    this.adjustContextMenuPosition(contextMenu);

    // Add event listeners for menu actions
    contextMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = e.target.closest('.context-menu-item')?.dataset.action;
      if (action) {
        this.handleContextMenuAction(action, taskId, task);
      }
    });

    this.activeContextMenu = contextMenu;
  }

  /**
   * Hide active context menu
   */
  hideContextMenu() {
    if (this.activeContextMenu && document.body.contains(this.activeContextMenu)) {
      document.body.removeChild(this.activeContextMenu);
    }
    this.activeContextMenu = null;
  }

  /**
   * Adjust context menu position to stay on screen
   */
  adjustContextMenuPosition(menu) {
    const rect = menu.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    // Adjust horizontal position
    if (rect.right > viewport.width) {
      menu.style.left = `${viewport.width - rect.width - 10}px`;
    }

    // Adjust vertical position  
    if (rect.bottom > viewport.height) {
      menu.style.top = `${viewport.height - rect.height - 10}px`;
    }

    // Ensure minimum margins
    if (parseInt(menu.style.left) < 10) {
      menu.style.left = '10px';
    }
    if (parseInt(menu.style.top) < 10) {
      menu.style.top = '10px';
    }
  }

  /**
   * Handle context menu action
   */
  async handleContextMenuAction(action, taskId, task) {
    this.hideContextMenu();

    try {
      switch (action) {
        case 'complete':
          await this.handleTaskComplete(taskId);
          break;
        case 'skip':
          await this.handleTaskSkip(taskId);
          break;
        case 'edit':
          this.handleTaskEdit(taskId);
          break;
        case 'reschedule':
          this.showQuickRescheduleMenu(taskId, task);
          break;
        case 'duplicate':
          await this.handleTaskDuplicate(taskId, task);
          break;
        case 'delete':
          await this.handleTaskDelete(taskId, task);
          break;
      }
    } catch (error) {
      console.error(`Error handling context menu action ${action}:`, error);
      this.showValidationError(`Failed to ${action} task. Please try again.`);
    }
  }

  /**
   * Get task by ID from schedule data
   */
  getTaskById(taskId) {
    if (!this.scheduleData?.schedule) return null;
    return this.scheduleData.schedule.find(task => task.id === taskId);
  }

  /**
   * Handle task skip action
   */
  async handleTaskSkip(taskId) {
    try {
      // Create a skipped instance for today
      const taskInstance = {
        templateId: taskId,
        date: this.currentDate,
        status: 'skipped',
        completedAt: new Date().toISOString(),
        notes: 'Skipped via timeline context menu'
      };

      await state.createTaskInstance(taskInstance);
      
      // Show success feedback
      const task = this.getTaskById(taskId);
      this.showRescheduleSuccess(`"${task?.taskName}" has been skipped`, '');
      
      // Re-render to reflect changes
      await this.loadScheduleData();
      this.render();

    } catch (error) {
      console.error('Error skipping task:', error);
      throw error;
    }
  }

  /**
   * Show quick reschedule menu with preset times
   */
  showQuickRescheduleMenu(taskId, task) {
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const currentMinutes = currentTime.getMinutes();
    
    // Generate quick reschedule options
    const options = [
      { label: 'In 15 minutes', time: this.addMinutesToTime(currentHour, currentMinutes, 15) },
      { label: 'In 30 minutes', time: this.addMinutesToTime(currentHour, currentMinutes, 30) },
      { label: 'In 1 hour', time: this.addMinutesToTime(currentHour, currentMinutes, 60) },
      { label: 'Next hour', time: this.addMinutesToTime(currentHour, 0, 60) },
      { label: 'Tomorrow morning', time: '08:00', tomorrow: true },
    ];

    // Create quick reschedule menu
    const menu = document.createElement('div');
    menu.className = 'quick-reschedule-menu';
    menu.innerHTML = `
      <div class="quick-reschedule-header">
        <span>Reschedule "${task.taskName}"</span>
      </div>
      <div class="quick-reschedule-options">
        ${options.map(option => `
          <button class="quick-reschedule-option" data-time="${option.time}" data-tomorrow="${option.tomorrow || false}">
            <span class="option-label">${option.label}</span>
            <span class="option-time">${option.time}</span>
          </button>
        `).join('')}
        <div class="quick-reschedule-separator"></div>
        <button class="quick-reschedule-option custom" data-action="custom">
          <span class="option-label">Custom time...</span>
          <span class="option-time">🕒</span>
        </button>
      </div>
    `;

    // Position menu
    menu.style.cssText = `
      position: fixed;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      z-index: 2100;
      min-width: 280px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
      font-size: 14px;
      overflow: hidden;
    `;

    // Add backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'quick-reschedule-backdrop';
    backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.3);
      z-index: 2050;
    `;

    document.body.appendChild(backdrop);
    document.body.appendChild(menu);

    // Handle option selection
    menu.addEventListener('click', async (e) => {
      const option = e.target.closest('.quick-reschedule-option');
      if (option) {
        if (option.dataset.action === 'custom') {
          // Open full edit dialog for custom time
          this.handleTaskEdit(taskId);
        } else {
          const newTime = option.dataset.time;
          const tomorrow = option.dataset.tomorrow === 'true';
          
          if (tomorrow) {
            // For tomorrow reschedule, would need date handling
            this.showValidationError('Tomorrow rescheduling not implemented yet');
          } else {
            await this.rescheduleTask(taskId, newTime);
          }
        }
        
        // Clean up
        document.body.removeChild(backdrop);
        document.body.removeChild(menu);
      }
    });

    // Click backdrop to close
    backdrop.addEventListener('click', () => {
      document.body.removeChild(backdrop);
      document.body.removeChild(menu);
    });
  }

  /**
   * Add minutes to current time and format as HH:MM
   */
  addMinutesToTime(hours, minutes, additionalMinutes) {
    const totalMinutes = hours * 60 + minutes + additionalMinutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMinutes = totalMinutes % 60;
    
    return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
  }

  /**
   * Handle task duplication
   */
  async handleTaskDuplicate(taskId, task) {
    try {
      // Create a new task template based on the existing one
      const newTask = {
        ...task,
        id: undefined, // Let the system assign new ID
        taskName: `${task.taskName} (Copy)`,
        scheduledTime: this.addMinutesToTime(
          parseInt(task.scheduledTime.split(':')[0]),
          parseInt(task.scheduledTime.split(':')[1]),
          task.durationMinutes
        )
      };

      await state.createTaskTemplate(newTask);
      
      // Show success feedback
      this.showRescheduleSuccess(`"${task.taskName}" duplicated successfully`, '');
      
      // Re-render to show new task
      await this.loadScheduleData();
      this.render();

    } catch (error) {
      console.error('Error duplicating task:', error);
      throw error;
    }
  }

  /**
   * Handle task deletion with confirmation
   */
  async handleTaskDelete(taskId, task) {
    // Show confirmation dialog
    const confirmed = await this.showDeleteConfirmation(task.taskName);
    if (!confirmed) return;

    try {
      await state.deleteTaskTemplate(taskId);
      
      // Show success feedback
      this.showRescheduleSuccess(`"${task.taskName}" deleted successfully`, '');
      
      // Re-render to reflect deletion
      await this.loadScheduleData();
      this.render();

    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  /**
   * Show delete confirmation dialog
   */
  showDeleteConfirmation(taskName) {
    return new Promise((resolve) => {
      const dialog = document.createElement('div');
      dialog.className = 'delete-confirmation-dialog';
      dialog.innerHTML = `
        <div class="delete-confirmation-content">
          <div class="delete-confirmation-header">
            <span class="delete-icon">⚠️</span>
            <h3>Delete Task</h3>
          </div>
          <p>Are you sure you want to delete "${taskName}"?</p>
          <p class="delete-warning">This action cannot be undone.</p>
          <div class="delete-confirmation-actions">
            <button class="btn-cancel">Cancel</button>
            <button class="btn-delete">Delete</button>
          </div>
        </div>
      `;

      // Position dialog
      dialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2200;
      `;

      document.body.appendChild(dialog);

      // Handle button clicks
      dialog.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-delete')) {
          resolve(true);
        } else if (e.target.classList.contains('btn-cancel') || e.target === dialog) {
          resolve(false);
        }
        document.body.removeChild(dialog);
      });
    });
  }

  /**
   * Setup inline editing functionality
   */
  setupInlineEditing() {
    // Double-click for task name editing
    const taskNameEditListener = SafeEventListener.add(
      this.container,
      'dblclick',
      (e) => {
        const taskName = e.target.closest('.task-name');
        if (taskName) {
          e.stopPropagation();
          const taskBlock = taskName.closest('.task-block');
          const taskId = taskBlock.dataset.taskId;
          this.startInlineEdit(taskName, taskId, 'taskName');
        }
      },
      { description: 'Task name inline edit' }
    );
    this.eventListeners.push(taskNameEditListener);

    // Click for duration editing
    const durationEditListener = SafeEventListener.add(
      this.container,
      'dblclick',
      (e) => {
        const taskDuration = e.target.closest('.task-duration');
        if (taskDuration) {
          e.stopPropagation();
          const taskBlock = taskDuration.closest('.task-block');
          const taskId = taskBlock.dataset.taskId;
          this.startInlineEdit(taskDuration, taskId, 'durationMinutes');
        }
      },
      { description: 'Task duration inline edit' }
    );
    this.eventListeners.push(durationEditListener);

    // Global keyboard handler for inline editing
    const keyHandler = SafeEventListener.add(
      document,
      'keydown',
      (e) => {
        const activeEdit = document.querySelector('.inline-edit-input');
        if (activeEdit) {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.saveInlineEdit(activeEdit);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            this.cancelInlineEdit(activeEdit);
          }
        }
      },
      { description: 'Inline edit keyboard shortcuts' }
    );
    this.eventListeners.push(keyHandler);
  }

  /**
   * Start inline editing for a field
   */
  startInlineEdit(element, taskId, fieldType) {
    // Prevent multiple simultaneous edits
    const existingEdit = document.querySelector('.inline-edit-input');
    if (existingEdit) {
      this.cancelInlineEdit(existingEdit);
    }

    const task = this.getTaskById(taskId);
    if (!task) return;

    const originalValue = fieldType === 'taskName' ? task.taskName : task.durationMinutes;
    const displayValue = fieldType === 'taskName' ? originalValue : originalValue.toString();

    // Create input element
    const input = document.createElement('input');
    input.className = 'inline-edit-input';
    input.type = fieldType === 'durationMinutes' ? 'number' : 'text';
    input.value = displayValue;
    
    if (fieldType === 'durationMinutes') {
      input.min = '5';
      input.max = '480'; // 8 hours max
      input.step = '5';
    }

    // Style the input
    input.style.cssText = `
      width: 100%;
      background: rgba(255, 255, 255, 0.95);
      border: 2px solid #3b82f6;
      border-radius: 4px;
      padding: 2px 6px;
      font-size: ${window.getComputedStyle(element).fontSize};
      font-family: inherit;
      color: #1f2937;
      outline: none;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
    `;

    // Store metadata
    input.dataset.taskId = taskId;
    input.dataset.fieldType = fieldType;
    input.dataset.originalValue = displayValue;

    // Replace element content with input
    const originalContent = element.innerHTML;
    element.innerHTML = '';
    element.appendChild(input);

    // Focus and select
    input.focus();
    input.select();

    // Handle blur (save on focus loss)
    input.addEventListener('blur', () => {
      setTimeout(() => {
        if (document.contains(input)) {
          this.saveInlineEdit(input);
        }
      }, 100);
    });

    // Store original content for cancel
    input.dataset.originalContent = originalContent;
  }

  /**
   * Save inline edit changes
   */
  async saveInlineEdit(input) {
    const taskId = input.dataset.taskId;
    const fieldType = input.dataset.fieldType;
    const newValue = input.value.trim();
    const originalValue = input.dataset.originalValue;

    // Validate input
    if (!newValue) {
      this.showValidationError('Field cannot be empty');
      input.focus();
      return;
    }

    if (fieldType === 'durationMinutes') {
      const duration = parseInt(newValue);
      if (isNaN(duration) || duration < 5 || duration > 480) {
        this.showValidationError('Duration must be between 5 and 480 minutes');
        input.focus();
        return;
      }
    }

    // Check if value changed
    const finalValue = fieldType === 'durationMinutes' ? parseInt(newValue) : newValue;
    const originalFinalValue = fieldType === 'durationMinutes' ? parseInt(originalValue) : originalValue;
    
    if (finalValue === originalFinalValue) {
      this.cancelInlineEdit(input);
      return;
    }

    try {
      // Get task template
      const taskTemplate = await state.getTaskTemplate(taskId);
      if (!taskTemplate) {
        throw new Error('Task template not found');
      }

      // Update the field
      const updatedTemplate = {
        ...taskTemplate,
        [fieldType]: finalValue
      };

      // Save changes
      await state.updateTaskTemplate(taskId, updatedTemplate);

      // Show success feedback
      const fieldName = fieldType === 'taskName' ? 'name' : 'duration';
      this.showRescheduleSuccess(`Task ${fieldName} updated successfully`, '');

      // Clean up input and reload
      this.finishInlineEdit(input, fieldType === 'taskName' ? finalValue : `${finalValue}min`);
      
      // Re-render timeline to reflect changes
      await this.loadScheduleData();
      this.render();

    } catch (error) {
      console.error('Error saving inline edit:', error);
      this.showValidationError('Failed to save changes. Please try again.');
      input.focus();
    }
  }

  /**
   * Cancel inline edit
   */
  cancelInlineEdit(input) {
    const originalContent = input.dataset.originalContent;
    const parent = input.parentElement;
    
    parent.innerHTML = originalContent;
  }

  /**
   * Finish inline edit with new value
   */
  finishInlineEdit(input, newDisplayValue) {
    const parent = input.parentElement;
    parent.innerHTML = newDisplayValue;
  }

  /**
   * Smart scheduling assistance methods
   */

  /**
   * Find optimal time slots for a new task
   */
  findOptimalTimeSlots(durationMinutes, preferences = {}) {
    if (!this.scheduleData?.schedule) return [];

    const {
      preferredTimeBlocks = ['morning', 'afternoon', 'evening'],
      avoidConflicts = true,
      bufferMinutes = 15,
      maxSuggestions = 5
    } = preferences;

    const schedule = this.scheduleData.schedule;
    const suggestions = [];
    
    // Define time block ranges
    const timeBlocks = {
      morning: { start: 6, end: 12 },
      afternoon: { start: 12, end: 18 },
      evening: { start: 18, end: 23 }
    };

    // Check each preferred time block
    for (const blockName of preferredTimeBlocks) {
      const block = timeBlocks[blockName];
      if (!block) continue;

      // Find available slots in this time block
      const blockSuggestions = this.findAvailableSlots(
        block.start * 60, // Convert to minutes
        block.end * 60,
        durationMinutes,
        schedule,
        bufferMinutes,
        avoidConflicts
      );

      suggestions.push(...blockSuggestions.map(slot => ({
        ...slot,
        timeBlock: blockName,
        reason: this.getRecommendationReason(slot, blockName, schedule)
      })));
    }

    // Sort by quality score and return top suggestions
    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSuggestions);
  }

  /**
   * Find available time slots within a range
   */
  findAvailableSlots(startMinutes, endMinutes, durationMinutes, schedule, bufferMinutes, avoidConflicts) {
    const slots = [];
    const busyPeriods = [];

    // Create busy periods from existing tasks
    if (avoidConflicts) {
      schedule.forEach(task => {
        const taskStart = this.timeStringToMinutes(task.scheduledTime);
        const taskEnd = taskStart + (task.durationMinutes || 0);
        busyPeriods.push({
          start: taskStart - bufferMinutes,
          end: taskEnd + bufferMinutes
        });
      });

      // Sort busy periods by start time
      busyPeriods.sort((a, b) => a.start - b.start);
    }

    // Find gaps between busy periods
    let currentTime = startMinutes;
    
    for (const busyPeriod of busyPeriods) {
      if (busyPeriod.start > currentTime) {
        // Found a gap
        const gapDuration = busyPeriod.start - currentTime;
        if (gapDuration >= durationMinutes) {
          slots.push({
            startTime: this.minutesToTimeString(currentTime),
            endTime: this.minutesToTimeString(currentTime + durationMinutes),
            availableDuration: gapDuration,
            score: this.calculateSlotScore(currentTime, durationMinutes, schedule)
          });
        }
      }
      currentTime = Math.max(currentTime, busyPeriod.end);
    }

    // Check for gap after last busy period
    if (currentTime < endMinutes) {
      const gapDuration = endMinutes - currentTime;
      if (gapDuration >= durationMinutes) {
        slots.push({
          startTime: this.minutesToTimeString(currentTime),
          endTime: this.minutesToTimeString(currentTime + durationMinutes),
          availableDuration: gapDuration,
          score: this.calculateSlotScore(currentTime, durationMinutes, schedule)
        });
      }
    }

    return slots;
  }

  /**
   * Calculate quality score for a time slot
   */
  calculateSlotScore(startMinutes, durationMinutes, schedule) {
    let score = 100; // Base score

    const hour = Math.floor(startMinutes / 60);
    
    // Prefer standard working hours
    if (hour >= 9 && hour < 17) {
      score += 20;
    } else if (hour >= 8 && hour < 19) {
      score += 10;
    }

    // Avoid very early or very late hours
    if (hour < 7 || hour > 21) {
      score -= 30;
    }

    // Prefer slots with more available time (less rushed)
    const endMinutes = startMinutes + durationMinutes;
    const nextTask = schedule.find(task => {
      const taskStart = this.timeStringToMinutes(task.scheduledTime);
      return taskStart > endMinutes;
    });

    if (nextTask) {
      const bufferTime = this.timeStringToMinutes(nextTask.scheduledTime) - endMinutes;
      if (bufferTime > 30) score += 15;
      else if (bufferTime > 15) score += 5;
    }

    // Round to 15-minute intervals get bonus
    if (startMinutes % 15 === 0) {
      score += 5;
    }

    return score;
  }

  /**
   * Get recommendation reason text
   */
  getRecommendationReason(slot, timeBlock, schedule) {
    const reasons = [];
    const startMinutes = this.timeStringToMinutes(slot.startTime);
    const hour = Math.floor(startMinutes / 60);

    if (timeBlock === 'morning' && hour >= 9) {
      reasons.push('Good morning focus time');
    } else if (timeBlock === 'afternoon' && hour >= 13 && hour < 16) {
      reasons.push('Peak afternoon productivity');
    } else if (timeBlock === 'evening' && hour >= 18) {
      reasons.push('Evening availability');
    }

    if (slot.availableDuration > 120) {
      reasons.push('Plenty of buffer time');
    }

    if (slot.score > 120) {
      reasons.push('Optimal schedule fit');
    }

    return reasons.length > 0 ? reasons.join(' • ') : 'Available time slot';
  }

  /**
   * Show smart scheduling suggestions
   */
  showSmartSchedulingSuggestions(durationMinutes = 60, taskName = 'New Task') {
    const suggestions = this.findOptimalTimeSlots(durationMinutes, {
      maxSuggestions: 6
    });

    if (suggestions.length === 0) {
      this.showValidationError('No suitable time slots found. Consider adjusting task duration or schedule.');
      return;
    }

    // Create suggestions modal
    const modal = document.createElement('div');
    modal.className = 'smart-scheduling-modal';
    modal.innerHTML = `
      <div class="smart-scheduling-content">
        <div class="smart-scheduling-header">
          <h3>✨ Smart Scheduling Suggestions</h3>
          <p>Best times for "${taskName}" (${durationMinutes} min)</p>
        </div>
        <div class="scheduling-suggestions">
          ${suggestions.map((suggestion, index) => `
            <div class="suggestion-item" data-time="${suggestion.startTime}">
              <div class="suggestion-main">
                <span class="suggestion-time">${suggestion.startTime} - ${suggestion.endTime}</span>
                <span class="suggestion-block">${suggestion.timeBlock}</span>
              </div>
              <div class="suggestion-reason">${suggestion.reason}</div>
              <div class="suggestion-score">Score: ${Math.round(suggestion.score)}</div>
            </div>
          `).join('')}
        </div>
        <div class="smart-scheduling-actions">
          <button class="btn-cancel">Cancel</button>
          <button class="btn-show-all">Show More Options</button>
        </div>
      </div>
    `;

    // Style modal
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2300;
    `;

    document.body.appendChild(modal);

    // Handle suggestion selection
    modal.addEventListener('click', async (e) => {
      const suggestionItem = e.target.closest('.suggestion-item');
      if (suggestionItem) {
        const selectedTime = suggestionItem.dataset.time;
        // Here you would create a new task at the selected time
        // For now, just show feedback
        this.showRescheduleSuccess(`Task scheduled for ${selectedTime}`, '');
        document.body.removeChild(modal);
      } else if (e.target.classList.contains('btn-cancel') || e.target === modal) {
        document.body.removeChild(modal);
      } else if (e.target.classList.contains('btn-show-all')) {
        // Show more detailed scheduling interface
        this.showAdvancedSchedulingInterface(durationMinutes, taskName);
        document.body.removeChild(modal);
      }
    });
  }

  /**
   * Show advanced scheduling interface
   */
  showAdvancedSchedulingInterface(durationMinutes, taskName) {
    // This would open a more detailed scheduling interface
    // For now, show a simple message
    this.showRescheduleSuccess('Advanced scheduling interface would open here', '');
  }

  /**
   * Auto-reschedule affected tasks when changes are made
   */
  async autoRescheduleAffectedTasks(changedTaskId, newStartTime, newDuration) {
    if (!this.scheduleData?.schedule) return;

    const affectedTasks = [];
    const newStart = this.timeStringToMinutes(newStartTime);
    const newEnd = newStart + newDuration;

    // Find tasks that conflict with the new time
    this.scheduleData.schedule.forEach(task => {
      if (task.id === changedTaskId) return; // Skip the changed task itself

      const taskStart = this.timeStringToMinutes(task.scheduledTime);
      const taskEnd = taskStart + (task.durationMinutes || 0);

      // Check for overlap
      if ((taskStart < newEnd && taskEnd > newStart)) {
        affectedTasks.push(task);
      }
    });

    if (affectedTasks.length === 0) return;

    // Show conflict resolution options
    this.showConflictResolutionDialog(affectedTasks, newStartTime, newDuration);
  }

  /**
   * Show conflict resolution dialog
   */
  showConflictResolutionDialog(affectedTasks, newTime, newDuration) {
    const dialog = document.createElement('div');
    dialog.className = 'conflict-resolution-dialog';
    dialog.innerHTML = `
      <div class="conflict-resolution-content">
        <div class="conflict-header">
          <span class="conflict-icon">⚠️</span>
          <h3>Schedule Conflict Detected</h3>
        </div>
        <p>The following tasks conflict with your change:</p>
        <div class="affected-tasks">
          ${affectedTasks.map(task => `
            <div class="affected-task">
              <span class="task-name">${task.taskName}</span>
              <span class="task-time">${task.scheduledTime} (${task.durationMinutes}min)</span>
            </div>
          `).join('')}
        </div>
        <div class="resolution-options">
          <h4>Resolution Options:</h4>
          <button class="resolution-btn" data-action="suggest">Smart Reschedule</button>
          <button class="resolution-btn" data-action="move">Move Later</button>
          <button class="resolution-btn" data-action="cancel">Cancel Change</button>
        </div>
      </div>
    `;

    dialog.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2400;
    `;

    document.body.appendChild(dialog);

    dialog.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action) {
        this.handleConflictResolution(action, affectedTasks);
        document.body.removeChild(dialog);
      }
    });
  }

  /**
   * Handle conflict resolution
   */
  async handleConflictResolution(action, affectedTasks) {
    switch (action) {
      case 'suggest':
        // Find new times for affected tasks
        for (const task of affectedTasks) {
          const suggestions = this.findOptimalTimeSlots(task.durationMinutes, { maxSuggestions: 1 });
          if (suggestions.length > 0) {
            // Auto-reschedule to best suggestion
            await this.rescheduleTask(task.id, suggestions[0].startTime);
          }
        }
        this.showRescheduleSuccess('Affected tasks automatically rescheduled', '');
        break;
      
      case 'move':
        // Move affected tasks to later in the day
        for (const task of affectedTasks) {
          const currentStart = this.timeStringToMinutes(task.scheduledTime);
          const newStart = Math.min(currentStart + 60, 22 * 60); // Max 10 PM
          await this.rescheduleTask(task.id, this.minutesToTimeString(newStart));
        }
        this.showRescheduleSuccess('Affected tasks moved to later times', '');
        break;
      
      case 'cancel':
        this.showValidationError('Change cancelled due to conflicts');
        break;
    }
  }

  /**
   * Setup timeline-specific event listeners
   */
  setupTimelineEventListeners() {
    const timerId = `${this.componentId}-setupEventListeners`;
    performanceMonitor.startTimer(timerId, 'eventSetup');
    
    let listenersAdded = 0;
    
    // Date navigation
    const prevBtn = document.getElementById('timeline-prev-day');
    const nextBtn = document.getElementById('timeline-next-day');
    const todayBtn = document.getElementById('timeline-today-btn');
    
    if (prevBtn) {
      const listener = SafeEventListener.add(
        prevBtn, 
        'click', 
        () => {
          this.performanceMetrics.eventHandlerCount++;
          this.navigateDate(-1);
        },
        { description: 'Timeline previous day button' }
      );
      this.eventListeners.push(listener);
      listenersAdded++;
    }
    
    if (nextBtn) {
      const listener = SafeEventListener.add(
        nextBtn, 
        'click', 
        () => {
          this.performanceMetrics.eventHandlerCount++;
          this.navigateDate(1);
        },
        { description: 'Timeline next day button' }
      );
      this.eventListeners.push(listener);
      listenersAdded++;
    }
    
    if (todayBtn) {
      const listener = SafeEventListener.add(
        todayBtn, 
        'click', 
        () => {
          this.performanceMetrics.eventHandlerCount++;
          this.goToToday();
        },
        { description: 'Timeline today button' }
      );
      this.eventListeners.push(listener);
      listenersAdded++;
    }
    
    // Click to create tasks
    if (this.options.enableClickToCreate) {
      const createListener = SafeEventListener.add(
        this.container, 
        'click', 
        (e) => {
          if (e.target.classList.contains('click-to-create') || e.target.classList.contains('hour-content')) {
            this.performanceMetrics.eventHandlerCount++;
            const hour = parseInt(e.target.dataset.hour);
            this.handleClickToCreate(hour);
          }
        },
        { description: 'Timeline click to create' }
      );
      this.eventListeners.push(createListener);
      listenersAdded++;
    }
    
    // Task interactions
    const taskListener = SafeEventListener.add(
      this.container, 
      'click', 
      (e) => {
        const taskBlock = e.target.closest('.task-block');
        if (!taskBlock) return;
        
        this.performanceMetrics.eventHandlerCount++;
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
    listenersAdded++;
    
    // Time block filter buttons
    const filterButtons = this.container.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
      const filterListener = SafeEventListener.add(
        button,
        'click',
        () => {
          this.performanceMetrics.eventHandlerCount++;
          this.setTimeFilter(button.dataset.filter);
        },
        { description: 'Timeline filter button' }
      );
      this.eventListeners.push(filterListener);
      listenersAdded++;
    });
    
    // Drag and drop event handlers
    this.setupDragAndDrop();
    
    // Context menu actions
    this.setupContextMenu();
    
    // Inline editing functionality
    this.setupInlineEditing();
    
    // Add mobile touch enhancements
    this.setupMobileTouchEnhancements();
    
    performanceMonitor.endTimer(timerId, {
      listenersAdded,
      totalEventListeners: this.eventListeners.length,
      enableClickToCreate: this.options.enableClickToCreate,
      filterButtonsCount: filterButtons.length
    });
  }
  
  /**
   * Setup mobile touch enhancements for better mobile experience
   */
  setupMobileTouchEnhancements() {
    // Detect if device supports touch
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    if (!isTouchDevice) return;
    
    // Add touch feedback for task blocks and clickable elements
    const touchFeedbackElements = this.container.querySelectorAll('.task-block, .click-to-create, .hour-content');
    
    touchFeedbackElements.forEach(element => {
      // Touch start feedback
      const touchStartListener = SafeEventListener.add(
        element,
        'touchstart',
        (e) => {
          element.style.opacity = '0.7';
          
          // Haptic feedback on supported devices
          if (navigator.vibrate) {
            navigator.vibrate(10); // Very short vibration
          }
        },
        { description: 'Timeline touch start feedback', passive: true }
      );
      this.eventListeners.push(touchStartListener);
      
      // Touch end feedback
      const touchEndListener = SafeEventListener.add(
        element,
        'touchend',
        (e) => {
          setTimeout(() => {
            element.style.opacity = '';
          }, 150);
        },
        { description: 'Timeline touch end feedback', passive: true }
      );
      this.eventListeners.push(touchEndListener);
      
      // Touch cancel feedback (when touch is interrupted)
      const touchCancelListener = SafeEventListener.add(
        element,
        'touchcancel',
        (e) => {
          element.style.opacity = '';
        },
        { description: 'Timeline touch cancel feedback', passive: true }
      );
      this.eventListeners.push(touchCancelListener);
    });
    
    // Prevent double-tap zoom on timeline elements
    const doubleTapPreventListener = SafeEventListener.add(
      this.container,
      'touchstart',
      (e) => {
        if (e.touches.length > 1) {
          e.preventDefault(); // Prevent pinch zoom
        }
      },
      { description: 'Timeline prevent pinch zoom' }
    );
    this.eventListeners.push(doubleTapPreventListener);
    
    console.log('✅ Mobile touch enhancements enabled');
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
   * Handle window resize with mobile performance optimizations
   */
  handleResize() {
    // Throttle resize handling for mobile performance
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    
    this.resizeTimeout = setTimeout(() => {
      this.updateResponsiveSizing();
      
      // Re-setup touch enhancements if needed (for dynamic elements)
      if (this.isMobileDevice()) {
        this.refreshMobileTouchEnhancements();
      }
    }, 100); // Throttle resize to 100ms for better mobile performance
  }
  
  /**
   * Check if current device is mobile
   */
  isMobileDevice() {
    return window.innerWidth <= 767 || ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }
  
  /**
   * Refresh mobile touch enhancements for dynamically added elements
   */
  refreshMobileTouchEnhancements() {
    if (!this.isMobileDevice()) return;
    
    // Re-apply touch enhancements to new elements
    const newTouchElements = this.container.querySelectorAll('.task-block:not([data-touch-enhanced]), .click-to-create:not([data-touch-enhanced])');
    
    newTouchElements.forEach(element => {
      element.setAttribute('data-touch-enhanced', 'true');
      
      // Add touch feedback
      const touchStartListener = SafeEventListener.add(
        element,
        'touchstart',
        () => {
          element.style.opacity = '0.7';
          if (navigator.vibrate) navigator.vibrate(10);
        },
        { description: 'Timeline touch refresh feedback', passive: true }
      );
      this.eventListeners.push(touchStartListener);
      
      const touchEndListener = SafeEventListener.add(
        element,
        'touchend',
        () => {
          setTimeout(() => element.style.opacity = '', 150);
        },
        { description: 'Timeline touch refresh end', passive: true }
      );
      this.eventListeners.push(touchEndListener);
    });
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
   * Get performance metrics summary for this timeline instance
   */
  getPerformanceMetrics() {
    const summary = performanceMonitor.getSummary();
    
    return {
      componentId: this.componentId,
      instanceMetrics: { ...this.performanceMetrics },
      globalMetrics: summary,
      renderEfficiency: {
        averageRenderTime: summary.recent.renders?.mean || 0,
        renderCount: this.performanceMetrics.renderCount,
        refreshCount: this.performanceMetrics.refreshCount,
        eventHandlerCount: this.performanceMetrics.eventHandlerCount
      },
      memoryUsage: summary.memory || null,
      recentAlerts: summary.alerts || []
    };
  }

  /**
   * Log performance summary to console
   */
  logPerformanceMetrics() {
    const metrics = this.getPerformanceMetrics();
    
    console.group(`📊 Timeline Performance Metrics (${this.componentId})`);
    console.log('Instance Metrics:', metrics.instanceMetrics);
    console.log('Render Efficiency:', metrics.renderEfficiency);
    
    if (metrics.memoryUsage) {
      console.log('Memory Usage:', metrics.memoryUsage);
    }
    
    if (metrics.recentAlerts.length > 0) {
      console.warn('Recent Alerts:', metrics.recentAlerts);
    }
    
    console.groupEnd();
  }

  /**
   * Destroy timeline component
   */
  destroy() {
    // Prevent double cleanup
    if (this._isDestroying || this._isDestroyed) return;
    
    const timerId = `${this.componentId}-destroy`;
    performanceMonitor.startTimer(timerId, 'destruction');
    
    // Log final performance metrics
    console.log('📊 Final performance metrics before destruction:');
    this.logPerformanceMetrics();
    
    this.pauseRealTimeUpdates();
    
    if (this.container) {
      this.container.innerHTML = '';
    }
    
    // Remove all tracked event listeners
    this.eventListeners.forEach(listenerId => {
      SafeEventListener.remove(listenerId);
    });
    this.eventListeners = [];
    
    // DO NOT call ComponentManager.unregister(this) here to prevent recursion
    // Memory manager handles unregistration externally via MemoryLeakPrevention.unregisterComponent()
    
    performanceMonitor.endTimer(timerId, {
      finalRenderCount: this.performanceMetrics.renderCount,
      finalRefreshCount: this.performanceMetrics.refreshCount,
      finalEventHandlerCount: this.performanceMetrics.eventHandlerCount,
      containerCleared: !this.container || this.container.innerHTML === ''
    });
    
    console.log('✅ Timeline component destroyed');
  }
}

export default Timeline;

console.log('✅ Timeline component initialized');