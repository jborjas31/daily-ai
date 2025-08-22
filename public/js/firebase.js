// Simple Firebase Integration
import { firebaseConfig } from './firebase-config.js';

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

export { 
  initFirebase, 
  onAuthStateChanged, 
  signInWithEmail, 
  createUserWithEmail,
  auth,
  db 
};