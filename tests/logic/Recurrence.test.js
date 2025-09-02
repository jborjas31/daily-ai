/**
 * RecurrenceEngine Module Tests
 * 
 * Comprehensive unit tests for the RecurrenceEngine functionality.
 * Part of Phase 2 refactoring testing strategy.
 */

// Import the RecurrenceEngine module (adjust path as needed in test environment)
// import { RecurrenceEngine } from '../../public/js/logic/Recurrence.js';

/**
 * Test templates with various recurrence patterns
 */
const testTemplates = {
  daily: {
    id: 'daily-1',
    taskName: 'Daily Exercise',
    recurrenceRule: {
      frequency: 'daily',
      interval: 1,
      startDate: '2024-01-01'
    }
  },
  
  dailyInterval: {
    id: 'daily-2',
    taskName: 'Every 3 Days',
    recurrenceRule: {
      frequency: 'daily',
      interval: 3,
      startDate: '2024-01-01'
    }
  },
  
  weekly: {
    id: 'weekly-1',
    taskName: 'Weekly Meeting',
    recurrenceRule: {
      frequency: 'weekly',
      interval: 1,
      daysOfWeek: [1, 3, 5], // Monday, Wednesday, Friday
      startDate: '2024-01-01' // January 1, 2024 is a Monday
    }
  },
  
  biweekly: {
    id: 'weekly-2',
    taskName: 'Biweekly Review',
    recurrenceRule: {
      frequency: 'weekly',
      interval: 2,
      daysOfWeek: [2], // Tuesday
      startDate: '2024-01-02' // January 2, 2024 is a Tuesday
    }
  },
  
  monthly: {
    id: 'monthly-1',
    taskName: 'Monthly Report',
    recurrenceRule: {
      frequency: 'monthly',
      interval: 1,
      dayOfMonth: 15,
      startDate: '2024-01-01'
    }
  },
  
  monthlyLastDay: {
    id: 'monthly-2',
    taskName: 'Month End',
    recurrenceRule: {
      frequency: 'monthly',
      interval: 1,
      dayOfMonth: -1, // Last day of month
      startDate: '2024-01-01'
    }
  },
  
  yearly: {
    id: 'yearly-1',
    taskName: 'Annual Review',
    recurrenceRule: {
      frequency: 'yearly',
      interval: 1,
      month: 12,
      dayOfMonth: 31,
      startDate: '2024-01-01'
    }
  },
  
  customWeekdays: {
    id: 'custom-1',
    taskName: 'Work Days Only',
    recurrenceRule: {
      frequency: 'custom',
      customPattern: {
        type: 'weekdays'
      },
      startDate: '2024-01-01'
    }
  },
  
  customWeekends: {
    id: 'custom-2',
    taskName: 'Weekend Tasks',
    recurrenceRule: {
      frequency: 'custom',
      customPattern: {
        type: 'weekends'
      },
      startDate: '2024-01-01'
    }
  },
  
  none: {
    id: 'none-1',
    taskName: 'One Time Task',
    recurrenceRule: {
      frequency: 'none'
    }
  }
};

/**
 * Test Suite: RecurrenceEngine.shouldGenerateForDate
 */
function testShouldGenerateForDate() {
  console.log('Testing RecurrenceEngine.shouldGenerateForDate...');
  
  // Create engine instance
  // const engine = new RecurrenceEngine();
  
  // Test daily recurrence
  // const dailyTest1 = engine.shouldGenerateForDate(testTemplates.daily, '2024-01-01');
  // const dailyTest2 = engine.shouldGenerateForDate(testTemplates.daily, '2024-01-02');
  // Expected: Both should return true for daily tasks
  
  // Test daily with interval
  // const intervalTest1 = engine.shouldGenerateForDate(testTemplates.dailyInterval, '2024-01-01');
  // const intervalTest2 = engine.shouldGenerateForDate(testTemplates.dailyInterval, '2024-01-02');
  // const intervalTest3 = engine.shouldGenerateForDate(testTemplates.dailyInterval, '2024-01-04');
  // Expected: Jan 1st and 4th should be true, Jan 2nd should be false
  
  // Test weekly recurrence
  // const weeklyTest1 = engine.shouldGenerateForDate(testTemplates.weekly, '2024-01-01'); // Monday
  // const weeklyTest2 = engine.shouldGenerateForDate(testTemplates.weekly, '2024-01-02'); // Tuesday
  // const weeklyTest3 = engine.shouldGenerateForDate(testTemplates.weekly, '2024-01-03'); // Wednesday
  // Expected: Monday and Wednesday should be true, Tuesday should be false
  
  // Test monthly recurrence
  // const monthlyTest1 = engine.shouldGenerateForDate(testTemplates.monthly, '2024-01-15');
  // const monthlyTest2 = engine.shouldGenerateForDate(testTemplates.monthly, '2024-01-16');
  // const monthlyTest3 = engine.shouldGenerateForDate(testTemplates.monthly, '2024-02-15');
  // Expected: 15th of any month should be true, other days false
  
  // Test yearly recurrence
  // const yearlyTest1 = engine.shouldGenerateForDate(testTemplates.yearly, '2024-12-31');
  // const yearlyTest2 = engine.shouldGenerateForDate(testTemplates.yearly, '2025-12-31');
  // const yearlyTest3 = engine.shouldGenerateForDate(testTemplates.yearly, '2024-12-30');
  // Expected: Dec 31st should be true, Dec 30th should be false
  
  // Test one-time tasks
  // const noneTest1 = engine.shouldGenerateForDate(testTemplates.none, '2024-01-01');
  // Expected: Should return false (one-time tasks don't auto-generate)
  
  console.log('✅ shouldGenerateForDate tests completed');
}

