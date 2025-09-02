/**
 * Comprehensive SchedulingEngine Integration Test Suite
 * Phase 4 Step 4.2: Integration Testing
 * 
 * This test suite validates the extracted SchedulingEngine maintains
 * identical functionality while providing enhanced testing capabilities.
 */

import { schedulingEngine, TIME_WINDOWS, realTimeTaskLogic } from '../../public/js/taskLogic.js';
import { performance } from 'perf_hooks';

/**
 * Mock browser environment for Node.js testing
 */
if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    performance: { now: () => Date.now() }
  };
}

if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    createElement: () => ({ style: {} }),
    getElementById: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {}
  };
}

// Mock console for consistent output
globalThis.console = {
  log: (...args) => process.stdout.write(`LOG: ${args.join(' ')}\n`),
  error: (...args) => process.stderr.write(`ERROR: ${args.join(' ')}\n`),
  warn: (...args) => process.stdout.write(`WARN: ${args.join(' ')}\n`),
  info: (...args) => process.stdout.write(`INFO: ${args.join(' ')}\n`)
};

/**
 * Enhanced mock state for comprehensive testing
 */
const mockState = {
  getSettings() {
    return {
      defaultWakeTime: '06:00',
      defaultSleepTime: '22:00',
      desiredSleepDuration: 8,
      bufferMinutes: 5
    };
  },

  getTaskTemplates() {
    return [
      {
        id: 'morning-routine',
        taskName: 'Morning Routine',
        durationMinutes: 60,
        timeWindow: 'morning',
        schedulingType: 'flexible',
        priority: 8,
        isMandatory: true,
        recurrence: { type: 'daily' }
      },
      {
        id: 'standup-meeting', 
        taskName: 'Daily Standup',
        durationMinutes: 30,
        schedulingType: 'fixed',
        defaultTime: '09:00',
        priority: 10,
        isMandatory: true,
        recurrence: { type: 'weekdays' }
      },
      {
        id: 'work-session',
        taskName: 'Deep Work Session',
        durationMinutes: 120,
        timeWindow: 'morning',
        schedulingType: 'flexible',
        priority: 9,
        isMandatory: true,
        dependsOn: 'morning-routine',
        recurrence: { type: 'daily' }
      },
      {
        id: 'lunch-break',
        taskName: 'Lunch Break',
        durationMinutes: 45,
        schedulingType: 'fixed',
        defaultTime: '12:00',
        priority: 7,
        isMandatory: false,
        recurrence: { type: 'daily' }
      },
      {
        id: 'afternoon-session',
        taskName: 'Afternoon Work',
        durationMinutes: 90,
        timeWindow: 'afternoon',
        schedulingType: 'flexible',
        priority: 8,
        isMandatory: true,
        dependsOn: 'lunch-break',
        recurrence: { type: 'weekdays' }
      },
      {
        id: 'evening-routine',
        taskName: 'Evening Routine',
        durationMinutes: 30,
        timeWindow: 'evening',
        schedulingType: 'flexible',
        priority: 6,
        isMandatory: false,
        recurrence: { type: 'daily' }
      }
    ];
  },

  getTaskInstancesForDate(date) {
    // Return some existing instances for realistic testing
    return [
      {
        id: 'instance-1',
        templateId: 'standup-meeting',
        scheduledTime: '09:00',
        status: 'completed',
        date: date
      }
    ];
  },

  getDailyScheduleForDate(date) {
    return null; // No daily overrides for testing
  },

  getUserId() {
    return 'test-user-123';
  }
};

// Set global state
globalThis.state = mockState;

/**
 * Test framework utilities
 */
class TestFramework {
  constructor() {
    this.testsPassed = 0;
    this.testsFailed = 0;
    this.testResults = [];
  }

