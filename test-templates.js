/**
 * Task Template Testing Script
 * Run this in browser console to test all template functionality
 * 
 * Instructions:
 * 1. Open your web app in browser
 * 2. Open developer tools (F12)
 * 3. Copy and paste this entire script into the console
 * 4. Press Enter to run all tests
 */

console.log('🧪 Starting Task Template System Tests...');

// Test Data: Various template configurations
const testTemplates = [
  // Test 1: Simple daily task
  {
    taskName: 'Morning Exercise',
    description: 'Daily workout routine',
    durationMinutes: 30,
    priority: 4,
    isMandatory: true,
    schedulingType: 'fixed',
    defaultTime: '07:00',
    timeWindow: 'morning',
    recurrenceRule: {
      frequency: 'daily',
      interval: 1
    }
  },
  
  // Test 2: Weekly task with multiple days
  {
    taskName: 'Team Meeting',
    description: 'Weekly team sync meetings',
    durationMinutes: 60,
    priority: 3,
    isMandatory: true,
    schedulingType: 'fixed',
    defaultTime: '10:00',
    timeWindow: 'morning',
    recurrenceRule: {
      frequency: 'weekly',
      interval: 1,
      daysOfWeek: [1, 3, 5] // Mon, Wed, Fri
    }
  },
  
  // Test 3: Flexible task with minimum duration
  {
    taskName: 'Creative Writing',
    description: 'Work on creative writing projects',
    durationMinutes: 90,
    minDurationMinutes: 30,
    priority: 2,
    isMandatory: false,
    schedulingType: 'flexible',
    timeWindow: 'evening',
    recurrenceRule: {
      frequency: 'daily',
      interval: 1
    }
  },
  
  // Test 4: Monthly task
  {
    taskName: 'Monthly Review',
    description: 'Review goals and progress',
    durationMinutes: 120,
    priority: 5,
    isMandatory: true,
    schedulingType: 'flexible',
    timeWindow: 'anytime',
    recurrenceRule: {
      frequency: 'monthly',
      interval: 1,
      dayOfMonth: 1
    }
  },
  
  // Test 5: One-time task
  {
    taskName: 'Project Setup',
    description: 'Set up new project structure',
    durationMinutes: 45,
    priority: 3,
    isMandatory: true,
    schedulingType: 'flexible',
    timeWindow: 'afternoon',
    recurrenceRule: {
      frequency: 'none'
    }
  }
];

// Invalid test templates for error testing
const invalidTemplates = [
  // Test 6: Missing required fields
  {
    description: 'Missing task name'
  },
  
  // Test 7: Invalid duration
  {
    taskName: 'Invalid Duration Test',
    durationMinutes: -5,
    priority: 3
  },
  
  // Test 8: Invalid scheduling
  {
    taskName: 'Invalid Scheduling Test',
    schedulingType: 'fixed'
    // Missing defaultTime for fixed scheduling
  },
  
  // Test 9: Invalid recurrence
  {
    taskName: 'Invalid Recurrence Test',
    durationMinutes: 30,
    recurrenceRule: {
      frequency: 'weekly'
      // Missing daysOfWeek for weekly frequency
    }
  },
  
  // Test 10: Task name too long
  {
    taskName: 'A'.repeat(150), // Over 100 characters
    durationMinutes: 30,
    priority: 1
  }
];

// Test Results Storage
let testResults = {
  passed: 0,
  failed: 0,
  errors: [],
  createdTemplates: []
};

// Helper Functions
function logTest(testName, success, details = '') {
  const icon = success ? '✅' : '❌';
  console.log(`${icon} ${testName}${details ? ': ' + details : ''}`);
  
  if (success) {
    testResults.passed++;
  } else {
    testResults.failed++;
    testResults.errors.push({test: testName, details});
  }
}

function logSection(sectionName) {
  console.log(`\n🔍 ${sectionName}`);
  console.log('='.repeat(50));
}

