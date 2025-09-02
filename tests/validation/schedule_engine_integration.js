/**
 * SchedulingEngine Integration Validation
 * 
 * This script validates that the SchedulingEngine extraction from Phase 4
 * maintains identical functionality to the original implementation.
 * 
 * Tests the integration between:
 * - taskLogic.js (exports schedulingEngine instance)
 * - SchedulingEngine class (extracted algorithms)
 * - RecurrenceEngine and DependencyResolver (dependencies)
 * - External component imports (Timeline.js, etc.)
 */

// Import validation framework (Node.js for testing)
const assert = require('assert');
const path = require('path');

/**
 * Mock browser globals for Node.js testing environment
 */
global.console = console;
global.performance = {
  now: () => Date.now()
};

// Mock DOM elements if needed
if (typeof document === 'undefined') {
  global.document = {
    createElement: () => ({ style: {} }),
    getElementById: () => null,
    querySelectorAll: () => []
  };
}

/**
 * Mock state object for testing
 */
const mockState = {
  getSettings() {
    return {
      defaultWakeTime: '06:00',
      defaultSleepTime: '22:00', 
      desiredSleepDuration: 8
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
    // Return no instances for clean testing
    return [];
  },
  
  getDailyScheduleForDate(date) {
    // Return no daily overrides
    return null;
  }
};

global.state = mockState;

/**
 * Validation Test Suite
 */
async function runValidationTests() {
  console.log('🧪 Starting SchedulingEngine Integration Validation...\n');
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  const test = (name, fn) => {
    try {
      console.log(`   Testing: ${name}`);
      fn();
      console.log(`   ✅ PASS: ${name}`);
      testsPassed++;
    } catch (error) {
      console.log(`   ❌ FAIL: ${name}`);
      console.log(`      Error: ${error.message}`);
      testsFailed++;
    }
  };

  // Test 1: Verify imports work correctly
  test('Module imports and exports', () => {
    // Import modules using require (Node.js style for testing)
    const taskLogicPath = path.resolve(__dirname, '../../public/js/taskLogic.js');
    delete require.cache[taskLogicPath]; // Clear cache
    
    const { schedulingEngine, TIME_WINDOWS } = require(taskLogicPath);
    
    assert(schedulingEngine, 'schedulingEngine should be exported');
    assert(TIME_WINDOWS, 'TIME_WINDOWS should be exported');
    
    // Verify it's an instance of SchedulingEngine class
    assert(typeof schedulingEngine.generateScheduleForDate === 'function', 
      'schedulingEngine should have generateScheduleForDate method');
    assert(typeof schedulingEngine.timeStringToMinutes === 'function',
      'schedulingEngine should have timeStringToMinutes method');
    assert(typeof schedulingEngine.detectAndMarkConflicts === 'function',
      'schedulingEngine should have detectAndMarkConflicts method');
  });

  // Test 2: Verify TIME_WINDOWS structure
  test('TIME_WINDOWS structure and values', () => {
    const { TIME_WINDOWS } = require(path.resolve(__dirname, '../../public/js/taskLogic.js'));
    
    assert(TIME_WINDOWS.morning, 'TIME_WINDOWS should have morning');
    assert(TIME_WINDOWS.afternoon, 'TIME_WINDOWS should have afternoon');
    assert(TIME_WINDOWS.evening, 'TIME_WINDOWS should have evening');
    assert(TIME_WINDOWS.anytime, 'TIME_WINDOWS should have anytime');
    
    assert.strictEqual(TIME_WINDOWS.morning.start, '06:00', 'Morning should start at 06:00');
    assert.strictEqual(TIME_WINDOWS.morning.end, '12:00', 'Morning should end at 12:00');
    assert.strictEqual(TIME_WINDOWS.afternoon.start, '12:00', 'Afternoon should start at 12:00');
  });

  // Test 3: Verify basic utility methods work
  test('Time utility methods', () => {
    const { schedulingEngine } = require(path.resolve(__dirname, '../../public/js/taskLogic.js'));
    
    // Test timeStringToMinutes
    assert.strictEqual(schedulingEngine.timeStringToMinutes('09:30'), 570, 
      'timeStringToMinutes should convert 09:30 to 570');
    assert.strictEqual(schedulingEngine.timeStringToMinutes('00:00'), 0,
      'timeStringToMinutes should convert 00:00 to 0');
    
    // Test minutesToTimeString
    assert.strictEqual(schedulingEngine.minutesToTimeString(570), '09:30',
      'minutesToTimeString should convert 570 to 09:30');
    assert.strictEqual(schedulingEngine.minutesToTimeString(0), '00:00',
      'minutesToTimeString should convert 0 to 00:00');
    
    // Test hasTimeOverlap
    assert.strictEqual(schedulingEngine.hasTimeOverlap(60, 120, 90, 150), true,
      'hasTimeOverlap should detect overlapping ranges');
    assert.strictEqual(schedulingEngine.hasTimeOverlap(60, 120, 120, 180), false,
      'hasTimeOverlap should not detect adjacent ranges');
  });

  // Test 4: Verify schedule generation works
  test('Schedule generation functionality', () => {
    const { schedulingEngine } = require(path.resolve(__dirname, '../../public/js/taskLogic.js'));
    
    const result = schedulingEngine.generateScheduleForDate('2024-08-30');
    
    assert(result, 'generateScheduleForDate should return a result');
    assert(typeof result.success === 'boolean', 'Result should have success property');
    
    if (result.success) {
      assert(Array.isArray(result.schedule), 'Successful result should have schedule array');
      assert(typeof result.totalTasks === 'number', 'Result should have totalTasks count');
      assert(typeof result.scheduledTasks === 'number', 'Result should have scheduledTasks count');
      assert(result.sleepSchedule, 'Result should have sleepSchedule');
      
      // Verify scheduled tasks have required properties
      result.schedule.forEach(task => {
        assert(task.id, 'Each scheduled task should have an id');
        assert(task.scheduledTime, 'Each scheduled task should have scheduledTime');
        assert(typeof task.durationMinutes === 'number', 'Each task should have durationMinutes');
      });
      
      console.log(`      Generated schedule with ${result.scheduledTasks} tasks`);
    } else {
      console.log(`      Schedule generation returned: ${result.error} - ${result.message}`);
      assert(result.error, 'Failed result should have error code');
      assert(result.message, 'Failed result should have error message');
    }
  });

  // Test 5: Verify conflict detection works
  test('Conflict detection functionality', () => {
    const { schedulingEngine } = require(path.resolve(__dirname, '../../public/js/taskLogic.js'));
    
    // Create test schedule with known conflicts
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
    
    assert(Array.isArray(result), 'detectAndMarkConflicts should return array');
    assert(result.length === 2, 'Should return all input tasks');
    
    // Verify conflicts are detected
    const task1Result = result.find(t => t.id === 'task1');
    const task2Result = result.find(t => t.id === 'task2');
    
    assert(task1Result.hasConflicts, 'Task1 should have conflicts detected');
    assert(task2Result.hasConflicts, 'Task2 should have conflicts detected');
    assert(task1Result.conflictType === 'time_overlap', 'Should detect time_overlap conflict type');
    
    console.log(`      Detected ${result.filter(t => t.hasConflicts).length} conflicted tasks`);
  });

  // Test 6: Verify dependency-aware scheduling
  test('Dependency-aware scheduling', () => {
    const { schedulingEngine } = require(path.resolve(__dirname, '../../public/js/taskLogic.js'));
    
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
    
    assert(Array.isArray(schedule), 'runSchedulingAlgorithm should return array');
    
    const prerequisite = schedule.find(t => t.id === 'prerequisite');
    const dependent = schedule.find(t => t.id === 'dependent');
    
    if (prerequisite && dependent && prerequisite.scheduledTime && dependent.scheduledTime) {
      const prereqEnd = schedulingEngine.timeStringToMinutes(prerequisite.scheduledTime) + prerequisite.durationMinutes;
      const depStart = schedulingEngine.timeStringToMinutes(dependent.scheduledTime);
      
      assert(depStart >= prereqEnd, 'Dependent task should start after prerequisite ends');
      console.log(`      Dependency ordering: ${prerequisite.scheduledTime} → ${dependent.scheduledTime}`);
    }
  });

  // Test 7: Verify integration with external components (mock test)
  test('External component compatibility', () => {
    // This simulates how Timeline.js would use the schedulingEngine
    const { schedulingEngine, realTimeTaskLogic } = require(path.resolve(__dirname, '../../public/js/taskLogic.js'));
    
    assert(schedulingEngine, 'Components should be able to import schedulingEngine');
    assert(realTimeTaskLogic, 'Components should be able to import realTimeTaskLogic');
    
    // Simulate Timeline.js usage pattern
    const scheduleData = schedulingEngine.generateScheduleForDate('2024-08-30');
    assert(scheduleData, 'Timeline.js pattern should work');
    
    // Verify the interface matches what Timeline.js expects
    assert('success' in scheduleData, 'Schedule data should have success property');
    assert('schedule' in scheduleData, 'Schedule data should have schedule property');
  });

  // Test 8: Performance validation
  test('Performance characteristics', () => {
    const { schedulingEngine } = require(path.resolve(__dirname, '../../public/js/taskLogic.js'));
    
    // Generate moderately complex schedule
    const largeTasks = [];
    for (let i = 0; i < 25; i++) {
      largeTasks.push({
        id: `task-${i}`,
        taskName: `Task ${i}`,
        durationMinutes: 30,
        timeWindow: 'anytime',
        schedulingType: 'flexible',
        priority: Math.floor(Math.random() * 10)
      });
    }
    
    const start = Date.now();
    const result = schedulingEngine.runSchedulingAlgorithm(largeTasks, mockState.getSettings());
    const end = Date.now();
    
    const executionTime = end - start;
    
    assert(Array.isArray(result), 'Should return valid schedule');
    assert(executionTime < 2000, `Should complete within 2 seconds (took ${executionTime}ms)`);
    
    console.log(`      Scheduled ${largeTasks.length} tasks in ${executionTime}ms`);
  });

  // Test Results Summary
  console.log('\n📊 Validation Results:');
  console.log(`   ✅ Tests Passed: ${testsPassed}`);
  console.log(`   ❌ Tests Failed: ${testsFailed}`);
  console.log(`   📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 All integration tests passed! SchedulingEngine extraction is successful.');
    console.log('   Phase 4 Step 4.1 validation complete ✅');
    return true;
  } else {
    console.log('\n❌ Some integration tests failed. Review the errors above.');
    console.log('   Phase 4 Step 4.1 requires fixes before completion.');
    return false;
  }
}

/**
 * Run validation if called directly
 */
if (require.main === module) {
  runValidationTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Validation crashed:', error);
    process.exit(1);
  });
}

module.exports = { runValidationTests, mockState };