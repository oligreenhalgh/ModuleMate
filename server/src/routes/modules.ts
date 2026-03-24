import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

/** GET / — all modules with camelCase fields, prerequisites, and unlocks */
router.get('/', (_req, res) => {
  const db = getDb();

  const rows = db.prepare('SELECT * FROM modules').all() as any[];
  const allPrereqs = db.prepare('SELECT module_code, prerequisite_code FROM module_prerequisites').all() as any[];

  // Build prerequisite and unlock maps
  const prereqMap = new Map<string, string[]>();
  const unlockMap = new Map<string, string[]>();

  for (const row of allPrereqs) {
    // prerequisites: module_code depends on prerequisite_code
    if (!prereqMap.has(row.module_code)) prereqMap.set(row.module_code, []);
    prereqMap.get(row.module_code)!.push(row.prerequisite_code);

    // unlocks: prerequisite_code unlocks module_code (inverse)
    if (!unlockMap.has(row.prerequisite_code)) unlockMap.set(row.prerequisite_code, []);
    unlockMap.get(row.prerequisite_code)!.push(row.module_code);
  }

  const modules = rows.map(row => {
    const { historical_a_rate, avg_weekly_hours, ...rest } = row;
    return {
      ...rest,
      historicalARate: historical_a_rate,
      avgWeeklyHours: avg_weekly_hours,
      prerequisites: prereqMap.get(row.code) || [],
      unlocks: unlockMap.get(row.code) || [],
    };
  });

  res.json(modules);
});

/** GET /:code — single module */
router.get('/:code', (req, res) => {
  const db = getDb();
  const { code } = req.params;

  const row = db.prepare('SELECT * FROM modules WHERE code = ?').get(code) as any;
  if (!row) {
    res.status(404).json({ error: 'Module not found' });
    return;
  }

  const prerequisites = (
    db.prepare('SELECT prerequisite_code FROM module_prerequisites WHERE module_code = ?').all(code) as any[]
  ).map(r => r.prerequisite_code);

  const unlocks = (
    db.prepare('SELECT module_code FROM module_prerequisites WHERE prerequisite_code = ?').all(code) as any[]
  ).map(r => r.module_code);

  const { historical_a_rate, avg_weekly_hours, ...rest } = row;
  res.json({
    ...rest,
    historicalARate: historical_a_rate,
    avgWeeklyHours: avg_weekly_hours,
    prerequisites,
    unlocks,
  });
});

/** PATCH /:code — update module status */
router.patch('/:code', (req, res) => {
  const db = getDb();
  const { code } = req.params;
  const { status } = req.body;

  const validStatuses = ['completed', 'available', 'locked'];
  if (!status || !validStatuses.includes(status)) {
    res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    return;
  }

  const existing = db.prepare('SELECT code FROM modules WHERE code = ?').get(code);
  if (!existing) {
    res.status(404).json({ error: 'Module not found' });
    return;
  }

  db.prepare('UPDATE modules SET status = ? WHERE code = ?').run(status, code);

  // Return the updated module in the same format as GET /:code
  const row = db.prepare('SELECT * FROM modules WHERE code = ?').get(code) as any;
  const prerequisites = (
    db.prepare('SELECT prerequisite_code FROM module_prerequisites WHERE module_code = ?').all(code) as any[]
  ).map(r => r.prerequisite_code);
  const unlocks = (
    db.prepare('SELECT module_code FROM module_prerequisites WHERE prerequisite_code = ?').all(code) as any[]
  ).map(r => r.module_code);

  const { historical_a_rate, avg_weekly_hours, ...rest } = row;
  res.json({
    ...rest,
    historicalARate: historical_a_rate,
    avgWeeklyHours: avg_weekly_hours,
    prerequisites,
    unlocks,
  });
});

export default router;
