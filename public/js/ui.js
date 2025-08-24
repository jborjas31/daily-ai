/**
 * UI Management Module
 * 
 * Handles all DOM manipulation, rendering, and UI state management
 * Separation of concerns: UI rendering separate from business logic
 */

import { state, stateListeners } from './state.js';
import { schedulingEngine, taskTemplateManager, taskInstanceManager } from './taskLogic.js';
import { SimpleErrorHandler } from './utils/SimpleErrorHandler.js';
import { dataUtils } from './data.js';

/**
 * UI State Management
 */
const uiState = {
  currentModal: null,
  isLoading: false,
  lastRenderedView: null,
  renderCache: new Map()
};

/**
 * DOM Element Selectors
 */
const SELECTORS = {
  loadingScreen: '#loading-screen',
  authContainer: '#auth-container',
  mainApp: '#main-app',
  appHeader: '#app-header',
  appMain: '#app-main',
  appNav: '#app-nav'
};

/**
 * Main UI Controller
 */
export const uiController = {
  /**
   * Initialize UI system
   */
  init() {
    this.setupGlobalEventListeners();
    this.setupStateChangeListeners();
    console.log('✅ UI system initialized');
  },

  /**
   * Setup global UI event listeners
   */
  setupGlobalEventListeners() {
    // Handle window resize for responsive updates
    window.addEventListener('resize', this.handleResize.bind(this));
    
    // Handle visibility change for performance
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  },

  /**
   * Setup state change listeners for automatic UI updates
   */
  setupStateChangeListeners() {
    // Listen for view changes
    stateListeners.on('view', (view) => {
      this.renderCurrentView();
    });

    // Listen for task template changes
    stateListeners.on('taskTemplates', () => {
      if (state.getCurrentView() === 'today' || state.getCurrentView() === 'library') {
        this.renderCurrentView();
      }
    });

    // Listen for task instance changes
    stateListeners.on('taskInstances', () => {
      if (state.getCurrentView() === 'today') {
        this.renderCurrentView();
      }
    });

    // Listen for settings changes
    stateListeners.on('settings', () => {
      this.renderCurrentView();
    });

    // Listen for loading state changes
    stateListeners.on('loading', (loadingData) => {
      this.updateLoadingStates(loadingData);
    });
  },

  /**
   * Handle window resize events
   */
  handleResize() {
    // Trigger responsive layout updates
    this.updateResponsiveElements();
  },

  /**
   * Handle visibility change events
   */
  handleVisibilityChange() {
    if (document.hidden) {
      // Pause non-critical UI updates when tab is hidden
      this.pauseUIUpdates();
    } else {
      // Resume UI updates when tab becomes visible
      this.resumeUIUpdates();
    }
  },

  /**
   * Pause non-critical UI updates
   */
  pauseUIUpdates() {
    console.log('⏸️ UI updates paused (tab hidden)');
  },

  /**
   * Resume UI updates
   */
  resumeUIUpdates() {
    console.log('▶️ UI updates resumed (tab visible)');
    this.renderCurrentView(); // Refresh current view
  },

  /**
   * Update responsive elements based on screen size
   */
  updateResponsiveElements() {
    // This will be expanded in future phases with specific responsive logic
    console.log('📱 Updating responsive elements');
  },

  /**
   * Render current view based on application state
   */
  renderCurrentView() {
    const currentView = state.getCurrentView();
    
    // Prevent unnecessary re-renders
    if (uiState.lastRenderedView === currentView && !this.shouldForceRender()) {
      return;
    }

    try {
      switch (currentView) {
        case 'today':
          this.renderTodayView();
          break;
        case 'library':
          this.renderTaskLibraryView();
          break;
        case 'settings':
          this.renderSettingsView();
          break;
        default:
          console.warn('Unknown view:', currentView);
      }
      
      uiState.lastRenderedView = currentView;
    } catch (error) {
      console.error('❌ Error rendering view:', error);
      SimpleErrorHandler.showError('Failed to render view. Please try refreshing the page.', error);
    }
  },

  /**
   * Check if UI should force re-render
   */
  shouldForceRender() {
    // Force render if data has been updated recently
    return true; // For now, always render to ensure consistency
  },

  /**
   * Update loading states in UI
   */
  updateLoadingStates(loadingData) {
    const { type, isLoading } = loadingData;
    
    // Update specific loading indicators
    const loadingElements = document.querySelectorAll(`[data-loading-type="${type}"]`);
    loadingElements.forEach(element => {
      if (isLoading) {
        element.classList.add('loading');
      } else {
        element.classList.remove('loading');
      }
    });
  }
};

