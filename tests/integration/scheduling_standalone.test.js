/**
 * Standalone SchedulingEngine Test Suite
 * Phase 4 Step 4.2: Integration Testing (Standalone Version)
 * 
 * Tests the core SchedulingEngine algorithms without external dependencies
 * by creating minimal mock implementations of required classes.
 */

/**
 * TIME_WINDOWS constant (replicated for standalone testing)
 */
const TIME_WINDOWS = {
  morning: { start: '06:00', end: '12:00', label: 'Morning (6:00-12:00)' },
  afternoon: { start: '12:00', end: '18:00', label: 'Afternoon (12:00-18:00)' },
  evening: { start: '18:00', end: '23:00', label: 'Evening (18:00-23:00)' },
  anytime: { start: '06:00', end: '23:00', label: 'Anytime (6:00-23:00)' }
};

/**
 * Mock RecurrenceEngine for standalone testing
 */
class MockRecurrenceEngine {
  shouldGenerateForDate(template, date) {
    // Simple mock - assume all templates should generate for testing
    return true;
  }
  
  getNextOccurrence(template, fromDate) {
    return new Date(fromDate.getTime() + 24 * 60 * 60 * 1000); // Next day
  }
}

/**
 * Mock DependencyResolver for standalone testing
 */
class MockDependencyResolver {
  resolveDependencies(tasks) {
    // Simple topological sort implementation for testing
    const result = [];
    const visited = new Set();
    const visiting = new Set();
    
    const visit = (task) => {
      if (visited.has(task.id)) return;
      if (visiting.has(task.id)) return; // Circular dependency - skip
      
      visiting.add(task.id);
      
      // Find dependencies
      if (task.dependsOn) {
        const dependency = tasks.find(t => t.id === task.dependsOn);
        if (dependency) {
          visit(dependency);
        }
      }
      
      visiting.delete(task.id);
      visited.add(task.id);
      result.push(task);
    };
    
    tasks.forEach(visit);
    return result;
  }
  
  detectCircularDependencies(tasks) {
    // Simple circular dependency detection
    const visited = new Set();
    const visiting = new Set();
    
    const hasCircle = (task) => {
      if (visited.has(task.id)) return false;
      if (visiting.has(task.id)) return true;
      
      visiting.add(task.id);
      
      if (task.dependsOn) {
        const dependency = tasks.find(t => t.id === task.dependsOn);
        if (dependency && hasCircle(dependency)) {
          return true;
        }
      }
      
      visiting.delete(task.id);
      visited.add(task.id);
      return false;
    };
    
    return tasks.some(hasCircle);
  }
}

/**
 * Standalone SchedulingEngine implementation for testing
 * (Core algorithm logic extracted for isolation)
 */
class StandaloneSchedulingEngine {
  constructor(recurrenceEngine = null, dependencyResolver = null) {
    this.recurrenceEngine = recurrenceEngine || new MockRecurrenceEngine();
    this.dependencyResolver = dependencyResolver || new MockDependencyResolver();
  }
  
  /**
   * Convert time string to minutes from midnight
   */
  timeStringToMinutes(timeString) {
    if (!timeString || typeof timeString !== 'string') return 0;
    const [hours, minutes] = timeString.split(':').map(num => parseInt(num, 10));
    return hours * 60 + minutes;
  }
  
  /**
   * Convert minutes from midnight to time string
   */
  minutesToTimeString(minutes) {
    if (minutes < 0 || minutes >= 1440) return '00:00';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }
  
  /**
   * Check if two time ranges overlap
   */
  hasTimeOverlap(start1, end1, start2, end2) {
    return start1 < end2 && start2 < end1;
  }
  
  /**
   * Check if a time slot fits within a time window
   */
  isTimeInWindow(startTime, duration, window) {
    const start = this.timeStringToMinutes(startTime);
    const end = start + duration;
    const windowStart = this.timeStringToMinutes(window.start);
    const windowEnd = this.timeStringToMinutes(window.end);
    
    return start >= windowStart && end <= windowEnd;
  }
  
  /**
   * Main scheduling algorithm
   */
  runSchedulingAlgorithm(tasks, settings) {
    if (!Array.isArray(tasks)) return [];
    
    // Step 1: Place fixed-time tasks (anchors)
    const anchors = this.placeAnchors([...tasks]);
    
    // Step 2: Resolve dependencies
    const orderedTasks = this.dependencyResolver.resolveDependencies([...tasks]);
    
    // Step 3: Slot flexible tasks
    const schedule = this.slotFlexibleTasks(orderedTasks, anchors, settings);
    
    // Step 4: Detect conflicts
    return this.detectAndMarkConflicts(schedule);
  }
  
