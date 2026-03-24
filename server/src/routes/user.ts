import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

const ALLOWED_FIELDS: Record<string, true> = {
  name: true, program: true, gpa: true, gpa_max: true, gpa_trend: true,
  total_credits: true, required_credits: true, major_credits: true,
  major_required: true, ue_credits: true, ue_required: true, ai_credits_used: true
};

/** GET /profile — returns user profile row (id=1) */
router.get('/profile', (_req, res) => {
  const db = getDb();
  const profile = db.prepare('SELECT * FROM user_profile WHERE id = 1').get();
  res.json(profile);
});

/** PATCH /profile — updates allowed fields only */
router.patch('/profile', (req, res) => {
  const db = getDb();
  const updates: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(req.body)) {
    if (ALLOWED_FIELDS[key]) {
      updates.push(`"${key}" = ?`);
      values.push(value);
    }
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No valid fields provided' });
    return;
  }

  db.prepare(`UPDATE user_profile SET ${updates.join(', ')} WHERE id = 1`).run(...values);
  const profile = db.prepare('SELECT * FROM user_profile WHERE id = 1').get();
  res.json(profile);
});

/** GET /stats — returns profile + computed prerequisite alerts */
router.get('/stats', (_req, res) => {
  const db = getDb();
  const profile = db.prepare('SELECT * FROM user_profile WHERE id = 1').get();

  // Find all locked modules
  const lockedModules = db.prepare("SELECT code FROM modules WHERE status = 'locked'").all() as any[];

  const alerts: { module: string; unmetPrereqs: string[] }[] = [];

  for (const mod of lockedModules) {
    // Find prerequisites that are not completed
    const unmetPrereqs = db.prepare(`
      SELECT mp.prerequisite_code FROM module_prerequisites mp
      JOIN modules m ON m.code = mp.prerequisite_code
      WHERE mp.module_code = ? AND m.status != 'completed'
    `).all(mod.code) as any[];

    if (unmetPrereqs.length > 0) {
      alerts.push({
        module: mod.code,
        unmetPrereqs: unmetPrereqs.map((r: any) => r.prerequisite_code),
      });
    }
  }

  res.json({ ...profile, alerts });
});

/** POST /reset — resets academic profile */
router.post('/reset', (_req, res) => {
  const db = getDb();

  db.prepare("UPDATE modules SET status = 'locked'").run();
  db.prepare('DELETE FROM schedule_entries').run();
  db.prepare('DELETE FROM chat_messages').run();
  db.prepare('DELETE FROM chat_threads').run();
  db.prepare(`
    UPDATE user_profile SET
      gpa = 0, gpa_max = 0, gpa_trend = 0,
      total_credits = 0, required_credits = 0,
      major_credits = 0, major_required = 0,
      ue_credits = 0, ue_required = 0,
      ai_credits_used = 0, ai_credits_max = 0
    WHERE id = 1
  `).run();

  res.json({ success: true });
});

export default router;