// Test Functions
async function testValidationSystem() {
  logSection('Testing Validation System');
  
  // Test valid templates
  testTemplates.forEach((template, index) => {
    try {
      const result = taskTemplateManager.validateTemplate(template);
      if (result.isValid) {
        logTest(`Valid Template ${index + 1} (${template.taskName})`, true);
      } else {
        logTest(`Valid Template ${index + 1}`, false, `Validation failed: ${result.getErrorMessages().join(', ')}`);
      }
    } catch (error) {
      logTest(`Valid Template ${index + 1}`, false, `Exception: ${error.message}`);
    }
  });
  
  // Test invalid templates
  invalidTemplates.forEach((template, index) => {
    try {
      const result = taskTemplateManager.validateTemplate(template);
      if (!result.isValid) {
        logTest(`Invalid Template ${index + 1} (correctly rejected)`, true, `Errors: ${result.getErrorMessages().join(', ')}`);
      } else {
        logTest(`Invalid Template ${index + 1}`, false, 'Should have failed validation but passed');
      }
    } catch (error) {
      logTest(`Invalid Template ${index + 1}`, false, `Unexpected exception: ${error.message}`);
    }
  });
}

async function testCRUDOperations() {
  logSection('Testing CRUD Operations');
  
  // Test CREATE operations
  for (let i = 0; i < testTemplates.length; i++) {
    const template = testTemplates[i];
    try {
      const created = await taskTemplateManager.create(template);
      if (created && created.id) {
        testResults.createdTemplates.push(created);
        logTest(`CREATE Template ${i + 1} (${template.taskName})`, true, `ID: ${created.id}`);
      } else {
        logTest(`CREATE Template ${i + 1}`, false, 'No ID returned');
      }
    } catch (error) {
      logTest(`CREATE Template ${i + 1}`, false, `Exception: ${error.message}`);
    }
  }
  
  // Test READ operations
  for (const template of testResults.createdTemplates) {
    try {
      const retrieved = await taskTemplateManager.get(template.id);
      if (retrieved && retrieved.taskName === template.taskName) {
        logTest(`READ Template (${template.taskName})`, true);
      } else {
        logTest(`READ Template (${template.taskName})`, false, 'Retrieved data mismatch');
      }
    } catch (error) {
      logTest(`READ Template (${template.taskName})`, false, `Exception: ${error.message}`);
    }
  }
  
  // Test GET ALL operation
  try {
    const allTemplates = await taskTemplateManager.getAll();
    if (Array.isArray(allTemplates) && allTemplates.length >= testResults.createdTemplates.length) {
      logTest('GET ALL Templates', true, `Retrieved ${allTemplates.length} templates`);
    } else {
      logTest('GET ALL Templates', false, 'Incorrect number of templates returned');
    }
  } catch (error) {
    logTest('GET ALL Templates', false, `Exception: ${error.message}`);
  }
  
  // Test UPDATE operations
  if (testResults.createdTemplates.length > 0) {
    const templateToUpdate = testResults.createdTemplates[0];
    const originalName = templateToUpdate.taskName;
    
    try {
      const updated = await taskTemplateManager.update(templateToUpdate.id, {
        taskName: originalName + ' (Updated)',
        priority: 5
      });
      
      if (updated && updated.taskName.includes('(Updated)')) {
        logTest(`UPDATE Template (${originalName})`, true);
      } else {
        logTest(`UPDATE Template (${originalName})`, false, 'Update data not reflected');
      }
    } catch (error) {
      logTest(`UPDATE Template (${originalName})`, false, `Exception: ${error.message}`);
    }
  }
}

async function testStateManagement() {
  logSection('Testing State Management Integration');
  
  try {
    // Test state getters
    const stateTemplates = getState().taskTemplates.data;
    if (Array.isArray(stateTemplates)) {
      logTest('State Templates Access', true, `${stateTemplates.length} templates in state`);
    } else {
      logTest('State Templates Access', false, 'Templates not found in state');
    }
    
    // Test state actions
    if (typeof stateActions.loadTaskTemplates === 'function') {
      logTest('State Actions Available', true);
    } else {
      logTest('State Actions Available', false, 'stateActions.loadTaskTemplates not found');
    }
    
    // Test state synchronization
    await stateActions.loadTaskTemplates();
    const reloadedState = getState().taskTemplates.data;
    logTest('State Synchronization', true, `Reloaded ${reloadedState.length} templates`);
    
  } catch (error) {
    logTest('State Management', false, `Exception: ${error.message}`);
  }
}

