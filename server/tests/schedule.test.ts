import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { getDb, closeDb } from '../src/db.js';

// Use in-memory DB for tests — must be set before any import that calls getDb
process.env.DATABASE_PATH = ':memory:';

import { app } from '../src/index.js';

describe('Schedule API', () => {
  beforeAll(() => {
    const db = getDb();
    db.exec('DELETE FROM schedule_entries');
  });

  afterAll(() => closeDb());

  describe('POST /api/schedule', () => {
    it('creates a schedule entry and returns id', async () => {
      const res = await request(app)
        .post('/api/schedule')
        .send({
          module_code: 'CS1010',
          course_name: 'Programming Methodology',
          schedule: 'Mon/Wed 14:00',
          professor: 'Dr. Smith',
          credits: 4,
          semester: 'Fall 2026',
        });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
    });
  });

  describe('GET /api/schedule', () => {
    it('returns entries and conflicts', async () => {
      const res = await request(app).get('/api/schedule');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('entries');
      expect(res.body).toHaveProperty('conflicts');
      expect(Array.isArray(res.body.entries)).toBe(true);
      expect(res.body.entries.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/schedule/conflicts', () => {
    it('returns conflicts array (empty when no overlaps)', async () => {
      const res = await request(app).get('/api/schedule/conflicts');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('returns conflicts when overlapping entries exist', async () => {
      // Create both entries within this test to be self-contained
      await request(app).post('/api/schedule').send({
        module_code: 'CONFLICT_A',
        course_name: 'Conflict Test A',
        schedule: 'Tue 14:00',
        professor: 'Dr. A',
        credits: 4,
        semester: 'Conflict Test',
      });
      await request(app).post('/api/schedule').send({
        module_code: 'CONFLICT_B',
        course_name: 'Conflict Test B',
        schedule: 'Tue 14:30',
        professor: 'Dr. B',
        credits: 4,
        semester: 'Conflict Test',
      });

      const res = await request(app).get('/api/schedule/conflicts');
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      const conflictModules = res.body.flatMap((c: any) => c.modules);
      expect(conflictModules).toContain('CONFLICT_A');
      expect(conflictModules).toContain('CONFLICT_B');
    });
  });

  describe('DELETE /api/schedule/:id', () => {
    it('deletes a schedule entry', async () => {
      // Create one to delete
      const createRes = await request(app)
        .post('/api/schedule')
        .send({
          module_code: 'CS3230',
          course_name: 'Algorithms',
          schedule: 'Tue/Thu 10:00',
          professor: 'Dr. Tan',
          credits: 4,
          semester: 'Fall 2026',
        });

      const id = createRes.body.id;
      const delRes = await request(app).delete(`/api/schedule/${id}`);
      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);
    });

    it('returns 404 for non-existent entry', async () => {
      const res = await request(app).delete('/api/schedule/nonexistent-id');
      expect(res.status).toBe(404);
    });
  });
});