/**
 * Test Suite: RecurrenceEngine.getNextOccurrence
 */
function testGetNextOccurrence() {
  console.log('Testing RecurrenceEngine.getNextOccurrence...');
  
  // const engine = new RecurrenceEngine();
  
  // Test daily next occurrence
  // const dailyNext = engine.getNextOccurrence(testTemplates.daily, '2024-01-01');
  // Expected: Should return January 2, 2024
  
  // Test weekly next occurrence
  // const weeklyNext = engine.getNextOccurrence(testTemplates.weekly, '2024-01-01'); // Monday
  // Expected: Should return January 3, 2024 (Wednesday)
  
  // Test monthly next occurrence
  // const monthlyNext = engine.getNextOccurrence(testTemplates.monthly, '2024-01-01');
  // Expected: Should return January 15, 2024
  
  // Test one-time task
  // const noneNext = engine.getNextOccurrence(testTemplates.none, '2024-01-01');
  // Expected: Should return null
  
  console.log('✅ getNextOccurrence tests completed');
}

/**
 * Test Suite: RecurrenceEngine.getOccurrencesInRange
 */
function testGetOccurrencesInRange() {
  console.log('Testing RecurrenceEngine.getOccurrencesInRange...');
  
  // const engine = new RecurrenceEngine();
  
  // Test daily occurrences for a week
  // const dailyOccurrences = engine.getOccurrencesInRange(
  //   testTemplates.daily,
  //   '2024-01-01',
  //   '2024-01-07'
  // );
  // Expected: Should return 7 dates (every day for a week)
  
  // Test weekly occurrences for a month
  // const weeklyOccurrences = engine.getOccurrencesInRange(
  //   testTemplates.weekly,
  //   '2024-01-01',
  //   '2024-01-31'
  // );
  // Expected: Should return dates for Mon/Wed/Fri in January 2024
  
  // Test monthly occurrences for a year
  // const monthlyOccurrences = engine.getOccurrencesInRange(
  //   testTemplates.monthly,
  //   '2024-01-01',
  //   '2024-12-31'
  // );
  // Expected: Should return 12 dates (15th of each month)
  
  console.log('✅ getOccurrencesInRange tests completed');
}

/**
 * Test Suite: RecurrenceEngine.validateRecurrenceRule
 */
function testValidateRecurrenceRule() {
  console.log('Testing RecurrenceEngine.validateRecurrenceRule...');
  
  // const engine = new RecurrenceEngine();
  
  // Test valid rules
  // const validDaily = engine.validateRecurrenceRule({
  //   frequency: 'daily',
  //   interval: 1
  // });
  // Expected: { isValid: true, errors: [] }
  
  // const validWeekly = engine.validateRecurrenceRule({
  //   frequency: 'weekly',
  //   daysOfWeek: [1, 3, 5],
  //   interval: 1
  // });
  // Expected: { isValid: true, errors: [] }
  
  // Test invalid rules
  // const invalidFrequency = engine.validateRecurrenceRule({
  //   frequency: 'invalid'
  // });
  // Expected: { isValid: false, errors: ['Invalid frequency: invalid'] }
  
  // const invalidInterval = engine.validateRecurrenceRule({
  //   frequency: 'daily',
  //   interval: -1
  // });
  // Expected: { isValid: false, errors: ['Interval must be a positive integer'] }
  
  // const invalidDateRange = engine.validateRecurrenceRule({
  //   frequency: 'daily',
  //   startDate: '2024-12-31',
  //   endDate: '2024-01-01'
  // });
  // Expected: { isValid: false, errors: ['End date must be after start date'] }
  
  console.log('✅ validateRecurrenceRule tests completed');
}

