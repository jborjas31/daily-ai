/**
 * SchedulingEngine Module Tests
 * 
 * Comprehensive unit tests for the advanced task scheduling engine.
 * Part of Phase 4 refactoring testing strategy.
 * 
 * Tests cover:
 * - Schedule generation and optimization
 * - Time window constraints and placement
 * - Dependency-aware task scheduling  
 * - Conflict detection and resolution
 * - Impossibility detection and handling
 * - Integration with RecurrenceEngine and DependencyResolver
 */

// Import the SchedulingEngine module (adjust path as needed in test environment)
// import { SchedulingEngine, TIME_WINDOWS } from '../../public/js/logic/SchedulingEngine.js';

/**
 * Test data: Various scheduling scenarios for comprehensive testing
 */
const testData = {
  // Basic task templates for scheduling
  basicTasks: [
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
      id: 'work-session',
      taskName: 'Deep Work Session',
      durationMinutes: 120,
      timeWindow: 'morning',
      schedulingType: 'flexible',
      priority: 9,
      isMandatory: true,
      recurrence: { type: 'daily' }
    },
    {
      id: 'exercise',
      taskName: 'Exercise',
      durationMinutes: 45,
      timeWindow: 'evening',
      schedulingType: 'flexible',
      priority: 7,
      isMandatory: false,
      recurrence: { type: 'daily' }
    }
  ],

  // Tasks with fixed times (anchors)
  anchorTasks: [
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
      id: 'lunch-break',
      taskName: 'Lunch Break',
      durationMinutes: 60,
      schedulingType: 'fixed',
      defaultTime: '12:00',
      priority: 6,
      isMandatory: true,
      recurrence: { type: 'daily' }
    }
  ],

  // Tasks with dependencies
  dependentTasks: [
    {
      id: 'research',
      taskName: 'Research Phase',
      durationMinutes: 90,
      timeWindow: 'morning',
      schedulingType: 'flexible',
      priority: 8,
      isMandatory: true,
      recurrence: { type: 'daily' }
    },
    {
      id: 'analysis',
      taskName: 'Data Analysis',
      durationMinutes: 60,
      timeWindow: 'afternoon',
      schedulingType: 'flexible',
      dependsOn: 'research',
      priority: 7,
      isMandatory: true,
      recurrence: { type: 'daily' }
    },
    {
      id: 'report',
      taskName: 'Write Report',
      durationMinutes: 45,
      timeWindow: 'afternoon',
      schedulingType: 'flexible',
      dependsOn: 'analysis',
      priority: 9,
      isMandatory: true,
      recurrence: { type: 'daily' }
    }
  ],

  // Impossible schedule (too many mandatory tasks)
  impossibleTasks: [
    {
      id: 'task1',
      taskName: 'Marathon Task 1',
      durationMinutes: 480, // 8 hours
      isMandatory: true,
      priority: 10
    },
    {
      id: 'task2',
      taskName: 'Marathon Task 2',
      durationMinutes: 420, // 7 hours
      isMandatory: true,
      priority: 9
    },
    {
      id: 'task3',
      taskName: 'Marathon Task 3',
      durationMinutes: 360, // 6 hours
      isMandatory: true,
      priority: 8
    }
  ],

  // Mock sleep schedule
  sleepSchedule: {
    wakeTime: '06:00',
    sleepTime: '22:00',
    duration: 8 // 8 hours of sleep
  },

  // Mock user settings
  mockSettings: {
    defaultWakeTime: '06:00',
    defaultSleepTime: '22:00',
    desiredSleepDuration: 8
  }
};

/**
 * Mock classes for testing (replace with actual imports in real environment)
 */
class MockRecurrenceEngine {
  shouldGenerateForDate(task, date) {
    // Simple mock: always return true for daily tasks
    if (task.recurrence?.type === 'daily') return true;
    if (task.recurrence?.type === 'weekdays') {
      const dayOfWeek = new Date(date).getDay();
      return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday-Friday
    }
    return true;
  }
}

class MockDependencyResolver {
  resolveDependencies(tasks) {
    // Simple mock: return tasks sorted by dependencies
    const resolved = [];
    const remaining = [...tasks];
    
    while (remaining.length > 0) {
      const canSchedule = remaining.filter(task => 
        !task.dependsOn || resolved.some(r => r.id === task.dependsOn)
      );
      
      if (canSchedule.length === 0) break; // Circular dependency
      
      // Sort by priority within same dependency level
      canSchedule.sort((a, b) => b.priority - a.priority);
      const next = canSchedule[0];
      
      resolved.push(next);
      remaining.splice(remaining.indexOf(next), 1);
    }
    
    return resolved;
  }
}