/**
 * Authentication UI Management
 */
export const authUI = {
  /**
   * Show authentication container
   */
  show() {
    const authContainer = document.getElementById('auth-container');
    const mainApp = document.getElementById('main-app');
    
    authContainer.style.display = 'block';
    mainApp.style.display = 'none';
    
    this.renderAuthForm();
  },

  /**
   * Hide authentication container
   */
  hide() {
    const authContainer = document.getElementById('auth-container');
    authContainer.style.display = 'none';
  },

  /**
   * Render authentication form
   */
  renderAuthForm() {
    const authContainer = document.getElementById('auth-container');
    authContainer.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        padding: 1rem;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      ">
        <div style="
          background: white;
          border-radius: 1rem;
          padding: 2rem;
          max-width: 400px;
          width: 100%;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        ">
          <div style="text-align: center; margin-bottom: 2rem;">
            <h1 style="font-size: 2rem; color: #3B82F6; margin-bottom: 0.5rem;">
              📋 Daily AI
            </h1>
            <p style="color: #6B7280;">
              Your intelligent task manager
            </p>
          </div>
          
          <form id="auth-form">
            <div style="margin-bottom: 1rem;">
              <label class="label" for="email">Email</label>
              <input 
                type="email" 
                id="email" 
                class="input"
                required
                placeholder="Enter your email"
              />
            </div>
            
            <div style="margin-bottom: 1.5rem;">
              <label class="label" for="password">Password</label>
              <input 
                type="password" 
                id="password" 
                class="input"
                required
                placeholder="Enter your password"
              />
            </div>
            
            <div style="margin-bottom: 1rem;">
              <button type="submit" id="login-btn" class="btn btn-primary" style="width: 100%;">
                Sign In
              </button>
            </div>
            
            <div>
              <button type="button" id="signup-btn" class="btn btn-secondary" style="width: 100%;">
                Create Account
              </button>
            </div>
            
            <div id="auth-error" class="hidden" style="
              margin-top: 1rem;
              padding: 0.75rem;
              background: #FEF2F2;
              border: 1px solid #FECACA;
              border-radius: 0.5rem;
              color: #DC2626;
            "></div>
          </form>
        </div>
      </div>
    `;
  }
};

/**
 * Main App UI Management
 */
export const mainAppUI = {
  /**
   * Show main application
   */
  show() {
    const authContainer = document.getElementById('auth-container');
    const mainApp = document.getElementById('main-app');
    
    authContainer.style.display = 'none';
    mainApp.style.display = 'block';
    
    this.renderAppStructure();
  },

  /**
   * Render main app structure (header, nav, main content area)
   */
  renderAppStructure() {
    const mainApp = document.getElementById('main-app');
    mainApp.innerHTML = `
      <div class="app-container">
        <header id="app-header" class="app-header"></header>
        <nav id="app-nav" class="app-nav"></nav>
        <main id="app-main" class="app-main"></main>
      </div>
    `;
    
    this.renderHeader();
    this.renderNavigation();
    uiController.renderCurrentView();
  },

  /**
   * Render application header
   */
  renderHeader() {
    const header = document.getElementById('app-header');
    const user = state.getUser();
    const today = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    header.innerHTML = `
      <div class="header-content">
        <div class="header-left">
          <h1 class="app-title">📋 Daily AI</h1>
          <p class="header-date">${today}</p>
        </div>
        <div class="header-right">
          <span class="user-email">${user?.email || 'User'}</span>
          <button id="sign-out-btn" class="btn btn-secondary btn-sm">
            Sign Out
          </button>
        </div>
      </div>
    `;
    
    // Add sign out functionality
    document.getElementById('sign-out-btn')?.addEventListener('click', () => {
      firebase.auth().signOut();
    });
  },

  /**
   * Render navigation
   */
  renderNavigation() {
    const nav = document.getElementById('app-nav');
    const currentView = state.getCurrentView();
    
    nav.innerHTML = `
      <div class="nav-content">
        <button class="nav-btn ${currentView === 'today' ? 'active' : ''}" data-view="today">
          🏠 Today
        </button>
        <button class="nav-btn ${currentView === 'library' ? 'active' : ''}" data-view="library">
          📚 Library
        </button>
        <button class="nav-btn ${currentView === 'settings' ? 'active' : ''}" data-view="settings">
          ⚙️ Settings
        </button>
        <button class="nav-btn add-task-btn" id="nav-add-task">
          ➕ Add Task
        </button>
      </div>
    `;
    
    // Add navigation event listeners
    nav.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        state.setCurrentView(view);
      });
    });
    
    // Add task button
    document.getElementById('nav-add-task')?.addEventListener('click', () => {
      this.showAddTaskModal();
    });
  },

  /**
   * Show add task modal (placeholder for now)
   */
  showAddTaskModal() {
    alert('Add Task modal coming soon! This will be implemented in Phase 4.');
    // TODO: Implement task creation modal in Phase 4
  }
};

/**
 * Today View UI Management
 */
export const todayViewUI = {
  /**
   * Render Today View
   */
  render() {
    const mainContent = document.getElementById('app-main');
    const settings = state.getSettings();
    const taskTemplates = state.getTaskTemplates();
    const currentDate = state.getCurrentDate();
    const taskInstances = state.getTaskInstancesForDate(currentDate);
    
    // Generate schedule for today
    const scheduleResult = schedulingEngine.generateScheduleForDate(currentDate);
    
    mainContent.innerHTML = `
      <div class="view-container">
        ${this.renderDateNavigation(currentDate)}
        ${this.renderScheduleOverview(settings, taskTemplates, taskInstances, scheduleResult)}
        ${this.renderQuickActions()}
        ${this.renderTasksList(taskTemplates, scheduleResult)}
      </div>
    `;
    
    this.setupEventListeners();
  },

  /**
   * Render date navigation
   */
  renderDateNavigation(currentDate) {
    return `
      <div class="date-navigation">
        <button id="prev-day" class="btn btn-secondary">← Previous</button>
        <h2 class="current-date">${this.formatDate(currentDate)}</h2>
        <button id="next-day" class="btn btn-secondary">Next →</button>
        <button id="today-btn" class="btn btn-primary">Today</button>
      </div>
    `;
  },

  /**
   * Render schedule overview
   */
  renderScheduleOverview(settings, taskTemplates, taskInstances, scheduleResult) {
    const sleepSchedule = `${settings.defaultSleepTime} - ${settings.defaultWakeTime} (${settings.desiredSleepDuration}h)`;
    
    return `
      <div class="schedule-overview">
        <div class="overview-card">
          <h3>Today's Schedule</h3>
          <p class="sleep-info">Sleep: ${sleepSchedule}</p>
          ${scheduleResult.success ? 
            `<p class="schedule-status success">✅ Schedule generated successfully</p>` :
            `<p class="schedule-status error">❌ ${scheduleResult.message}</p>`
          }
        </div>
        
        <div class="stats-grid">
          <div class="stat-card">
            <h4>Task Templates</h4>
            <span class="stat-number">${taskTemplates.length}</span>
            <span class="stat-label">Active tasks</span>
          </div>
          
          <div class="stat-card">
            <h4>Today's Instances</h4>
            <span class="stat-number">${taskInstances.length}</span>
            <span class="stat-label">Modified for today</span>
          </div>
          
          ${scheduleResult.success ? `
            <div class="stat-card">
              <h4>Scheduled</h4>
              <span class="stat-number">${scheduleResult.scheduledTasks}</span>
              <span class="stat-label">Tasks scheduled</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  },

  /**
   * Render quick actions
   */
  renderQuickActions() {
    return `
      <div class="quick-actions">
        <h3>Quick Actions</h3>
        <div class="action-buttons">
          <button id="add-task-btn" class="btn btn-primary">
            ➕ Add Task
          </button>
          <button id="view-library-btn" class="btn btn-secondary">
            📚 View Library
          </button>
          <button id="refresh-schedule-btn" class="btn btn-secondary">
            🔄 Refresh Schedule
          </button>
        </div>
      </div>
    `;
  },

  /**
   * Render tasks list
   */
  renderTasksList(taskTemplates, scheduleResult) {
    if (taskTemplates.length === 0) {
      return `
        <div class="tasks-section">
          <h3>Your Tasks</h3>
          <div class="empty-state">
            <p>No tasks yet. Add your first task to get started!</p>
          </div>
        </div>
      `;
    }
    
    return `
      <div class="tasks-section">
        <h3>Your Tasks (${taskTemplates.length})</h3>
        <div class="tasks-list">
          ${taskTemplates.map(task => this.renderTaskItem(task)).join('')}
        </div>
      </div>
    `;
  },

  /**
   * Render individual task item
   */
  renderTaskItem(task) {
    return `
      <div class="task-item" data-task-id="${task.id}">
        <div class="task-content">
          <h4 class="task-name">${task.taskName}</h4>
          ${task.description ? `<p class="task-description">${task.description}</p>` : ''}
          <div class="task-meta">
            <span class="task-duration">⏱️ ${task.durationMinutes}min</span>
            <span class="task-priority">📊 Priority ${task.priority}</span>
            <span class="task-type">${task.isMandatory ? '🔒 Mandatory' : '📝 Skippable'}</span>
            <span class="task-window">🕐 ${task.timeWindow}</span>
          </div>
        </div>
        <div class="task-actions">
          <button class="btn btn-sm btn-secondary" onclick="editTask('${task.id}')">
            Edit
          </button>
          <button class="btn btn-sm btn-primary" onclick="toggleTaskCompletion('${task.id}')">
            ✓ Complete
          </button>
        </div>
      </div>
    `;
  },

  /**
   * Setup event listeners for Today view
   */
  setupEventListeners() {
    // Date navigation
    document.getElementById('prev-day')?.addEventListener('click', () => {
      this.navigateDate(-1);
    });
    
    document.getElementById('next-day')?.addEventListener('click', () => {
      this.navigateDate(1);
    });
    
    document.getElementById('today-btn')?.addEventListener('click', () => {
      state.setCurrentDate(dataUtils.getTodayDateString());
    });
    
    // Quick actions
    document.getElementById('add-task-btn')?.addEventListener('click', () => {
      mainAppUI.showAddTaskModal();
    });
    
    document.getElementById('view-library-btn')?.addEventListener('click', () => {
      state.setCurrentView('library');
    });
    
    document.getElementById('refresh-schedule-btn')?.addEventListener('click', () => {
      uiController.renderCurrentView();
      SimpleErrorHandler.showSuccess('Schedule refreshed!');
    });
  },

  /**
   * Navigate date by number of days
   */
  navigateDate(days) {
    const currentDate = new Date(state.getCurrentDate());
    currentDate.setDate(currentDate.getDate() + days);
    state.setCurrentDate(dataUtils.formatDate(currentDate));
  },

  /**
   * Format date for display
   */
  formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
};

/**
 * Task Library View UI Management
 */
export const taskLibraryUI = {
  /**
   * Render Task Library View
   */
  render() {
    const mainContent = document.getElementById('app-main');
    const taskTemplates = state.getTaskTemplates();
    
    mainContent.innerHTML = `
      <div class="view-container">
        <div class="library-header">
          <h2>Task Library</h2>
          <p>Manage all your task templates</p>
        </div>
        
        <div class="library-content">
          ${this.renderSearchAndFilters()}
          ${this.renderTaskCategories(taskTemplates)}
        </div>
      </div>
    `;
    
    this.setupEventListeners();
  },

  /**
   * Render search and filters
   */
  renderSearchAndFilters() {
    return `
      <div class="search-filters">
        <div class="search-bar">
          <input type="text" id="task-search" class="input" placeholder="Search tasks...">
        </div>
        <div class="filter-buttons">
          <button class="btn btn-sm btn-secondary filter-btn active" data-filter="all">All</button>
          <button class="btn btn-sm btn-secondary filter-btn" data-filter="mandatory">Mandatory</button>
          <button class="btn btn-sm btn-secondary filter-btn" data-filter="skippable">Skippable</button>
        </div>
      </div>
    `;
  },

  /**
   * Render task categories
   */
  renderTaskCategories(taskTemplates) {
    if (taskTemplates.length === 0) {
      return `
        <div class="empty-state">
          <h3>No Tasks Found</h3>
          <p>Start by creating your first task template!</p>
          <button class="btn btn-primary" onclick="mainAppUI.showAddTaskModal()">
            ➕ Add Your First Task
          </button>
        </div>
      `;
    }
    
    return `
      <div class="task-categories">
        <div class="category-section">
          <h3>All Tasks (${taskTemplates.length})</h3>
          <div class="tasks-grid">
            ${taskTemplates.map(task => this.renderLibraryTaskItem(task)).join('')}
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Render library task item
   */
  renderLibraryTaskItem(task) {
    return `
      <div class="library-task-item card" data-task-id="${task.id}">
        <div class="task-header">
          <h4 class="task-name">${task.taskName}</h4>
          <div class="task-actions">
            <button class="btn btn-sm btn-secondary" onclick="editTask('${task.id}')">Edit</button>
            <button class="btn btn-sm btn-secondary" onclick="duplicateTask('${task.id}')">Copy</button>
          </div>
        </div>
        ${task.description ? `<p class="task-description">${task.description}</p>` : ''}
        <div class="task-details">
          <span class="detail-item">Duration: ${task.durationMinutes}min</span>
          <span class="detail-item">Priority: ${task.priority}/5</span>
          <span class="detail-item">Type: ${task.schedulingType}</span>
          <span class="detail-item">${task.isMandatory ? 'Mandatory' : 'Skippable'}</span>
          <span class="detail-item">Window: ${task.timeWindow}</span>
        </div>
      </div>
    `;
  },

  /**
   * Setup event listeners for Task Library view
   */
  setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('task-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.handleSearch(e.target.value);
      });
    }
    
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.handleFilter(btn.dataset.filter);
      });
    });
  },

  /**
   * Handle search input
   */
  handleSearch(query) {
    state.setSearchQuery(query);
    // Re-render with filtered results
    this.render();
  },

  /**
   * Handle filter selection
   */
  handleFilter(filterType) {
    state.setFilter('mandatory', filterType);
    // Re-render with filtered results
    this.render();
  }
};

