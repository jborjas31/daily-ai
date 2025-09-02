/**
 * Test Suite for Dependency-Aware Scheduling Engine
 * 
 * Tests the enhanced schedulingEngine with dependency resolution capabilities
 * from Phase 3.2 implementation.
 */

import { schedulingEngine } from '../public/js/taskLogic.js';

// Test data for dependency scenarios
const testTasks = {
  // Simple dependency chain: A -> B -> C
  simpleChain: [
    {
      id: 'task-a',
      taskName: 'Setup Environment',
      schedulingType: 'flexible',
      timeWindow: 'morning',
      durationMinutes: 30,
      priority: 5,
      isMandatory: false
    },
    {
      id: 'task-b', 
      taskName: 'Install Dependencies',
      schedulingType: 'flexible',
      timeWindow: 'morning',
      durationMinutes: 45,
      priority: 5,
      isMandatory: false,
      dependsOn: 'task-a'
    },
    {
      id: 'task-c',
      taskName: 'Run Tests',
      schedulingType: 'flexible', 
      timeWindow: 'morning',
      durationMinutes: 60,
      priority: 5,
      isMandatory: false,
      dependsOn: 'task-b'
    }
  ],

  // Complex dependency graph with multiple chains
  complexGraph: [
    {
      id: 'research',
      taskName: 'Research Market',
      schedulingType: 'flexible',
      timeWindow: 'morning',
      durationMinutes: 90,
      priority: 8,
      isMandatory: false
    },
    {
      id: 'design-mockup',
      taskName: 'Design Mockup',
      schedulingType: 'flexible',
      timeWindow: 'morning', 
      durationMinutes: 120,
      priority: 7,
      isMandatory: false,
      dependsOn: 'research'
    },
    {
      id: 'write-specs',
      taskName: 'Write Technical Specs',
      schedulingType: 'flexible',
      timeWindow: 'morning',
      durationMinutes: 60,
      priority: 7,
      isMandatory: false,
      dependsOn: 'research'
    },
    {
      id: 'implement',
      taskName: 'Implement Feature',
      schedulingType: 'flexible',
      timeWindow: 'afternoon',
      durationMinutes: 180,
      priority: 9,
      isMandatory: false,
      dependsOn: 'design-mockup'
    },
    {
      id: 'code-review',
      taskName: 'Code Review',
      schedulingType: 'flexible',
      timeWindow: 'afternoon', 
      durationMinutes: 45,
      priority: 8,
      isMandatory: false,
      dependsOn: 'implement'
    }
  ],

  // Mixed anchors and flexible tasks with dependencies
  mixedSchedule: [
    {
      id: 'standup',
      taskName: 'Daily Standup',
      schedulingType: 'fixed',
      defaultTime: '09:00',
      durationMinutes: 15,
      priority: 10,
      isMandatory: true
    },
    {
      id: 'prep-standup',
      taskName: 'Prepare for Standup',
      schedulingType: 'flexible',
      timeWindow: 'early_morning',
      durationMinutes: 20,
      priority: 6,
      isMandatory: false
    },
    {
      id: 'follow-up',
      taskName: 'Follow up on Action Items',
      schedulingType: 'flexible', 
      timeWindow: 'morning',
      durationMinutes: 30,
      priority: 7,
      isMandatory: false,
      dependsOn: 'standup'
    }
  ]
};

// Test utility functions
function runTest(testName, testFn) {
  try {
    console.log(`\n🧪 Running test: ${testName}`);
    testFn();
    console.log(`✅ PASSED: ${testName}`);
  } catch (error) {
    console.log(`❌ FAILED: ${testName}`);
    console.error(error);
  }
}

function validateScheduleOrder(schedule, dependencies) {
  for (const task of schedule) {
    if (task.dependsOn) {
      const dependency = schedule.find(t => t.id === task.dependsOn);
      if (!dependency) continue;
      
      const taskStart = schedulingEngine.timeStringToMinutes(task.scheduledTime);
      const depStart = schedulingEngine.timeStringToMinutes(dependency.scheduledTime);
      const depEnd = depStart + (dependency.durationMinutes || 30);
      
      if (taskStart < depEnd) {
        throw new Error(`Dependency violation: ${task.taskName} starts before ${dependency.taskName} completes`);
      }
    }
  }
}

