/**
 * Components Index
 * 
 * Central export file for all UI components
 * Provides easy importing of components throughout the application
 */

// Import all components
import { TaskModal, taskModal } from './TaskModal.js';
import Timeline from './Timeline.js';
import { TaskBlock, taskBlockUtils } from './TaskBlock.js';

// Export all components
export {
  // Task Modal Component
  TaskModal,
  taskModal,
  
  // Timeline Component
  Timeline,
  
  // Task Block Component
  TaskBlock,
  taskBlockUtils
};

// Default export for convenience
export default {
  TaskModal,
  taskModal,
  Timeline,
  TaskBlock,
  taskBlockUtils
};

console.log('✅ Components index loaded');