  /**
   * Place fixed-time tasks as anchors
   */
  placeAnchors(tasks) {
    const anchors = [];
    
    tasks.forEach(task => {
      if (task.schedulingType === 'fixed' && task.defaultTime) {
        task.scheduledTime = task.defaultTime;
        task.isAnchor = true;
        anchors.push(task);
      }
    });
    
    return anchors;
  }
  
  /**
   * Slot flexible tasks around anchors
   */
  slotFlexibleTasks(orderedTasks, anchors, settings) {
    const schedule = [...anchors];
    const flexibleTasks = orderedTasks.filter(t => t.schedulingType === 'flexible' || !t.schedulingType);
    
    // Process flexible tasks in dependency order (already resolved by dependency resolver)
    flexibleTasks.forEach(task => {
      const scheduledTime = this.findBestTimeSlot(task, schedule, settings);
      if (scheduledTime) {
        task.scheduledTime = scheduledTime;
        schedule.push(task);
      }
    });
    
    return schedule;
  }
  
  /**
   * Find the best time slot for a flexible task
   */
  findBestTimeSlot(task, existingSchedule, settings) {
    const timeWindow = task.timeWindow || 'anytime';
    const window = TIME_WINDOWS[timeWindow];
    if (!window) return null;
    
    const startMinutes = this.timeStringToMinutes(window.start);
    const endMinutes = this.timeStringToMinutes(window.end);
    const duration = task.durationMinutes || 60;
    
    // Check for dependency constraints
    let earliestStart = startMinutes;
    if (task.dependsOn) {
      const dependency = existingSchedule.find(t => t.id === task.dependsOn);
      if (dependency && dependency.scheduledTime) {
        const depEnd = this.timeStringToMinutes(dependency.scheduledTime) + (dependency.durationMinutes || 0);
        earliestStart = Math.max(earliestStart, depEnd + 5); // 5 minute buffer
      }
    }
    
    // Find first available slot
    for (let minute = earliestStart; minute + duration <= endMinutes; minute += 15) { // 15-minute increments
      const timeString = this.minutesToTimeString(minute);
      const proposedEnd = minute + duration;
      
      // Check for conflicts with existing schedule
      const hasConflict = existingSchedule.some(scheduled => {
        if (!scheduled.scheduledTime) return false;
        const scheduledStart = this.timeStringToMinutes(scheduled.scheduledTime);
        const scheduledEnd = scheduledStart + (scheduled.durationMinutes || 0);
        return this.hasTimeOverlap(minute, proposedEnd, scheduledStart, scheduledEnd);
      });
      
      if (!hasConflict) {
        return timeString;
      }
    }
    
    return null; // No available slot found
  }
  
  /**
   * Detect and mark conflicts in the schedule
   */
  detectAndMarkConflicts(schedule) {
    const result = [...schedule];
    
    result.forEach((task, index) => {
      if (!task.scheduledTime) return;
      
      task.hasConflicts = false;
      task.conflictType = null;
      task.conflictsWith = [];
      
      const taskStart = this.timeStringToMinutes(task.scheduledTime);
      const taskEnd = taskStart + (task.durationMinutes || 0);
      
      // Check for time overlaps
      result.forEach((other, otherIndex) => {
        if (index === otherIndex || !other.scheduledTime) return;
        
        const otherStart = this.timeStringToMinutes(other.scheduledTime);
        const otherEnd = otherStart + (other.durationMinutes || 0);
        
        if (this.hasTimeOverlap(taskStart, taskEnd, otherStart, otherEnd)) {
          task.hasConflicts = true;
          task.conflictType = 'time_overlap';
          task.conflictsWith.push(other.id);
        }
      });
      
      // Check for dependency violations
      if (task.dependsOn) {
        const dependency = result.find(t => t.id === task.dependsOn);
        if (dependency && dependency.scheduledTime) {
          const depEnd = this.timeStringToMinutes(dependency.scheduledTime) + (dependency.durationMinutes || 0);
          if (taskStart < depEnd) {
            task.hasConflicts = true;
            task.conflictType = task.conflictType ? 'multiple' : 'dependency_violation';
            task.conflictsWith.push(task.dependsOn);
          }
        }
      }
    });
    
    return result;
  }
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
    console.log('\n📊 Standalone Integration Test Results:');
    console.log(`   ✅ Tests Passed: ${this.testsPassed}`);
    console.log(`   ❌ Tests Failed: ${this.testsFailed}`);
    console.log(`   📈 Success Rate: ${((this.testsPassed / (this.testsPassed + this.testsFailed)) * 100).toFixed(1)}%`);
    
    if (this.testsFailed === 0) {
      console.log('\n🎉 All standalone integration tests passed!');
      return true;
    } else {
      console.log('\n❌ Some integration tests failed.');
      return false;
    }
  }
}

