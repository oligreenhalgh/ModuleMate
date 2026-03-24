import { describe, it, expect, afterAll } from 'vitest';
import { getDb, closeDb } from '../src/db.js';

// Use in-memory DB for tests
process.env.DATABASE_PATH = ':memory:';

describe('Database Schema', () => {
  afterAll(() => closeDb());

  it('creates all required tables', () => {
    const db = getDb();
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all() as { name: string }[];
    const names = tables.map(t => t.name);
    expect(names).toContain('modules');
    expect(names).toContain('module_prerequisites');
    expect(names).toContain('majors');
    expect(names).toContain('schedule_entries');
    expect(names).toContain('chat_threads');
    expect(names).toContain('chat_messages');
    expect(names).toContain('user_profile');
    expect(names).toContain('transcripts');
    expect(names).toContain('settings');
  });

  it('creates default user profile row', () => {
    const db = getDb();
    const profile = db.prepare('SELECT * FROM user_profile WHERE id = 1').get();
    expect(profile).toBeTruthy();
  });
});
