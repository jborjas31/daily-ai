/**
 * Unit Test for Dependency-Aware Scheduling Engine Methods
 * 
 * Tests the specific methods enhanced in Phase 3.2 without importing the full system
 */

// Mock schedulingEngine methods for testing
const TIME_WINDOWS = {
  early_morning: { start: '06:00', end: '08:00' },
  morning: { start: '08:00', end: '12:00' },
  afternoon: { start: '12:00', end: '17:00' },
  evening: { start: '17:00', end: '22:00' },
  anytime: { start: '06:00', end: '22:00' }
};

const schedulingEngineTest = {
  /**
   * Convert time string (HH:MM) to minutes since midnight
   */
  timeStringToMinutes(timeString) {
    if (!timeString || typeof timeString !== 'string') return 0;
    const [hours, minutes] = timeString.split(':').map(Number);
    return (hours * 60) + (minutes || 0);
  },

  /**
   * Convert minutes since midnight to time string (HH:MM)
   */
  minutesToTimeString(minutes) {
    if (typeof minutes !== 'number' || minutes < 0) return '00:00';
    const hours = Math.floor(minutes / 60) % 24;
    const mins = Math.floor(minutes % 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  },

  /**
   * Check if two time ranges overlap
   */
  hasTimeOverlap(start1, end1, start2, end2) {
    return Math.max(start1, start2) < Math.min(end1, end2);
  },

  /**
   * Calculate earliest possible start time based on dependencies
   */
  calculateEarliestStartTime(task, schedule, dependencyMap) {
    if (!dependencyMap.has(task.id)) {
      return null; // No dependencies, can start anytime
    }
    
    const dependencyId = dependencyMap.get(task.id);
    const dependency = schedule.find(t => t.id === dependencyId);
    
    if (!dependency || !dependency.scheduledTime) {
      return null; // Dependency not scheduled yet
    }
    
    // Calculate when dependency ends
    const depStartMinutes = this.timeStringToMinutes(dependency.scheduledTime);
    const depDurationMinutes = dependency.durationMinutes || 30;
    const depEndMinutes = depStartMinutes + depDurationMinutes;
    
    // Add 5-minute buffer after dependency completion
    const earliestStartMinutes = depEndMinutes + 5;
    
    return this.minutesToTimeString(earliestStartMinutes);
  },

  /**
   * Validate that a scheduled task respects its dependency constraints
   */
  validateDependencyConstraints(scheduledTask, schedule, dependencyMap) {
    if (!dependencyMap.has(scheduledTask.id)) {
      return true; // No dependencies to validate
    }
    
    const dependencyId = dependencyMap.get(scheduledTask.id);
    const dependency = schedule.find(t => t.id === dependencyId);
    
    if (!dependency || !dependency.scheduledTime) {
      return false; // Dependency not found or not scheduled
    }
    
    const taskStartMinutes = this.timeStringToMinutes(scheduledTask.scheduledTime);
    const depStartMinutes = this.timeStringToMinutes(dependency.scheduledTime);
    const depEndMinutes = depStartMinutes + (dependency.durationMinutes || 30);
    
    // Task should start after dependency ends (with small buffer)
    return taskStartMinutes >= depEndMinutes;
  },

  /**
   * Topological sort with Kahn's algorithm
   */
  resolveDependencies(tasks) {
    // Build dependency graph for task templates
    const dependencyGraph = new Map();
    const taskMap = new Map();
    
    // Initialize graph nodes
    tasks.forEach(task => {
      taskMap.set(task.id, task);
      dependencyGraph.set(task.id, {
        task,
        dependencies: [],
        dependents: []
      });
    });
    
    // Build dependency relationships
    tasks.forEach(task => {
      if (task.dependsOn) {
        const node = dependencyGraph.get(task.id);
        if (taskMap.has(task.dependsOn)) {
          node.dependencies.push(task.dependsOn);
          const depNode = dependencyGraph.get(task.dependsOn);
          if (depNode) {
            depNode.dependents.push(task.id);
          }
        }
      }
    });
    
    // Perform topological sort using Kahn's algorithm
    const result = [];
    const inDegree = new Map();
    const queue = [];
    
    // Calculate in-degrees
    dependencyGraph.forEach((node, taskId) => {
      inDegree.set(taskId, node.dependencies.length);
      if (node.dependencies.length === 0) {
        queue.push(taskId);
      }
    });
    
    // Process queue
    while (queue.length > 0) {
      // Sort queue by priority for stable ordering
      queue.sort((a, b) => {
        const taskA = taskMap.get(a);
        const taskB = taskMap.get(b);
        return taskB.priority - taskA.priority;
      });
      
      const currentId = queue.shift();
      const currentTask = taskMap.get(currentId);
      result.push(currentTask);
      
      // Update dependents
      const node = dependencyGraph.get(currentId);
      node.dependents.forEach(dependentId => {
        const newInDegree = inDegree.get(dependentId) - 1;
        inDegree.set(dependentId, newInDegree);
        if (newInDegree === 0) {
          queue.push(dependentId);
        }
      });
    }
    
    // Check for circular dependencies
    if (result.length !== tasks.length) {
      console.warn('⚠️ Circular dependencies detected in task templates');
      // Fall back to priority-based sorting for remaining tasks
      const remainingTasks = tasks.filter(task => !result.some(r => r.id === task.id));
      remainingTasks.sort((a, b) => b.priority - a.priority);
      result.push(...remainingTasks);
    }
    
    return result;
  },

  /**
   * Detect dependency conflicts in schedule
   */
  detectDependencyConflicts(schedule) {
    const taskMap = new Map();
    schedule.forEach(task => taskMap.set(task.id, task));

    const conflicts = [];

    schedule.forEach(task => {
      if (task.dependsOn) {
        const dependency = taskMap.get(task.dependsOn);
        if (dependency && dependency.scheduledTime) {
          const taskStart = this.timeStringToMinutes(task.scheduledTime);
          const depStart = this.timeStringToMinutes(dependency.scheduledTime);
          const depEnd = depStart + (dependency.durationMinutes || 30);
          
          // Check if task starts before dependency ends
          if (taskStart < depEnd) {
            conflicts.push({
              task: task.taskName,
              dependency: dependency.taskName,
              issue: 'Task starts before dependency completes',
              taskStart: task.scheduledTime,
              dependencyEnd: this.minutesToTimeString(depEnd),
              violationMinutes: depEnd - taskStart
            });
          }
        } else if (!dependency) {
          conflicts.push({
            task: task.taskName,
            dependency: task.dependsOn,
            issue: 'Required dependency not found in schedule'
          });
        }
      }
    });

    return conflicts;
  }
};

// Test data
const testScenarios = {
  simpleChain: [
    {
      id: 'a',
      taskName: 'Task A',
      priority: 5,
      durationMinutes: 30,
      scheduledTime: '09:00'
    },
    {
      id: 'b', 
      taskName: 'Task B',
      priority: 5,
      durationMinutes: 45,
      dependsOn: 'a',
      scheduledTime: '09:35' // Should be fine (5-min buffer after A ends at 09:30)
    },
    {
      id: 'c',
      taskName: 'Task C',
      priority: 5,
      durationMinutes: 60,
      dependsOn: 'b',
      scheduledTime: '10:20' // Should be fine (0-min buffer after B ends at 10:20)
    }
  ],

  conflictingSchedule: [
    {
      id: 'x',
      taskName: 'Task X',
      priority: 5,
      durationMinutes: 60,
      scheduledTime: '09:00'
    },
    {
      id: 'y',
      taskName: 'Task Y',
      priority: 5,
      durationMinutes: 30,
      dependsOn: 'x',
      scheduledTime: '09:30' // CONFLICT: starts before X completes at 10:00
    }
  ],

  topologicalSort: [
    {
      id: 'research',
      taskName: 'Research',
      priority: 8,
      durationMinutes: 90
    },
    {
      id: 'design',
      taskName: 'Design',
      priority: 7,
      durationMinutes: 120,
      dependsOn: 'research'
    },
    {
      id: 'specs',
      taskName: 'Write Specs',
      priority: 7,
      durationMinutes: 60,
      dependsOn: 'research'
    },
    {
      id: 'implement',
      taskName: 'Implement',
      priority: 9,
      durationMinutes: 180,
      dependsOn: 'design'
    }
  ]
};

// Test functions
function runTest(testName, testFn) {
  try {
    console.log(`\n🧪 ${testName}`);
    testFn();
    console.log(`✅ PASSED: ${testName}`);
  } catch (error) {
    console.log(`❌ FAILED: ${testName}`);
    console.error('   Error:', error.message);
  }
}

function testEarliestStartTime() {
  const schedule = testScenarios.simpleChain;
  const dependencyMap = new Map();
  dependencyMap.set('b', 'a');
  dependencyMap.set('c', 'b');
  
  const taskB = schedule.find(t => t.id === 'b');
  const earliestB = schedulingEngineTest.calculateEarliestStartTime(taskB, schedule, dependencyMap);
  
  // Task A ends at 09:30, so B should start at 09:35 (5-min buffer)
  if (earliestB !== '09:35') {
    throw new Error(`Expected 09:35, got ${earliestB}`);
  }
  
  console.log('   ✓ Earliest start time calculation correct');
}

function testDependencyValidation() {
  const schedule = testScenarios.simpleChain;
  const dependencyMap = new Map();
  dependencyMap.set('b', 'a');
  dependencyMap.set('c', 'b');
  
  const taskB = schedule.find(t => t.id === 'b');
  const taskC = schedule.find(t => t.id === 'c');
  
  const bValid = schedulingEngineTest.validateDependencyConstraints(taskB, schedule, dependencyMap);
  const cValid = schedulingEngineTest.validateDependencyConstraints(taskC, schedule, dependencyMap);
  
  if (!bValid || !cValid) {
    throw new Error('Valid dependency constraints should pass validation');
  }
  
  console.log('   ✓ Valid dependency constraints validated correctly');
}

function testTopologicalSort() {
  const tasks = testScenarios.topologicalSort;
  const sorted = schedulingEngineTest.resolveDependencies(tasks);
  
  // Should be ordered: research, then design/specs (parallel), then implement
  const researchIdx = sorted.findIndex(t => t.id === 'research');
  const designIdx = sorted.findIndex(t => t.id === 'design');
  const specsIdx = sorted.findIndex(t => t.id === 'specs');
  const implementIdx = sorted.findIndex(t => t.id === 'implement');
  
  if (researchIdx >= designIdx || researchIdx >= specsIdx) {
    throw new Error('Research should come before design and specs');
  }
  
  if (designIdx >= implementIdx) {
    throw new Error('Design should come before implement');
  }
  
  console.log('   ✓ Topological sort order:');
  sorted.forEach((task, idx) => {
    console.log(`     ${idx + 1}. ${task.taskName}${task.dependsOn ? ' (depends on: ' + task.dependsOn + ')' : ''}`);
  });
}

function testConflictDetection() {
  const validSchedule = testScenarios.simpleChain;
  const conflictingSchedule = testScenarios.conflictingSchedule;
  
  const validConflicts = schedulingEngineTest.detectDependencyConflicts(validSchedule);
  const invalidConflicts = schedulingEngineTest.detectDependencyConflicts(conflictingSchedule);
  
  if (validConflicts.length > 0) {
    throw new Error(`Valid schedule should have no conflicts, found ${validConflicts.length}`);
  }
  
  if (invalidConflicts.length === 0) {
    throw new Error('Conflicting schedule should detect dependency violations');
  }
  
  console.log('   ✓ No conflicts in valid schedule');
  console.log(`   ✓ Detected ${invalidConflicts.length} conflicts in invalid schedule:`);
  invalidConflicts.forEach(conflict => {
    console.log(`     - ${conflict.task}: ${conflict.issue}`);
  });
}

function testCircularDependencies() {
  const circularTasks = [
    {
      id: 'task-1',
      taskName: 'Task 1',
      priority: 5,
      dependsOn: 'task-2'
    },
    {
      id: 'task-2',
      taskName: 'Task 2',
      priority: 5,
      dependsOn: 'task-1' // Circular!
    },
    {
      id: 'task-3',
      taskName: 'Task 3',
      priority: 8
    }
  ];
  
  const sorted = schedulingEngineTest.resolveDependencies(circularTasks);
  
  // Should still return all tasks (fallback to priority)
  if (sorted.length !== 3) {
    throw new Error(`Expected 3 tasks, got ${sorted.length}`);
  }
  
  // Task 3 should be first (highest priority)
  if (sorted[0].id !== 'task-3') {
    throw new Error('Should fallback to priority order for circular dependencies');
  }
  
  console.log('   ✓ Circular dependencies handled with priority fallback');
}

// Run tests
console.log('🚀 Testing Enhanced Scheduling Engine (Phase 3.2)');
console.log('=' .repeat(60));

runTest('Earliest Start Time Calculation', testEarliestStartTime);
runTest('Dependency Constraint Validation', testDependencyValidation);
runTest('Topological Sort Algorithm', testTopologicalSort);
runTest('Dependency Conflict Detection', testConflictDetection);
runTest('Circular Dependency Handling', testCircularDependencies);

console.log('\n' + '='.repeat(60));
console.log('🎉 All scheduling engine unit tests completed!');