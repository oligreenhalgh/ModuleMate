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

// AI-powered search for majors/specializations (must be before /:id)
router.post('/search', async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Query required' });

  const db = getDb();
  const allMajors = db.prepare('SELECT * FROM majors').all() as any[];

  // Try AI search
  const apiKeySetting = db.prepare("SELECT value FROM settings WHERE key = 'gemini_api_key'").get() as any;
  const apiKey = apiKeySetting?.value || process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    try {
      const { searchMajors } = await import('../services/gemini.js');
      const results = await searchMajors(query, apiKey);
      return res.json(results);
    } catch (e) {
      // Fall through to static
    }
  }

  // Static fallback: fuzzy match on name/description
  const q = query.toLowerCase();
  const results = allMajors
    .filter((m: any) => m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q))
    .map((m: any) => ({
      name: m.name,
      description: m.description,
      relevance: m.name.toLowerCase().includes(q) ? 'High' : 'Medium'
    }));

  // If no matches, return all with relevance hints
  if (results.length === 0) {
    res.json({ results: allMajors.map((m: any) => ({ name: m.name, description: m.description, relevance: 'Consider' })) });
  } else {
    res.json({ results });
  }
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

// Generate a recommended module path for a major (after /:id but uses /:id/path pattern)
router.get('/:id/path', async (req, res) => {
  const db = getDb();
  const major = db.prepare('SELECT * FROM majors WHERE id = ?').get(req.params.id) as any;
  if (!major) return res.status(404).json({ error: 'Major not found' });

  const foundational = JSON.parse(major.foundational_modules || '[]');
  const allModules = db.prepare('SELECT * FROM modules ORDER BY code').all() as any[];

  // Try AI if available
  const apiKeySetting = db.prepare("SELECT value FROM settings WHERE key = 'gemini_api_key'").get() as any;
  const apiKey = apiKeySetting?.value || process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    try {
      const { generateMajorPath } = await import('../services/gemini.js');
      const path = await generateMajorPath(major.name, foundational, apiKey);
      return res.json(path);
    } catch (e) {
      // Fall through to static
    }
  }

  // Static pathway generation based on module codes (year prefix)
  const byYear: Record<string, any[]> = { '1': [], '2': [], '3': [], '4': [] };
  for (const mod of allModules) {
    const year = mod.code.charAt(2);
    if (byYear[year]) byYear[year].push(mod);
  }

  const semesters = [
    { name: 'Year 1 Sem 1', modules: byYear['1'].slice(0, 3).map((m: any) => ({ code: m.code, name: m.name, credits: m.credits })) },
    { name: 'Year 1 Sem 2', modules: byYear['1'].slice(3).map((m: any) => ({ code: m.code, name: m.name, credits: m.credits })) },
    { name: 'Year 2 Sem 1', modules: byYear['2'].slice(0, 4).map((m: any) => ({ code: m.code, name: m.name, credits: m.credits })) },
    { name: 'Year 2 Sem 2', modules: byYear['2'].slice(4).map((m: any) => ({ code: m.code, name: m.name, credits: m.credits })) },
    { name: 'Year 3 Sem 1', modules: byYear['3'].filter((m: any) => foundational.includes(m.code) || m.type === 'Core').slice(0, 4).map((m: any) => ({ code: m.code, name: m.name, credits: m.credits })) },
    { name: 'Year 3 Sem 2', modules: byYear['3'].filter((m: any) => !foundational.includes(m.code)).slice(0, 4).map((m: any) => ({ code: m.code, name: m.name, credits: m.credits })) },
    { name: 'Year 4 Sem 1', modules: byYear['4'].slice(0, 3).map((m: any) => ({ code: m.code, name: m.name, credits: m.credits })) },
    { name: 'Year 4 Sem 2', modules: byYear['4'].slice(3).map((m: any) => ({ code: m.code, name: m.name, credits: m.credits })) },
  ];

  res.json({
    semesters: semesters.filter(s => s.modules.length > 0),
    summary: `Recommended ${major.name} pathway across ${semesters.filter(s => s.modules.length > 0).length} semesters, prioritizing foundational modules: ${foundational.join(', ')}.`
  });
});

export default router;
