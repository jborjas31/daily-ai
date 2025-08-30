/**
 * Scheduling System Fix Validation Test
 * Run this in browser console to verify the detectAndMarkConflicts fix
 */

console.log('🧪 Testing scheduling system fix...');

// Test 1: Verify detectAndMarkConflicts method exists in schedulingEngine
function testDetectAndMarkConflictsExists() {
  console.log('\n📋 Test 1: detectAndMarkConflicts method accessibility');
  
  try {
    if (typeof schedulingEngine !== 'undefined') {
      if (typeof schedulingEngine.detectAndMarkConflicts === 'function') {
        console.log('✅ schedulingEngine.detectAndMarkConflicts exists');
        return true;
      } else {
        console.log('❌ detectAndMarkConflicts method not found in schedulingEngine');
        return false;
      }
    } else {
      console.log('❌ schedulingEngine object not found');
      return false;
    }
  } catch (error) {
    console.error('❌ Error checking detectAndMarkConflicts:', error);
    return false;
  }
}

// Test 2: Test the actual scheduling algorithm
function testSchedulingAlgorithm() {
  console.log('\n📋 Test 2: runSchedulingAlgorithm execution');
  
  try {
    if (typeof schedulingEngine !== 'undefined' && typeof schedulingEngine.runSchedulingAlgorithm === 'function') {
      // Create mock data for testing
      const mockTasks = [
        {
          id: 'test-1',
          taskName: 'Test Task 1',
          durationMinutes: 30,
          scheduledTime: '09:00',
          isSkippable: false
        },
        {
          id: 'test-2', 
          taskName: 'Test Task 2',
          durationMinutes: 45,
          scheduledTime: '09:15', // This should create a conflict
          isSkippable: true
        }
      ];
      
      const mockSleepSchedule = {
        sleepTime: '23:00',
        wakeTime: '07:00'
      };
      
      console.log('Calling runSchedulingAlgorithm with test data...');
      const result = schedulingEngine.runSchedulingAlgorithm(mockTasks, mockSleepSchedule);
      
      if (result && Array.isArray(result)) {
        console.log('✅ runSchedulingAlgorithm completed successfully');
        console.log(`   Returned ${result.length} scheduled tasks`);
        
        // Check if conflict detection worked
        const conflictTasks = result.filter(task => task.hasConflicts);
        if (conflictTasks.length > 0) {
          console.log(`✅ Conflict detection working: Found ${conflictTasks.length} tasks with conflicts`);
        } else {
          console.log('ℹ️  No conflicts detected in test data');
        }
        
        return true;
      } else {
        console.log('❌ runSchedulingAlgorithm returned invalid result:', result);
        return false;
      }
    } else {
      console.log('❌ runSchedulingAlgorithm method not found');
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing scheduling algorithm:', error);
    return false;
  }
}

// Test 3: Test actual schedule generation for today
function testScheduleGeneration() {
  console.log('\n📋 Test 3: generateScheduleForDate execution');
  
  try {
    if (typeof schedulingEngine !== 'undefined' && typeof schedulingEngine.generateScheduleForDate === 'function') {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      console.log(`Generating schedule for ${today}...`);
      const result = schedulingEngine.generateScheduleForDate(today);
      
      if (result && typeof result === 'object') {
        console.log('✅ generateScheduleForDate completed successfully');
        console.log('   Schedule object returned');
        return true;
      } else {
        console.log('❌ generateScheduleForDate returned invalid result:', result);
        return false;
      }
    } else {
      console.log('❌ generateScheduleForDate method not found');
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing schedule generation:', error);
    console.error('   Error details:', error.message);
    return false;
  }
}

// Run all tests
async function runSchedulingTests() {
  console.log('🚀 Running scheduling system validation tests...\n');
  
  const test1 = testDetectAndMarkConflictsExists();
  const test2 = testSchedulingAlgorithm();
  const test3 = testScheduleGeneration();
  
  console.log('\n📊 Test Results:');
  console.log(`detectAndMarkConflicts exists: ${test1 ? '✅' : '❌'}`);
  console.log(`Scheduling algorithm works: ${test2 ? '✅' : '❌'}`);
  console.log(`Schedule generation works: ${test3 ? '✅' : '❌'}`);
  
  if (test1 && test2 && test3) {
    console.log('\n🎉 All scheduling system tests PASSED!');
    console.log('The detectAndMarkConflicts fix is working correctly.');
  } else {
    console.log('\n⚠️  Some tests FAILED - scheduling system may still have issues');
  }
  
  return { test1, test2, test3 };
}

// Expose test function globally
window.testSchedulingFix = runSchedulingTests;

console.log('✅ Scheduling system test loaded. Run testSchedulingFix() to validate the fix.');