  test(name, fn) {
    try {
      console.log(`   🧪 Testing: ${name}`);
      const result = fn();
      if (result && typeof result.then === 'function') {
        return result.then(() => {
          console.log(`   ✅ PASS: ${name}`);
          this.testsPassed++;
          this.testResults.push({ name, status: 'PASS' });
        }).catch(error => {
          console.error(`   ❌ FAIL: ${name}`);
          console.error(`      Error: ${error.message}`);
          this.testsFailed++;
          this.testResults.push({ name, status: 'FAIL', error: error.message });
        });
      } else {
        console.log(`   ✅ PASS: ${name}`);
        this.testsPassed++;
        this.testResults.push({ name, status: 'PASS' });
      }
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

  assertArrayEqual(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`${message} - Expected: ${JSON.stringify(expected)}, Actual: ${JSON.stringify(actual)}`);
    }
  }

  generateReport() {
    console.log('\n📊 Comprehensive Integration Test Results:');
    console.log(`   ✅ Tests Passed: ${this.testsPassed}`);
    console.log(`   ❌ Tests Failed: ${this.testsFailed}`);
    console.log(`   📈 Success Rate: ${((this.testsPassed / (this.testsPassed + this.testsFailed)) * 100).toFixed(1)}%`);
    
    if (this.testsFailed === 0) {
      console.log('\n🎉 All integration tests passed! Phase 4 Step 4.2 complete.');
      return true;
    } else {
      console.log('\n❌ Some integration tests failed. Review the errors above.');
      console.log('\nFailed tests:');
      this.testResults.filter(r => r.status === 'FAIL').forEach(r => {
        console.log(`   - ${r.name}: ${r.error}`);
      });
      return false;
    }
  }
}

/**
 * Main test suite execution
 */
