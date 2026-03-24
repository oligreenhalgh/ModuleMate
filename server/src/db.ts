import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'modulemate.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS modules (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      credits REAL NOT NULL,
      historical_a_rate REAL NOT NULL DEFAULT 0,
      avg_weekly_hours REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'locked' CHECK(status IN ('completed','available','locked')),
      type TEXT NOT NULL DEFAULT 'Core' CHECK(type IN ('Core','Elective')),
      workload INTEGER NOT NULL DEFAULT 0,
      difficulty INTEGER NOT NULL DEFAULT 0,
      theory INTEGER NOT NULL DEFAULT 0,
      project INTEGER NOT NULL DEFAULT 0,
      exam INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS module_prerequisites (
      module_code TEXT NOT NULL REFERENCES modules(code),
      prerequisite_code TEXT NOT NULL REFERENCES modules(code),
      PRIMARY KEY (module_code, prerequisite_code)
    );

    CREATE TABLE IF NOT EXISTS majors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      ai_match REAL NOT NULL DEFAULT 0,
      career_outcomes TEXT NOT NULL DEFAULT '[]',
      foundational_modules TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS schedule_entries (
      id TEXT PRIMARY KEY,
      module_code TEXT NOT NULL,
      course_name TEXT NOT NULL,
      schedule TEXT NOT NULL,
      professor TEXT NOT NULL,
      credits INTEGER NOT NULL,
      semester TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_threads (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('user','model')),
      content TEXT NOT NULL,
      modules TEXT DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      name TEXT NOT NULL DEFAULT 'Alex Chen',
      program TEXT NOT NULL DEFAULT 'L4 Computer Science',
      gpa REAL NOT NULL DEFAULT 4.21,
      gpa_max REAL NOT NULL DEFAULT 5.00,
      gpa_trend REAL NOT NULL DEFAULT 0.12,
      total_credits INTEGER NOT NULL DEFAULT 84,
      required_credits INTEGER NOT NULL DEFAULT 120,
      major_credits INTEGER NOT NULL DEFAULT 52,
      major_required INTEGER NOT NULL DEFAULT 64,
      ue_credits INTEGER NOT NULL DEFAULT 12,
      ue_required INTEGER NOT NULL DEFAULT 20,
      ai_credits_used INTEGER NOT NULL DEFAULT 750,
      ai_credits_max INTEGER NOT NULL DEFAULT 1000
    );

    CREATE TABLE IF NOT EXISTS transcripts (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'Official',
      processed_date TEXT NOT NULL DEFAULT (datetime('now')),
      file_path TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    INSERT OR IGNORE INTO user_profile (id) VALUES (1);
  `);
}

export function closeDb() {
  if (db) {
    db.close();
    db = undefined as any;
  }
}