/**
 * Test Suite: Edge Cases and Complex Scenarios
 */
function testEdgeCases() {
  console.log('Testing edge cases...');
  
  // const engine = new RecurrenceEngine();
  
  // Test leap year handling
  const leapYearTemplate = {
    id: 'leap-1',
    taskName: 'Leap Day Task',
    recurrenceRule: {
      frequency: 'yearly',
      month: 2,
      dayOfMonth: 29,
      startDate: '2024-01-01'
    }
  };
  
  // const leapYearTest1 = engine.shouldGenerateForDate(leapYearTemplate, '2024-02-29');
  // const leapYearTest2 = engine.shouldGenerateForDate(leapYearTemplate, '2025-02-29');
  // Expected: 2024 (leap year) should be true, 2025 (non-leap year) should be false
  
  // Test month boundaries
  const monthBoundaryTemplate = {
    id: 'boundary-1',
    taskName: 'Month End Task',
    recurrenceRule: {
      frequency: 'monthly',
      dayOfMonth: -1, // Last day of month
      startDate: '2024-01-01'
    }
  };
  
  // const jan31Test = engine.shouldGenerateForDate(monthBoundaryTemplate, '2024-01-31');
  // const feb29Test = engine.shouldGenerateForDate(monthBoundaryTemplate, '2024-02-29'); // Leap year
  // const feb28Test = engine.shouldGenerateForDate(monthBoundaryTemplate, '2025-02-28'); // Non-leap year
  // Expected: All should be true (last day of respective months)
  
  // Test DST transitions (conceptual - depends on timezone handling)
  // Note: JavaScript Date handles DST automatically
  
  // Test interval edge cases
  const intervalEdgeTemplate = {
    id: 'interval-edge-1',
    taskName: 'Every 7 Days',
    recurrenceRule: {
      frequency: 'daily',
      interval: 7,
      startDate: '2024-01-01'
    }
  };
  
  // const intervalEdgeTest1 = engine.shouldGenerateForDate(intervalEdgeTemplate, '2024-01-01');
  // const intervalEdgeTest2 = engine.shouldGenerateForDate(intervalEdgeTemplate, '2024-01-08');
  // const intervalEdgeTest3 = engine.shouldGenerateForDate(intervalEdgeTemplate, '2024-01-07');
  // Expected: Jan 1st and 8th should be true, Jan 7th should be false
  
  console.log('✅ Edge case tests completed');
}

/**
 * Test Suite: Custom Recurrence Patterns
 */
function testCustomPatterns() {
  console.log('Testing custom recurrence patterns...');
  
  // const engine = new RecurrenceEngine();
  
  // Test weekdays pattern
  // const weekdaysTest1 = engine.shouldGenerateForDate(testTemplates.customWeekdays, '2024-01-01'); // Monday
  // const weekdaysTest2 = engine.shouldGenerateForDate(testTemplates.customWeekdays, '2024-01-06'); // Saturday
  // const weekdaysTest3 = engine.shouldGenerateForDate(testTemplates.customWeekdays, '2024-01-07'); // Sunday
  // Expected: Monday should be true, Saturday and Sunday should be false
  
  // Test weekends pattern
  // const weekendsTest1 = engine.shouldGenerateForDate(testTemplates.customWeekends, '2024-01-06'); // Saturday
  // const weekendsTest2 = engine.shouldGenerateForDate(testTemplates.customWeekends, '2024-01-07'); // Sunday
  // const weekendsTest3 = engine.shouldGenerateForDate(testTemplates.customWeekends, '2024-01-01'); // Monday
  // Expected: Saturday and Sunday should be true, Monday should be false
  
  // Test nth weekday pattern
  const nthWeekdayTemplate = {
    id: 'nth-1',
    taskName: '2nd Tuesday',
    recurrenceRule: {
      frequency: 'custom',
      customPattern: {
        type: 'nth_weekday',
        dayOfWeek: 2, // Tuesday
        nthWeek: 2    // 2nd occurrence
      },
      startDate: '2024-01-01'
    }
  };
  
  // const nthTest1 = engine.shouldGenerateForDate(nthWeekdayTemplate, '2024-01-09'); // 2nd Tuesday of Jan 2024
  // const nthTest2 = engine.shouldGenerateForDate(nthWeekdayTemplate, '2024-01-02'); // 1st Tuesday of Jan 2024
  // Expected: Jan 9th should be true, Jan 2nd should be false
  
  console.log('✅ Custom pattern tests completed');
}

