import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { getDb, closeDb } from '../src/db.js';

// Use in-memory DB for tests — must be set before any import that calls getDb
process.env.DATABASE_PATH = ':memory:';

import { app } from '../src/index.js';

function seedTestData() {
  const db = getDb();
  db.exec('DELETE FROM transcripts');

  const insert = db.prepare(
    'INSERT INTO transcripts (id, filename, type, file_path) VALUES (?, ?, ?, ?)'
  );
  insert.run('t1', 'semester1.pdf', 'Official', '/fake/path/semester1.pdf');
  insert.run('t2', 'semester2.pdf', 'Unofficial', '/fake/path/semester2.pdf');
}

describe('Transcripts API', () => {
  beforeAll(() => {
    seedTestData();
  });

  afterAll(() => closeDb());

  describe('GET /api/transcripts', () => {
    it('returns an array of transcripts', async () => {
      const res = await request(app).get('/api/transcripts');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
    });

    it('returns expected fields', async () => {
      const res = await request(app).get('/api/transcripts');
      const t = res.body[0];
      expect(t).toHaveProperty('id');
      expect(t).toHaveProperty('filename');
      expect(t).toHaveProperty('type');
      expect(t).toHaveProperty('processed_date');
    });
  });

  describe('DELETE /api/transcripts/:id', () => {
    it('deletes an existing transcript and returns success', async () => {
      const res = await request(app).delete('/api/transcripts/t1');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify it's gone
      const listRes = await request(app).get('/api/transcripts');
      const ids = listRes.body.map((t: any) => t.id);
      expect(ids).not.toContain('t1');
    });

    it('returns 404 for non-existent transcript', async () => {
      const res = await request(app).delete('/api/transcripts/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.error).toBeTruthy();
    });
  });
});
