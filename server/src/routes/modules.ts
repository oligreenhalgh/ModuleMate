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

/** GET /compare — compare two modules */
router.get('/compare', async (req, res) => {
  const { a, b } = req.query;
  if (!a || !b) return res.status(400).json({ error: 'Parameters a and b required' });

  const db = getDb();
  const modA = db.prepare('SELECT * FROM modules WHERE code = ?').get(a) as any;
  const modB = db.prepare('SELECT * FROM modules WHERE code = ?').get(b) as any;

  if (!modA || !modB) return res.status(404).json({ error: 'Module not found' });

  // Try AI comparison if API key available
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    try {
      const { chatWithGemini } = await import('../services/gemini.js');
      const result = await chatWithGemini([{
        role: 'user',
        content: `Compare these two university modules briefly:
Module A: ${modA.code} - ${modA.name} (${modA.credits} credits, difficulty: ${modA.difficulty}/100, workload: ${modA.workload}/100)
Module B: ${modB.code} - ${modB.name} (${modB.credits} credits, difficulty: ${modB.difficulty}/100, workload: ${modB.workload}/100)
Give a concise recommendation on which to take and why.`
      }], apiKey);
      return res.json({ recommendation: result.content });
    } catch (e) {
      // Fall through to static comparison
    }
  }

  // Static fallback comparison
  const recommendation = generateStaticComparison(modA, modB);
  res.json({ recommendation });
});

function generateStaticComparison(a: any, b: any): string {
  const parts = [];
  parts.push(`## ${a.code} vs ${b.code}\n`);

  if (a.difficulty > b.difficulty) {
    parts.push(`**${a.code}** is more challenging (difficulty: ${a.difficulty} vs ${b.difficulty}).`);
  } else if (b.difficulty > a.difficulty) {
    parts.push(`**${b.code}** is more challenging (difficulty: ${b.difficulty} vs ${a.difficulty}).`);
  }

  if (a.workload > b.workload) {
    parts.push(`**${a.code}** requires more weekly hours (${a.avg_weekly_hours}h vs ${b.avg_weekly_hours}h).`);
  } else if (b.workload > a.workload) {
    parts.push(`**${b.code}** requires more weekly hours (${b.avg_weekly_hours}h vs ${a.avg_weekly_hours}h).`);
  }

  if (a.historical_a_rate > b.historical_a_rate) {
    parts.push(`**${a.code}** has a higher A-rate (${a.historical_a_rate}% vs ${b.historical_a_rate}%).`);
  } else {
    parts.push(`**${b.code}** has a higher A-rate (${b.historical_a_rate}% vs ${a.historical_a_rate}%).`);
  }

  // Theory vs project balance
  if (a.theory > 60) parts.push(`${a.code} is theory-heavy (${a.theory}% theory).`);
  if (b.project > 60) parts.push(`${b.code} is project-heavy (${b.project}% project).`);

  parts.push(`\n**Recommendation:** Take ${a.historical_a_rate >= b.historical_a_rate ? a.code : b.code} if you prefer better grade outcomes, or ${a.project > b.project ? a.code : b.code} for more hands-on experience.`);

  return parts.join('\n');
}

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
