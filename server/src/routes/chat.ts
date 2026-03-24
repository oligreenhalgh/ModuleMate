import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db.js';
import { chatWithGemini, isRoadmapRequest, generateRoadmap } from '../services/gemini.js';

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

/** DELETE /threads/:id — delete a thread, its messages, and any roadmap modules */
router.delete('/threads/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const existing = db.prepare('SELECT id FROM chat_threads WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: 'Thread not found' });
    return;
  }

  // Collect all roadmap module codes from this thread's messages
  const messages = db.prepare("SELECT roadmap_modules FROM chat_messages WHERE thread_id = ? AND roadmap_modules != '[]'").all(id) as { roadmap_modules: string }[];
  const codesToDelete: string[] = [];
  for (const msg of messages) {
    try {
      const codes = JSON.parse(msg.roadmap_modules) as string[];
      codesToDelete.push(...codes);
    } catch {}
  }

  // Delete thread (cascade deletes messages)
  db.prepare('DELETE FROM chat_threads WHERE id = ?').run(id);

  // Remove roadmap modules that aren't referenced by other threads
  if (codesToDelete.length > 0) {
    const remainingMessages = db.prepare("SELECT roadmap_modules FROM chat_messages WHERE roadmap_modules != '[]'").all() as { roadmap_modules: string }[];
    const stillReferenced = new Set<string>();
    for (const msg of remainingMessages) {
      try {
        const codes = JSON.parse(msg.roadmap_modules) as string[];
        codes.forEach(c => stillReferenced.add(c));
      } catch {}
    }

    const deleteMod = db.prepare('DELETE FROM modules WHERE code = ?');
    for (const code of new Set(codesToDelete)) {
      if (!stillReferenced.has(code)) {
        deleteMod.run(code);
      }
    }
  }

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
    roadmap: m.roadmap_data ? JSON.parse(m.roadmap_data) : undefined,
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

  // Auto-title the thread from the first user message
  const currentThread = db.prepare('SELECT title FROM chat_threads WHERE id = ?').get(id) as any;
  if (currentThread?.title === 'New Chat') {
    const title = content.length > 40 ? content.slice(0, 40).trimEnd() + '...' : content;
    db.prepare('UPDATE chat_threads SET title = ? WHERE id = ?').run(title, id);
  }

  // Build history for Gemini
  const history = db.prepare('SELECT role, content FROM chat_messages WHERE thread_id = ? ORDER BY created_at ASC').all(id) as { role: string; content: string }[];

  try {
    const aiResponse = await chatWithGemini(history, apiKey);

    // Check if this is a roadmap request and generate structured roadmap data
    let roadmap = null;
    if (isRoadmapRequest(content)) {
      const profile = db.prepare('SELECT * FROM user_profile WHERE id = 1').get() as any;
      const completedRows = db.prepare("SELECT code FROM modules WHERE status = 'completed'").all() as { code: string }[];
      const completedModules = completedRows.map(r => r.code);

      try {
        roadmap = await generateRoadmap(history, {
          program: profile?.program || 'Unknown',
          gpa: profile?.gpa || 0,
          total_credits: profile?.total_credits || 0,
          required_credits: profile?.required_credits || 0,
          completed_modules: completedModules,
        }, apiKey);

        // Sync roadmap modules into the database so they appear in Explorer
        if (roadmap && roadmap.semesters) {
          const insertMod = db.prepare(
            `INSERT OR IGNORE INTO modules (code, name, description, credits, status, type)
             VALUES (?, ?, ?, ?, ?, 'Core')`
          );
          for (const sem of roadmap.semesters) {
            for (const mod of sem.modules) {
              const isCompleted = completedModules.includes(mod.code);
              insertMod.run(
                mod.code,
                mod.name,
                `Recommended in ${sem.name} of your AI-generated roadmap.`,
                mod.credits,
                isCompleted ? 'completed' : 'available'
              );
            }
          }
        }
      } catch (e) {
        // Roadmap generation failed, continue without it
        console.error('Roadmap generation failed:', e);
      }
    }

    // Collect roadmap module codes for cleanup on thread delete
    const roadmapModuleCodes: string[] = [];
    if (roadmap && roadmap.semesters) {
      for (const sem of roadmap.semesters) {
        for (const mod of sem.modules) {
          roadmapModuleCodes.push(mod.code);
        }
      }
    }

    // Save AI message
    const aiMsgId = uuidv4();
    const aiNow = new Date().toISOString();
    db.prepare('INSERT INTO chat_messages (id, thread_id, role, content, modules, roadmap_modules, roadmap_data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(aiMsgId, id, 'model', aiResponse.content, JSON.stringify(aiResponse.modules), JSON.stringify(roadmapModuleCodes), roadmap ? JSON.stringify(roadmap) : null, aiNow);

    // Update thread timestamp
    db.prepare('UPDATE chat_threads SET updated_at = ? WHERE id = ?').run(aiNow, id);

    // Decrement available AI credits by 10
    db.prepare('UPDATE user_profile SET ai_credits_used = MIN(ai_credits_used + 10, ai_credits_max) WHERE id = 1').run();

    res.json({
      id: aiMsgId,
      thread_id: id,
      role: 'model',
      content: aiResponse.content,
      modules: aiResponse.modules,
      timestamp: aiNow,
      roadmap,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Gemini API error', details: err.message });
  }
});

export default router;
