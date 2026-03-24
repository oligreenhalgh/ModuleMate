import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db.js';
import { chatWithGemini } from '../services/gemini.js';

const router = Router();

/** GET /threads — list all threads ordered by most recently updated */
router.get('/threads', (_req, res) => {
  const db = getDb();
  const threads = db.prepare('SELECT * FROM chat_threads ORDER BY updated_at DESC').all();
  res.json(threads);
});

/** POST /threads — create a new thread */
router.post('/threads', (req, res) => {
  const db = getDb();
  const { title } = req.body;
  if (!title) {
    res.status(400).json({ error: 'title is required' });
    return;
  }
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO chat_threads (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)').run(id, title, now, now);
  const thread = db.prepare('SELECT * FROM chat_threads WHERE id = ?').get(id);
  res.status(201).json(thread);
});

/** DELETE /threads/:id — delete a thread and its messages (cascade) */
router.delete('/threads/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const existing = db.prepare('SELECT id FROM chat_threads WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: 'Thread not found' });
    return;
  }
  db.prepare('DELETE FROM chat_threads WHERE id = ?').run(id);
  res.json({ success: true });
});

/** GET /threads/:id/messages — get all messages for a thread */
router.get('/threads/:id/messages', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const thread = db.prepare('SELECT id FROM chat_threads WHERE id = ?').get(id);
  if (!thread) {
    res.status(404).json({ error: 'Thread not found' });
    return;
  }
  const messages = db.prepare('SELECT * FROM chat_messages WHERE thread_id = ? ORDER BY created_at ASC').all(id) as any[];
  res.json(messages.map(m => ({
    id: m.id,
    thread_id: m.thread_id,
    role: m.role,
    content: m.content,
    modules: JSON.parse(m.modules || '[]'),
    timestamp: m.created_at,
  })));
});

/** POST /threads/:id/messages — send a user message, get AI response */
router.post('/threads/:id/messages', async (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { content } = req.body;

  if (!content) {
    res.status(400).json({ error: 'content is required' });
    return;
  }

  const thread = db.prepare('SELECT id FROM chat_threads WHERE id = ?').get(id);
  if (!thread) {
    res.status(404).json({ error: 'Thread not found' });
    return;
  }

  // Resolve API key from settings table or environment
  const settingsRow = db.prepare("SELECT value FROM settings WHERE key = 'gemini_api_key'").get() as any;
  const apiKey = settingsRow?.value || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Gemini API key not configured' });
    return;
  }

  // Save user message
  const userMsgId = uuidv4();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO chat_messages (id, thread_id, role, content, modules, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(userMsgId, id, 'user', content, '[]', now);

  // Build history for Gemini
  const history = db.prepare('SELECT role, content FROM chat_messages WHERE thread_id = ? ORDER BY created_at ASC').all(id) as { role: string; content: string }[];

  try {
    const aiResponse = await chatWithGemini(history, apiKey);

    // Save AI message
    const aiMsgId = uuidv4();
    const aiNow = new Date().toISOString();
    db.prepare('INSERT INTO chat_messages (id, thread_id, role, content, modules, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(aiMsgId, id, 'model', aiResponse.content, JSON.stringify(aiResponse.modules), aiNow);

    // Update thread timestamp
    db.prepare('UPDATE chat_threads SET updated_at = ? WHERE id = ?').run(aiNow, id);

    res.json({
      id: aiMsgId,
      thread_id: id,
      role: 'model',
      content: aiResponse.content,
      modules: aiResponse.modules,
      timestamp: aiNow,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Gemini API error', details: err.message });
  }
});

export default router;