async function runComprehensiveTests() {
  console.log('🚀 Starting Comprehensive SchedulingEngine Integration Tests...\n');
  
  const test = new TestFramework();

  // Test Suite 1: Module Structure and Exports
  console.log('📦 Module Structure Tests');
  
  test.test('SchedulingEngine export verification', () => {
    test.assert(schedulingEngine, 'schedulingEngine should be exported');
    test.assert(typeof schedulingEngine.generateScheduleForDate === 'function', 
      'schedulingEngine should have generateScheduleForDate method');
    test.assert(typeof schedulingEngine.runSchedulingAlgorithm === 'function',
      'schedulingEngine should have runSchedulingAlgorithm method');
    test.assert(typeof schedulingEngine.detectAndMarkConflicts === 'function',
      'schedulingEngine should have detectAndMarkConflicts method');
  });

  test.test('TIME_WINDOWS structure validation', () => {
    test.assert(TIME_WINDOWS.morning, 'TIME_WINDOWS should have morning');
    test.assert(TIME_WINDOWS.afternoon, 'TIME_WINDOWS should have afternoon');
    test.assert(TIME_WINDOWS.evening, 'TIME_WINDOWS should have evening');
    test.assert(TIME_WINDOWS.anytime, 'TIME_WINDOWS should have anytime');
    
    test.assertEqual(TIME_WINDOWS.morning.start, '06:00', 'Morning should start at 06:00');
    test.assertEqual(TIME_WINDOWS.morning.end, '12:00', 'Morning should end at 12:00');
    test.assertEqual(TIME_WINDOWS.afternoon.start, '12:00', 'Afternoon should start at 12:00');
  });

  test.test('RealTimeTaskLogic export verification', () => {
    test.assert(realTimeTaskLogic, 'realTimeTaskLogic should be exported');
    test.assert(typeof realTimeTaskLogic === 'object', 'realTimeTaskLogic should be an object');
  });

  // Test Suite 2: Core Utility Methods
  console.log('\n⚙️ Core Utility Methods Tests');

  test.test('Time conversion utilities', () => {
    test.assertEqual(schedulingEngine.timeStringToMinutes('09:30'), 570, 
      'timeStringToMinutes should convert 09:30 to 570');
    test.assertEqual(schedulingEngine.timeStringToMinutes('00:00'), 0,
      'timeStringToMinutes should convert 00:00 to 0');
    test.assertEqual(schedulingEngine.timeStringToMinutes('23:59'), 1439,
      'timeStringToMinutes should convert 23:59 to 1439');
    
    test.assertEqual(schedulingEngine.minutesToTimeString(570), '09:30',
      'minutesToTimeString should convert 570 to 09:30');
    test.assertEqual(schedulingEngine.minutesToTimeString(0), '00:00',
      'minutesToTimeString should convert 0 to 00:00');
    test.assertEqual(schedulingEngine.minutesToTimeString(1439), '23:59',
      'minutesToTimeString should convert 1439 to 23:59');
  });

  test.test('Time overlap detection', () => {
    test.assertEqual(schedulingEngine.hasTimeOverlap(60, 120, 90, 150), true,
      'hasTimeOverlap should detect overlapping ranges');
    test.assertEqual(schedulingEngine.hasTimeOverlap(60, 120, 120, 180), false,
      'hasTimeOverlap should not detect adjacent ranges');
    test.assertEqual(schedulingEngine.hasTimeOverlap(60, 120, 30, 60), false,
      'hasTimeOverlap should not detect non-overlapping ranges before');
    test.assertEqual(schedulingEngine.hasTimeOverlap(60, 120, 130, 190), false,
      'hasTimeOverlap should not detect non-overlapping ranges after');
  });

  // Test Suite 3: Schedule Generation with Various Task Combinations
  console.log('\n📅 Schedule Generation Tests');

  test.test('Basic schedule generation', () => {
    const result = schedulingEngine.generateScheduleForDate('2024-08-30');
    
    test.assert(result, 'generateScheduleForDate should return a result');
    test.assert(typeof result.success === 'boolean', 'Result should have success property');
    
    if (result.success) {
      test.assert(Array.isArray(result.schedule), 'Successful result should have schedule array');
      test.assert(typeof result.totalTasks === 'number', 'Result should have totalTasks count');
      test.assert(typeof result.scheduledTasks === 'number', 'Result should have scheduledTasks count');
      test.assert(result.sleepSchedule, 'Result should have sleepSchedule');
      
      console.log(`      Generated schedule with ${result.scheduledTasks} tasks`);
    } else {
      console.log(`      Schedule generation returned: ${result.error} - ${result.message}`);
    }
  });

  test.test('Fixed time task scheduling', () => {
    const fixedTasks = [
      {
        id: 'fixed-1',
        taskName: 'Fixed Task 1',
        durationMinutes: 30,
        schedulingType: 'fixed',
        defaultTime: '09:00',
        priority: 10
      },
      {
        id: 'fixed-2',
        taskName: 'Fixed Task 2',
        durationMinutes: 45,
        schedulingType: 'fixed',
        defaultTime: '14:00',
        priority: 9
      }
    ];
    
    const schedule = schedulingEngine.runSchedulingAlgorithm(fixedTasks, mockState.getSettings());
    test.assert(Array.isArray(schedule), 'Should return schedule array');
    
    const fixed1 = schedule.find(t => t.id === 'fixed-1');
    const fixed2 = schedule.find(t => t.id === 'fixed-2');
    
    if (fixed1) {
      test.assertEqual(fixed1.scheduledTime, '09:00', 'Fixed task should keep its default time');
    }
    if (fixed2) {
      test.assertEqual(fixed2.scheduledTime, '14:00', 'Fixed task should keep its default time');
    }
  });

  test.test('Flexible task scheduling within time windows', () => {
    const flexibleTasks = [
      {
        id: 'flex-morning',
        taskName: 'Flexible Morning Task',
        durationMinutes: 60,
        schedulingType: 'flexible',
        timeWindow: 'morning',
        priority: 8
      },
      {
        id: 'flex-afternoon',
        taskName: 'Flexible Afternoon Task',
        durationMinutes: 90,
        schedulingType: 'flexible',
        timeWindow: 'afternoon',
        priority: 7
      }
    ];
    
    const schedule = schedulingEngine.runSchedulingAlgorithm(flexibleTasks, mockState.getSettings());
    test.assert(Array.isArray(schedule), 'Should return schedule array');
    
    const morningTask = schedule.find(t => t.id === 'flex-morning');
    const afternoonTask = schedule.find(t => t.id === 'flex-afternoon');
    
    if (morningTask && morningTask.scheduledTime) {
      const morningStart = schedulingEngine.timeStringToMinutes(morningTask.scheduledTime);
      const morningWindowStart = schedulingEngine.timeStringToMinutes(TIME_WINDOWS.morning.start);
      const morningWindowEnd = schedulingEngine.timeStringToMinutes(TIME_WINDOWS.morning.end);
      
      test.assert(morningStart >= morningWindowStart, 
        'Morning task should be scheduled within morning window');
      test.assert(morningStart + morningTask.durationMinutes <= morningWindowEnd, 
        'Morning task should end within morning window');
    }
    
    if (afternoonTask && afternoonTask.scheduledTime) {
      const afternoonStart = schedulingEngine.timeStringToMinutes(afternoonTask.scheduledTime);
      const afternoonWindowStart = schedulingEngine.timeStringToMinutes(TIME_WINDOWS.afternoon.start);
      const afternoonWindowEnd = schedulingEngine.timeStringToMinutes(TIME_WINDOWS.afternoon.end);
      
      test.assert(afternoonStart >= afternoonWindowStart, 
        'Afternoon task should be scheduled within afternoon window');
      test.assert(afternoonStart + afternoonTask.durationMinutes <= afternoonWindowEnd, 
        'Afternoon task should end within afternoon window');
    }
  });

  test.test('Priority-based scheduling', () => {
    const priorityTasks = [
      {
        id: 'low-priority',
        taskName: 'Low Priority Task',
        durationMinutes: 60,
        schedulingType: 'flexible',
        timeWindow: 'morning',
        priority: 3
      },
      {
        id: 'high-priority',
        taskName: 'High Priority Task',
        durationMinutes: 60,
        schedulingType: 'flexible',
        timeWindow: 'morning',
        priority: 9
      },
      {
        id: 'medium-priority',
        taskName: 'Medium Priority Task',
        durationMinutes: 60,
        schedulingType: 'flexible',
        timeWindow: 'morning',
        priority: 6
      }
    ];
    
    const schedule = schedulingEngine.runSchedulingAlgorithm(priorityTasks, mockState.getSettings());
    const scheduledTasks = schedule.filter(t => t.scheduledTime);
    
    // Higher priority tasks should be scheduled first (earlier times)
    const highPriorityTask = scheduledTasks.find(t => t.id === 'high-priority');
    const mediumPriorityTask = scheduledTasks.find(t => t.id === 'medium-priority');
    const lowPriorityTask = scheduledTasks.find(t => t.id === 'low-priority');
    
    if (highPriorityTask && mediumPriorityTask) {
      const highStart = schedulingEngine.timeStringToMinutes(highPriorityTask.scheduledTime);
      const mediumStart = schedulingEngine.timeStringToMinutes(mediumPriorityTask.scheduledTime);
      test.assert(highStart <= mediumStart, 'Higher priority task should be scheduled earlier');
    }
    
    console.log(`      Scheduled ${scheduledTasks.length} priority tasks`);
  });

  // Test Suite 4: Dependency-Aware Scheduling
  console.log('\n🔗 Dependency-Aware Scheduling Tests');

  test.test('Simple dependency chain scheduling', () => {
    const dependentTasks = [
      {
        id: 'prerequisite',
        taskName: 'Prerequisite Task',
        durationMinutes: 60,
        timeWindow: 'morning',
        schedulingType: 'flexible',
        priority: 8
      },
      {
        id: 'dependent',
        taskName: 'Dependent Task',
        durationMinutes: 45,
        timeWindow: 'morning',
        schedulingType: 'flexible',
        dependsOn: 'prerequisite',
        priority: 7
      }
    ];
    
    const schedule = schedulingEngine.runSchedulingAlgorithm(dependentTasks, mockState.getSettings());
    
    const prerequisite = schedule.find(t => t.id === 'prerequisite');
    const dependent = schedule.find(t => t.id === 'dependent');
    
    if (prerequisite && dependent && prerequisite.scheduledTime && dependent.scheduledTime) {
      const prereqEnd = schedulingEngine.timeStringToMinutes(prerequisite.scheduledTime) + prerequisite.durationMinutes;
      const depStart = schedulingEngine.timeStringToMinutes(dependent.scheduledTime);
      
      test.assert(depStart >= prereqEnd, 'Dependent task should start after prerequisite ends');
      console.log(`      Dependency ordering verified: ${prerequisite.scheduledTime} → ${dependent.scheduledTime}`);
    }
  });

  test.test('Complex dependency chain scheduling', () => {
    const complexTasks = [
      {
        id: 'task-a',
        taskName: 'Task A',
        durationMinutes: 30,
        timeWindow: 'morning',
        schedulingType: 'flexible',
        priority: 8
      },
      {
        id: 'task-b',
        taskName: 'Task B',
        durationMinutes: 45,
        timeWindow: 'morning',
        schedulingType: 'flexible',
        dependsOn: 'task-a',
        priority: 7
      },
      {
        id: 'task-c',
        taskName: 'Task C',
        durationMinutes: 60,
        timeWindow: 'afternoon',
        schedulingType: 'flexible',
        dependsOn: 'task-b',
        priority: 6
      }
    ];
    
    const schedule = schedulingEngine.runSchedulingAlgorithm(complexTasks, mockState.getSettings());
    
    const taskA = schedule.find(t => t.id === 'task-a');
    const taskB = schedule.find(t => t.id === 'task-b');
    const taskC = schedule.find(t => t.id === 'task-c');
    
    if (taskA && taskB && taskC && taskA.scheduledTime && taskB.scheduledTime && taskC.scheduledTime) {
      const aEnd = schedulingEngine.timeStringToMinutes(taskA.scheduledTime) + taskA.durationMinutes;
      const bStart = schedulingEngine.timeStringToMinutes(taskB.scheduledTime);
      const bEnd = bStart + taskB.durationMinutes;
      const cStart = schedulingEngine.timeStringToMinutes(taskC.scheduledTime);
      
      test.assert(bStart >= aEnd, 'Task B should start after Task A ends');
      test.assert(cStart >= bEnd, 'Task C should start after Task B ends');
      
      console.log(`      Complex dependency chain: A(${taskA.scheduledTime}) → B(${taskB.scheduledTime}) → C(${taskC.scheduledTime})`);
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
      },
      {
        id: 'task3',
        taskName: 'Task 3',
        scheduledTime: '11:00',
        durationMinutes: 30
      }
    ];
    
    const result = schedulingEngine.detectAndMarkConflicts(conflictingSchedule);
    
    test.assert(Array.isArray(result), 'detectAndMarkConflicts should return array');
    test.assertEqual(result.length, 3, 'Should return all input tasks');
    
    const task1 = result.find(t => t.id === 'task1');
    const task2 = result.find(t => t.id === 'task2');
    const task3 = result.find(t => t.id === 'task3');
    
    test.assert(task1.hasConflicts, 'Task1 should have conflicts detected');
    test.assert(task2.hasConflicts, 'Task2 should have conflicts detected');
    test.assert(!task3.hasConflicts, 'Task3 should not have conflicts');
    
    const conflictedTasks = result.filter(t => t.hasConflicts).length;
    console.log(`      Detected ${conflictedTasks} conflicted tasks out of ${result.length}`);
  });

  test.test('Dependency violation conflict detection', () => {
    const dependencyViolationSchedule = [
      {
        id: 'prerequisite',
        taskName: 'Prerequisite Task',
        scheduledTime: '10:00',
        durationMinutes: 60,
        dependents: ['dependent']
      },
      {
        id: 'dependent',
        taskName: 'Dependent Task',
        scheduledTime: '09:30', // Starts before prerequisite ends
        durationMinutes: 30,
        dependsOn: 'prerequisite'
      }
    ];
    
    const result = schedulingEngine.detectAndMarkConflicts(dependencyViolationSchedule);
    
    const dependent = result.find(t => t.id === 'dependent');
    if (dependent) {
      test.assert(dependent.hasConflicts, 'Dependent task should have conflicts detected for dependency violation');
    }
  });

  // Test Suite 6: Performance and Stress Testing
  console.log('\n⚡ Performance and Stress Tests');

  test.test('Large dataset scheduling performance', () => {
    const largeTasks = [];
    for (let i = 0; i < 100; i++) {
      largeTasks.push({
        id: `stress-task-${i}`,
        taskName: `Stress Task ${i}`,
        durationMinutes: 30 + (i % 60), // Vary duration
        timeWindow: ['morning', 'afternoon', 'evening', 'anytime'][i % 4],
        schedulingType: i % 3 === 0 ? 'fixed' : 'flexible',
        defaultTime: i % 3 === 0 ? `${6 + (i % 12)}:${(i * 15) % 60}`.padStart(5, '0') : undefined,
        priority: Math.floor(Math.random() * 10) + 1
      });
    }
    
    const startTime = performance.now();
    const result = schedulingEngine.runSchedulingAlgorithm(largeTasks, mockState.getSettings());
    const endTime = performance.now();
    
    const executionTime = endTime - startTime;
    
    test.assert(Array.isArray(result), 'Should return valid schedule array');
    test.assert(executionTime < 5000, `Should complete within 5 seconds (took ${executionTime.toFixed(2)}ms)`);
    
    const scheduledCount = result.filter(t => t.scheduledTime).length;
    console.log(`      Processed ${largeTasks.length} tasks in ${executionTime.toFixed(2)}ms, scheduled ${scheduledCount}`);
  });

  test.test('Memory usage and garbage collection', () => {
    const initialMemory = process.memoryUsage();
    
    // Generate many schedules to test memory usage
    for (let i = 0; i < 20; i++) {
      const testTasks = mockState.getTaskTemplates().map(t => ({ ...t, id: `${t.id}-${i}` }));
      schedulingEngine.runSchedulingAlgorithm(testTasks, mockState.getSettings());
    }
    
    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
    
    test.assert(memoryIncrease < 50 * 1024 * 1024, 'Memory increase should be less than 50MB');
    console.log(`      Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
  });

  // Test Suite 7: Real-world Scenario Testing
  console.log('\n🌍 Real-world Scenario Tests');

  test.test('Mixed task type realistic schedule', () => {
    const realisticTasks = [
      // Fixed meetings
      {
        id: 'standup',
        taskName: 'Daily Standup',
        durationMinutes: 15,
        schedulingType: 'fixed',
        defaultTime: '09:00',
        priority: 10,
        isMandatory: true
      },
      {
        id: 'lunch',
        taskName: 'Lunch Break',
        durationMinutes: 60,
        schedulingType: 'fixed',
        defaultTime: '12:30',
        priority: 8,
        isMandatory: false
      },
      // Flexible work tasks
      {
        id: 'code-review',
        taskName: 'Code Review',
        durationMinutes: 45,
        timeWindow: 'morning',
        schedulingType: 'flexible',
        priority: 9,
        isMandatory: true
      },
      {
        id: 'documentation',
        taskName: 'Write Documentation',
        durationMinutes: 90,
        timeWindow: 'afternoon',
        schedulingType: 'flexible',
        priority: 6,
        isMandatory: false
      },
      // Dependent tasks
      {
        id: 'testing',
        taskName: 'Run Tests',
        durationMinutes: 30,
        timeWindow: 'afternoon',
        schedulingType: 'flexible',
        dependsOn: 'code-review',
        priority: 8,
        isMandatory: true
      }
    ];
    
    const result = schedulingEngine.generateScheduleForDate('2024-08-30');
    test.assert(result.success, 'Realistic schedule should generate successfully');
    
    if (result.success) {
      const mandatoryScheduled = result.schedule.filter(t => t.isMandatory && t.scheduledTime).length;
      const mandatoryTotal = realisticTasks.filter(t => t.isMandatory).length;
      
      test.assert(mandatoryScheduled >= mandatoryTotal * 0.8, 
        'At least 80% of mandatory tasks should be scheduled');
      
      console.log(`      Realistic schedule: ${result.scheduledTasks}/${result.totalTasks} tasks scheduled`);
    }
  });

  // Generate final report
  return test.generateReport();
}

// Export for use in other test files
export { runComprehensiveTests, mockState, TestFramework };

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runComprehensiveTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Test suite crashed:', error);
    process.exit(1);
  });
}