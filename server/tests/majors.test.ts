import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { getDb, closeDb } from '../src/db.js';

// Use in-memory DB for tests — must be set before any import that calls getDb
process.env.DATABASE_PATH = ':memory:';

import { app } from '../src/index.js';

function seedMajors() {
  const db = getDb();

  db.exec('DELETE FROM majors');

  const insert = db.prepare(`
    INSERT INTO majors (id, name, description, ai_match, career_outcomes, foundational_modules)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insert.run(
    'cs',
    'Computer Science',
    'Study of computation and information.',
    92.5,
    JSON.stringify(['Software Engineer', 'Data Scientist']),
    JSON.stringify(['CS1010', 'CS2030']),
  );
  insert.run(
    'is',
    'Information Systems',
    'Technology meets business.',
    78.0,
    JSON.stringify(['Business Analyst', 'IT Consultant']),
    JSON.stringify(['IS1108', 'IS2102']),
  );
}

describe('Majors API', () => {
  beforeAll(() => {
    seedMajors();
  });

  afterAll(() => closeDb());

  describe('GET /api/majors', () => {
    it('returns an array of majors', async () => {
      const res = await request(app).get('/api/majors');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
    });

    it('returns camelCase fields with parsed JSON arrays', async () => {
      const res = await request(app).get('/api/majors');
      const cs = res.body.find((m: any) => m.id === 'cs');
      expect(cs).toBeDefined();
      expect(cs.name).toBe('Computer Science');
      expect(cs.aiMatch).toBe(92.5);
      expect(Array.isArray(cs.careerOutcomes)).toBe(true);
      expect(cs.careerOutcomes).toEqual(['Software Engineer', 'Data Scientist']);
      expect(Array.isArray(cs.foundationalModules)).toBe(true);
      expect(cs.foundationalModules).toEqual(['CS1010', 'CS2030']);
      // snake_case fields should not be present
      expect(cs).not.toHaveProperty('ai_match');
      expect(cs).not.toHaveProperty('career_outcomes');
      expect(cs).not.toHaveProperty('foundational_modules');
    });
  });

  describe('GET /api/majors/:id', () => {
    it('returns a single major', async () => {
      const res = await request(app).get('/api/majors/is');
      expect(res.status).toBe(200);
      expect(res.body.id).toBe('is');
      expect(res.body.name).toBe('Information Systems');
      expect(res.body.aiMatch).toBe(78.0);
      expect(res.body.careerOutcomes).toEqual(['Business Analyst', 'IT Consultant']);
      expect(res.body.foundationalModules).toEqual(['IS1108', 'IS2102']);
    });

    it('returns 404 for unknown major', async () => {
      const res = await request(app).get('/api/majors/unknown');
      expect(res.status).toBe(404);
      expect(res.body.error).toBeTruthy();
    });
  });
});
