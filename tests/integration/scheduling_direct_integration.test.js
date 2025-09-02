/**
 * Direct SchedulingEngine Integration Test Suite
 * Phase 4 Step 4.2: Integration Testing (Node.js compatible)
 * 
 * Tests the extracted SchedulingEngine class directly without browser dependencies
 */

import { SchedulingEngine } from '../../public/js/logic/SchedulingEngine.js';
import { RecurrenceEngine } from '../../public/js/logic/Recurrence.js';
import { DependencyResolver } from '../../public/js/logic/DependencyResolver.js';

/**
 * Mock performance API for Node.js
 */
if (typeof globalThis.performance === 'undefined') {
  globalThis.performance = { now: () => Date.now() };
}

/**
 * Test framework utilities
 */
class TestRunner {
  constructor() {
    this.testsPassed = 0;
    this.testsFailed = 0;
    this.testResults = [];
  }

  test(name, fn) {
    try {
      console.log(`   🧪 Testing: ${name}`);
      fn();
      console.log(`   ✅ PASS: ${name}`);
      this.testsPassed++;
      this.testResults.push({ name, status: 'PASS' });
    } catch (error) {
      console.error(`   ❌ FAIL: ${name}`);
      console.error(`      Error: ${error.message}`);
      this.testsFailed++;
      this.testResults.push({ name, status: 'FAIL', error: error.message });
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`${message} - Expected: ${expected}, Actual: ${actual}`);
    }
  }

  generateReport() {
    console.log('\n📊 Direct Integration Test Results:');
    console.log(`   ✅ Tests Passed: ${this.testsPassed}`);
    console.log(`   ❌ Tests Failed: ${this.testsFailed}`);
    console.log(`   📈 Success Rate: ${((this.testsPassed / (this.testsPassed + this.testsFailed)) * 100).toFixed(1)}%`);
    
    if (this.testsFailed === 0) {
      console.log('\n🎉 All direct integration tests passed!');
      return true;
    } else {
      console.log('\n❌ Some integration tests failed.');
      return false;
    }
  }
}

/**
 * Enhanced mock settings for testing
 */
const mockSettings = {
  defaultWakeTime: '06:00',
  defaultSleepTime: '22:00',
  desiredSleepDuration: 8,
  bufferMinutes: 5
};

/**
 * Main test suite execution
 */
