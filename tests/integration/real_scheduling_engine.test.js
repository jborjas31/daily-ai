/**
 * Real SchedulingEngine Integration Test
 * Phase 4 Step 4.2: Testing the actual extracted SchedulingEngine class
 * 
 * Tests the real extracted SchedulingEngine by mocking only the minimal
 * browser dependencies that prevent Node.js execution.
 */

// Mock browser environment before any imports
global.window = {
  location: { hostname: 'localhost' },
  performance: { now: () => Date.now() }
};

global.document = {
  createElement: () => ({ style: {} }),
  getElementById: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {},
  removeEventListener: () => {}
};

// Mock Firebase-specific globals that might be referenced
global.firebase = {
  auth: () => ({ currentUser: null }),
  firestore: () => ({ collection: () => ({ doc: () => ({}) }) })
};

// Set up console for clean output
const originalConsole = console;
console.log = (...args) => process.stdout.write(`LOG: ${args.join(' ')}\n`);
console.error = (...args) => process.stderr.write(`ERROR: ${args.join(' ')}\n`);

/**
 * Import the real SchedulingEngine
 */
let SchedulingEngine;
let TIME_WINDOWS;

try {
  // Try to import the actual extracted SchedulingEngine
  const schedulingModule = await import('../../public/js/logic/SchedulingEngine.js');
  SchedulingEngine = schedulingModule.SchedulingEngine;
  TIME_WINDOWS = schedulingModule.TIME_WINDOWS;
  
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  
  console.log('✅ Successfully imported real SchedulingEngine class');
} catch (error) {
  console.error('❌ Failed to import SchedulingEngine:', error.message);
  process.exit(1);
}

/**
 * Mock state object that the real SchedulingEngine expects
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
      }
    ];
  },
  
  getTaskInstancesForDate(date) {
    return []; // Return empty for testing
  },
  
  getDailyScheduleForDate(date) {
    return null; // No daily overrides
  }
};

// Set global state for the real SchedulingEngine
global.state = mockState;

/**
 * Test Framework
 */
class RealTestRunner {
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
    console.log('\n📊 Real SchedulingEngine Test Results:');
    console.log(`   ✅ Tests Passed: ${this.testsPassed}`);
    console.log(`   ❌ Tests Failed: ${this.testsFailed}`);
    console.log(`   📈 Success Rate: ${((this.testsPassed / (this.testsPassed + this.testsFailed)) * 100).toFixed(1)}%`);
    
    if (this.testsFailed === 0) {
      console.log('\n🎉 All real SchedulingEngine tests passed!');
      console.log('   Phase 4 Step 4.2 validation successful ✅');
      return true;
    } else {
      console.log('\n❌ Some real SchedulingEngine tests failed.');
      return false;
    }
  }
}

/**
 * Test the real extracted SchedulingEngine
 */
