import { Router } from 'express';
import { getDb } from '../db.js';
import { generateMajorPath, searchMajors } from '../services/gemini.js';

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

// Generate a recommended module path for a major
router.get('/:id/path', async (req, res) => {
  const db = getDb();
  const major = db.prepare('SELECT * FROM majors WHERE id = ?').get(req.params.id) as any;
  if (!major) return res.status(404).json({ error: 'Major not found' });

  const apiKeySetting = db.prepare("SELECT value FROM settings WHERE key = 'gemini_api_key'").get() as any;
  const apiKey = apiKeySetting?.value || process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(400).json({ error: 'Gemini API key not configured' });

  try {
    const path = await generateMajorPath(
      major.name,
      JSON.parse(major.foundational_modules),
      apiKey
    );
    res.json(path);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate path', details: err.message });
  }
});

// AI-powered search for majors/specializations
router.post('/search', async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });

  const db = getDb();
  const apiKeySetting = db.prepare("SELECT value FROM settings WHERE key = 'gemini_api_key'").get() as any;
  const apiKey = apiKeySetting?.value || process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(400).json({ error: 'Gemini API key not configured' });

  try {
    const results = await searchMajors(query, apiKey);
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: 'Search failed', details: err.message });
  }
});

export default router;
