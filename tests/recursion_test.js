/**
 * Quick recursion fix test - Run this in browser console
 * Tests that component cleanup no longer causes infinite recursion
 */

console.log('🧪 Starting component recursion fix test...');

// Test 1: Check if MemoryLeakPrevention has state guards
function testMemoryLeakPreventionStateGuards() {
  console.log('\n📋 Test 1: MemoryLeakPrevention state guards');
  
  // Create a mock component with destroy method
  const mockComponent = {
    constructor: { name: 'TestComponent' },
    _isDestroying: false,
    _isDestroyed: false,
    destroy: function() {
      console.log('Mock component destroy called');
    }
  };
  
  try {
    // First call should work
    console.log('Calling unregisterComponent first time...');
    memoryManager.unregisterComponent(mockComponent);
    
    // Second call should be prevented by state guards
    console.log('Calling unregisterComponent second time (should be prevented)...');
    memoryManager.unregisterComponent(mockComponent);
    
    console.log('✅ State guards working - no infinite recursion');
    return true;
  } catch (error) {
    console.error('❌ State guards failed:', error);
    return false;
  }
}

// Test 2: Check TaskList no longer calls ComponentManager.unregister
function testTaskListRecursionFix() {
  console.log('\n📋 Test 2: TaskList recursion prevention');
  
  try {
    const testTaskList = new TaskList();
    testTaskList._isDestroying = false;
    testTaskList._isDestroyed = false;
    
    console.log('Calling TaskList destroy method...');
    testTaskList.destroy();
    
    // If we reach here, no infinite recursion occurred
    console.log('✅ TaskList destroy completed without recursion');
    return true;
  } catch (error) {
    console.error('❌ TaskList recursion test failed:', error);
    return false;
  }
}

// Test 3: Monitor console for recursion messages
function monitorConsoleForRecursion() {
  console.log('\n📋 Test 3: Console monitoring for recursion messages');
  
  let recursionCount = 0;
  const originalLog = console.log;
  
  // Override console.log to count recursion messages
  console.log = function(...args) {
    const message = args.join(' ');
    if (message.includes('🗑️ Unregistered component')) {
      recursionCount++;
    }
    return originalLog.apply(console, args);
  };
  
  // Wait a bit then restore and report
  setTimeout(() => {
    console.log = originalLog;
    if (recursionCount > 5) {
      console.error(`❌ Detected ${recursionCount} repeated unregister messages`);
      return false;
    } else {
      console.log(`✅ Only ${recursionCount} unregister messages (acceptable)`);
      return true;
    }
  }, 2000);
}

// Run all tests
async function runRecursionFixTests() {
  console.log('🚀 Running recursion fix validation tests...\n');
  
  const test1 = testMemoryLeakPreventionStateGuards();
  const test2 = testTaskListRecursionFix();
  
  console.log('\n📊 Test Results:');
  console.log(`Memory Leak Prevention State Guards: ${test1 ? '✅' : '❌'}`);
  console.log(`TaskList Recursion Prevention: ${test2 ? '✅' : '❌'}`);
  
  if (test1 && test2) {
    console.log('\n🎉 All recursion fix tests PASSED!');
    console.log('Infinite recursion bug should be resolved.');
  } else {
    console.log('\n⚠️  Some tests FAILED - recursion may still occur');
  }
  
  // Start console monitoring
  monitorConsoleForRecursion();
}

// Expose test function globally
window.testRecursionFix = runRecursionFixTests;

console.log('✅ Recursion fix test loaded. Run testRecursionFix() to validate the fix.');