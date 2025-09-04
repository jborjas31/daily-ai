// Minimal smoke test to validate multi-dependency scheduling behavior
// This is a lightweight harness that mimics the key parts of SchedulingEngine

function timeStringToMinutes(t) {
  const [h, m] = String(t).split(':').map(Number);
  return (h * 60) + (m || 0);
}

function minutesToTimeString(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function resolveDependencies(tasks) {
  const graph = new Map();
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  tasks.forEach(t => graph.set(t.id, { deps: [], outs: [] }));
  tasks.forEach(t => {
    const deps = Array.isArray(t.dependsOn) ? t.dependsOn : (t.dependsOn ? [t.dependsOn] : []);
    deps.forEach(depId => {
      if (!taskMap.has(depId)) return;
      graph.get(t.id).deps.push(depId);
      graph.get(depId).outs.push(t.id);
    });
  });
  const indeg = new Map();
  const q = [];
  graph.forEach((node, id) => {
    indeg.set(id, node.deps.length);
    if (node.deps.length === 0) q.push(id);
  });
  const ordered = [];
  while (q.length) {
    const id = q.shift();
    ordered.push(taskMap.get(id));
    graph.get(id).outs.forEach(out => {
      const v = (indeg.get(out) || 0) - 1;
      indeg.set(out, v);
      if (v === 0) q.push(out);
    });
  }
  if (ordered.length !== tasks.length) {
    const remaining = tasks.filter(t => !ordered.find(x => x.id === t.id));
    ordered.push(...remaining);
  }
  return ordered;
}

function calculateEarliestStart(task, schedule, depMap) {
  const deps = depMap.get(task.id) || [];
  if (!deps.length) return null;
  let maxEnd = null;
  deps.forEach(depId => {
    const dep = schedule.find(t => t.id === depId);
    if (!dep || !dep.scheduledTime) return;
    const start = timeStringToMinutes(dep.scheduledTime);
    const end = start + (dep.durationMinutes || 30);
    if (maxEnd === null || end > maxEnd) maxEnd = end;
  });
  return maxEnd == null ? null : minutesToTimeString(maxEnd + 5);
}

function findBestTimeSlot(task, schedule, window, earliestStart = null) {
  const duration = task.durationMinutes || 30;
  const wStart = timeStringToMinutes(window.start);
  const wEnd = timeStringToMinutes(window.end);
  let startMin = wStart;
  if (earliestStart) startMin = Math.max(startMin, timeStringToMinutes(earliestStart));
  if (startMin >= wEnd) return null;
  for (let t = startMin; t <= wEnd - duration; t += 15) {
    const tEnd = t + duration;
    const conflict = schedule.some(s => {
      if (!s.scheduledTime) return false;
      const sStart = timeStringToMinutes(s.scheduledTime);
      const sEnd = sStart + (s.durationMinutes || 30);
      return Math.max(t, sStart) < Math.min(tEnd, sEnd);
    });
    if (!conflict) return minutesToTimeString(t);
  }
  return null;
}

function validateDeps(scheduledTask, schedule, depMap) {
  const deps = depMap.get(scheduledTask.id) || [];
  const start = timeStringToMinutes(scheduledTask.scheduledTime);
  for (const depId of deps) {
    const dep = schedule.find(t => t.id === depId);
    if (!dep || !dep.scheduledTime) return false;
    const ds = timeStringToMinutes(dep.scheduledTime);
    const de = ds + (dep.durationMinutes || 30);
    if (start < de) return false;
  }
  return true;
}

// Smoke scenario: A(08:00,30), B(09:00,30), C(depends on A & B, 30, flexible)
const A = { id: 'A', taskName: 'Task A', durationMinutes: 30, isMandatory: true, schedulingType: 'fixed', defaultTime: '08:00', timeWindow: 'anytime' };
const B = { id: 'B', taskName: 'Task B', durationMinutes: 30, isMandatory: true, schedulingType: 'fixed', defaultTime: '09:00', timeWindow: 'anytime' };
const C = { id: 'C', taskName: 'Task C', durationMinutes: 30, isMandatory: false, schedulingType: 'flexible', dependsOn: ['A', 'B'], timeWindow: 'anytime' };

// Anchors
const anchors = [
  { ...A, scheduledTime: A.defaultTime },
  { ...B, scheduledTime: B.defaultTime }
];

// Order
const ordered = resolveDependencies([A, B, C]);

// Dep map
const depMap = new Map();
ordered.forEach(t => {
  const deps = Array.isArray(t.dependsOn) ? t.dependsOn : (t.dependsOn ? [t.dependsOn] : []);
  if (deps.length) depMap.set(t.id, deps);
});

// Earliest start for C
const earliest = calculateEarliestStart(C, anchors, depMap);
const slot = findBestTimeSlot(C, anchors, { start: '06:00', end: '23:00' }, earliest);
const scheduledC = { ...C, scheduledTime: slot };
const valid = validateDeps(scheduledC, anchors, depMap);

console.log(JSON.stringify({
  ordered: ordered.map(t => t.id),
  earliestForC: earliest,
  scheduledC: scheduledC.scheduledTime,
  dependencyValid: valid
}, null, 2));

