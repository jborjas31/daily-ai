/**
 * Daily AI - Main Application Entry Point
 * 
 * This is the main application file that initializes all modules
 * and starts the Daily AI task management application.
 */

// Import Firebase module with error handling
import { 
  initFirebase, 
  onAuthStateChanged, 
  safeSignIn, 
  safeCreateUser,
  SimpleErrorHandler 
} from './firebase.js';

// Import data and state management
import { state, stateListeners, stateActions } from './state.js';
import { dataUtils } from './data.js';

// Import error handling utilities
import { SimpleValidation } from './utils/SimpleValidation.js';
import { SimpleNetworkChecker } from './utils/SimpleNetworkChecker.js';
import { SimpleTabSync } from './utils/SimpleTabSync.js';

/**
 * Application initialization
 */
async function initApp() {
  try {
    console.log('🚀 Initializing Daily AI...');
    
    // Setup network monitoring
    SimpleNetworkChecker.setupNetworkMonitoring();
    console.log('✅ Network monitoring initialized');
    
    // Initialize tab synchronization
    window.tabSync = new SimpleTabSync();
    console.log('✅ Tab synchronization initialized');
    
    // Initialize Firebase first
    await initFirebase();
    console.log('✅ Firebase initialized');
    
    // Set up authentication state observer
    onAuthStateChanged(async (user) => {
      document.getElementById('loading-screen').style.display = 'none';
      
      if (user) {
        console.log('✅ User authenticated:', user.email);
        
        // Set user in application state
        state.setUser(user);
        
        try {
          // Initialize user data and load settings with error handling
          SimpleErrorHandler.showLoading('Loading your data...');
          
          await stateActions.initializeUser();
          await stateActions.loadTaskTemplates();
          
          // Load data for current date
          const today = dataUtils.getTodayDateString();
          await stateActions.loadTaskInstancesForDate(today);
          await stateActions.loadDailyScheduleForDate(today);
          
          SimpleErrorHandler.hideLoading();
          showMainApp();
        } catch (error) {
          SimpleErrorHandler.hideLoading();
          console.error('❌ Error initializing user data:', error);
          SimpleErrorHandler.showError('Failed to load user data. Please try refreshing the page.', error);
        }
      } else {
        console.log('🔒 User not authenticated, showing login');
        
        // Clear user from application state
        state.setUser(null);
        showAuthContainer();
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to initialize Daily AI:', error);
    document.getElementById('loading-screen').style.display = 'none';
    SimpleErrorHandler.showError('Failed to initialize the application. Please refresh the page and try again.', error);
  }
}

/**
 * Show authentication container with login/signup form
 */
function showAuthContainer() {
  document.getElementById('auth-container').style.display = 'block';
  document.getElementById('main-app').style.display = 'none';
  
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
            <label style="display: block; margin-bottom: 0.5rem; color: #374151; font-weight: 500;">
              Email
            </label>
            <input 
              type="email" 
              id="email" 
              required
              style="
                width: 100%;
                padding: 0.75rem;
                border: 2px solid #E5E7EB;
                border-radius: 0.5rem;
                font-size: 1rem;
                transition: border-color 0.2s;
              "
              placeholder="Enter your email"
            />
          </div>
          
          <div style="margin-bottom: 1.5rem;">
            <label style="display: block; margin-bottom: 0.5rem; color: #374151; font-weight: 500;">
              Password
            </label>
            <input 
              type="password" 
              id="password" 
              required
              style="
                width: 100%;
                padding: 0.75rem;
                border: 2px solid #E5E7EB;
                border-radius: 0.5rem;
                font-size: 1rem;
                transition: border-color 0.2s;
              "
              placeholder="Enter your password"
            />
          </div>
          
          <div style="margin-bottom: 1rem;">
            <button 
              type="submit" 
              id="login-btn"
              style="
                width: 100%;
                padding: 0.75rem;
                background: #3B82F6;
                color: white;
                border: none;
                border-radius: 0.5rem;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: background-color 0.2s;
              "
            >
              Sign In
            </button>
          </div>
          
          <div>
            <button 
              type="button" 
              id="signup-btn"
              style="
                width: 100%;
                padding: 0.75rem;
                background: transparent;
                color: #3B82F6;
                border: 2px solid #3B82F6;
                border-radius: 0.5rem;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
              "
            >
              Create Account
            </button>
          </div>
          
          <div id="auth-error" style="
            margin-top: 1rem;
            padding: 0.75rem;
            background: #FEF2F2;
            border: 1px solid #FECACA;
            border-radius: 0.5rem;
            color: #DC2626;
            display: none;
          "></div>
        </form>
      </div>
    </div>
  `;
  
  // Add event listeners
  setupAuthEventListeners();
}

/**
 * Show main application
 */
function showMainApp() {
  document.getElementById('auth-container').style.display = 'none';
  document.getElementById('main-app').style.display = 'block';
  
  // Initialize the main app interface
  initializeMainAppInterface();
}

/**
 * Initialize main application interface
 */
function initializeMainAppInterface() {
  // Set up header
  setupAppHeader();
  
  // Set up navigation
  setupAppNavigation();
  
  // Show Today View by default
  showTodayView();
  
  // Set up state change listeners for UI updates
  setupStateChangeListeners();
}

/**
 * Set up app header
 */
function setupAppHeader() {
  const header = document.getElementById('app-header');
  const user = state.getUser();
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  header.innerHTML = `
    <div style="
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 2rem;
      background: white;
      border-bottom: 1px solid #E5E7EB;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    ">
      <div>
        <h1 style="font-size: 1.5rem; color: #3B82F6; margin: 0;">📋 Daily AI</h1>
        <p style="color: #6B7280; margin: 0; font-size: 0.875rem;">${today}</p>
      </div>
      <div style="display: flex; align-items: center; gap: 1rem;">
        <span style="color: #374151; font-size: 0.875rem;">${user?.email}</span>
        <button id="sign-out-btn" style="
          padding: 0.5rem 1rem;
          background: #EF4444;
          color: white;
          border: none;
          border-radius: 0.375rem;
          cursor: pointer;
          font-size: 0.875rem;
        ">
          Sign Out
        </button>
      </div>
    </div>
  `;
  
  // Add sign out functionality
  document.getElementById('sign-out-btn').addEventListener('click', () => {
    firebase.auth().signOut();
  });
}

/**
 * Set up app navigation
 */
function setupAppNavigation() {
  const navigation = document.getElementById('app-navigation');
  const currentView = state.getCurrentView();
  
  navigation.innerHTML = `
    <nav style="
      display: flex;
      background: white;
      border-bottom: 1px solid #E5E7EB;
      padding: 0 2rem;
    ">
      <button id="nav-today" class="nav-btn ${currentView === 'today' ? 'active' : ''}" data-view="today">
        Today
      </button>
      <button id="nav-library" class="nav-btn ${currentView === 'library' ? 'active' : ''}" data-view="library">
        Task Library
      </button>
      <button id="nav-settings" class="nav-btn ${currentView === 'settings' ? 'active' : ''}" data-view="settings">
        Settings
      </button>
    </nav>
    
    <style>
      .nav-btn {
        padding: 1rem 1.5rem;
        border: none;
        background: none;
        color: #6B7280;
        cursor: pointer;
        border-bottom: 3px solid transparent;
        font-weight: 500;
        transition: all 0.2s;
      }
      .nav-btn:hover {
        color: #3B82F6;
      }
      .nav-btn.active {
        color: #3B82F6;
        border-bottom-color: #3B82F6;
      }
    </style>
  `;
  
  // Add navigation event listeners
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const view = e.target.dataset.view;
      switchToView(view);
    });
  });
}

/**
 * Show Today View
 */
function showTodayView() {
  state.setCurrentView('today');
  
  const mainContent = document.getElementById('app-main');
  const settings = state.getSettings();
  const taskTemplates = state.getTaskTemplates();
  const currentDate = state.getCurrentDate();
  const taskInstances = state.getTaskInstancesForDate(currentDate);
  
  mainContent.innerHTML = `
    <div style="padding: 2rem;">
      <div style="margin-bottom: 2rem;">
        <h2 style="margin-bottom: 1rem; color: #1F2937;">Today's Schedule</h2>
        <p style="color: #6B7280; margin-bottom: 0.5rem;">
          Sleep: ${settings.defaultSleepTime} - ${settings.defaultWakeTime} 
          (${settings.desiredSleepDuration} hours)
        </p>
        <p style="color: #6B7280;">Date: ${currentDate}</p>
      </div>
      
      <div style="
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2rem;
        margin-bottom: 2rem;
      ">
        <div style="
          background: #F0F9FF;
          border: 1px solid #BAE6FD;
          border-radius: 0.5rem;
          padding: 1.5rem;
        ">
          <h3 style="margin-bottom: 1rem; color: #0369A1;">Task Templates</h3>
          <p style="font-size: 2rem; font-weight: bold; color: #075985; margin: 0;">
            ${taskTemplates.length}
          </p>
          <p style="color: #0369A1; font-size: 0.875rem;">Active tasks</p>
        </div>
        
        <div style="
          background: #F0FDF4;
          border: 1px solid #BBF7D0;
          border-radius: 0.5rem;
          padding: 1.5rem;
        ">
          <h3 style="margin-bottom: 1rem; color: #166534;">Task Instances</h3>
          <p style="font-size: 2rem; font-weight: bold; color: #15803D; margin: 0;">
            ${taskInstances.length}
          </p>
          <p style="color: #166534; font-size: 0.875rem;">Modified for today</p>
        </div>
      </div>
      
      <div style="
        background: white;
        border: 1px solid #E5E7EB;
        border-radius: 0.5rem;
        padding: 1.5rem;
      ">
        <h3 style="margin-bottom: 1rem; color: #1F2937;">Quick Actions</h3>
        <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
          <button id="add-task-btn" style="
            padding: 0.75rem 1.5rem;
            background: #3B82F6;
            color: white;
            border: none;
            border-radius: 0.375rem;
            cursor: pointer;
            font-weight: 500;
          ">
            ➕ Add Task
          </button>
          <button id="view-library-btn" style="
            padding: 0.75rem 1.5rem;
            background: #F3F4F6;
            color: #374151;
            border: 1px solid #D1D5DB;
            border-radius: 0.375rem;
            cursor: pointer;
            font-weight: 500;
          ">
            📚 View Library
          </button>
        </div>
        
        <div style="margin-top: 2rem;">
          <h4 style="margin-bottom: 0.5rem; color: #1F2937;">Your Tasks:</h4>
          <div id="task-list">
            ${taskTemplates.length === 0 
              ? '<p style="color: #6B7280; font-style: italic;">No tasks yet. Add your first task above!</p>'
              : taskTemplates.map(task => `
                <div style="
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  padding: 0.75rem;
                  background: #F9FAFB;
                  border-radius: 0.375rem;
                  margin-bottom: 0.5rem;
                ">
                  <div>
                    <strong>${task.taskName}</strong>
                    ${task.description ? `<p style="color: #6B7280; font-size: 0.875rem; margin: 0.25rem 0 0 0;">${task.description}</p>` : ''}
                    <div style="display: flex; gap: 1rem; font-size: 0.75rem; color: #6B7280; margin-top: 0.25rem;">
                      <span>⏱️ ${task.durationMinutes}min</span>
                      <span>📊 Priority ${task.priority}</span>
                      <span>${task.isMandatory ? '🔒 Mandatory' : '📝 Skippable'}</span>
                    </div>
                  </div>
                  <button onclick="editTask('${task.id}')" style="
                    padding: 0.25rem 0.5rem;
                    background: #E5E7EB;
                    border: none;
                    border-radius: 0.25rem;
                    cursor: pointer;
                    font-size: 0.75rem;
                  ">
                    Edit
                  </button>
                </div>
              `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Add event listeners
  document.getElementById('add-task-btn')?.addEventListener('click', () => {
    console.log('Add task clicked - will implement modal');
  });
  
  document.getElementById('view-library-btn')?.addEventListener('click', () => {
    switchToView('library');
  });
  
  // Make editTask function global temporarily
  window.editTask = (taskId) => {
    console.log('Edit task:', taskId, '- will implement modal');
  };
}

/**
 * Switch to different view
 */
function switchToView(view) {
  state.setCurrentView(view);
  
  // Update navigation
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  
  // Show appropriate view
  switch (view) {
    case 'today':
      showTodayView();
      break;
    case 'library':
      showTaskLibraryView();
      break;
    case 'settings':
      showSettingsView();
      break;
  }
}

/**
 * Show Task Library View (placeholder)
 */
function showTaskLibraryView() {
  const mainContent = document.getElementById('app-main');
  const taskTemplates = state.getTaskTemplates();
  
  mainContent.innerHTML = `
    <div style="padding: 2rem;">
      <h2 style="margin-bottom: 1rem; color: #1F2937;">Task Library</h2>
      <p style="color: #6B7280; margin-bottom: 2rem;">Manage all your task templates</p>
      
      <div style="
        background: white;
        border: 1px solid #E5E7EB;
        border-radius: 0.5rem;
        padding: 1.5rem;
      ">
        <h3 style="margin-bottom: 1rem;">All Tasks (${taskTemplates.length})</h3>
        ${taskTemplates.length === 0 
          ? '<p style="color: #6B7280; font-style: italic;">No tasks created yet.</p>'
          : taskTemplates.map(task => `
            <div style="
              padding: 1rem;
              border: 1px solid #E5E7EB;
              border-radius: 0.375rem;
              margin-bottom: 1rem;
            ">
              <h4 style="margin: 0 0 0.5rem 0;">${task.taskName}</h4>
              ${task.description ? `<p style="color: #6B7280; margin: 0 0 0.5rem 0;">${task.description}</p>` : ''}
              <div style="display: flex; gap: 1rem; font-size: 0.875rem; color: #6B7280;">
                <span>Duration: ${task.durationMinutes}min</span>
                <span>Priority: ${task.priority}/5</span>
                <span>Type: ${task.schedulingType}</span>
                <span>${task.isMandatory ? 'Mandatory' : 'Skippable'}</span>
              </div>
            </div>
          `).join('')}
      </div>
    </div>
  `;
}

/**
 * Show Settings View (placeholder)
 */
function showSettingsView() {
  const mainContent = document.getElementById('app-main');
  const settings = state.getSettings();
  
  mainContent.innerHTML = `
    <div style="padding: 2rem;">
      <h2 style="margin-bottom: 1rem; color: #1F2937;">Settings</h2>
      
      <div style="
        background: white;
        border: 1px solid #E5E7EB;
        border-radius: 0.5rem;
        padding: 1.5rem;
      ">
        <h3 style="margin-bottom: 1rem;">Sleep Configuration</h3>
        <div style="display: grid; gap: 1rem;">
          <div>
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Sleep Duration (hours)</label>
            <span style="color: #6B7280;">${settings.desiredSleepDuration}</span>
          </div>
          <div>
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Default Wake Time</label>
            <span style="color: #6B7280;">${settings.defaultWakeTime}</span>
          </div>
          <div>
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Default Sleep Time</label>
            <span style="color: #6B7280;">${settings.defaultSleepTime}</span>
          </div>
        </div>
        <p style="color: #6B7280; font-size: 0.875rem; margin-top: 1rem;">
          Settings editing will be implemented in the next phase.
        </p>
      </div>
    </div>
  `;
}

/**
 * Set up state change listeners
 */
function setupStateChangeListeners() {
  // Listen for task template changes to update UI
  stateListeners.on('taskTemplates', () => {
    if (state.getCurrentView() === 'today') {
      showTodayView(); // Refresh the today view
    } else if (state.getCurrentView() === 'library') {
      showTaskLibraryView(); // Refresh the library view
    }
  });
  
  // Listen for settings changes
  stateListeners.on('settings', () => {
    if (state.getCurrentView() === 'today') {
      showTodayView(); // Refresh to show updated settings
    } else if (state.getCurrentView() === 'settings') {
      showSettingsView(); // Refresh settings view
    }
  });
}

/**
 * Setup authentication event listeners
 */
function setupAuthEventListeners() {
  const form = document.getElementById('auth-form');
  const loginBtn = document.getElementById('login-btn');
  const signupBtn = document.getElementById('signup-btn');
  const errorDiv = document.getElementById('auth-error');
  
  // Handle form submission (login)
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const email = emailInput.value;
    const password = passwordInput.value;
    
    // Clear previous validation errors
    SimpleValidation.clearValidationError(emailInput);
    SimpleValidation.clearValidationError(passwordInput);
    errorDiv.style.display = 'none';
    
    // Validate email
    const emailValidation = SimpleValidation.validateEmail(email);
    if (!emailValidation.valid) {
      SimpleValidation.showValidationError(emailInput, emailValidation.message);
      return;
    }
    
    // Validate password
    const passwordValidation = SimpleValidation.validatePassword(password);
    if (!passwordValidation.valid) {
      SimpleValidation.showValidationError(passwordInput, passwordValidation.message);
      return;
    }
    
    // Check network connection
    if (!SimpleNetworkChecker.checkConnectionBeforeAction()) {
      return;
    }
    
    try {
      loginBtn.textContent = 'Signing in...';
      loginBtn.disabled = true;
      
      const result = await safeSignIn(email, password);
      
      if (!result.success) {
        // Error already handled by safeSignIn
        console.log('Login failed');
      }
      
    } finally {
      loginBtn.textContent = 'Sign In';
      loginBtn.disabled = false;
    }
  });
  
  // Handle signup button
  signupBtn.addEventListener('click', async () => {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const email = emailInput.value;
    const password = passwordInput.value;
    
    // Clear previous validation errors
    SimpleValidation.clearValidationError(emailInput);
    SimpleValidation.clearValidationError(passwordInput);
    errorDiv.style.display = 'none';
    
    // Validate email
    const emailValidation = SimpleValidation.validateEmail(email);
    if (!emailValidation.valid) {
      SimpleValidation.showValidationError(emailInput, emailValidation.message);
      return;
    }
    
    // Validate password
    const passwordValidation = SimpleValidation.validatePassword(password);
    if (!passwordValidation.valid) {
      SimpleValidation.showValidationError(passwordInput, passwordValidation.message);
      return;
    }
    
    // Check network connection
    if (!SimpleNetworkChecker.checkConnectionBeforeAction()) {
      return;
    }
    
    try {
      signupBtn.textContent = 'Creating account...';
      signupBtn.disabled = true;
      
      const result = await safeCreateUser(email, password);
      
      if (!result.success) {
        // Error already handled by safeCreateUser
        console.log('Signup failed');
      }
      
    } finally {
      signupBtn.textContent = 'Create Account';
      signupBtn.disabled = false;
    }
  });
}

// Note: Authentication error messages are now handled by SimpleErrorHandler.getFriendlyMessage()

/**
 * Show critical error message (used for app initialization failures)
 */
function showErrorMessage(message) {
  // For critical errors, show using SimpleErrorHandler and offer reload
  SimpleErrorHandler.showError(message);
  
  // Also show in UI if possible
  try {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    
    const mainContent = document.getElementById('app-main');
    mainContent.innerHTML = `
      <div style="text-align: center; padding: 2rem;">
        <h2 style="color: #EF4444; margin-bottom: 1rem;">Application Error</h2>
        <p style="color: #57534E;">${message}</p>
        <button onclick="location.reload()" style="
          margin-top: 1rem;
          padding: 0.75rem 1.5rem;
          background: #3B82F6;
          color: white;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
        ">
          Reload Application
        </button>
      </div>
    `;
  } catch (error) {
    console.error('Failed to show error UI:', error);
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);