function validateConflictDetection(schedule) {
  const conflictedTasks = schedule.filter(t => t.hasConflicts);
  console.log(`📊 Found ${conflictedTasks.length} tasks with conflicts`);
  
  for (const task of conflictedTasks) {
    console.log(`⚠️  ${task.taskName}: ${task.conflictType} (${task.conflictSeverity})`);
    if (task.conflicts) {
      task.conflicts.forEach(conflict => {
        console.log(`   - ${conflict.type}: ${conflict.issue || 'Time overlap with ' + conflict.conflictWithName}`);
      });
    }
  }
}

// Test cases
function testSimpleDependencyChain() {
  console.log('Testing simple dependency chain: A -> B -> C');
  
  const sleepSchedule = {
    wakeTime: '07:00',
    sleepTime: '23:00'
  };
  
  const schedule = schedulingEngine.runSchedulingAlgorithm(testTasks.simpleChain, sleepSchedule);
  
  console.log('📅 Generated schedule:');
  schedule.forEach(task => {
    console.log(`   ${task.scheduledTime} - ${task.taskName} (${task.durationMinutes}min)`);
  });
  
  // Validate dependency order
  validateScheduleOrder(schedule, testTasks.simpleChain);
  
  // Validate conflict detection
  validateConflictDetection(schedule);
  
  // Ensure tasks are scheduled in correct order
  const taskA = schedule.find(t => t.id === 'task-a');
  const taskB = schedule.find(t => t.id === 'task-b');
  const taskC = schedule.find(t => t.id === 'task-c');
  
  if (!taskA || !taskB || !taskC) {
    throw new Error('Missing tasks in schedule');
  }
  
  const aTime = schedulingEngine.timeStringToMinutes(taskA.scheduledTime);
  const bTime = schedulingEngine.timeStringToMinutes(taskB.scheduledTime);
  const cTime = schedulingEngine.timeStringToMinutes(taskC.scheduledTime);
  
  if (!(aTime < bTime && bTime < cTime)) {
    throw new Error(`Tasks not in dependency order: A=${taskA.scheduledTime}, B=${taskB.scheduledTime}, C=${taskC.scheduledTime}`);
  }
  
  console.log('✓ Dependencies respected in correct order');
}

function testComplexDependencyGraph() {
  console.log('Testing complex dependency graph with parallel branches');
  
  const sleepSchedule = {
    wakeTime: '07:00', 
    sleepTime: '23:00'
  };
  
  const schedule = schedulingEngine.runSchedulingAlgorithm(testTasks.complexGraph, sleepSchedule);
  
  console.log('📅 Generated schedule:');
  schedule.forEach(task => {
    console.log(`   ${task.scheduledTime} - ${task.taskName} (${task.durationMinutes}min)${task.dependsOn ? ' [depends on: ' + task.dependsOn + ']' : ''}`);
  });
  
  // Validate dependency order
  validateScheduleOrder(schedule, testTasks.complexGraph);
  
  // Validate conflict detection
  validateConflictDetection(schedule);
  
  // Ensure research happens first
  const research = schedule.find(t => t.id === 'research');
  const design = schedule.find(t => t.id === 'design-mockup');
  const specs = schedule.find(t => t.id === 'write-specs');
  const implement = schedule.find(t => t.id === 'implement');
  const review = schedule.find(t => t.id === 'code-review');
  
  if (!research || !design || !specs || !implement || !review) {
    throw new Error('Missing tasks in schedule');
  }
  
  const researchTime = schedulingEngine.timeStringToMinutes(research.scheduledTime);
  const designTime = schedulingEngine.timeStringToMinutes(design.scheduledTime);
  const specsTime = schedulingEngine.timeStringToMinutes(specs.scheduledTime);
  const implementTime = schedulingEngine.timeStringToMinutes(implement.scheduledTime);
  const reviewTime = schedulingEngine.timeStringToMinutes(review.scheduledTime);
  
  // Research should be first
  if (!(researchTime < designTime && researchTime < specsTime)) {
    throw new Error('Research should be scheduled before its dependents');
  }
  
  // Implementation should be after design
  if (!(designTime < implementTime)) {
    throw new Error('Design should be scheduled before implementation');
  }
  
  // Review should be after implementation
  if (!(implementTime < reviewTime)) {
    throw new Error('Implementation should be scheduled before review');
  }
  
  console.log('✓ Complex dependency graph handled correctly');
}