/**
 * Test Suite: SchedulingEngine Core Functionality
 */
describe('SchedulingEngine', () => {
  let schedulingEngine;
  
  beforeEach(() => {
    // Initialize with mock dependencies
    schedulingEngine = new SchedulingEngine(
      new MockRecurrenceEngine(),
      new MockDependencyResolver()
    );
  });

  describe('Time Utility Functions', () => {
    test('timeStringToMinutes converts time correctly', () => {
      expect(schedulingEngine.timeStringToMinutes('09:30')).toBe(570);
      expect(schedulingEngine.timeStringToMinutes('00:00')).toBe(0);
      expect(schedulingEngine.timeStringToMinutes('23:59')).toBe(1439);
      expect(schedulingEngine.timeStringToMinutes('')).toBe(0);
    });

    test('minutesToTimeString converts minutes correctly', () => {
      expect(schedulingEngine.minutesToTimeString(570)).toBe('09:30');
      expect(schedulingEngine.minutesToTimeString(0)).toBe('00:00');
      expect(schedulingEngine.minutesToTimeString(1439)).toBe('23:59');
    });

    test('hasTimeOverlap detects overlaps correctly', () => {
      expect(schedulingEngine.hasTimeOverlap(60, 120, 90, 150)).toBe(true);
      expect(schedulingEngine.hasTimeOverlap(60, 120, 120, 180)).toBe(false);
      expect(schedulingEngine.hasTimeOverlap(60, 120, 30, 90)).toBe(true);
      expect(schedulingEngine.hasTimeOverlap(60, 120, 150, 210)).toBe(false);
    });
  });

  describe('Sleep Schedule Management', () => {
    test('getEffectiveSleepSchedule uses daily override', () => {
      const dailyOverride = {
        wakeTime: '05:00',
        sleepTime: '21:00'
      };
      
      const result = schedulingEngine.getEffectiveSleepSchedule(
        testData.mockSettings,
        dailyOverride
      );
      
      expect(result.wakeTime).toBe('05:00');
      expect(result.sleepTime).toBe('21:00');
      expect(result.duration).toBe(8); // From settings
    });

    test('getEffectiveSleepSchedule uses default settings', () => {
      const result = schedulingEngine.getEffectiveSleepSchedule(
        testData.mockSettings,
        null
      );
      
      expect(result.wakeTime).toBe('06:00');
      expect(result.sleepTime).toBe('22:00');
      expect(result.duration).toBe(8);
    });
  });

  describe('Task Filtering', () => {
    test('getActiveTasksForDate filters completed/skipped tasks', () => {
      const templates = testData.basicTasks;
      const instances = [
        { templateId: 'morning-routine', status: 'completed' },
        { templateId: 'work-session', status: 'skipped' }
      ];
      
      const result = schedulingEngine.getActiveTasksForDate(
        templates,
        instances,
        '2024-08-30'
      );
      
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('exercise');
    });

    test('shouldTaskOccurOnDate uses RecurrenceEngine', () => {
      const task = { recurrence: { type: 'daily' } };
      const result = schedulingEngine.shouldTaskOccurOnDate(task, '2024-08-30');
      
      expect(result).toBe(true);
    });
  });

  describe('Impossibility Detection', () => {
    test('checkScheduleImpossibility detects impossible schedules', () => {
      const result = schedulingEngine.checkScheduleImpossibility(
        testData.impossibleTasks,
        testData.sleepSchedule
      );
      
      expect(result.possible).toBe(false);
      expect(result.message).toContain('mandatory tasks require');
      expect(result.suggestions).toBeInstanceOf(Array);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    test('checkScheduleImpossibility allows feasible schedules', () => {
      const result = schedulingEngine.checkScheduleImpossibility(
        testData.basicTasks,
        testData.sleepSchedule
      );
      
      expect(result.possible).toBe(true);
    });
  });

  describe('Anchor Placement', () => {
    test('placeAnchors identifies and places fixed-time tasks', () => {
      const tasks = [...testData.basicTasks, ...testData.anchorTasks];
      const anchors = schedulingEngine.placeAnchors(tasks);
      
      expect(anchors.length).toBe(2);
      expect(anchors[0].id).toBe('standup-meeting');
      expect(anchors[0].scheduledTime).toBe('09:00');
      expect(anchors[0].isAnchor).toBe(true);
      
      expect(anchors[1].id).toBe('lunch-break');
      expect(anchors[1].scheduledTime).toBe('12:00');
    });

    test('placeAnchors sorts anchors by time', () => {
      const tasks = [
        {
          id: 'late-meeting',
          schedulingType: 'fixed',
          defaultTime: '15:00',
          isMandatory: true
        },
        {
          id: 'early-meeting',
          schedulingType: 'fixed',
          defaultTime: '08:00',
          isMandatory: true
        }
      ];
      
      const anchors = schedulingEngine.placeAnchors(tasks);
      
      expect(anchors[0].id).toBe('early-meeting');
      expect(anchors[1].id).toBe('late-meeting');
    });
  });

  describe('Dependency Resolution Integration', () => {
    test('resolveDependencies uses DependencyResolver', () => {
      const result = schedulingEngine.resolveDependencies(testData.dependentTasks);
      
      expect(result.length).toBe(3);
      expect(result[0].id).toBe('research'); // No dependencies
      expect(result[1].id).toBe('analysis'); // Depends on research
      expect(result[2].id).toBe('report'); // Depends on analysis
    });
  });

  describe('Earliest Start Time Calculation', () => {
    test('calculateEarliestStartTime handles no dependencies', () => {
      const task = { id: 'independent-task' };
      const result = schedulingEngine.calculateEarliestStartTime(task, [], new Map());
      
      expect(result).toBeNull();
    });

    test('calculateEarliestStartTime calculates with dependencies', () => {
      const task = { id: 'dependent-task' };
      const schedule = [
        {
          id: 'prerequisite',
          scheduledTime: '09:00',
          durationMinutes: 30
        }
      ];
      const dependencyMap = new Map([['dependent-task', 'prerequisite']]);
      
      const result = schedulingEngine.calculateEarliestStartTime(task, schedule, dependencyMap);
      
      expect(result).toBe('09:35'); // 09:00 + 30 minutes + 5 minute buffer
    });
  });

  describe('Time Slot Finding', () => {
    test('findBestTimeSlot finds available slot in time window', () => {
      const task = {
        id: 'flexible-task',
        durationMinutes: 60
      };
      const timeWindow = TIME_WINDOWS.morning;
      const existingSchedule = [
        {
          id: 'existing',
          scheduledTime: '08:00',
          durationMinutes: 30
        }
      ];
      
      const result = schedulingEngine.findBestTimeSlot(
        task,
        existingSchedule,
        timeWindow,
        testData.sleepSchedule
      );
      
      expect(result).not.toBeNull();
      // Should find slot after existing task
      const resultMinutes = schedulingEngine.timeStringToMinutes(result);
      expect(resultMinutes).toBeGreaterThanOrEqual(510); // After 08:30
    });

    test('findBestTimeSlot respects earliest start time', () => {
      const task = {
        id: 'dependent-task',
        durationMinutes: 30
      };
      const timeWindow = TIME_WINDOWS.morning;
      
      const result = schedulingEngine.findBestTimeSlot(
        task,
        [],
        timeWindow,
        testData.sleepSchedule,
        '10:00' // Earliest start
      );
      
      expect(result).toBe('10:00');
    });

    test('findBestTimeSlot returns null when no slot available', () => {
      const task = {
        id: 'impossible-task',
        durationMinutes: 480 // 8 hours
      };
      const timeWindow = TIME_WINDOWS.morning; // Only 6 hours
      
      const result = schedulingEngine.findBestTimeSlot(
        task,
        [],
        timeWindow,
        testData.sleepSchedule
      );
      
      expect(result).toBeNull();
    });
  });

  describe('Dependency Constraint Validation', () => {
    test('validateDependencyConstraints passes with no dependencies', () => {
      const task = { id: 'independent', scheduledTime: '09:00' };
      const result = schedulingEngine.validateDependencyConstraints(task, [], new Map());
      
      expect(result).toBe(true);
    });

    test('validateDependencyConstraints validates proper ordering', () => {
      const task = { id: 'dependent', scheduledTime: '10:00' };
      const schedule = [
        { id: 'prerequisite', scheduledTime: '09:00', durationMinutes: 30 }
      ];
      const dependencyMap = new Map([['dependent', 'prerequisite']]);
      
      const result = schedulingEngine.validateDependencyConstraints(task, schedule, dependencyMap);
      
      expect(result).toBe(true); // 10:00 > 09:30
    });

    test('validateDependencyConstraints fails with violation', () => {
      const task = { id: 'dependent', scheduledTime: '09:15' };
      const schedule = [
        { id: 'prerequisite', scheduledTime: '09:00', durationMinutes: 30 }
      ];
      const dependencyMap = new Map([['dependent', 'prerequisite']]);
      
      const result = schedulingEngine.validateDependencyConstraints(task, schedule, dependencyMap);
      
      expect(result).toBe(false); // 09:15 < 09:30
    });
  });

  describe('Conflict Detection', () => {
    test('detectAndMarkConflicts identifies time overlaps', () => {
      const schedule = [
        {
          id: 'task1',
          taskName: 'Task 1',
          scheduledTime: '09:00',
          durationMinutes: 60
        },
        {
          id: 'task2',
          taskName: 'Task 2',
          scheduledTime: '09:30',
          durationMinutes: 60
        }
      ];
      
      const result = schedulingEngine.detectAndMarkConflicts(schedule);
      
      expect(result[0].hasConflicts).toBe(true);
      expect(result[0].conflictType).toBe('time_overlap');
      expect(result[0].conflicts[0].overlapMinutes).toBe(30);
      
      expect(result[1].hasConflicts).toBe(true);
      expect(result[1].conflictType).toBe('time_overlap');
    });

    test('detectAndMarkConflicts identifies dependency violations', () => {
      const schedule = [
        {
          id: 'prerequisite',
          taskName: 'Prerequisite',
          scheduledTime: '10:00',
          durationMinutes: 60
        },
        {
          id: 'dependent',
          taskName: 'Dependent Task',
          scheduledTime: '10:30',
          durationMinutes: 30,
          dependsOn: 'prerequisite'
        }
      ];
      
      const result = schedulingEngine.detectAndMarkConflicts(schedule);
      
      const dependentTask = result.find(t => t.id === 'dependent');
      expect(dependentTask.hasConflicts).toBe(true);
      expect(dependentTask.conflictType).toBe('dependency_violation');
      expect(dependentTask.conflicts[0].type).toBe('dependency_violation');
    });

    test('detectAndMarkConflicts handles missing dependencies', () => {
      const schedule = [
        {
          id: 'orphan',
          taskName: 'Orphaned Task',
          scheduledTime: '09:00',
          durationMinutes: 30,
          dependsOn: 'missing-task'
        }
      ];
      
      const result = schedulingEngine.detectAndMarkConflicts(schedule);
      
      expect(result[0].hasConflicts).toBe(true);
      expect(result[0].conflicts[0].type).toBe('missing_dependency');
    });
  });

  describe('Conflict Severity Calculation', () => {
    test('calculateConflictSeverity rates dependency violations as high', () => {
      const conflicts = [
        { type: 'dependency_violation', violationMinutes: 15 }
      ];
      
      const severity = schedulingEngine.calculateConflictSeverity(conflicts);
      expect(severity).toBe('high');
    });

    test('calculateConflictSeverity rates time overlaps by duration', () => {
      const lowConflicts = [{ type: 'time_overlap', overlapMinutes: 15 }];
      const mediumConflicts = [{ type: 'time_overlap', overlapMinutes: 45 }];
      const highConflicts = [{ type: 'time_overlap', overlapMinutes: 90 }];
      
      expect(schedulingEngine.calculateConflictSeverity(lowConflicts)).toBe('low');
      expect(schedulingEngine.calculateConflictSeverity(mediumConflicts)).toBe('medium');
      expect(schedulingEngine.calculateConflictSeverity(highConflicts)).toBe('high');
    });
  });

  describe('Complete Scheduling Algorithm', () => {
    test('runSchedulingAlgorithm integrates all steps', () => {
      const tasks = [...testData.basicTasks, ...testData.anchorTasks];
      const result = schedulingEngine.runSchedulingAlgorithm(tasks, testData.sleepSchedule);
      
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      
      // Check that anchors are included
      const anchors = result.filter(task => task.isAnchor);
      expect(anchors.length).toBe(2);
      
      // Check that flexible tasks are scheduled
      const flexible = result.filter(task => task.isFlexible);
      expect(flexible.length).toBeGreaterThan(0);
      
      // Check that schedule is sorted by time
      for (let i = 1; i < result.length; i++) {
        const prevTime = schedulingEngine.timeStringToMinutes(result[i-1].scheduledTime);
        const currTime = schedulingEngine.timeStringToMinutes(result[i].scheduledTime);
        expect(currTime).toBeGreaterThanOrEqual(prevTime);
      }
    });

    test('runSchedulingAlgorithm handles dependency chains', () => {
      const result = schedulingEngine.runSchedulingAlgorithm(testData.dependentTasks, testData.sleepSchedule);
      
      const research = result.find(t => t.id === 'research');
      const analysis = result.find(t => t.id === 'analysis');
      const report = result.find(t => t.id === 'report');
      
      expect(research).toBeDefined();
      expect(analysis).toBeDefined();
      expect(report).toBeDefined();
      
      // Verify dependency order is respected
      const researchTime = schedulingEngine.timeStringToMinutes(research.scheduledTime);
      const analysisTime = schedulingEngine.timeStringToMinutes(analysis.scheduledTime);
      const reportTime = schedulingEngine.timeStringToMinutes(report.scheduledTime);
      
      expect(analysisTime).toBeGreaterThan(researchTime + research.durationMinutes);
      expect(reportTime).toBeGreaterThan(analysisTime + analysis.durationMinutes);
    });
  });

  describe('Full Schedule Generation', () => {
    test('generateScheduleForDate returns success result', () => {
      // Mock state object
      global.state = {
        getSettings: () => testData.mockSettings,
        getTaskTemplates: () => testData.basicTasks,
        getTaskInstancesForDate: () => [],
        getDailyScheduleForDate: () => null
      };
      
      const result = schedulingEngine.generateScheduleForDate('2024-08-30');
      
      expect(result.success).toBe(true);
      expect(result.schedule).toBeInstanceOf(Array);
      expect(result.sleepSchedule).toBeDefined();
      expect(result.totalTasks).toBe(testData.basicTasks.length);
      expect(result.scheduledTasks).toBe(result.schedule.length);
    });

    test('generateScheduleForDate handles impossible schedules', () => {
      // Mock state object with impossible tasks
      global.state = {
        getSettings: () => testData.mockSettings,
        getTaskTemplates: () => testData.impossibleTasks,
        getTaskInstancesForDate: () => [],
        getDailyScheduleForDate: () => null
      };
      
      const result = schedulingEngine.generateScheduleForDate('2024-08-30');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('impossible_schedule');
      expect(result.suggestions).toBeInstanceOf(Array);
    });

    test('generateScheduleForDate handles errors gracefully', () => {
      // Mock state object that throws error
      global.state = {
        getSettings: () => { throw new Error('Mock error'); },
        getTaskTemplates: () => [],
        getTaskInstancesForDate: () => [],
        getDailyScheduleForDate: () => null
      };
      
      const result = schedulingEngine.generateScheduleForDate('2024-08-30');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('scheduling_error');
    });
  });

  describe('Integration with Time Windows', () => {
    test('TIME_WINDOWS are properly defined', () => {
      expect(TIME_WINDOWS).toBeDefined();
      expect(TIME_WINDOWS.morning).toBeDefined();
      expect(TIME_WINDOWS.afternoon).toBeDefined();
      expect(TIME_WINDOWS.evening).toBeDefined();
      expect(TIME_WINDOWS.anytime).toBeDefined();
      
      expect(TIME_WINDOWS.morning.start).toBe('06:00');
      expect(TIME_WINDOWS.morning.end).toBe('12:00');
    });

    test('slotFlexibleTasks respects time windows', () => {
      const tasks = [
        {
          id: 'morning-task',
          taskName: 'Morning Task',
          durationMinutes: 60,
          timeWindow: 'morning',
          schedulingType: 'flexible'
        }
      ];
      
      const result = schedulingEngine.slotFlexibleTasks(tasks, [], tasks, testData.sleepSchedule);
      const morningTask = result.find(t => t.id === 'morning-task');
      
      expect(morningTask).toBeDefined();
      
      if (morningTask.scheduledTime) {
        const taskTime = schedulingEngine.timeStringToMinutes(morningTask.scheduledTime);
        const windowStart = schedulingEngine.timeStringToMinutes(TIME_WINDOWS.morning.start);
        const windowEnd = schedulingEngine.timeStringToMinutes(TIME_WINDOWS.morning.end);
        
        expect(taskTime).toBeGreaterThanOrEqual(windowStart);
        expect(taskTime).toBeLessThan(windowEnd);
      }
    });
  });

  describe('Performance and Edge Cases', () => {
    test('handles empty task list', () => {
      const result = schedulingEngine.runSchedulingAlgorithm([], testData.sleepSchedule);
      expect(result).toEqual([]);
    });

    test('handles tasks with missing properties', () => {
      const incompleteTasks = [
        { id: 'minimal-task' } // Missing many properties
      ];
      
      expect(() => {
        schedulingEngine.runSchedulingAlgorithm(incompleteTasks, testData.sleepSchedule);
      }).not.toThrow();
    });

    test('handles large number of tasks efficiently', () => {
      const largeTasks = [];
      for (let i = 0; i < 100; i++) {
        largeTasks.push({
          id: `task-${i}`,
          taskName: `Task ${i}`,
          durationMinutes: 30,
          timeWindow: 'anytime',
          schedulingType: 'flexible',
          priority: Math.floor(Math.random() * 10)
        });
      }
      
      const startTime = Date.now();
      const result = schedulingEngine.runSchedulingAlgorithm(largeTasks, testData.sleepSchedule);
      const endTime = Date.now();
      
      expect(result).toBeInstanceOf(Array);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in under 5 seconds
    });
  });
});

/**
 * Performance Benchmarks
 * 
 * These tests measure the performance characteristics of the scheduling engine
 * to ensure it meets real-world performance requirements.
 */
describe('SchedulingEngine Performance', () => {
  let schedulingEngine;
  
  beforeEach(() => {
    schedulingEngine = new SchedulingEngine(
      new MockRecurrenceEngine(),
      new MockDependencyResolver()
    );
  });

  test('schedule generation completes within time limits', () => {
    // Generate 50 realistic tasks
    const tasks = [];
    const timeWindows = ['morning', 'afternoon', 'evening', 'anytime'];
    
    for (let i = 0; i < 50; i++) {
      tasks.push({
        id: `perf-task-${i}`,
        taskName: `Performance Task ${i}`,
        durationMinutes: 30 + (i % 6) * 15, // 30-120 minutes
        timeWindow: timeWindows[i % 4],
        schedulingType: i % 10 === 0 ? 'fixed' : 'flexible',
        defaultTime: i % 10 === 0 ? `${8 + (i % 8)}:00` : undefined,
        priority: 1 + (i % 10),
        isMandatory: i % 3 === 0,
        dependsOn: i > 10 && i % 7 === 0 ? `perf-task-${i - 5}` : undefined
      });
    }
    
    const startTime = performance.now();
    const result = schedulingEngine.runSchedulingAlgorithm(tasks, testData.sleepSchedule);
    const endTime = performance.now();
    
    const executionTime = endTime - startTime;
    
    expect(result).toBeInstanceOf(Array);
    expect(executionTime).toBeLessThan(1000); // Should complete in under 1 second
    
    console.log(`Performance test: ${tasks.length} tasks scheduled in ${executionTime.toFixed(2)}ms`);
  });

  test('conflict detection scales linearly', () => {
    const createOverlappingTasks = (count) => {
      return Array.from({ length: count }, (_, i) => ({
        id: `overlap-${i}`,
        taskName: `Overlap Task ${i}`,
        scheduledTime: '09:00', // All overlap
        durationMinutes: 30
      }));
    };
    
    // Test with different sizes
    const sizes = [10, 20, 50];
    const times = [];
    
    for (const size of sizes) {
      const tasks = createOverlappingTasks(size);
      
      const start = performance.now();
      schedulingEngine.detectAndMarkConflicts(tasks);
      const end = performance.now();
      
      times.push(end - start);
    }
    
    // Check that time doesn't grow exponentially
    expect(times[2] / times[0]).toBeLessThan(25); // 50/10 = 5x tasks, should be < 25x time
    
    console.log(`Conflict detection scaling: ${sizes.map((s, i) => `${s}→${times[i].toFixed(1)}ms`).join(', ')}`);
  });
});

// Export test data for use in integration tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testData, MockRecurrenceEngine, MockDependencyResolver };
}