/**
 * Settings View UI Management
 */
export const settingsUI = {
  /**
   * Render Settings View
   */
  render() {
    const mainContent = document.getElementById('app-main');
    const settings = state.getSettings();
    
    mainContent.innerHTML = `
      <div class="view-container">
        <div class="settings-header">
          <h2>Settings</h2>
          <p>Configure your Daily AI preferences</p>
        </div>
        
        <div class="settings-content">
          ${this.renderSleepConfiguration(settings)}
        </div>
      </div>
    `;
  },

  /**
   * Render sleep configuration section
   */
  renderSleepConfiguration(settings) {
    return `
      <div class="settings-section card">
        <h3>Sleep Configuration</h3>
        <div class="settings-grid">
          <div class="setting-item">
            <label class="label">Sleep Duration (hours)</label>
            <span class="setting-value">${settings.desiredSleepDuration}</span>
          </div>
          <div class="setting-item">
            <label class="label">Default Wake Time</label>
            <span class="setting-value">${settings.defaultWakeTime}</span>
          </div>
          <div class="setting-item">
            <label class="label">Default Sleep Time</label>
            <span class="setting-value">${settings.defaultSleepTime}</span>
          </div>
        </div>
        <p class="settings-note">
          Settings editing will be implemented in a future phase.
        </p>
      </div>
    `;
  }
};