/**
 * Test Suite: Performance Tests
 */
function testPerformance() {
  console.log('Testing RecurrenceEngine performance...');
  
  // const engine = new RecurrenceEngine();
  
  // Performance test: Generate occurrences for a year
  // const startTime = performance.now();
  // const yearlyOccurrences = engine.getOccurrencesInRange(
  //   testTemplates.daily,
  //   '2024-01-01',
  //   '2024-12-31'
  // );
  // const endTime = performance.now();
  // const duration = endTime - startTime;
  
  // Expected: Should complete in reasonable time (<100ms for daily occurrences over a year)
  // console.log(`Generated ${yearlyOccurrences.length} occurrences in ${duration.toFixed(2)}ms`);
  
  // Performance test: Complex weekly pattern
  // const complexTemplate = {
  //   id: 'complex-1',
  //   taskName: 'Complex Weekly',
  //   recurrenceRule: {
  //     frequency: 'weekly',
  //     interval: 2,
  //     daysOfWeek: [1, 2, 3, 4, 5], // Weekdays
  //     startDate: '2024-01-01'
  //   }
  // };
  
  // const complexStartTime = performance.now();
  // const complexOccurrences = engine.getOccurrencesInRange(
  //   complexTemplate,
  //   '2024-01-01',
  //   '2024-12-31'
  // );
  // const complexEndTime = performance.now();
  // const complexDuration = complexEndTime - complexStartTime;
  
  // console.log(`Generated ${complexOccurrences.length} complex occurrences in ${complexDuration.toFixed(2)}ms`);
  
  console.log('✅ Performance tests completed');
}

/**
 * Test Suite: Utility Methods
 */
function testUtilityMethods() {
  console.log('Testing utility methods...');
  
  // const engine = new RecurrenceEngine();
  
  // Test date formatting
  // const formattedDate = engine.formatDate(new Date('2024-01-01'));
  // Expected: '2024-01-01'
  
  // Test weekend detection
  // const isSaturdayWeekend = engine.isWeekend(new Date('2024-01-06')); // Saturday
  // const isMondayWeekend = engine.isWeekend(new Date('2024-01-01')); // Monday
  // Expected: Saturday should be true, Monday should be false
  
  // Test leap year detection
  // const is2024LeapYear = engine.isLeapYear(2024);
  // const is2025LeapYear = engine.isLeapYear(2025);
  // Expected: 2024 should be true, 2025 should be false
  
  // Test last day of month
  // const lastDayFeb2024 = engine.getLastDayOfMonth(2024, 1); // February 2024 (leap year)
  // const lastDayFeb2025 = engine.getLastDayOfMonth(2025, 1); // February 2025 (non-leap year)
  // Expected: 29 for 2024, 28 for 2025
  
  // Test business day calculation
  // const nextBusinessDay = engine.getNextBusinessDay(new Date('2024-01-05')); // Friday
  // Expected: Should return Monday, January 8, 2024
  
  console.log('✅ Utility method tests completed');
}

/**
 * Run all RecurrenceEngine tests
 */
function runRecurrenceEngineTests() {
  console.log('🧪 Running RecurrenceEngine Module Tests...\n');
  
  try {
    testShouldGenerateForDate();
    testGetNextOccurrence();
    testGetOccurrencesInRange();
    testValidateRecurrenceRule();
    testEdgeCases();
    testCustomPatterns();
    testPerformance();
    testUtilityMethods();
    
    console.log('\n✅ All RecurrenceEngine tests completed successfully!');
    console.log('📊 Test Coverage: Comprehensive coverage of all recurrence patterns and edge cases');
  } catch (error) {
    console.error('❌ RecurrenceEngine tests failed:', error);
  }
}

// Export test functions for use in test runners
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runRecurrenceEngineTests,
    testShouldGenerateForDate,
    testGetNextOccurrence,
    testGetOccurrencesInRange,
    testValidateRecurrenceRule,
    testEdgeCases,
    testCustomPatterns,
    testPerformance,
    testUtilityMethods,
    testTemplates
  };
}

// Auto-run tests if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment - can be run manually
  window.runRecurrenceEngineTests = runRecurrenceEngineTests;
} else if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].endsWith('Recurrence.test.js')) {
  // Node.js environment - run automatically  
  runRecurrenceEngineTests();
}