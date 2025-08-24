import { SafeEventListener } from './MemoryLeakPrevention.js';

// Simple network connection checking
class SimpleNetworkChecker {
  static eventListeners = [];
  
  static isOnline() {
    return navigator.onLine;
  }
  
  static setupNetworkMonitoring() {
    const onlineListener = SafeEventListener.add(
      window,
      'online',
      () => {
        alert('✅ Internet connection restored');
        console.log('Back online');
      },
      { description: 'Network checker online listener' }
    );
    this.eventListeners.push(onlineListener);
    
    const offlineListener = SafeEventListener.add(
      window,
      'offline',
      () => {
        alert('⚠️ Internet connection lost. Changes will be saved locally.');
        console.log('Gone offline');
      },
      { description: 'Network checker offline listener' }
    );
    this.eventListeners.push(offlineListener);
  }
  
  static cleanup() {
    this.eventListeners.forEach(listenerId => {
      SafeEventListener.remove(listenerId);
    });
    this.eventListeners = [];
  }
  
  static checkConnectionBeforeAction(action) {
    if (!this.isOnline()) {
      alert('⚠️ No internet connection. Please check your network and try again.');
      return false;
    }
    
    return true;
  }
  
  static getNetworkStatus() {
    return {
      online: this.isOnline(),
      message: this.isOnline() ? 'Connected' : 'Offline'
    };
  }
  
  static showNetworkStatus() {
    const status = this.getNetworkStatus();
    console.log(`Network Status: ${status.message}`);
    return status;
  }
}

export { SimpleNetworkChecker };