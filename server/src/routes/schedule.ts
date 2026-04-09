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

/** POST / — add a schedule entry */
router.post('/', (req, res) => {
  const db = getDb();
  const { module_code, course_name, schedule, professor, credits, semester } = req.body;
  const id = uuidv4();

  db.prepare(
    'INSERT INTO schedule_entries (id, module_code, course_name, schedule, professor, credits, semester) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, module_code, course_name, schedule, professor, credits, semester);

  res.status(201).json({ id });
});

/** DELETE / — clear all schedule entries */
router.delete('/', (_req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM schedule_entries').run();
  res.json({ success: true });
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