async function runDirectIntegrationTests() {
  console.log('🚀 Starting Direct SchedulingEngine Integration Tests...\n');
  
  const test = new TestRunner();

  // Test Suite 1: Class Instantiation and Dependencies
  console.log('🏗️ Class Instantiation Tests');

  test.test('SchedulingEngine instantiation with dependencies', () => {
    const recurrenceEngine = new RecurrenceEngine();
    const dependencyResolver = new DependencyResolver();
    const schedulingEngine = new SchedulingEngine(recurrenceEngine, dependencyResolver);
    
    test.assert(schedulingEngine, 'SchedulingEngine should instantiate successfully');
    test.assert(schedulingEngine.recurrenceEngine, 'Should have recurrence engine dependency');
    test.assert(schedulingEngine.dependencyResolver, 'Should have dependency resolver dependency');
  });

  test.test('SchedulingEngine with default dependencies', () => {
    const schedulingEngine = new SchedulingEngine();
    
    test.assert(schedulingEngine, 'SchedulingEngine should instantiate with defaults');
    test.assert(schedulingEngine.recurrenceEngine, 'Should create default recurrence engine');
    test.assert(schedulingEngine.dependencyResolver, 'Should create default dependency resolver');
  });

  // Test Suite 2: Core Algorithm Components
  console.log('\n⚙️ Core Algorithm Tests');

  const schedulingEngine = new SchedulingEngine();

  test.test('Utility methods functionality', () => {
    // Time conversion tests
    test.assertEqual(schedulingEngine.timeStringToMinutes('09:30'), 570, 
      'timeStringToMinutes conversion');
    test.assertEqual(schedulingEngine.minutesToTimeString(570), '09:30',
      'minutesToTimeString conversion');
    
    // Overlap detection tests
    test.assertEqual(schedulingEngine.hasTimeOverlap(60, 120, 90, 150), true,
      'Time overlap detection - overlapping');
    test.assertEqual(schedulingEngine.hasTimeOverlap(60, 120, 120, 180), false,
      'Time overlap detection - adjacent');
  });

  test.test('Time window validation', () => {
    const morningWindow = { start: '06:00', end: '12:00' };
    const afternoonWindow = { start: '12:00', end: '18:00' };
    
    // Test a task that fits in morning window
    test.assert(schedulingEngine.isTimeInWindow('08:00', 120, morningWindow),
      'Task should fit in morning window');
    
    // Test a task that doesn't fit in morning window (would go past 12:00)
    test.assert(!schedulingEngine.isTimeInWindow('11:00', 120, morningWindow),
      'Task should not fit in morning window when extending past end');
    
    // Test a task that fits in afternoon window
    test.assert(schedulingEngine.isTimeInWindow('14:00', 90, afternoonWindow),
      'Task should fit in afternoon window');
  });

  // Test Suite 3: Scheduling Algorithm Integration
  console.log('\n📅 Scheduling Algorithm Integration Tests');

  test.test('Fixed task scheduling (anchors)', () => {
    const fixedTasks = [
      {
        id: 'meeting-1',
        taskName: 'Morning Meeting',
        durationMinutes: 30,
        schedulingType: 'fixed',
        defaultTime: '09:00',
        priority: 10
      },
      {
        id: 'lunch',
        taskName: 'Lunch Break',
        durationMinutes: 60,
        schedulingType: 'fixed',
        defaultTime: '12:30',
        priority: 8
      }
    ];
    
    const schedule = schedulingEngine.runSchedulingAlgorithm(fixedTasks, mockSettings);
    test.assert(Array.isArray(schedule), 'Should return schedule array');
    
    const meeting = schedule.find(t => t.id === 'meeting-1');
    const lunch = schedule.find(t => t.id === 'lunch');
    
    test.assert(meeting && meeting.scheduledTime === '09:00', 
      'Fixed meeting should keep its default time');
    test.assert(lunch && lunch.scheduledTime === '12:30', 
      'Fixed lunch should keep its default time');
  });

  test.test('Flexible task scheduling', () => {
    const flexibleTasks = [
      {
        id: 'work-session',
        taskName: 'Deep Work Session',
        durationMinutes: 120,
        schedulingType: 'flexible',
        timeWindow: 'morning',
        priority: 9
      },
      {
        id: 'admin-tasks',
        taskName: 'Administrative Tasks',
        durationMinutes: 45,
        schedulingType: 'flexible',
        timeWindow: 'afternoon',
        priority: 6
      }
    ];
    
    const schedule = schedulingEngine.runSchedulingAlgorithm(flexibleTasks, mockSettings);
    const scheduledTasks = schedule.filter(t => t.scheduledTime);
    
    test.assert(scheduledTasks.length > 0, 'Should schedule at least some flexible tasks');
    
    const workSession = schedule.find(t => t.id === 'work-session');
    if (workSession && workSession.scheduledTime) {
      const startTime = schedulingEngine.timeStringToMinutes(workSession.scheduledTime);
      const morningStart = schedulingEngine.timeStringToMinutes('06:00');
      const morningEnd = schedulingEngine.timeStringToMinutes('12:00');
      
      test.assert(startTime >= morningStart && startTime + 120 <= morningEnd,
        'Morning flexible task should be within morning window');
    }
  });

  test.test('Priority-based task ordering', () => {
    const priorityTasks = [
      {
        id: 'low-priority',
        taskName: 'Low Priority Task',
        durationMinutes: 30,
        schedulingType: 'flexible',
        timeWindow: 'anytime',
        priority: 3
      },
      {
        id: 'high-priority',
        taskName: 'High Priority Task',
        durationMinutes: 30,
        schedulingType: 'flexible',
        timeWindow: 'anytime',
        priority: 9
      }
    ];
    
    const schedule = schedulingEngine.runSchedulingAlgorithm(priorityTasks, mockSettings);
    const lowPriorityTask = schedule.find(t => t.id === 'low-priority');
    const highPriorityTask = schedule.find(t => t.id === 'high-priority');
    
    if (lowPriorityTask && highPriorityTask && 
        lowPriorityTask.scheduledTime && highPriorityTask.scheduledTime) {
      const lowStart = schedulingEngine.timeStringToMinutes(lowPriorityTask.scheduledTime);
      const highStart = schedulingEngine.timeStringToMinutes(highPriorityTask.scheduledTime);
      
      test.assert(highStart <= lowStart, 
        'Higher priority task should be scheduled earlier than lower priority');
    }
  });

  // Test Suite 4: Dependency Resolution Integration
  console.log('\n🔗 Dependency Resolution Integration Tests');

  test.test('Simple dependency chain', () => {
    const dependentTasks = [
      {
        id: 'setup',
        taskName: 'Setup Task',
        durationMinutes: 30,
        schedulingType: 'flexible',
        timeWindow: 'morning',
        priority: 8
      },
      {
        id: 'execution',
        taskName: 'Execution Task',
        durationMinutes: 60,
        schedulingType: 'flexible',
        timeWindow: 'morning',
        dependsOn: 'setup',
        priority: 9
      }
    ];
    
    const schedule = schedulingEngine.runSchedulingAlgorithm(dependentTasks, mockSettings);
    const setup = schedule.find(t => t.id === 'setup');
    const execution = schedule.find(t => t.id === 'execution');
    
    if (setup && execution && setup.scheduledTime && execution.scheduledTime) {
      const setupEnd = schedulingEngine.timeStringToMinutes(setup.scheduledTime) + setup.durationMinutes;
      const executionStart = schedulingEngine.timeStringToMinutes(execution.scheduledTime);
      
      test.assert(executionStart >= setupEnd, 
        'Dependent task should start after prerequisite ends');
      
      console.log(`      Dependency order validated: ${setup.scheduledTime} → ${execution.scheduledTime}`);
    }
  });

  test.test('Complex dependency chain (A → B → C)', () => {
    const complexTasks = [
      {
        id: 'task-a',
        taskName: 'Task A',
        durationMinutes: 30,
        schedulingType: 'flexible',
        timeWindow: 'anytime',
        priority: 8
      },
      {
        id: 'task-b',
        taskName: 'Task B',
        durationMinutes: 45,
        schedulingType: 'flexible',
        timeWindow: 'anytime',
        dependsOn: 'task-a',
        priority: 7
      },
      {
        id: 'task-c',
        taskName: 'Task C',
        durationMinutes: 60,
        schedulingType: 'flexible',
        timeWindow: 'anytime',
        dependsOn: 'task-b',
        priority: 6
      }
    ];
    
    const schedule = schedulingEngine.runSchedulingAlgorithm(complexTasks, mockSettings);
    const taskA = schedule.find(t => t.id === 'task-a');
    const taskB = schedule.find(t => t.id === 'task-b');
    const taskC = schedule.find(t => t.id === 'task-c');
    
    if (taskA && taskB && taskC && 
        taskA.scheduledTime && taskB.scheduledTime && taskC.scheduledTime) {
      
      const aEnd = schedulingEngine.timeStringToMinutes(taskA.scheduledTime) + taskA.durationMinutes;
      const bStart = schedulingEngine.timeStringToMinutes(taskB.scheduledTime);
      const bEnd = bStart + taskB.durationMinutes;
      const cStart = schedulingEngine.timeStringToMinutes(taskC.scheduledTime);
      
      test.assert(bStart >= aEnd, 'Task B should start after Task A');
      test.assert(cStart >= bEnd, 'Task C should start after Task B');
      
      console.log(`      Complex chain: A(${taskA.scheduledTime}) → B(${taskB.scheduledTime}) → C(${taskC.scheduledTime})`);
    }
  });

  // Test Suite 5: Conflict Detection
  console.log('\n⚠️ Conflict Detection Tests');

  test.test('Time overlap conflict detection', () => {
    const conflictingSchedule = [
      {
        id: 'task1',
        taskName: 'Task 1',
        scheduledTime: '09:00',
        durationMinutes: 60
      },
      {
        id: 'task2',
        taskName: 'Task 2',
        scheduledTime: '09:30', // Overlaps with task1
        durationMinutes: 60
      }
    ];
    
    const result = schedulingEngine.detectAndMarkConflicts(conflictingSchedule);
    
    test.assert(Array.isArray(result), 'Should return conflict analysis array');
    test.assertEqual(result.length, 2, 'Should analyze all input tasks');
    
    const task1 = result.find(t => t.id === 'task1');
    const task2 = result.find(t => t.id === 'task2');
    
    test.assert(task1.hasConflicts, 'Task 1 should be marked as conflicted');
    test.assert(task2.hasConflicts, 'Task 2 should be marked as conflicted');
    test.assertEqual(task1.conflictType, 'time_overlap', 'Should identify time overlap conflict type');
  });

  test.test('No conflicts scenario', () => {
    const nonConflictingSchedule = [
      {
        id: 'task1',
        taskName: 'Task 1',
        scheduledTime: '09:00',
        durationMinutes: 60
      },
      {
        id: 'task2',
        taskName: 'Task 2',
        scheduledTime: '10:30', // Starts after task1 ends (with buffer)
        durationMinutes: 60
      }
    ];
    
    const result = schedulingEngine.detectAndMarkConflicts(nonConflictingSchedule);
    
    const conflictedTasks = result.filter(t => t.hasConflicts);
    test.assertEqual(conflictedTasks.length, 0, 'Should detect no conflicts');
  });

  // Test Suite 6: Performance Testing
  console.log('\n⚡ Performance Tests');

  test.test('Large task set performance', () => {
    const startTime = Date.now();
    
    const largeTasks = [];
    for (let i = 0; i < 50; i++) {
      largeTasks.push({
        id: `perf-task-${i}`,
        taskName: `Performance Task ${i}`,
        durationMinutes: 30 + (i % 90), // Varying durations
        schedulingType: i % 2 === 0 ? 'flexible' : 'fixed',
        timeWindow: ['morning', 'afternoon', 'evening', 'anytime'][i % 4],
        defaultTime: i % 2 === 1 ? `${8 + (i % 8)}:00` : undefined,
        priority: Math.floor(Math.random() * 10) + 1
      });
    }
    
    const schedule = schedulingEngine.runSchedulingAlgorithm(largeTasks, mockSettings);
    const endTime = Date.now();
    
    const executionTime = endTime - startTime;
    
    test.assert(Array.isArray(schedule), 'Should return valid schedule');
    test.assert(executionTime < 3000, `Performance test should complete within 3 seconds (took ${executionTime}ms)`);
    
    const scheduledCount = schedule.filter(t => t.scheduledTime).length;
    console.log(`      Processed ${largeTasks.length} tasks in ${executionTime}ms, scheduled ${scheduledCount}`);
  });

  // Test Suite 7: Integration Edge Cases
  console.log('\n🧪 Edge Case Integration Tests');

  test.test('Empty task list handling', () => {
    const schedule = schedulingEngine.runSchedulingAlgorithm([], mockSettings);
    test.assert(Array.isArray(schedule), 'Should handle empty task list');
    test.assertEqual(schedule.length, 0, 'Should return empty array for empty input');
  });

  test.test('Tasks outside available time windows', () => {
    const impossibleTasks = [
      {
        id: 'impossible',
        taskName: 'Impossible Task',
        durationMinutes: 480, // 8 hours - longer than any single window
        schedulingType: 'flexible',
        timeWindow: 'morning', // Only 6 hours available (06:00-12:00)
        priority: 10
      }
    ];
    
    const schedule = schedulingEngine.runSchedulingAlgorithm(impossibleTasks, mockSettings);
    const impossible = schedule.find(t => t.id === 'impossible');
    
    // The task should either be scheduled with a warning or left unscheduled
    if (impossible) {
      console.log(`      Impossible task handled: ${impossible.scheduledTime ? 'scheduled' : 'unscheduled'}`);
    }
  });

  test.test('Circular dependency handling', () => {
    const circularTasks = [
      {
        id: 'task-x',
        taskName: 'Task X',
        durationMinutes: 30,
        schedulingType: 'flexible',
        timeWindow: 'morning',
        dependsOn: 'task-y',
        priority: 8
      },
      {
        id: 'task-y',
        taskName: 'Task Y',
        durationMinutes: 30,
        schedulingType: 'flexible',
        timeWindow: 'morning',
        dependsOn: 'task-x', // Creates circular dependency
        priority: 7
      }
    ];
    
    // This should not crash and should handle the circular dependency gracefully
    const schedule = schedulingEngine.runSchedulingAlgorithm(circularTasks, mockSettings);
    test.assert(Array.isArray(schedule), 'Should handle circular dependencies without crashing');
    
    console.log(`      Circular dependency handled gracefully`);
  });

  // Generate final report
  return test.generateReport();
}

// Export for use in other test files
export { runDirectIntegrationTests };

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDirectIntegrationTests().then(success => {
    console.log(`\n🏁 Direct Integration Testing Complete`);
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Direct integration test suite crashed:', error);
    process.exit(1);
  });
}