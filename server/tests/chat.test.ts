import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { getDb, closeDb } from '../src/db.js';

// Use in-memory DB for tests — must be set before any import that calls getDb
process.env.DATABASE_PATH = ':memory:';

import { app } from '../src/index.js';

describe('Chat API', () => {
  afterAll(() => closeDb());

  let threadId: string;

  describe('POST /api/chat/threads', () => {
    it('creates a thread and returns 201', async () => {
      const res = await request(app)
        .post('/api/chat/threads')
        .send({ title: 'Test Thread' });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('Test Thread');
      threadId = res.body.id;
    });

    it('returns 400 when title is missing', async () => {
      const res = await request(app)
        .post('/api/chat/threads')
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/chat/threads', () => {
    it('returns a list of threads', async () => {
      const res = await request(app).get('/api/chat/threads');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].title).toBe('Test Thread');
    });
  });

  describe('GET /api/chat/threads/:id/messages', () => {
    it('returns empty messages for a new thread', async () => {
      // Create a fresh thread to avoid interference from parallel tests
      const createRes = await request(app).post('/api/chat/threads').send({ title: 'Messages Test' });
      const freshThreadId = createRes.body.id;
      const res = await request(app).get(`/api/chat/threads/${freshThreadId}/messages`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });

    it('returns messages after inserting directly', async () => {
      // Create a fresh thread to avoid interference from parallel tests
      const createRes = await request(app).post('/api/chat/threads').send({ title: 'Direct Insert Test' });
      const freshThreadId = createRes.body.id;
      const db = getDb();
      const { v4: uuidv4 } = await import('uuid');
      const msgId = uuidv4();
      const now = new Date().toISOString();
      db.prepare('INSERT INTO chat_messages (id, thread_id, role, content, modules, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(msgId, freshThreadId, 'user', 'Hello', '["CS1010"]', now);

      const res = await request(app).get(`/api/chat/threads/${freshThreadId}/messages`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].content).toBe('Hello');
      expect(res.body[0].role).toBe('user');
      expect(res.body[0].modules).toEqual(['CS1010']);
      expect(res.body[0]).toHaveProperty('timestamp');
    });

    it('returns 404 for non-existent thread', async () => {
      const res = await request(app).get('/api/chat/threads/nonexistent/messages');
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/chat/threads/:id', () => {
    it('deletes a thread', async () => {
      // Create a thread to delete
      const createRes = await request(app)
        .post('/api/chat/threads')
        .send({ title: 'To Delete' });
      const deleteId = createRes.body.id;

      const res = await request(app).delete(`/api/chat/threads/${deleteId}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify it's gone
      const getRes = await request(app).get('/api/chat/threads');
      const ids = getRes.body.map((t: any) => t.id);
      expect(ids).not.toContain(deleteId);
    });

    it('returns 404 for non-existent thread', async () => {
      const res = await request(app).delete('/api/chat/threads/nonexistent');
      expect(res.status).toBe(404);
    });
  });
});