/**
 * Main test suite execution
 */
async function runStandaloneTests() {
  console.log('🚀 Starting Standalone SchedulingEngine Integration Tests...\n');
  
  const test = new TestRunner();
  const schedulingEngine = new StandaloneSchedulingEngine();
  const mockSettings = {
    defaultWakeTime: '06:00',
    defaultSleepTime: '22:00',
    desiredSleepDuration: 8,
    bufferMinutes: 5
  };

  // Test Suite 1: Core Utility Methods
  console.log('⚙️ Core Utility Method Tests');

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
      'Should detect overlapping ranges');
    test.assertEqual(schedulingEngine.hasTimeOverlap(60, 120, 120, 180), false,
      'Should not detect adjacent ranges');
    test.assertEqual(schedulingEngine.hasTimeOverlap(60, 120, 30, 60), false,
      'Should not detect non-overlapping ranges before');
    test.assertEqual(schedulingEngine.hasTimeOverlap(60, 120, 130, 190), false,
      'Should not detect non-overlapping ranges after');
  });

  test.test('Time window validation', () => {
    const morningWindow = TIME_WINDOWS.morning;
    const afternoonWindow = TIME_WINDOWS.afternoon;
    
    test.assert(schedulingEngine.isTimeInWindow('08:00', 120, morningWindow),
      'Task should fit in morning window');
    test.assert(!schedulingEngine.isTimeInWindow('11:00', 120, morningWindow),
      'Task should not fit when extending past morning window end');
    test.assert(schedulingEngine.isTimeInWindow('14:00', 90, afternoonWindow),
      'Task should fit in afternoon window');
  });

  // Test Suite 2: Fixed Task Scheduling (Anchors)
  console.log('\n📍 Fixed Task Scheduling Tests');

  test.test('Fixed time task placement', () => {
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
    
    const meeting = schedule.find(t => t.id === 'meeting-1');
    const lunch = schedule.find(t => t.id === 'lunch');
    
    test.assert(meeting && meeting.scheduledTime === '09:00', 
      'Fixed meeting should keep its default time');
    test.assert(lunch && lunch.scheduledTime === '12:30', 
      'Fixed lunch should keep its default time');
    test.assert(meeting.isAnchor, 'Fixed task should be marked as anchor');
    
    console.log(`      Fixed tasks scheduled: Meeting(${meeting.scheduledTime}), Lunch(${lunch.scheduledTime})`);
  });

  // Test Suite 3: Flexible Task Scheduling
  console.log('\n🔄 Flexible Task Scheduling Tests');

  test.test('Single flexible task scheduling', () => {
    const flexibleTasks = [
      {
        id: 'work-session',
        taskName: 'Deep Work Session',
        durationMinutes: 120,
        schedulingType: 'flexible',
        timeWindow: 'morning',
        priority: 9
      }
    ];
    
    const schedule = schedulingEngine.runSchedulingAlgorithm(flexibleTasks, mockSettings);
    const workSession = schedule.find(t => t.id === 'work-session');
    
    test.assert(workSession && workSession.scheduledTime, 'Flexible task should be scheduled');
    
    if (workSession.scheduledTime) {
      const startTime = schedulingEngine.timeStringToMinutes(workSession.scheduledTime);
      const morningStart = schedulingEngine.timeStringToMinutes(TIME_WINDOWS.morning.start);
      const morningEnd = schedulingEngine.timeStringToMinutes(TIME_WINDOWS.morning.end);
      
      test.assert(startTime >= morningStart && startTime + 120 <= morningEnd,
        'Morning flexible task should be within morning window');
      
      console.log(`      Flexible task scheduled: ${workSession.scheduledTime} (within morning window)`);
    }
  });

  test.test('Priority-based flexible task ordering', () => {
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
        'Higher priority task should be scheduled earlier');
      
      console.log(`      Priority ordering: High(${highPriorityTask.scheduledTime}) before Low(${lowPriorityTask.scheduledTime})`);
    }
  });

  // Test Suite 4: Mixed Task Scheduling
  console.log('\n🎯 Mixed Task Scheduling Tests');

  test.test('Fixed and flexible task integration', () => {
    const mixedTasks = [
      {
        id: 'standup',
        taskName: 'Daily Standup',
        durationMinutes: 15,
        schedulingType: 'fixed',
        defaultTime: '09:00',
        priority: 10
      },
      {
        id: 'work-block',
        taskName: 'Work Block',
        durationMinutes: 90,
        schedulingType: 'flexible',
        timeWindow: 'morning',
        priority: 8
      },
      {
        id: 'lunch-meeting',
        taskName: 'Lunch Meeting',
        durationMinutes: 60,
        schedulingType: 'fixed',
        defaultTime: '12:00',
        priority: 9
      }
    ];
    
    const schedule = schedulingEngine.runSchedulingAlgorithm(mixedTasks, mockSettings);
    
    const standup = schedule.find(t => t.id === 'standup');
    const workBlock = schedule.find(t => t.id === 'work-block');
    const lunchMeeting = schedule.find(t => t.id === 'lunch-meeting');
    
    test.assert(standup && standup.scheduledTime === '09:00', 
      'Fixed standup should keep its time');
    test.assert(lunchMeeting && lunchMeeting.scheduledTime === '12:00', 
      'Fixed lunch meeting should keep its time');
    test.assert(workBlock && workBlock.scheduledTime, 
      'Flexible work block should be scheduled');
    
    if (workBlock && workBlock.scheduledTime) {
      // Work block should not conflict with fixed tasks
      const workStart = schedulingEngine.timeStringToMinutes(workBlock.scheduledTime);
      const workEnd = workStart + 90;
      const standupStart = 540; // 09:00
      const standupEnd = 555;   // 09:15
      const lunchStart = 720;   // 12:00
      
      test.assert(!schedulingEngine.hasTimeOverlap(workStart, workEnd, standupStart, standupEnd) &&
                 workEnd <= lunchStart,
        'Flexible task should not conflict with fixed tasks');
      
      console.log(`      Mixed schedule: Standup(09:00), Work(${workBlock.scheduledTime}), Lunch(12:00)`);
    }
  });

  // Test Suite 5: Dependency Resolution
  console.log('\n🔗 Dependency Resolution Tests');

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
      
      console.log(`      Dependency respected: Setup(${setup.scheduledTime}) → Execution(${execution.scheduledTime})`);
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

  // Test Suite 6: Conflict Detection
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
    
    const task1 = result.find(t => t.id === 'task1');
    const task2 = result.find(t => t.id === 'task2');
    const task3 = result.find(t => t.id === 'task3');
    
    test.assert(task1.hasConflicts, 'Task1 should have conflicts detected');
    test.assert(task2.hasConflicts, 'Task2 should have conflicts detected');
    test.assert(!task3.hasConflicts, 'Task3 should not have conflicts');
    test.assertEqual(task1.conflictType, 'time_overlap', 'Should identify time overlap conflict type');
    
    const conflictedTasks = result.filter(t => t.hasConflicts).length;
    console.log(`      Detected ${conflictedTasks} conflicted tasks out of ${result.length}`);
  });

  test.test('Dependency violation detection', () => {
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
    
    test.assert(dependent.hasConflicts, 'Dependent task should have conflicts for dependency violation');
    console.log(`      Dependency violation detected for task: ${dependent.id}`);
  });

  // Test Suite 7: Edge Cases and Stress Testing
  console.log('\n🧪 Edge Cases and Stress Tests');

  test.test('Empty task list handling', () => {
    const schedule = schedulingEngine.runSchedulingAlgorithm([], mockSettings);
    test.assert(Array.isArray(schedule), 'Should handle empty task list');
    test.assertEqual(schedule.length, 0, 'Should return empty array for empty input');
  });

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
        defaultTime: i % 2 === 1 ? `${6 + (i % 10)}:00` : undefined,
        priority: Math.floor(Math.random() * 10) + 1
      });
    }
    
    const schedule = schedulingEngine.runSchedulingAlgorithm(largeTasks, mockSettings);
    const endTime = Date.now();
    
    const executionTime = endTime - startTime;
    
    test.assert(Array.isArray(schedule), 'Should return valid schedule');
    test.assert(executionTime < 2000, `Performance test should complete within 2 seconds (took ${executionTime}ms)`);
    
    const scheduledCount = schedule.filter(t => t.scheduledTime).length;
    console.log(`      Processed ${largeTasks.length} tasks in ${executionTime}ms, scheduled ${scheduledCount}`);
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
    
    // Should not crash and should handle gracefully
    const schedule = schedulingEngine.runSchedulingAlgorithm(circularTasks, mockSettings);
    test.assert(Array.isArray(schedule), 'Should handle circular dependencies without crashing');
    
    const hasCircular = schedulingEngine.dependencyResolver.detectCircularDependencies(circularTasks);
    test.assert(hasCircular, 'Should detect circular dependencies');
    
    console.log(`      Circular dependency handled gracefully`);
  });

  // Generate final report
  return test.generateReport();
}

// Run tests if executed directly
runStandaloneTests().then(success => {
  console.log(`\n🏁 Standalone Integration Testing Complete`);
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Standalone test suite crashed:', error);
  process.exit(1);
});