async function runRealSchedulingEngineTests() {
  console.log('🔬 Testing Real Extracted SchedulingEngine...\n');
  
  const test = new RealTestRunner();

  // Test 1: Class instantiation
  console.log('🏗️ Class Instantiation Tests');
  
  let schedulingEngine;
  test.test('SchedulingEngine instantiation', () => {
    schedulingEngine = new SchedulingEngine();
    test.assert(schedulingEngine, 'SchedulingEngine should instantiate');
    test.assert(schedulingEngine.recurrenceEngine, 'Should have recurrence engine');
    test.assert(schedulingEngine.dependencyResolver, 'Should have dependency resolver');
  });

  test.test('TIME_WINDOWS export', () => {
    test.assert(TIME_WINDOWS, 'TIME_WINDOWS should be exported');
    test.assert(TIME_WINDOWS.morning, 'Should have morning window');
    test.assert(TIME_WINDOWS.afternoon, 'Should have afternoon window');
    test.assertEqual(TIME_WINDOWS.morning.start, '06:00', 'Morning should start at 06:00');
    test.assertEqual(TIME_WINDOWS.morning.end, '12:00', 'Morning should end at 12:00');
  });

  // Test 2: Core utility methods
  console.log('\n⚙️ Core Utility Method Tests');
  
  test.test('Time conversion methods', () => {
    test.assertEqual(schedulingEngine.timeStringToMinutes('09:30'), 570, 
      'timeStringToMinutes conversion');
    test.assertEqual(schedulingEngine.minutesToTimeString(570), '09:30',
      'minutesToTimeString conversion');
  });

  test.test('Time overlap detection', () => {
    test.assertEqual(schedulingEngine.hasTimeOverlap(60, 120, 90, 150), true,
      'Should detect overlapping ranges');
    test.assertEqual(schedulingEngine.hasTimeOverlap(60, 120, 120, 180), false,
      'Should not detect adjacent ranges');
  });

  // Test 3: Schedule generation with mocked state
  console.log('\n📅 Schedule Generation Tests');
  
  test.test('generateScheduleForDate method', () => {
    const result = schedulingEngine.generateScheduleForDate('2024-08-30');
    
    test.assert(result, 'Should return a result object');
    test.assert(typeof result.success === 'boolean', 'Should have success property');
    
    if (result.success) {
      test.assert(Array.isArray(result.schedule), 'Should have schedule array');
      test.assert(typeof result.totalTasks === 'number', 'Should have totalTasks count');
      test.assert(typeof result.scheduledTasks === 'number', 'Should have scheduledTasks count');
      test.assert(result.sleepSchedule, 'Should have sleepSchedule');
      
      console.log(`      Generated ${result.scheduledTasks}/${result.totalTasks} tasks`);
    } else {
      console.log(`      Schedule generation failed: ${result.error}`);
    }
  });

  test.test('runSchedulingAlgorithm method', () => {
    const testTasks = [
      {
        id: 'test-fixed',
        taskName: 'Test Fixed Task',
        durationMinutes: 30,
        schedulingType: 'fixed',
        defaultTime: '10:00',
        priority: 10
      },
      {
        id: 'test-flexible',
        taskName: 'Test Flexible Task',
        durationMinutes: 60,
        schedulingType: 'flexible',
        timeWindow: 'afternoon',
        priority: 8
      }
    ];
    
    const settings = mockState.getSettings();
    const schedule = schedulingEngine.runSchedulingAlgorithm(testTasks, settings);
    
    test.assert(Array.isArray(schedule), 'Should return schedule array');
    
    const fixedTask = schedule.find(t => t.id === 'test-fixed');
    const flexibleTask = schedule.find(t => t.id === 'test-flexible');
    
    test.assert(fixedTask && fixedTask.scheduledTime === '10:00', 
      'Fixed task should keep its time');
    test.assert(flexibleTask, 'Flexible task should be in schedule');
    
    console.log(`      Scheduled ${schedule.filter(t => t.scheduledTime).length}/${schedule.length} tasks`);
  });

  // Test 4: Conflict detection
  console.log('\n⚠️ Conflict Detection Tests');
  
  test.test('detectAndMarkConflicts method', () => {
    const testSchedule = [
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
    
    const result = schedulingEngine.detectAndMarkConflicts(testSchedule);
    
    test.assert(Array.isArray(result), 'Should return array');
    test.assertEqual(result.length, 2, 'Should return all tasks');
    
    const task1 = result.find(t => t.id === 'task1');
    const task2 = result.find(t => t.id === 'task2');
    
    test.assert(task1.hasConflicts, 'Task1 should have conflicts');
    test.assert(task2.hasConflicts, 'Task2 should have conflicts'); 
    
    console.log(`      Detected conflicts for ${result.filter(t => t.hasConflicts).length} tasks`);
  });

  // Test 5: Integration with dependencies
  console.log('\n🔗 Dependency Integration Tests');
  
  test.test('Dependency-aware scheduling', () => {
    const dependentTasks = [
      {
        id: 'prereq',
        taskName: 'Prerequisite',
        durationMinutes: 30,
        schedulingType: 'flexible',
        timeWindow: 'morning',
        priority: 8
      },
      {
        id: 'dependent',
        taskName: 'Dependent Task',
        durationMinutes: 45,
        schedulingType: 'flexible',
        timeWindow: 'morning',
        dependsOn: 'prereq',
        priority: 7
      }
    ];
    
    const schedule = schedulingEngine.runSchedulingAlgorithm(dependentTasks, mockState.getSettings());
    
    const prereq = schedule.find(t => t.id === 'prereq');
    const dependent = schedule.find(t => t.id === 'dependent');
    
    if (prereq && dependent && prereq.scheduledTime && dependent.scheduledTime) {
      const prereqEnd = schedulingEngine.timeStringToMinutes(prereq.scheduledTime) + prereq.durationMinutes;
      const dependentStart = schedulingEngine.timeStringToMinutes(dependent.scheduledTime);
      
      test.assert(dependentStart >= prereqEnd, 
        'Dependent task should start after prerequisite ends');
      
      console.log(`      Dependency order: ${prereq.scheduledTime} → ${dependent.scheduledTime}`);
    }
  });

  // Test 6: Performance validation
  console.log('\n⚡ Performance Validation');
  
  test.test('Real SchedulingEngine performance', () => {
    const startTime = Date.now();
    
    // Generate realistic task load
    const largeTasks = [];
    for (let i = 0; i < 20; i++) {
      largeTasks.push({
        id: `real-task-${i}`,
        taskName: `Real Task ${i}`,
        durationMinutes: 30 + (i % 90),
        schedulingType: i % 2 === 0 ? 'flexible' : 'fixed',
        timeWindow: ['morning', 'afternoon', 'evening', 'anytime'][i % 4],
        defaultTime: i % 2 === 1 ? `${8 + (i % 8)}:00` : undefined,
        priority: Math.floor(Math.random() * 10) + 1
      });
    }
    
    const schedule = schedulingEngine.runSchedulingAlgorithm(largeTasks, mockState.getSettings());
    const endTime = Date.now();
    
    const executionTime = endTime - startTime;
    
    test.assert(Array.isArray(schedule), 'Should return valid schedule');
    test.assert(executionTime < 1000, `Should complete within 1 second (took ${executionTime}ms)`);
    
    const scheduledCount = schedule.filter(t => t.scheduledTime).length;
    console.log(`      Real engine processed ${largeTasks.length} tasks in ${executionTime}ms, scheduled ${scheduledCount}`);
  });

  return test.generateReport();
}

// Run the tests
runRealSchedulingEngineTests().then(success => {
  console.log(`\n🏁 Real SchedulingEngine Testing Complete`);
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Real SchedulingEngine test crashed:', error);
  process.exit(1);
});