function testMixedAnchorsAndFlexible() {
  console.log('Testing mixed anchors and flexible tasks with dependencies');
  
  const sleepSchedule = {
    wakeTime: '07:00',
    sleepTime: '23:00'
  };
  
  const schedule = schedulingEngine.runSchedulingAlgorithm(testTasks.mixedSchedule, sleepSchedule);
  
  console.log('📅 Generated schedule:');
  schedule.forEach(task => {
    console.log(`   ${task.scheduledTime} - ${task.taskName} (${task.durationMinutes}min)${task.isAnchor ? ' [ANCHOR]' : ''}${task.dependsOn ? ' [depends on: ' + task.dependsOn + ']' : ''}`);
  });
  
  // Validate dependency order
  validateScheduleOrder(schedule, testTasks.mixedSchedule);
  
  // Validate conflict detection
  validateConflictDetection(schedule);
  
  const standup = schedule.find(t => t.id === 'standup');
  const followUp = schedule.find(t => t.id === 'follow-up');
  
  if (!standup || !followUp) {
    throw new Error('Missing tasks in schedule');
  }
  
  // Standup should be at exact time (anchor)
  if (standup.scheduledTime !== '09:00') {
    throw new Error(`Standup should be at 09:00, got ${standup.scheduledTime}`);
  }
  
  // Follow-up should be after standup
  const standupTime = schedulingEngine.timeStringToMinutes(standup.scheduledTime);
  const standupEnd = standupTime + (standup.durationMinutes || 30);
  const followUpTime = schedulingEngine.timeStringToMinutes(followUp.scheduledTime);
  
  if (followUpTime < standupEnd) {
    throw new Error('Follow-up should be scheduled after standup completes');
  }
  
  console.log('✓ Mixed anchors and flexible dependencies handled correctly');
}

function testCircularDependencies() {
  console.log('Testing circular dependency detection');
  
  const circularTasks = [
    {
      id: 'task-1',
      taskName: 'Task 1',
      schedulingType: 'flexible',
      timeWindow: 'morning',
      durationMinutes: 30,
      priority: 5,
      dependsOn: 'task-2'
    },
    {
      id: 'task-2',
      taskName: 'Task 2', 
      schedulingType: 'flexible',
      timeWindow: 'morning',
      durationMinutes: 30,
      priority: 5,
      dependsOn: 'task-1' // Creates circular dependency
    }
  ];
  
  const sleepSchedule = {
    wakeTime: '07:00',
    sleepTime: '23:00'
  };
  
  const schedule = schedulingEngine.runSchedulingAlgorithm(circularTasks, sleepSchedule);
  
  console.log('📅 Generated schedule (should handle circular dependency gracefully):');
  schedule.forEach(task => {
    console.log(`   ${task.scheduledTime} - ${task.taskName} (${task.durationMinutes}min)`);
  });
  
  // Should still generate a schedule (fallback to priority ordering)
  if (schedule.length === 0) {
    throw new Error('Should generate schedule even with circular dependencies');
  }
  
  console.log('✓ Circular dependencies handled gracefully');
}

// Run all tests
console.log('🚀 Starting Dependency-Aware Scheduling Engine Tests');
console.log('=' .repeat(60));

runTest('Simple Dependency Chain', testSimpleDependencyChain);
runTest('Complex Dependency Graph', testComplexDependencyGraph); 
runTest('Mixed Anchors and Flexible', testMixedAnchorsAndFlexible);
runTest('Circular Dependencies', testCircularDependencies);

console.log('\n' + '='.repeat(60));
console.log('🎉 All dependency scheduling tests completed!');

export { testTasks };