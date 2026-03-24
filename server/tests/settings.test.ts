import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { getDb, closeDb } from '../src/db.js';

// Use in-memory DB for tests — must be set before any import that calls getDb
process.env.DATABASE_PATH = ':memory:';

import { app } from '../src/index.js';

describe('Settings API', () => {
  beforeAll(() => {
    const db = getDb();
    db.exec('DELETE FROM settings');
  });

  afterAll(() => {
    closeDb();
  });

  it('GET /api/settings returns empty object initially', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({});
  });

  it('PATCH /api/settings upserts a setting, GET returns it', async () => {
    const patchRes = await request(app)
      .patch('/api/settings')
      .send({ theme: 'dark' });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body).toEqual({ success: true });

    const getRes = await request(app).get('/api/settings');
    expect(getRes.status).toBe(200);
    expect(getRes.body.theme).toBe('dark');
  });

  it('PATCH gemini_api_key, GET returns masked version', async () => {
    const patchRes = await request(app)
      .patch('/api/settings')
      .send({ gemini_api_key: 'sk-abc123xyz9999' });
    expect(patchRes.status).toBe(200);

    const getRes = await request(app).get('/api/settings');
    expect(getRes.status).toBe(200);
    expect(getRes.body.gemini_api_key).toBe('••••••••9999');
  });
});
