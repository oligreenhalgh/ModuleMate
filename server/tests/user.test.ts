import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { getDb, closeDb } from '../src/db.js';

// Use in-memory DB for tests — must be set before any import that calls getDb
process.env.DATABASE_PATH = ':memory:';

import { app } from '../src/index.js';

describe('User API', () => {
  beforeAll(() => {
    // Ensure DB is initialized with default profile
    getDb();
  });

  afterAll(() => closeDb());

  describe('GET /api/user/profile', () => {
    it('returns profile with name, gpa, total_credits', async () => {
      const res = await request(app).get('/api/user/profile');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('name');
      expect(res.body).toHaveProperty('gpa');
      expect(res.body).toHaveProperty('total_credits');
      expect(res.body.id).toBe(1);
    });
  });

  describe('PATCH /api/user/profile', () => {
    it('updates a field', async () => {
      const res = await request(app)
        .patch('/api/user/profile')
        .send({ name: 'Test User' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Test User');
    });

    it('returns 400 if no valid fields', async () => {
      const res = await request(app)
        .patch('/api/user/profile')
        .send({ invalid_field: 'nope' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/user/reset', () => {
    it('returns success', async () => {
      const res = await request(app).post('/api/user/reset');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
