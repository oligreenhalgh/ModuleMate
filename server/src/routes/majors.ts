import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

router.get('/', (_req, res) => {
  const db = getDb();
  const majors = db.prepare('SELECT * FROM majors').all().map((m: any) => {
    const { ai_match, career_outcomes, foundational_modules, ...rest } = m;
    return {
      ...rest,
      aiMatch: ai_match,
      careerOutcomes: JSON.parse(career_outcomes),
      foundationalModules: JSON.parse(foundational_modules),
    };
  });
  res.json(majors);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const major = db.prepare('SELECT * FROM majors WHERE id = ?').get(req.params.id) as any;
  if (!major) return res.status(404).json({ error: 'Major not found' });
  const { ai_match, career_outcomes, foundational_modules, ...rest } = major;
  res.json({
    ...rest,
    aiMatch: ai_match,
    careerOutcomes: JSON.parse(career_outcomes),
    foundationalModules: JSON.parse(foundational_modules),
  });
});

export default router;
