import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { getDb, closeDb } from '../src/db.js';

// Use in-memory DB for tests — must be set before any import that calls getDb
process.env.DATABASE_PATH = ':memory:';

import { app } from '../src/index.js';

function seedTestData() {
  const db = getDb();

  db.exec('DELETE FROM module_prerequisites');
  db.exec('DELETE FROM modules');

  const insertModule = db.prepare(`
    INSERT INTO modules (code, name, description, credits, historical_a_rate, avg_weekly_hours, status, type, workload, difficulty, theory, project, exam)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPrereq = db.prepare(`
    INSERT INTO module_prerequisites (module_code, prerequisite_code) VALUES (?, ?)
  `);

  insertModule.run('CS1010', 'Programming Methodology', 'Intro to programming.', 4, 35.2, 10.5, 'completed', 'Core', 40, 30, 20, 50, 60);
  insertModule.run('CS2030', 'Programming Methodology II', 'Advanced programming.', 4, 28.5, 12.0, 'completed', 'Core', 60, 50, 40, 70, 50);
  insertModule.run('CS2040', 'Data Structures & Algos', 'DSA fundamentals.', 4, 22.1, 14.5, 'available', 'Core', 70, 75, 60, 40, 80);
  insertModule.run('CS3230', 'Design and Analysis of Algorithms', 'Advanced algorithms.', 4, 18.2, 16.8, 'locked', 'Core', 85, 90, 95, 30, 90);

  insertPrereq.run('CS2030', 'CS1010');
  insertPrereq.run('CS2040', 'CS1010');
  insertPrereq.run('CS3230', 'CS2030');
  insertPrereq.run('CS3230', 'CS2040');
}

describe('Modules API', () => {
  beforeAll(() => {
    seedTestData();
  });

  afterAll(() => closeDb());

  describe('GET /api/modules', () => {
    it('returns an array of modules', async () => {
      const res = await request(app).get('/api/modules');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(4);
    });

    it('returns camelCase fields and excludes snake_case', async () => {
      const res = await request(app).get('/api/modules');
      const mod = res.body[0];
      expect(mod).toHaveProperty('historicalARate');
      expect(mod).toHaveProperty('avgWeeklyHours');
      expect(mod).not.toHaveProperty('historical_a_rate');
      expect(mod).not.toHaveProperty('avg_weekly_hours');
    });

    it('includes prerequisites and unlocks arrays', async () => {
      const res = await request(app).get('/api/modules');
      const cs1010 = res.body.find((m: any) => m.code === 'CS1010');
      expect(cs1010.prerequisites).toEqual([]);
      expect(cs1010.unlocks).toContain('CS2030');
      expect(cs1010.unlocks).toContain('CS2040');

      const cs3230 = res.body.find((m: any) => m.code === 'CS3230');
      expect(cs3230.prerequisites).toContain('CS2030');
      expect(cs3230.prerequisites).toContain('CS2040');
    });
  });

  describe('GET /api/modules/:code', () => {
    it('returns a single module', async () => {
      const res = await request(app).get('/api/modules/CS2030');
      expect(res.status).toBe(200);
      expect(res.body.code).toBe('CS2030');
      expect(res.body.historicalARate).toBe(28.5);
      expect(res.body.prerequisites).toEqual(['CS1010']);
    });

    it('returns 404 for unknown module', async () => {
      const res = await request(app).get('/api/modules/UNKNOWN');
      expect(res.status).toBe(404);
      expect(res.body.error).toBeTruthy();
    });
  });

  describe('PATCH /api/modules/:code', () => {
    it('updates module status', async () => {
      const res = await request(app)
        .patch('/api/modules/CS2040')
        .send({ status: 'completed' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('completed');
    });

    it('rejects invalid status', async () => {
      const res = await request(app)
        .patch('/api/modules/CS2040')
        .send({ status: 'invalid' });
      expect(res.status).toBe(400);
    });

    it('returns 404 for unknown module', async () => {
      const res = await request(app)
        .patch('/api/modules/UNKNOWN')
        .send({ status: 'completed' });
      expect(res.status).toBe(404);
    });
  });
});
