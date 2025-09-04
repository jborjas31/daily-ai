// Mapping helpers lightweight tests
import { timestampToISO, stampCreate, stampUpdate, templateToDTO, templateFromDoc, instanceFromDoc } from '../../public/js/data/shared/Mapping.js';

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

t.test('timestampToISO handles string passthrough', () => {
  const s = '2024-08-30T10:00:00.000Z';
  t.assertEqual(timestampToISO(s), s, 'should return same ISO string');
});

t.test('timestampToISO handles Firestore-like Timestamp', () => {
  const iso = '2024-08-30T10:00:00.000Z';
  const ts = { toDate: () => new Date(iso) };
  t.assertEqual(timestampToISO(ts), iso, 'should convert Timestamp to ISO');
});

t.test('stampCreate adds createdAt and updatedAt', () => {
  const base = { a: 1 };
  const stamped = stampCreate(base);
  t.assert('createdAt' in stamped && 'updatedAt' in stamped, 'should include timestamps');
  t.assert(typeof stamped.createdAt === 'string' && stamped.createdAt.includes('T'), 'createdAt should be ISO');
});

t.test('stampUpdate adds updatedAt and removes id/createdAt', () => {
  const base = { id: 'x', createdAt: 'old', name: 'N' };
  const stamped = stampUpdate(base);
  t.assert(!('id' in stamped), 'id should be removed');
  t.assert(stamped.updatedAt && typeof stamped.updatedAt === 'string', 'should include updatedAt');
  t.assertEqual(stamped.name, 'N', 'other fields preserved');
});

t.test('templateToDTO strips id', () => {
  const dto = templateToDTO({ id: 't1', taskName: 'A' });
  t.assert(!('id' in dto), 'id should be stripped');
  t.assertEqual(dto.taskName, 'A', 'should keep fields');
});

t.test('templateFromDoc maps doc with timestamps', () => {
  const iso = '2024-08-30T00:00:00.000Z';
  const ts = { toDate: () => new Date(iso) };
  const doc = { id: 'abc', data: () => ({ taskName: 'X', createdAt: ts, updatedAt: iso }) };
  const out = templateFromDoc(doc);
  t.assertEqual(out.id, 'abc', 'should include id');
  t.assertEqual(out.taskName, 'X', 'should include fields');
  t.assertEqual(out.createdAt, iso, 'should normalize createdAt');
  t.assertEqual(out.updatedAt, iso, 'should keep updatedAt');
});

t.test('instanceFromDoc maps basic fields and timestamps', () => {
  const iso = '2024-08-30T00:00:00.000Z';
  const doc = { id: 'i1', data: () => ({ templateId: 't1', date: '2024-08-30', createdAt: iso, status: 'pending' }) };
  const out = instanceFromDoc(doc);
  t.assertEqual(out.id, 'i1', 'should include id');
  t.assertEqual(out.templateId, 't1', 'should include fields');
  t.assertEqual(out.createdAt, iso, 'should normalize createdAt');
});

t.summary();

