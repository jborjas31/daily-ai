/**
 * Daily AI - Main Application Entry Point
 * 
 * This is the main application file that initializes all modules
 * and starts the Daily AI task management application.
 */

// Import Firebase module
import { initFirebase, onAuthStateChanged, signInWithEmail, createUserWithEmail } from './firebase.js';

/**
 * Application initialization
 */
async function initApp() {
  try {
    console.log('🚀 Initializing Daily AI...');
    
    // Initialize Firebase first
    await initFirebase();
    console.log('✅ Firebase initialized');
    
    // Set up authentication state observer
    onAuthStateChanged((user) => {
      document.getElementById('loading-screen').style.display = 'none';
      
      if (user) {
        console.log('✅ User authenticated:', user.email);
        showMainApp();
      } else {
        console.log('🔒 User not authenticated, showing login');
        showAuthContainer();
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to initialize Daily AI:', error);
    document.getElementById('loading-screen').style.display = 'none';
    showErrorMessage(error.message);
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
  
  // Show temporary message until main app is developed
  showDevelopmentMessage();
}

/**
 * Show development message (temporary)
 */
function showDevelopmentMessage() {
  const mainContent = document.getElementById('app-main');
  mainContent.innerHTML = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      text-align: center;
      padding: 2rem;
    ">
      <div>
        <h1 style="font-size: 2rem; margin-bottom: 1rem; color: #3B82F6;">
          📋 Daily AI - Authenticated!
        </h1>
        <p style="color: #57534E; margin-bottom: 2rem;">
          🎉 Authentication working! Ready to build the task manager.
        </p>
        <button onclick="firebase.auth().signOut()" style="
          padding: 0.75rem 1.5rem;
          background: #EF4444;
          color: white;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
        ">
          Sign Out
        </button>
      </div>
    </div>
  `;
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
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
      loginBtn.textContent = 'Signing in...';
      loginBtn.disabled = true;
      errorDiv.style.display = 'none';
      
      await signInWithEmail(email, password);
      console.log('✅ Login successful');
      
    } catch (error) {
      console.error('❌ Login failed:', error);
      showAuthError(getAuthErrorMessage(error.code));
      
    } finally {
      loginBtn.textContent = 'Sign In';
      loginBtn.disabled = false;
    }
  });
  
  // Handle signup button
  signupBtn.addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
      showAuthError('Please enter both email and password');
      return;
    }
    
    if (password.length < 6) {
      showAuthError('Password must be at least 6 characters long');
      return;
    }
    
    try {
      signupBtn.textContent = 'Creating account...';
      signupBtn.disabled = true;
      errorDiv.style.display = 'none';
      
      await createUserWithEmail(email, password);
      console.log('✅ Signup successful');
      
    } catch (error) {
      console.error('❌ Signup failed:', error);
      showAuthError(getAuthErrorMessage(error.code));
      
    } finally {
      signupBtn.textContent = 'Create Account';
      signupBtn.disabled = false;
    }
  });
}

/**
 * Show authentication error message
 */
function showAuthError(message) {
  const errorDiv = document.getElementById('auth-error');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
}

/**
 * Get user-friendly error message
 */
function getAuthErrorMessage(errorCode) {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'No account found with this email. Try creating a new account.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in instead.';
    case 'auth/weak-password':
      return 'Password is too weak. Please choose a stronger password.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    default:
      return 'Authentication failed. Please try again.';
  }
}

/**
 * Show error message
 */
function showErrorMessage(message) {
  document.getElementById('auth-container').style.display = 'none';
  document.getElementById('main-app').style.display = 'block';
  
  const mainContent = document.getElementById('app-main');
  mainContent.innerHTML = `
    <div style="text-align: center; padding: 2rem;">
      <h2 style="color: #EF4444; margin-bottom: 1rem;">Error</h2>
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
        Try Again
      </button>
    </div>
  `;
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);