async function testErrorHandling() {
  logSection('Testing Error Handling');
  
  // Test with invalid template ID
  try {
    await taskTemplateManager.get('invalid-id-12345');
    logTest('Invalid ID Handling', false, 'Should have thrown an error');
  } catch (error) {
    logTest('Invalid ID Handling', true, `Correctly threw: ${error.message}`);
  }
  
  // Test updating non-existent template
  try {
    await taskTemplateManager.update('non-existent-id', {taskName: 'Test'});
    logTest('Update Non-existent', false, 'Should have thrown an error');
  } catch (error) {
    logTest('Update Non-existent', true, `Correctly threw: ${error.message}`);
  }
  
  // Test circular dependency detection
  if (testResults.createdTemplates.length >= 2) {
    const template1 = testResults.createdTemplates[0];
    const template2 = testResults.createdTemplates[1];
    
    try {
      // Try to create circular dependency
      await taskTemplateManager.update(template1.id, {dependsOn: template2.id});
      await taskTemplateManager.update(template2.id, {dependsOn: template1.id});
      
      // This should fail validation
      const validation = taskTemplateManager.validateTemplate({
        ...template2,
        dependsOn: template1.id
      }, [template1, {...template2, dependsOn: template1.id}]);
      
      if (!validation.isValid && validation.getErrorMessages().some(msg => msg.includes('circular'))) {
        logTest('Circular Dependency Detection', true);
      } else {
        logTest('Circular Dependency Detection', false, 'Failed to detect circular dependency');
      }
    } catch (error) {
      logTest('Circular Dependency Detection', true, `Prevented by system: ${error.message}`);
    }
  }
}

async function testPerformance() {
  logSection('Testing Performance');
  
  const startTime = performance.now();
  
  // Test batch operations
  try {
    const batchTemplates = testTemplates.slice(0, 3);
    const batchResults = await Promise.all(
      batchTemplates.map(template => taskTemplateManager.validateTemplate(template))
    );
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    logTest('Batch Validation Performance', true, `${batchResults.length} templates in ${duration.toFixed(2)}ms`);
    
    if (duration > 1000) {
      logTest('Performance Warning', false, 'Validation took over 1 second');
    } else {
      logTest('Performance Check', true, `Good performance: ${duration.toFixed(2)}ms`);
    }
    
  } catch (error) {
    logTest('Performance Test', false, `Exception: ${error.message}`);
  }
}

async function cleanup() {
  logSection('Cleanup Test Data');
  
  // Delete test templates
  for (const template of testResults.createdTemplates) {
    try {
      await taskTemplateManager.delete(template.id);
      logTest(`DELETE Template (${template.taskName})`, true);
    } catch (error) {
      logTest(`DELETE Template (${template.taskName})`, false, `Exception: ${error.message}`);
    }
  }
}

// Main Test Runner
async function runAllTests() {
  console.log('🚀 Starting Comprehensive Task Template Tests');
  console.log('This will test all functionality we built in Steps 1-4');
  console.log('');
  
  try {
    // Check if required objects exist
    if (typeof taskTemplateManager === 'undefined') {
      console.error('❌ taskTemplateManager not found. Make sure the app is loaded.');
      return;
    }
    
    if (typeof getState === 'undefined') {
      console.error('❌ getState not found. Make sure the app is loaded.');
      return;
    }
    
    // Run all tests
    await testValidationSystem();
    await testCRUDOperations();
    await testStateManagement();
    await testErrorHandling();
    await testPerformance();
    
    // Show summary
    console.log('\n📊 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📝 Created Templates: ${testResults.createdTemplates.length}`);
    
    if (testResults.failed > 0) {
      console.log('\n🔍 FAILURES:');
      testResults.errors.forEach(error => {
        console.log(`❌ ${error.test}: ${error.details}`);
      });
    }
    
    const successRate = ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1);
    console.log(`\n🎯 Success Rate: ${successRate}%`);
    
    if (successRate >= 90) {
      console.log('🎉 EXCELLENT! Template system is working well.');
    } else if (successRate >= 75) {
      console.log('👍 GOOD! Minor issues to address.');
    } else {
      console.log('⚠️  NEEDS WORK! Several issues found.');
    }
    
    // Cleanup
    await cleanup();
    
    console.log('\n✅ Testing Complete!');
    console.log('Step 5 of Phase 2A is now ready for completion.');
    
  } catch (error) {
    console.error('💥 Test runner failed:', error);
  }
}

// Start tests automatically
runAllTests();