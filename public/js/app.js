/**
 * Daily AI - Main Application Entry Point
 * 
 * This is the main application file that initializes all modules
 * and starts the Daily AI task management application.
 */

// Task Modal V2 is now the default (legacy modal removed)

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
import { dataUtils } from './dataOffline.js';
import { userSettingsManager } from './userSettings.js';

// Import task logic and scheduling
import { taskTemplateManager, schedulingEngine, taskInstanceManager } from './taskLogic.js';

// Import UI management system
import { uiController, authUI, mainAppUI } from './ui.js';

// Import components
import { TaskModalContainer } from './components/TaskModalContainer.js';
import { taskList } from './components/TaskList.js';
import { TimelineContainer } from './components/TimelineContainer.js';

// Import utility modules
import { SimpleValidation } from './utils/SimpleValidation.js';
import { SimpleNetworkChecker } from './utils/SimpleNetworkChecker.js';
import { SimpleTabSync } from './utils/SimpleTabSync.js';
import { ResponsiveNavigation } from './utils/ResponsiveNavigation.js';
import { SafeEventListener, initMemoryLeakPrevention } from './utils/MemoryLeakPrevention.js';

// Import offline functionality
import { offlineDataLayer } from './utils/OfflineDataLayer.js';
import { offlineDetection } from './utils/OfflineDetection.js';

/**
 * Application initialization
 * Called by AppInitializer after browser compatibility check
 */
export async function initApp() {
  try {
    console.log('🚀 Initializing Daily AI...');
    
    // Initialize memory leak prevention system first
    initMemoryLeakPrevention();
    
    // Initialize offline system early
    await offlineDataLayer.init();
    console.log('✅ Offline system initialized');
    
    // Initialize UI system first
    uiController.init();
    
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
      // Safely hide loading screen if it exists
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) {
        loadingScreen.style.display = 'none';
      }
      
      if (user) {
        console.log('✅ User authenticated:', user.email);
        
        // Set user in application state
        state.setUser(user);
        
        try {
          // Initialize user data and load settings with error handling
          SimpleErrorHandler.showLoading('Loading your data...');
          
          console.log('🔧 Step 1: Initializing user settings...');
          await stateActions.initializeUser();
          console.log('✅ Step 1 complete: User settings initialized');
          
          console.log('🔧 Step 2: Loading task templates...');
          await stateActions.loadTaskTemplates();
          console.log('✅ Step 2 complete: Task templates loaded');
          
          // Load data for current date
          const today = dataUtils.getTodayDateString();
          console.log('🔧 Step 3: Loading task instances for today:', today);
          await stateActions.loadTaskInstancesForDate(today);
          console.log('✅ Step 3 complete: Task instances loaded');
          
          console.log('🔧 Step 4: Loading daily schedule for today:', today);
          await stateActions.loadDailyScheduleForDate(today);
          console.log('✅ Step 4 complete: Daily schedule loaded');
          
          SimpleErrorHandler.hideLoading();
          
          // Show main app using UI module
          mainAppUI.show();
        } catch (error) {
          SimpleErrorHandler.hideLoading();
          console.error('❌ Error initializing user data:', error);
          SimpleErrorHandler.showError('Failed to load user data. Please try refreshing the page.', error);
        }
      } else {
        console.log('🔒 User not authenticated, showing login');
        
        // Clear user from application state
        state.setUser(null);
        
        // Show auth UI using UI module
        authUI.show();
        setupAuthEventListeners();
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to initialize Daily AI:', error);
    document.getElementById('loading-screen').style.display = 'none';
    SimpleErrorHandler.showError('Failed to initialize the application. Please refresh the page and try again.', error);
  }
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
/**
 * Handle add task action from navigation
 */
function handleAddTaskAction() {
  console.log('🚀 Opening task creation modal...');
  
  window.taskModal.showCreate({}, (savedTask) => {
    console.log('Task created:', savedTask);
    // The UI will automatically update via state listeners
  });
}

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

// Global functions for backwards compatibility
window.editTask = (taskId) => {
  const taskTemplates = state.getTaskTemplates();
  const task = taskTemplates.find(t => t.id === taskId);
  
  if (task) {
    window.taskModal.showEdit(task, (savedTask) => {
      console.log('Task updated:', savedTask);
      // UI will update automatically via state listeners
    });
  }
};

window.duplicateTask = async (taskId) => {
  try {
    const uid = state.getUser()?.uid;
    if (!uid) {
      SimpleErrorHandler.showError('Please sign in to duplicate tasks.');
      return;
    }
    await taskTemplateManager.duplicate(uid, taskId);
    SimpleErrorHandler.showSuccess('Task duplicated successfully!');
  } catch (error) {
    console.error('Error duplicating task:', error);
    SimpleErrorHandler.showError('Failed to duplicate task. Please try again.', error);
  }
};

window.toggleTaskCompletion = async (taskId) => {
  try {
    const currentDate = state.getCurrentDate();
    await taskInstanceManager.toggleByTemplateAndDate(taskId, currentDate);
    SimpleErrorHandler.showSuccess('Task status updated!');
  } catch (error) {
    console.error('Error toggling task completion:', error);
    SimpleErrorHandler.showError('Failed to update task status. Please try again.', error);
  }
};

// Note: App initialization now handled by AppInitializer.js
// document.addEventListener('DOMContentLoaded', initApp);

// Expose objects globally for testing purposes
// This allows the comprehensive test script to access required modules
window.taskTemplateManager = taskTemplateManager;
window.taskList = taskList;
window.schedulingEngine = schedulingEngine;
window.getState = () => state;
window.stateActions = stateActions;

// Expose Firebase auth helper for testing
window.getCurrentFirebaseUser = () => {
  if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth()) {
    return firebase.auth().currentUser;
  }
  return null;
};

// Initialize Task Modal container globally
window.taskModal = new TaskModalContainer();

console.log('✅ Daily AI application module loaded');
console.log('🧪 Testing objects exposed globally for console access');
