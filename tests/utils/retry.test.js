// Retry helpers lightweight tests
import { withRetry, shouldRetryOperation } from '../../public/js/data/shared/Retry.js';

class TestRunner {
  constructor() { this.passed = 0; this.failed = 0; }
  test(name, fn) {
    try { fn(); console.log(`✅ ${name}`); this.passed++; }
    catch (e) { console.error(`❌ ${name}: ${e.message}`); this.failed++; }
  }
  assert(cond, msg) { if (!cond) throw new Error(msg); }
  assertEqual(a, b, msg) { if (a !== b) throw new Error(`${msg} (expected ${b}, got ${a})`); }
  summary() { console.log(`\nPassed: ${this.passed}, Failed: ${this.failed}`); process.exitCode = this.failed ? 1 : 0; }
}

const t = new TestRunner();

t.test('shouldRetryOperation returns true for network errors', () => {
  t.assert(shouldRetryOperation({ code: 'network-request-failed' }, 1, 3) === true, 'network-request-failed should be retryable');
  t.assert(shouldRetryOperation({ code: 'temporarily-unavailable' }, 1, 3) === true, 'temporarily-unavailable should be retryable');
  t.assert(shouldRetryOperation({ code: 'deadline-exceeded' }, 1, 3) === true, 'deadline-exceeded should be retryable');
});

t.test('shouldRetryOperation returns false for non-retryable errors or max attempts', () => {
  t.assert(shouldRetryOperation({ code: 'permission-denied' }, 1, 3) === false, 'permission-denied should not be retryable');
  t.assert(shouldRetryOperation({ code: 'network-request-failed' }, 3, 3) === false, 'should not retry at max attempts');
});

await (async () => {
  t.test('withRetry succeeds after transient failures', async () => {
    let count = 0;
    const result = await withRetry(async () => {
      count++;
      if (count < 3) {
        const err = new Error('temporary');
        err.code = 'network-request-failed';
        throw err;
      }
      return 'ok';
    }, 5, 1);
    t.assertEqual(result, 'ok', 'result should be ok');
    t.assertEqual(count, 3, 'operation should attempt 3 times');
  });

  t.test('withRetry throws after exhausting attempts', async () => {
    let attempts = 0;
    let threw = false;
    try {
      await withRetry(async () => {
        attempts++;
        const err = new Error('temporary');
        err.code = 'network-request-failed';
        throw err;
      }, 2, 1);
    } catch (e) {
      threw = true;
    }
    t.assert(threw, 'should throw after retries');
    t.assertEqual(attempts, 2, 'should attempt exactly maxAttempts times');
  });
})();

t.summary();

