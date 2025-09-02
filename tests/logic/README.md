# Logic Module Tests

This directory contains unit tests for the refactored business logic modules, created as part of the TaskLogic.js refactoring effort.

## Phase 1 Tests

### TaskQuery.test.js
Tests for the centralized task filtering, sorting, and querying functionality.

**Test Coverage:**
- ✅ filterTasks() - Search query and criteria-based filtering
- ✅ sortTasks() - Multi-criteria sorting with direction support  
- ✅ search() - Enhanced search with multi-term support
- ✅ categorize() - Task categorization by various attributes
- ✅ getTaskStats() - Statistical analysis of task collections

## Running Tests

### Browser Environment
1. Include the test file in your HTML page
2. Call `runTaskQueryTests()` from the console

### Node.js Environment  
```bash
cd tests/logic
node TaskQuery.test.js
```

## Future Test Files

As the refactoring progresses, additional test files will be added:

- **Phase 2**: `Recurrence.test.js` - Recurrence rule processing tests
- **Phase 3**: `DependencyResolver.test.js` - Graph algorithm tests  
- **Phase 4**: `SchedulingEngine.test.js` - Core scheduling algorithm tests
- **Phase 5**: Manager class tests after refactoring

## Test Data

Each test file includes mock data appropriate for testing its specific module functionality. Mock data is designed to cover edge cases and typical usage patterns.

## Success Criteria

- **Logic modules**: >90% coverage target
- **Manager classes**: >85% coverage target  
- **Integration points**: 100% coverage target

## Notes

Tests are written to be framework-agnostic and can run in both browser and Node.js environments. This supports the project's goal of maintaining simplicity while ensuring comprehensive testing coverage.