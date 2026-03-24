import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

router.get('/', (_req, res) => {
  const db = getDb();
  const settings = db.prepare('SELECT * FROM settings').all() as { key: string; value: string }[];
  const obj: Record<string, string> = {};
  for (const s of settings) {
    if (s.key === 'gemini_api_key') {
      obj[s.key] = s.value ? '••••••••' + s.value.slice(-4) : '';
    } else {
      obj[s.key] = s.value;
    }
  }
  res.json(obj);
});

router.patch('/', (req, res) => {
  const db = getDb();
  const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  const tx = db.transaction(() => {
    for (const [key, value] of Object.entries(req.body)) {
      upsert.run(key, String(value));
    }
  });
  tx();
  res.json({ success: true });
});

export default router;
