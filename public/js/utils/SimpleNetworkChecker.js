// Simple network connection checking
class SimpleNetworkChecker {
  static isOnline() {
    return navigator.onLine;
  }
  
  static setupNetworkMonitoring() {
    window.addEventListener('online', () => {
      alert('✅ Internet connection restored');
      console.log('Back online');
    });
    
    window.addEventListener('offline', () => {
      alert('⚠️ Internet connection lost. Changes will be saved locally.');
      console.log('Gone offline');
    });
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