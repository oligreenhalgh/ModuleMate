import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db.js';
import { detectConflicts, ScheduleEntry } from '../services/conflicts.js';

const router = Router();

function getAllEntries(): ScheduleEntry[] {
  const db = getDb();
  return db.prepare('SELECT id, module_code, course_name, schedule, professor, credits, semester FROM schedule_entries').all() as ScheduleEntry[];
}

/** GET / — all entries with computed conflicts */
router.get('/', (_req, res) => {
  const entries = getAllEntries();
  const conflicts = detectConflicts(entries);
  res.json({ entries, conflicts });
});

/** GET /conflicts — just the conflicts */
router.get('/conflicts', (_req, res) => {
  const entries = getAllEntries();
  const conflicts = detectConflicts(entries);
  res.json(conflicts);
});

/** POST / — add a schedule entry (rejects duplicates) */
router.post('/', (req, res) => {
  const db = getDb();
  const { module_code, course_name, schedule, professor, credits, semester } = req.body;

  // Prevent duplicate module codes
  const existing = db.prepare('SELECT id FROM schedule_entries WHERE module_code = ?').get(module_code);
  if (existing) {
    res.status(409).json({ error: `${module_code} is already in your schedule` });
    return;
  }

  const id = uuidv4();
  db.prepare(
    'INSERT INTO schedule_entries (id, module_code, course_name, schedule, professor, credits, semester) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, module_code, course_name, schedule, professor, credits, semester);

  res.status(201).json({ id });
});

/** POST /bulk — replace entire schedule with roadmap modules */
router.post('/bulk', (req, res) => {
  const db = getDb();
  const { entries } = req.body as { entries: { module_code: string; course_name: string; schedule: string; professor: string; credits: number; semester: string }[] };

  if (!entries || !Array.isArray(entries)) {
    res.status(400).json({ error: 'entries array is required' });
    return;
  }

  // Clear current schedule
  db.prepare('DELETE FROM schedule_entries').run();

  // Insert all new entries
  const insert = db.prepare(
    'INSERT INTO schedule_entries (id, module_code, course_name, schedule, professor, credits, semester) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const added: string[] = [];
  for (const e of entries) {
    const id = uuidv4();
    insert.run(id, e.module_code, e.course_name, e.schedule, e.professor, e.credits, e.semester);
    added.push(e.module_code);
  }

  res.status(201).json({ added, count: added.length });
});

/** DELETE /:id — remove a schedule entry */
router.delete('/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const result = db.prepare('DELETE FROM schedule_entries WHERE id = ?').run(id);

  if (result.changes === 0) {
    res.status(404).json({ error: 'Entry not found' });
    return;
  }

  res.json({ success: true });
});

export default router;
