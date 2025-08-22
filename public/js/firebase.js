// Simple Firebase Integration
import { firebaseConfig } from './firebase-config.js';
import { SimpleErrorHandler } from './utils/SimpleErrorHandler.js';

// Import Firebase (using CDN for simplicity)
let app, auth, db;

async function initFirebase() {
  try {
    // Initialize Firebase
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    
    // Enable offline persistence
    await db.enablePersistence();
    
    console.log('✅ Firebase initialized');
    return { app, auth, db };
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    throw error;
  }
}

// Simple auth state observer
function onAuthStateChanged(callback) {
  return auth.onAuthStateChanged(callback);
}

// Simple login function
async function signInWithEmail(email, password) {
  return await auth.signInWithEmailAndPassword(email, password);
}

// Simple signup function
async function createUserWithEmail(email, password) {
  return await auth.createUserWithEmailAndPassword(email, password);
}

// Simple wrapper for Firebase operations
async function safeFirebaseOperation(operation, loadingMessage = null) {
  return await SimpleErrorHandler.withErrorHandling(operation, loadingMessage);
}

// Safe login function
async function safeSignIn(email, password) {
  const result = await safeFirebaseOperation(
    () => signInWithEmail(email, password),
    'Signing in...'
  );
  
  if (result.success) {
    SimpleErrorHandler.showSuccess('Signed in successfully!');
  }
  
  return result;
}

// Safe signup function
async function safeCreateUser(email, password) {
  const result = await safeFirebaseOperation(
    () => createUserWithEmail(email, password),
    'Creating account...'
  );
  
  if (result.success) {
    SimpleErrorHandler.showSuccess('Account created successfully!');
  }
  
  return result;
}

// Safe data save function (generic)
async function safeSaveData(collectionPath, data, loadingMessage = 'Saving...') {
  return await safeFirebaseOperation(
    () => db.collection(collectionPath).add(data),
    loadingMessage
  );
}

// Safe data update function (generic)
async function safeUpdateData(docPath, data, loadingMessage = 'Updating...') {
  return await safeFirebaseOperation(
    () => db.doc(docPath).update(data),
    loadingMessage
  );
}

// Safe data load function (generic)
async function safeLoadData(collectionPath, loadingMessage = 'Loading...') {
  return await safeFirebaseOperation(
    () => db.collection(collectionPath).get(),
    loadingMessage
  );
}

// Safe document get function
async function safeGetDocument(docPath, loadingMessage = 'Loading...') {
  return await safeFirebaseOperation(
    () => db.doc(docPath).get(),
    loadingMessage
  );
}

// Safe document set function
async function safeSetDocument(docPath, data, loadingMessage = 'Saving...') {
  return await safeFirebaseOperation(
    () => db.doc(docPath).set(data),
    loadingMessage
  );
}

export { 
  initFirebase, 
  onAuthStateChanged, 
  signInWithEmail, 
  createUserWithEmail,
  safeSignIn,
  safeCreateUser,
  safeSaveData,
  safeUpdateData,
  safeLoadData,
  safeGetDocument,
  safeSetDocument,
  SimpleErrorHandler,
  auth,
  db 
};