/**
 * Add UI controller methods to main uiController
 */
uiController.renderTodayView = todayViewUI.render.bind(todayViewUI);
uiController.renderTaskLibraryView = taskLibraryUI.render.bind(taskLibraryUI);
uiController.renderSettingsView = settingsUI.render.bind(settingsUI);

/**
 * Global UI functions (for backwards compatibility with existing onclick handlers)
 */
window.editTask = (taskId) => {
  console.log('Edit task:', taskId);
  alert('Task editing modal will be implemented in Phase 4.');
  // TODO: Implement task editing modal in Phase 4
};

window.duplicateTask = async (taskId) => {
  try {
    await taskTemplateManager.duplicateTemplate(taskId);
    SimpleErrorHandler.showSuccess('Task duplicated successfully!');
  } catch (error) {
    console.error('Error duplicating task:', error);
    SimpleErrorHandler.showError('Failed to duplicate task. Please try again.', error);
  }
};

window.toggleTaskCompletion = async (taskId) => {
  try {
    const currentDate = state.getCurrentDate();
    await taskInstanceManager.toggleTaskCompletion(taskId, currentDate);
    SimpleErrorHandler.showSuccess('Task status updated!');
  } catch (error) {
    console.error('Error toggling task completion:', error);
    SimpleErrorHandler.showError('Failed to update task status. Please try again.', error);
  }
};

console.log('✅ UI management system initialized');