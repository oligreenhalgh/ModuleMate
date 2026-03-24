# ModuleMate Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full Express.js backend with SQLite persistence, REST API, and Gemini AI proxy to replace all hardcoded frontend data and enable every UI action.

**Architecture:** Express.js API server with SQLite (via better-sqlite3) for persistence, organized into route modules per domain (modules, majors, schedule, chat, user, transcripts). The Gemini API key moves server-side. Frontend switches from hardcoded constants to `fetch()` calls against the API. Authentication is session-based (express-session) for single-user MVP.

**Tech Stack:** Express.js, TypeScript, better-sqlite3, express-session, multer (file uploads), @google/genai (server-side), tsx (dev runner), vitest (tests)

---

## File Structure

```
server/
├── src/
│   ├── index.ts              — Express app entry, middleware, route mounting
│   ├── db.ts                 — SQLite connection + schema init
│   ├── routes/
│   │   ├── modules.ts        — GET /api/modules, GET /api/modules/:code, PATCH /api/modules/:code
│   │   ├── majors.ts         — GET /api/majors, GET /api/majors/:id
│   │   ├── schedule.ts       — GET/POST/DELETE /api/schedule, GET /api/schedule/conflicts
│   │   ├── chat.ts           — POST /api/chat, GET /api/chat/threads, GET /api/chat/threads/:id
│   │   ├── user.ts           — GET/PATCH /api/user/profile, GET /api/user/stats, POST /api/user/reset
│   │   ├── transcripts.ts    — GET/POST/DELETE /api/transcripts
│   │   └── settings.ts       — GET/PATCH /api/settings
│   ├── services/
│   │   ├── gemini.ts         — Gemini AI wrapper (chat, comparison recommendations, major matching)
│   │   ├── conflicts.ts      — Schedule conflict detection logic
│   │   └── prerequisites.ts  — Prerequisite graph traversal + status computation
│   └── seed.ts               — Seed DB with initial modules/majors data from constants
├── tests/
│   ├── modules.test.ts
│   ├── schedule.test.ts
│   ├── chat.test.ts
│   ├── conflicts.test.ts
│   ├── prerequisites.test.ts
│   ├── settings.test.ts
│   ├── gemini.test.ts
│   └── user.test.ts
├── uploads/                  — Transcript file storage
├── tsconfig.json
└── package.json
src/
├── services/
│   └── api.ts                — Frontend API client (replaces direct constant imports)
├── views/                    — (modify existing views to use api.ts)
└── types.ts                  — (extend with backend response types)
```

---

## Task 1: Project Scaffolding & Database Schema

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/src/index.ts`
- Create: `server/src/db.ts`
- Create: `server/src/seed.ts`
- Test: `server/tests/db.test.ts`

- [ ] **Step 1: Create server/package.json**

```json
{
  "name": "modulemate-server",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "seed": "tsx src/seed.ts"
  },
  "dependencies": {
    "@google/genai": "^1.29.0",
    "better-sqlite3": "^11.0.0",
    "cors": "^2.8.5",
    "express": "^4.21.2",
    "express-session": "^1.18.0",
    "multer": "^1.4.5-lts.1",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.8",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/express-session": "^1.18.0",
    "@types/multer": "^1.4.11",
    "@types/uuid": "^9.0.7",
    "tsx": "^4.21.0",
    "typescript": "~5.8.2",
    "vitest": "^2.0.0",
    "supertest": "^7.0.0",
    "@types/supertest": "^6.0.2"
  }
}
```

- [ ] **Step 2: Create server/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Create server/src/db.ts with schema**

```typescript
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(path.join(__dirname, '..', 'modulemate.db'));
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

    -- NOTE: No module_unlocks table needed. Unlocks are computed as the inverse
    -- of prerequisites: SELECT module_code FROM module_prerequisites WHERE prerequisite_code = ?

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
  if (db) db.close();
}
```

- [ ] **Step 4: Write test for DB init**

```typescript
// server/tests/db.test.ts
import { describe, it, expect, afterAll } from 'vitest';
import { getDb, closeDb } from '../src/db.js';

describe('Database Schema', () => {
  afterAll(() => closeDb());

  it('creates all required tables', () => {
    const db = getDb();
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all() as { name: string }[];
    const names = tables.map(t => t.name);
    expect(names).toContain('modules');
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
```

> **Note:** Export `initSchema` is not needed — `getDb()` auto-initializes. For tests needing isolation, set `DATABASE_PATH=:memory:` env var (add support in `db.ts`).

- [ ] **Step 5: Run test to verify it passes**

Run: `cd server && npm install && npx vitest run tests/db.test.ts`
Expected: PASS

- [ ] **Step 6: Create seed script**

```typescript
// server/src/seed.ts
import { getDb, closeDb } from './db.js';

const MODULES = [/* copy from src/constants.ts */];
const MAJORS = [/* copy from src/constants.ts */];

const db = getDb();

const insertModule = db.prepare(`
  INSERT OR REPLACE INTO modules (code, name, description, credits, historical_a_rate, avg_weekly_hours, status, type, workload, difficulty, theory, project, exam)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertPrereq = db.prepare(`INSERT OR IGNORE INTO module_prerequisites (module_code, prerequisite_code) VALUES (?, ?)`);
// No module_unlocks table — unlocks are computed as inverse of prerequisites at query time.

const seedModules = db.transaction(() => {
  for (const m of MODULES) {
    insertModule.run(m.code, m.name, m.description, m.credits, m.historicalARate, m.avgWeeklyHours, m.status, m.type, m.workload, m.difficulty, m.theory, m.project, m.exam);
    for (const pre of m.prerequisites) insertPrereq.run(m.code, pre);
  }
});

const insertMajor = db.prepare(`
  INSERT OR REPLACE INTO majors (id, name, description, ai_match, career_outcomes, foundational_modules)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const seedMajors = db.transaction(() => {
  for (const major of MAJORS) {
    insertMajor.run(major.id, major.name, major.description, major.aiMatch, JSON.stringify(major.careerOutcomes), JSON.stringify(major.foundationalModules));
  }
});

seedModules();
seedMajors();
closeDb();
console.log('Seeded database successfully.');
```

- [ ] **Step 7: Commit**

```bash
git add server/
git commit -m "feat: scaffold backend with SQLite schema and seed script"
```

---

## Task 2: Express Server Entry Point & Middleware

**Files:**
- Create: `server/src/index.ts`

- [ ] **Step 1: Write server/src/index.ts**

```typescript
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { getDb } from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize DB on startup
getDb();

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'modulemate-dev-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Route mounting (added in subsequent tasks)
// app.use('/api/modules', modulesRouter);
// app.use('/api/majors', majorsRouter);
// app.use('/api/schedule', scheduleRouter);
// app.use('/api/chat', chatRouter);
// app.use('/api/user', userRouter);
// app.use('/api/transcripts', transcriptsRouter);
// app.use('/api/settings', settingsRouter);

app.listen(PORT, () => {
  console.log(`ModuleMate API running on http://localhost:${PORT}`);
});

export { app };
```

- [ ] **Step 2: Verify server starts**

Run: `cd server && npx tsx src/index.ts`
Expected: "ModuleMate API running on http://localhost:3001"

- [ ] **Step 3: Commit**

```bash
git add server/src/index.ts
git commit -m "feat: add Express server entry with CORS and session middleware"
```

---

## Task 3: Modules API (Feeds: Graph View, Comparison View, Explorer foundational modules)

**Files:**
- Create: `server/src/routes/modules.ts`
- Create: `server/src/services/prerequisites.ts`
- Test: `server/tests/modules.test.ts`
- Test: `server/tests/prerequisites.test.ts`

**UI buttons/features served:**
- GraphView: module nodes, details panel, "Add to Planner" button
- ComparisonView: radar chart data, historical A-rate bars, AI recommendation
- ExplorerView: foundational module codes on major cards

- [ ] **Step 1: Write prerequisite service test**

```typescript
// server/tests/prerequisites.test.ts
import { describe, it, expect } from 'vitest';
import { computeModuleStatuses } from '../src/services/prerequisites.js';

describe('computeModuleStatuses', () => {
  const modules = [
    { code: 'CS1010', prerequisites: [] },
    { code: 'CS2030', prerequisites: ['CS1010'] },
    { code: 'CS3230', prerequisites: ['CS2030', 'CS2040'] },
    { code: 'CS2040', prerequisites: ['CS1010'] },
  ];
  const completed = new Set(['CS1010']);

  it('marks completed modules as completed', () => {
    const result = computeModuleStatuses(modules, completed);
    expect(result.get('CS1010')).toBe('completed');
  });

  it('marks modules with all prereqs met as available', () => {
    const result = computeModuleStatuses(modules, completed);
    expect(result.get('CS2030')).toBe('available');
    expect(result.get('CS2040')).toBe('available');
  });

  it('marks modules with unmet prereqs as locked', () => {
    const result = computeModuleStatuses(modules, completed);
    expect(result.get('CS3230')).toBe('locked');
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `cd server && npx vitest run tests/prerequisites.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement prerequisite service**

```typescript
// server/src/services/prerequisites.ts
type ModulePrereqs = { code: string; prerequisites: string[] };

export function computeModuleStatuses(
  modules: ModulePrereqs[],
  completedCodes: Set<string>
): Map<string, 'completed' | 'available' | 'locked'> {
  const result = new Map<string, 'completed' | 'available' | 'locked'>();

  for (const mod of modules) {
    if (completedCodes.has(mod.code)) {
      result.set(mod.code, 'completed');
    } else if (mod.prerequisites.every(p => completedCodes.has(p))) {
      result.set(mod.code, 'available');
    } else {
      result.set(mod.code, 'locked');
    }
  }

  return result;
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `cd server && npx vitest run tests/prerequisites.test.ts`
Expected: PASS

- [ ] **Step 5: Write modules route test**

```typescript
// server/tests/modules.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.js';

describe('GET /api/modules', () => {
  it('returns array of modules', async () => {
    const res = await request(app).get('/api/modules');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('each module has required fields', async () => {
    const res = await request(app).get('/api/modules');
    const mod = res.body[0];
    expect(mod).toHaveProperty('code');
    expect(mod).toHaveProperty('name');
    expect(mod).toHaveProperty('prerequisites');
    expect(mod).toHaveProperty('unlocks');
    expect(mod).toHaveProperty('status');
  });
});

describe('GET /api/modules/:code', () => {
  it('returns a single module', async () => {
    const res = await request(app).get('/api/modules/CS1010');
    expect(res.status).toBe(200);
    expect(res.body.code).toBe('CS1010');
  });

  it('returns 404 for unknown module', async () => {
    const res = await request(app).get('/api/modules/FAKE999');
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 6: Implement modules route**

```typescript
// server/src/routes/modules.ts
import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

router.get('/', (_req, res) => {
  const db = getDb();
  const modules = db.prepare('SELECT * FROM modules').all();

  const enriched = modules.map((m: any) => {
    const prereqs = db.prepare('SELECT prerequisite_code FROM module_prerequisites WHERE module_code = ?').all(m.code);
    // Unlocks = inverse of prerequisites (modules that list this module as a prerequisite)
    const unlocks = db.prepare('SELECT module_code FROM module_prerequisites WHERE prerequisite_code = ?').all(m.code);
    const { historical_a_rate, avg_weekly_hours, ...rest } = m;
    return {
      ...rest,
      historicalARate: historical_a_rate,
      avgWeeklyHours: avg_weekly_hours,
      prerequisites: prereqs.map((p: any) => p.prerequisite_code),
      unlocks: unlocks.map((u: any) => u.module_code),
    };
  });

  res.json(enriched);
});

router.get('/:code', (req, res) => {
  const db = getDb();
  const mod = db.prepare('SELECT * FROM modules WHERE code = ?').get(req.params.code) as any;
  if (!mod) return res.status(404).json({ error: 'Module not found' });

  const prereqs = db.prepare('SELECT prerequisite_code FROM module_prerequisites WHERE module_code = ?').all(mod.code);
  const unlocks = db.prepare('SELECT module_code FROM module_prerequisites WHERE prerequisite_code = ?').all(mod.code);
  const { historical_a_rate, avg_weekly_hours, ...rest } = mod;

  res.json({
    ...rest,
    historicalARate: historical_a_rate,
    avgWeeklyHours: avg_weekly_hours,
    prerequisites: prereqs.map((p: any) => p.prerequisite_code),
    unlocks: unlocks.map((u: any) => u.module_code),
  });
});

router.patch('/:code', (req, res) => {
  const db = getDb();
  const { status } = req.body;
  if (!['completed', 'available', 'locked'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  db.prepare('UPDATE modules SET status = ? WHERE code = ?').run(status, req.params.code);
  res.json({ success: true });
});

export default router;
```

- [ ] **Step 7: Mount route in index.ts, run tests — expect PASS**

- [ ] **Step 8: Commit**

```bash
git add server/src/routes/modules.ts server/src/services/prerequisites.ts server/tests/
git commit -m "feat: add modules API with prerequisite status computation"
```

---

## Task 4: Majors API (Feeds: Explorer View)

**Files:**
- Create: `server/src/routes/majors.ts`
- Test: `server/tests/majors.test.ts`

**UI buttons/features served:**
- ExplorerView: major cards grid, AI match %, career outcomes, "Preview Path" button
- ExplorerView: search bar and command suggestions (`/generate`, `/path`, `/compare`)

- [ ] **Step 1: Write test**

```typescript
// server/tests/majors.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.js';

describe('GET /api/majors', () => {
  it('returns array of majors with parsed arrays', async () => {
    const res = await request(app).get('/api/majors');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const major = res.body[0];
    expect(Array.isArray(major.careerOutcomes)).toBe(true);
    expect(Array.isArray(major.foundationalModules)).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement majors route**

```typescript
// server/src/routes/majors.ts
import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

router.get('/', (_req, res) => {
  const db = getDb();
  const majors = db.prepare('SELECT * FROM majors').all().map((m: any) => ({
    ...m,
    aiMatch: m.ai_match,
    careerOutcomes: JSON.parse(m.career_outcomes),
    foundationalModules: JSON.parse(m.foundational_modules),
  }));
  res.json(majors);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const major = db.prepare('SELECT * FROM majors WHERE id = ?').get(req.params.id) as any;
  if (!major) return res.status(404).json({ error: 'Major not found' });
  res.json({
    ...major,
    aiMatch: major.ai_match,
    careerOutcomes: JSON.parse(major.career_outcomes),
    foundationalModules: JSON.parse(major.foundational_modules),
  });
});

export default router;
```

- [ ] **Step 4: Mount, run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/majors.ts server/tests/majors.test.ts
git commit -m "feat: add majors API for explorer view"
```

---

## Task 5: Schedule API with Conflict Detection (Feeds: Schedule View)

**Files:**
- Create: `server/src/routes/schedule.ts`
- Create: `server/src/services/conflicts.ts`
- Test: `server/tests/schedule.test.ts`
- Test: `server/tests/conflicts.test.ts`

**UI buttons/features served:**
- ScheduleView: course rows display, conflict warning banner
- ScheduleView: "Sync to Google Calendar" button (placeholder), "Download PDF" button (placeholder)
- ScheduleView: degree progress stats (84/120 credits, core 92%, electives 45%)

- [ ] **Step 1: Write conflict detection test**

```typescript
// server/tests/conflicts.test.ts
import { describe, it, expect } from 'vitest';
import { detectConflicts } from '../src/services/conflicts.js';

describe('detectConflicts', () => {
  it('detects overlapping schedules on same day', () => {
    const entries = [
      { id: '1', module_code: 'CS402', schedule: 'Mon/Wed 14:00', credits: 4 },
      { id: '2', module_code: 'MATH301', schedule: 'Wed 14:30', credits: 4 },
    ];
    const conflicts = detectConflicts(entries);
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].modules).toContain('CS402');
    expect(conflicts[0].modules).toContain('MATH301');
  });

  it('returns empty for non-overlapping schedules', () => {
    const entries = [
      { id: '1', module_code: 'CS402', schedule: 'Mon 14:00', credits: 4 },
      { id: '2', module_code: 'PHIL220', schedule: 'Tue 10:00', credits: 4 },
    ];
    const conflicts = detectConflicts(entries);
    expect(conflicts.length).toBe(0);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement conflict service**

```typescript
// server/src/services/conflicts.ts
interface ScheduleEntry {
  id: string;
  module_code: string;
  schedule: string;
  credits: number;
}

interface Conflict {
  modules: string[];
  day: string;
  description: string;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function parseDaysAndTime(schedule: string): { days: string[]; hour: number; minute: number }[] {
  // Format: "Mon/Wed 14:00" or "Friday 11:00" or "Tue/Thu 10:00"
  const parts = schedule.split(' ');
  const timeStr = parts[parts.length - 1];
  const dayStr = parts.slice(0, -1).join(' ');
  const [hour, minute] = timeStr.split(':').map(Number);

  const days = dayStr.split('/').map(d => {
    const normalized = d.trim().substring(0, 3);
    return DAYS.find(day => day.toLowerCase() === normalized.toLowerCase()) || normalized;
  });

  return days.map(day => ({ days: [day], hour, minute }));
}

export function detectConflicts(entries: ScheduleEntry[]): Conflict[] {
  const conflicts: Conflict[] = [];
  const DURATION_MINUTES = 90; // assume 1.5hr blocks

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const slotsA = parseDaysAndTime(entries[i].schedule);
      const slotsB = parseDaysAndTime(entries[j].schedule);

      for (const a of slotsA) {
        for (const b of slotsB) {
          const sharedDays = a.days.filter(d => b.days.includes(d));
          for (const day of sharedDays) {
            const startA = a.hour * 60 + a.minute;
            const startB = b.hour * 60 + b.minute;
            if (startA < startB + DURATION_MINUTES && startB < startA + DURATION_MINUTES) {
              conflicts.push({
                modules: [entries[i].module_code, entries[j].module_code],
                day,
                description: `${entries[i].module_code} and ${entries[j].module_code} overlap on ${day}`,
              });
            }
          }
        }
      }
    }
  }

  return conflicts;
}
```

- [ ] **Step 4: Run conflict tests — expect PASS**

- [ ] **Step 5: Write schedule route test**

```typescript
// server/tests/schedule.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.js';

describe('POST /api/schedule', () => {
  it('adds a schedule entry', async () => {
    const res = await request(app).post('/api/schedule').send({
      module_code: 'CS402-A',
      course_name: 'Distributed Systems',
      schedule: 'Mon/Wed 14:00',
      professor: 'Dr. Aris Thorne',
      credits: 4,
      semester: 'Fall 2024'
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });
});

describe('GET /api/schedule', () => {
  it('returns entries grouped by semester', async () => {
    const res = await request(app).get('/api/schedule');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('entries');
    expect(res.body).toHaveProperty('conflicts');
  });
});

describe('GET /api/schedule/conflicts', () => {
  it('returns conflict array', async () => {
    const res = await request(app).get('/api/schedule/conflicts');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
```

- [ ] **Step 6: Implement schedule route**

```typescript
// server/src/routes/schedule.ts
import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db.js';
import { detectConflicts } from '../services/conflicts.js';

const router = Router();

router.get('/', (_req, res) => {
  const db = getDb();
  const entries = db.prepare('SELECT * FROM schedule_entries').all();
  const conflicts = detectConflicts(entries as any[]);
  res.json({ entries, conflicts });
});

router.post('/', (req, res) => {
  const db = getDb();
  const { module_code, course_name, schedule, professor, credits, semester } = req.body;
  const id = uuid();
  db.prepare(
    'INSERT INTO schedule_entries (id, module_code, course_name, schedule, professor, credits, semester) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, module_code, course_name, schedule, professor, credits, semester);
  res.status(201).json({ id });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM schedule_entries WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.get('/conflicts', (_req, res) => {
  const db = getDb();
  const entries = db.prepare('SELECT * FROM schedule_entries').all();
  res.json(detectConflicts(entries as any[]));
});

export default router;
```

- [ ] **Step 7: Mount, run tests — expect PASS**

- [ ] **Step 8: Commit**

```bash
git add server/src/routes/schedule.ts server/src/services/conflicts.ts server/tests/
git commit -m "feat: add schedule API with conflict detection"
```

---

## Task 6: Chat API with Gemini Proxy (Feeds: Home View)

**Files:**
- Create: `server/src/routes/chat.ts`
- Create: `server/src/services/gemini.ts`
- Test: `server/tests/chat.test.ts`

**UI buttons/features served:**
- HomeView: Send button (chat message submission)
- HomeView: Recent Threads sidebar (thread list, thread selection)
- HomeView: Module tags in AI responses
- HomeView: "AI Thinking..." indicator (frontend manages this via loading state)

- [ ] **Step 1: Write Gemini service**

```typescript
// server/src/services/gemini.ts
import { GoogleGenAI } from '@google/genai';

const SYSTEM_INSTRUCTION = `You are ModuleMate, an AI university advisor. Help students plan their degrees, understand prerequisites, and manage workload. Be concise, technical, and helpful. Use markdown for formatting. When you reference module codes, wrap them in backticks.`;

export async function chatWithGemini(
  messages: { role: string; content: string }[],
  apiKey: string
): Promise<{ content: string; modules: string[] }> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: messages.map(m => ({
      role: m.role as 'user' | 'model',
      parts: [{ text: m.content }],
    })),
    config: { systemInstruction: SYSTEM_INSTRUCTION },
  });

  const content = response.text || "I'm sorry, I couldn't process that request.";

  // Extract module codes (pattern: 2-4 uppercase letters followed by 4 digits)
  const modulePattern = /\b[A-Z]{2,4}\d{4}[A-Z]?\b/g;
  const modules = [...new Set(content.match(modulePattern) || [])];

  return { content, modules };
}

export async function getComparisonRecommendation(
  moduleA: string,
  moduleB: string,
  apiKey: string
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{
      role: 'user',
      parts: [{ text: `Compare these two university modules for a student: ${moduleA} vs ${moduleB}. Consider workload, difficulty, career relevance. Be concise (2-3 sentences).` }],
    }],
    config: { systemInstruction: SYSTEM_INSTRUCTION },
  });
  return response.text || '';
}
```

- [ ] **Step 2: Write chat route test**

```typescript
// server/tests/chat.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.js';

describe('POST /api/chat/threads', () => {
  it('creates a new thread', async () => {
    const res = await request(app).post('/api/chat/threads').send({ title: 'Test Thread' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('Test Thread');
  });
});

describe('GET /api/chat/threads', () => {
  it('returns list of threads', async () => {
    const res = await request(app).get('/api/chat/threads');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('GET /api/chat/threads/:id/messages', () => {
  it('returns messages for a thread', async () => {
    // Create thread first
    const thread = await request(app).post('/api/chat/threads').send({ title: 'Msg Test' });
    const res = await request(app).get(`/api/chat/threads/${thread.body.id}/messages`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
```

- [ ] **Step 3: Run — expect FAIL**

- [ ] **Step 4: Implement chat route**

```typescript
// server/src/routes/chat.ts
import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db.js';
import { chatWithGemini } from '../services/gemini.js';

const router = Router();

// List threads
router.get('/threads', (_req, res) => {
  const db = getDb();
  const threads = db.prepare('SELECT * FROM chat_threads ORDER BY updated_at DESC').all();
  res.json(threads);
});

// Create thread
router.post('/threads', (req, res) => {
  const db = getDb();
  const id = uuid();
  const title = req.body.title || 'New Chat';
  db.prepare('INSERT INTO chat_threads (id, title) VALUES (?, ?)').run(id, title);
  res.status(201).json({ id, title });
});

// Delete thread
router.delete('/threads/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM chat_threads WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Get messages in thread
router.get('/threads/:id/messages', (req, res) => {
  const db = getDb();
  const messages = db.prepare(
    'SELECT * FROM chat_messages WHERE thread_id = ? ORDER BY created_at ASC'
  ).all(req.params.id).map((m: any) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: m.created_at,  // Map DB column to frontend Message.timestamp
    modules: JSON.parse(m.modules || '[]'),
  }));
  res.json(messages);
});

// Send message (saves user msg, calls Gemini, saves AI response)
router.post('/threads/:id/messages', async (req, res) => {
  const db = getDb();
  const threadId = req.params.id;
  const { content } = req.body;

  // Save user message
  const userMsgId = uuid();
  db.prepare(
    'INSERT INTO chat_messages (id, thread_id, role, content) VALUES (?, ?, ?, ?)'
  ).run(userMsgId, threadId, 'user', content);

  // Get thread history
  const history = db.prepare(
    'SELECT role, content FROM chat_messages WHERE thread_id = ? ORDER BY created_at ASC'
  ).all(threadId) as { role: string; content: string }[];

  // Get API key from settings
  const apiKeySetting = db.prepare("SELECT value FROM settings WHERE key = 'gemini_api_key'").get() as any;
  const apiKey = apiKeySetting?.value || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(400).json({ error: 'Gemini API key not configured' });
  }

  try {
    const aiResponse = await chatWithGemini(history, apiKey);
    const aiMsgId = uuid();
    db.prepare(
      'INSERT INTO chat_messages (id, thread_id, role, content, modules) VALUES (?, ?, ?, ?, ?)'
    ).run(aiMsgId, threadId, 'model', aiResponse.content, JSON.stringify(aiResponse.modules));

    // Update thread timestamp
    db.prepare('UPDATE chat_threads SET updated_at = datetime("now") WHERE id = ?').run(threadId);

    res.json({
      id: aiMsgId,
      role: 'model',
      content: aiResponse.content,
      modules: aiResponse.modules,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'AI generation failed', details: error.message });
  }
});

export default router;
```

- [ ] **Step 5: Mount, run tests — expect PASS**

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/chat.ts server/src/services/gemini.ts server/tests/chat.test.ts
git commit -m "feat: add chat API with Gemini proxy and thread persistence"
```

---

## Task 7: User Profile & Stats API (Feeds: Sidebar, HomeView stats panel)

**Files:**
- Create: `server/src/routes/user.ts`
- Test: `server/tests/user.test.ts`

**UI buttons/features served:**
- Sidebar: user name, program, Pro plan, AI credits (750/1000)
- HomeView right pane: GPA (4.21/5.00), credit progress (84/120), major/UE breakdown
- HomeView right pane: prerequisite alerts
- SettingsView: "Initialize Reset" button (danger zone)

- [ ] **Step 1: Write test**

```typescript
// server/tests/user.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.js';

describe('GET /api/user/profile', () => {
  it('returns user profile', async () => {
    const res = await request(app).get('/api/user/profile');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name');
    expect(res.body).toHaveProperty('gpa');
    expect(res.body).toHaveProperty('total_credits');
  });
});

describe('PATCH /api/user/profile', () => {
  it('updates user fields', async () => {
    const res = await request(app).patch('/api/user/profile').send({ name: 'Jane Doe' });
    expect(res.status).toBe(200);
    const check = await request(app).get('/api/user/profile');
    expect(check.body.name).toBe('Jane Doe');
  });
});

describe('POST /api/user/reset', () => {
  it('resets academic profile', async () => {
    const res = await request(app).post('/api/user/reset');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement user route**

```typescript
// server/src/routes/user.ts
import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

router.get('/profile', (_req, res) => {
  const db = getDb();
  const profile = db.prepare('SELECT * FROM user_profile WHERE id = 1').get();
  res.json(profile);
});

router.patch('/profile', (req, res) => {
  const db = getDb();
  // Strict allowlist: only these exact column names can be updated.
  // Column names are hardcoded strings, never from user input.
  const ALLOWED_FIELDS: Record<string, true> = {
    name: true, program: true, gpa: true, gpa_max: true, gpa_trend: true,
    total_credits: true, required_credits: true, major_credits: true,
    major_required: true, ue_credits: true, ue_required: true, ai_credits_used: true
  };

  const sets: string[] = [];
  const values: any[] = [];

  for (const [key, val] of Object.entries(req.body)) {
    if (ALLOWED_FIELDS[key]) {
      sets.push(`"${key}" = ?`);  // quoted identifier, key validated against allowlist
      values.push(val);
    }
  }

  if (sets.length === 0) return res.status(400).json({ error: 'No valid fields' });

  db.prepare(`UPDATE user_profile SET ${sets.join(', ')} WHERE id = 1`).run(...values);
  res.json({ success: true });
});

router.get('/stats', (_req, res) => {
  const db = getDb();
  const profile = db.prepare('SELECT * FROM user_profile WHERE id = 1').get() as any;

  // Compute prerequisite alerts from modules
  const modules = db.prepare('SELECT code, status FROM modules').all() as any[];
  const locked = modules.filter(m => m.status === 'locked');
  const alerts = locked.map(m => {
    const prereqs = db.prepare('SELECT prerequisite_code FROM module_prerequisites WHERE module_code = ?')
      .all(m.code).map((p: any) => p.prerequisite_code);
    const unmet = prereqs.filter((p: string) => {
      const mod = modules.find(mod => mod.code === p);
      return mod && mod.status !== 'completed';
    });
    if (unmet.length > 0) {
      return { module: m.code, unmetPrereqs: unmet };
    }
    return null;
  }).filter(Boolean);

  res.json({ ...profile, alerts });
});

router.post('/reset', (_req, res) => {
  const db = getDb();
  db.prepare('UPDATE modules SET status = "locked"').run();
  db.prepare('DELETE FROM schedule_entries').run();
  db.prepare('DELETE FROM chat_messages').run();
  db.prepare('DELETE FROM chat_threads').run();
  db.prepare(`UPDATE user_profile SET
    gpa = 0, gpa_trend = 0, total_credits = 0,
    major_credits = 0, ue_credits = 0, ai_credits_used = 0
    WHERE id = 1`).run();
  res.json({ success: true });
});

export default router;
```

- [ ] **Step 4: Mount, run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/user.ts server/tests/user.test.ts
git commit -m "feat: add user profile/stats API with academic reset"
```

---

## Task 8: Transcripts API (Feeds: Settings View)

**Files:**
- Create: `server/src/routes/transcripts.ts`
- Test: `server/tests/transcripts.test.ts`

**UI buttons/features served:**
- SettingsView: transcript table (Document ID, Type, Date, Actions)
- SettingsView: "Upload New Transcript" button
- SettingsView: Delete (trash) button per transcript row

- [ ] **Step 1: Write test**

```typescript
// server/tests/transcripts.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.js';

describe('GET /api/transcripts', () => {
  it('returns array of transcripts', async () => {
    const res = await request(app).get('/api/transcripts');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('DELETE /api/transcripts/:id', () => {
  it('deletes a transcript', async () => {
    const res = await request(app).delete('/api/transcripts/nonexistent');
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement transcripts route with multer upload**

```typescript
// server/src/routes/transcripts.ts
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, cb) => cb(null, `${uuid()}-${file.originalname}`),
  }),
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files allowed'));
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const router = Router();

router.get('/', (_req, res) => {
  const db = getDb();
  const transcripts = db.prepare('SELECT id, filename, type, processed_date FROM transcripts').all();
  res.json(transcripts);
});

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const db = getDb();
  const id = uuid();
  db.prepare(
    'INSERT INTO transcripts (id, filename, type, file_path) VALUES (?, ?, ?, ?)'
  ).run(id, req.file.originalname, req.body.type || 'Official', req.file.path);

  res.status(201).json({ id, filename: req.file.originalname });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const transcript = db.prepare('SELECT file_path FROM transcripts WHERE id = ?').get(req.params.id) as any;
  if (transcript?.file_path && fs.existsSync(transcript.file_path)) {
    fs.unlinkSync(transcript.file_path);
  }
  db.prepare('DELETE FROM transcripts WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
```

- [ ] **Step 4: Mount, run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/transcripts.ts server/tests/transcripts.test.ts
git commit -m "feat: add transcripts API with PDF upload via multer"
```

---

## Task 9: Settings API (Feeds: Settings View)

**Files:**
- Create: `server/src/routes/settings.ts`
- Test: `server/tests/settings.test.ts`

**UI buttons/features served:**
- SettingsView: Gemini API Key input field, eye toggle visibility
- SettingsView: Light Mode toggle (disabled for now, but backend stores preference)

- [ ] **Step 1: Write settings test**

```typescript
// server/tests/settings.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.js';

describe('GET /api/settings', () => {
  it('returns empty object initially', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(200);
    expect(typeof res.body).toBe('object');
  });
});

describe('PATCH /api/settings', () => {
  it('upserts settings', async () => {
    const res = await request(app).patch('/api/settings').send({ theme: 'dark' });
    expect(res.status).toBe(200);
    const check = await request(app).get('/api/settings');
    expect(check.body.theme).toBe('dark');
  });

  it('masks gemini_api_key in GET response', async () => {
    await request(app).patch('/api/settings').send({ gemini_api_key: 'sk-test-1234567890' });
    const res = await request(app).get('/api/settings');
    expect(res.body.gemini_api_key).not.toContain('sk-test');
    expect(res.body.gemini_api_key).toContain('7890');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement settings route**

```typescript
// server/src/routes/settings.ts
import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

router.get('/', (_req, res) => {
  const db = getDb();
  const settings = db.prepare('SELECT * FROM settings').all() as { key: string; value: string }[];
  const obj: Record<string, string> = {};
  for (const s of settings) {
    // Mask API key in response
    if (s.key === 'gemini_api_key') {
      obj[s.key] = s.value ? '••••••••' + s.value.slice(-4) : '';
    } else {
      obj[s.key] = s.value;
    }
  }
  res.json(obj);
});

router.patch('/', (req, res) => {
  const db = getDb();
  const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  const tx = db.transaction(() => {
    for (const [key, value] of Object.entries(req.body)) {
      upsert.run(key, String(value));
    }
  });
  tx();
  res.json({ success: true });
});

export default router;
```

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Mount in index.ts**

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/settings.ts server/tests/settings.test.ts
git commit -m "feat: add settings API with API key masking"
```

---

## Task 10: Mount All Routes & Final Server Wiring

**Files:**
- Modify: `server/src/index.ts`

- [ ] **Step 1: Update index.ts to mount all routers**

```typescript
// Add imports at top:
import modulesRouter from './routes/modules.js';
import majorsRouter from './routes/majors.js';
import scheduleRouter from './routes/schedule.js';
import chatRouter from './routes/chat.js';
import userRouter from './routes/user.js';
import transcriptsRouter from './routes/transcripts.js';
import settingsRouter from './routes/settings.js';

// Replace commented route lines with:
app.use('/api/modules', modulesRouter);
app.use('/api/majors', majorsRouter);
app.use('/api/schedule', scheduleRouter);
app.use('/api/chat', chatRouter);
app.use('/api/user', userRouter);
app.use('/api/transcripts', transcriptsRouter);
app.use('/api/settings', settingsRouter);
```

- [ ] **Step 2: Run all tests**

Run: `cd server && npx vitest run`
Expected: All PASS

- [ ] **Step 3: Commit**

```bash
git add server/src/index.ts
git commit -m "feat: mount all API routes in Express server"
```

---

## Task 11: Frontend API Client

**Files:**
- Create: `src/services/api.ts`

**Purpose:** Single module the frontend uses to talk to the backend, replacing all hardcoded data imports.

- [ ] **Step 1: Write API client**

```typescript
// src/services/api.ts
import type { Module, Major, Message } from '../types';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...opts?.headers },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

// Modules
export const getModules = () => request<Module[]>('/modules');
export const getModule = (code: string) => request<Module>(`/modules/${code}`);
export const compareModules = (a: string, b: string) =>
  request<{ recommendation: string }>(`/modules/compare?a=${a}&b=${b}`);
export const updateModuleStatus = (code: string, status: string) =>
  request(`/modules/${code}`, { method: 'PATCH', body: JSON.stringify({ status }) });

// Majors
export const getMajors = () => request<Major[]>('/majors');
export const getMajor = (id: string) => request<Major>(`/majors/${id}`);

// Schedule
export interface ScheduleEntry {
  id: string; module_code: string; course_name: string;
  schedule: string; professor: string; credits: number; semester: string;
}
export interface Conflict { modules: string[]; day: string; description: string; }
export const getSchedule = () => request<{ entries: ScheduleEntry[]; conflicts: Conflict[] }>('/schedule');
export const addScheduleEntry = (entry: Omit<ScheduleEntry, 'id'>) =>
  request<{ id: string }>('/schedule', { method: 'POST', body: JSON.stringify(entry) });
export const deleteScheduleEntry = (id: string) =>
  request(`/schedule/${id}`, { method: 'DELETE' });

// Chat
export interface Thread { id: string; title: string; created_at: string; updated_at: string; }
export const getThreads = () => request<Thread[]>('/chat/threads');
export const createThread = (title: string) =>
  request<Thread>('/chat/threads', { method: 'POST', body: JSON.stringify({ title }) });
export const deleteThread = (id: string) =>
  request(`/chat/threads/${id}`, { method: 'DELETE' });
export const getMessages = (threadId: string) => request<Message[]>(`/chat/threads/${threadId}/messages`);
export const sendMessage = (threadId: string, content: string) =>
  request<Message>(`/chat/threads/${threadId}/messages`, { method: 'POST', body: JSON.stringify({ content }) });

// User
export const getProfile = () => request<any>('/user/profile');
export const updateProfile = (data: any) =>
  request('/user/profile', { method: 'PATCH', body: JSON.stringify(data) });
export const getStats = () => request<any>('/user/stats');
export const resetProfile = () => request('/user/reset', { method: 'POST' });

// Transcripts
export const getTranscripts = () => request<any[]>('/transcripts');
export const uploadTranscript = (file: File, type?: string) => {
  const form = new FormData();
  form.append('file', file);
  if (type) form.append('type', type);
  return fetch(`${BASE}/transcripts`, { method: 'POST', body: form, credentials: 'include' }).then(r => r.json());
};
export const deleteTranscript = (id: string) =>
  request(`/transcripts/${id}`, { method: 'DELETE' });

// Settings
export const getSettings = () => request<Record<string, string>>('/settings');
export const updateSettings = (data: Record<string, string>) =>
  request('/settings', { method: 'PATCH', body: JSON.stringify(data) });
```

- [ ] **Step 2: Commit**

```bash
git add src/services/api.ts
git commit -m "feat: add frontend API client for all backend endpoints"
```

---

## Task 12: Wire HomeView to Backend (Chat)

**Files:**
- Modify: `src/views/HomeView.tsx`

**UI buttons wired:**
- Send button → `POST /api/chat/threads/:id/messages`
- Recent Threads list → `GET /api/chat/threads`
- Thread click → `GET /api/chat/threads/:id/messages`
- Academic Status panel → `GET /api/user/stats`

- [ ] **Step 1: Refactor HomeView to use api.ts**

Replace the direct GoogleGenAI import with api calls:
- On mount: fetch threads via `getThreads()`, fetch stats via `getStats()`
- On thread select: fetch messages via `getMessages(threadId)`
- On send: call `sendMessage(threadId, input)` instead of direct Gemini call
- Right pane stats: populate from `getStats()` response (gpa, credits, alerts)

- [ ] **Step 2: Remove `@google/genai` import from HomeView**

- [ ] **Step 3: Verify chat works end-to-end**

Run: Start backend (`cd server && npm run dev`), start frontend (`npm run dev`), send a message.
Expected: Message appears, AI responds, thread is persisted.

- [ ] **Step 4: Commit**

```bash
git add src/views/HomeView.tsx
git commit -m "feat: wire HomeView chat to backend API"
```

---

## Task 13: Wire ExplorerView to Backend

**Files:**
- Modify: `src/views/ExplorerView.tsx`

**UI buttons wired:**
- Major cards → `GET /api/majors`
- "Preview Path" button → navigate to `/graph` filtered by major (future enhancement stub)
- Search bar → `GET /api/majors?q=...` (extend backend with optional query filter)

- [ ] **Step 1: Replace `import { MAJORS }` with `useEffect` + `getMajors()`**

- [ ] **Step 2: Verify major cards load from API**

- [ ] **Step 3: Commit**

```bash
git add src/views/ExplorerView.tsx
git commit -m "feat: wire ExplorerView to majors API"
```

---

## Task 14: Wire ComparisonView to Backend

**Files:**
- Modify: `src/views/ComparisonView.tsx`

**UI features wired:**
- Radar chart data → `GET /api/modules/:code` for both modules
- Historical A-Rate bars → from module data `historicalARate`
- AI Recommendation text → `GET /api/modules/compare?a=CODE1&b=CODE2`

**Prerequisite: Add comparison endpoint to modules route** (in `server/src/routes/modules.ts`):

```typescript
// Add before the /:code route to avoid path conflict
router.get('/compare', async (req, res) => {
  const { a, b } = req.query;
  if (!a || !b) return res.status(400).json({ error: 'Provide ?a=CODE&b=CODE' });

  const db = getDb();
  const apiKeySetting = db.prepare("SELECT value FROM settings WHERE key = 'gemini_api_key'").get() as any;
  const apiKey = apiKeySetting?.value || process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(400).json({ error: 'Gemini API key not configured' });

  try {
    const { getComparisonRecommendation } = await import('../services/gemini.js');
    const recommendation = await getComparisonRecommendation(String(a), String(b), apiKey);
    res.json({ recommendation });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
```

- [ ] **Step 1: Add comparison endpoint to modules route (see above)**
- [ ] **Step 2: Add module selection state (two dropdowns or search)**
- [ ] **Step 3: Fetch module data for both selected modules via `getModule()`**
- [ ] **Step 4: Fetch AI recommendation via `GET /api/modules/compare?a=...&b=...`**
- [ ] **Step 5: Build radar chart data dynamically from module properties**
- [ ] **Step 6: Verify comparison updates when modules change**
- [ ] **Step 7: Commit**

```bash
git add src/views/ComparisonView.tsx
git commit -m "feat: wire ComparisonView to modules API with dynamic comparison"
```

---

## Task 15: Wire GraphView to Backend

**Files:**
- Modify: `src/views/GraphView.tsx`

**UI buttons wired:**
- Module nodes → `GET /api/modules` (positions computed client-side from prereq graph)
- Details panel → `GET /api/modules/:code`
- "Add to Planner" button → `POST /api/schedule` (adds module to schedule)
- Zoom/Fit buttons remain client-side only

- [ ] **Step 1: Replace `import { MODULES }` with `useEffect` + `getModules()`**
- [ ] **Step 2: Implement "Add to Planner" onClick → `addScheduleEntry()`**
- [ ] **Step 3: Verify graph renders from API data**
- [ ] **Step 4: Commit**

```bash
git add src/views/GraphView.tsx
git commit -m "feat: wire GraphView to modules API with Add to Planner"
```

---

## Task 16: Wire ScheduleView to Backend

**Files:**
- Modify: `src/views/ScheduleView.tsx`

**UI buttons wired:**
- Course rows → `GET /api/schedule`
- Conflict warning banner → from schedule response `conflicts` array
- Degree progress stats → `GET /api/user/stats`
- "Sync to Google Calendar" → placeholder alert (future OAuth integration)
- "Download PDF" → client-side PDF generation (or backend endpoint later)

- [ ] **Step 1: Fetch schedule on mount via `getSchedule()`**
- [ ] **Step 2: Render conflicts from API response**
- [ ] **Step 3: Wire "Sync to Google Calendar" button to show toast notification (placeholder)**
- [ ] **Step 4: Wire "Download PDF" to trigger client-side download or placeholder**
- [ ] **Step 5: Commit**

```bash
git add src/views/ScheduleView.tsx
git commit -m "feat: wire ScheduleView to schedule API with conflict display"
```

---

## Task 17: Wire SettingsView to Backend

**Files:**
- Modify: `src/views/SettingsView.tsx`

**UI buttons wired:**
- Gemini API Key field → `GET /api/settings` (masked), `PATCH /api/settings` on save
- Eye toggle → client-side visibility toggle (already visual-only)
- Transcript table → `GET /api/transcripts`
- "Upload New Transcript" button → `POST /api/transcripts` with file picker
- Delete (trash) button → `DELETE /api/transcripts/:id`
- "Initialize Reset" button → `POST /api/user/reset`
- Light Mode toggle → `PATCH /api/settings` (stores preference, UI stays disabled)

- [ ] **Step 1: Fetch settings and transcripts on mount**
- [ ] **Step 2: Wire API key save**
- [ ] **Step 3: Wire transcript upload with file input dialog**
- [ ] **Step 4: Wire transcript delete**
- [ ] **Step 5: Wire "Initialize Reset" with confirmation dialog → `resetProfile()`**
- [ ] **Step 6: Commit**

```bash
git add src/views/SettingsView.tsx
git commit -m "feat: wire SettingsView to settings/transcripts/reset APIs"
```

---

## Task 18: Wire Sidebar & TopBar to Backend

**Files:**
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/TopBar.tsx`

**UI elements wired:**
- Sidebar user card (name, program) → `GET /api/user/profile`
- Sidebar AI credits (750/1000) → from profile `ai_credits_used` / `ai_credits_max`
- TopBar "AI Status: Connected" → `GET /api/health` ping indicator
- TopBar notifications bell → future (no backend yet, keep as-is)

- [ ] **Step 1: Add profile context or prop drilling from App.tsx**
- [ ] **Step 2: Fetch profile in App.tsx, pass to Sidebar**
- [ ] **Step 3: Ping `/api/health` for AI status indicator in TopBar**
- [ ] **Step 4: Commit**

```bash
git add src/components/Sidebar.tsx src/components/TopBar.tsx src/App.tsx
git commit -m "feat: wire Sidebar and TopBar to user profile and health APIs"
```

---

## Task 19: Add Vite Proxy & Environment Configuration

**Files:**
- Modify: `vite.config.ts`
- Modify: `.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: Update .gitignore**

Add these lines:
```
server/modulemate.db
server/uploads/
server/dist/
```

- [ ] **Step 2: Add API proxy to vite config**

```typescript
// vite.config.ts — add to defineConfig:
server: {
  port: 3000,
  proxy: {
    '/api': 'http://localhost:3001'
  }
}
```

- [ ] **Step 3: Update .env.example**

```
GEMINI_API_KEY=your-key-here
SESSION_SECRET=your-session-secret
PORT=3001
VITE_API_URL=/api
```

- [ ] **Step 4: Update api.ts BASE to use `/api` when proxied**

- [ ] **Step 5: Commit**

```bash
git add vite.config.ts .env.example .gitignore src/services/api.ts
git commit -m "feat: add Vite proxy config and environment setup"
```

---

## Task 20: End-to-End Smoke Test

- [ ] **Step 1: Seed database**

Run: `cd server && npm run seed`

- [ ] **Step 2: Start backend**

Run: `cd server && npm run dev`

- [ ] **Step 3: Start frontend**

Run: `npm run dev`

- [ ] **Step 4: Manual verification checklist**

| Page | Check | Status |
|------|-------|--------|
| Home | Threads load in sidebar | |
| Home | Chat sends and receives AI response | |
| Home | GPA/credits/alerts show from API | |
| Explorer | Major cards load from API | |
| Comparison | Radar chart shows real module data | |
| Schedule | Course rows load from API | |
| Schedule | Conflicts display correctly | |
| Graph | Nodes render from API data | |
| Graph | "Add to Planner" creates schedule entry | |
| Settings | API key field shows masked value | |
| Settings | Transcript upload works | |
| Settings | "Initialize Reset" clears data | |
| Sidebar | User name/credits from API | |
| TopBar | AI status reflects health check | |

- [ ] **Step 5: Run all backend tests**

Run: `cd server && npx vitest run`
Expected: All PASS

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete backend integration for all ModuleMate features"
```

---

## API Endpoint Summary

| Method | Endpoint | UI Feature |
|--------|----------|------------|
| GET | `/api/health` | TopBar AI status indicator |
| GET | `/api/modules` | GraphView nodes, ComparisonView dropdowns |
| GET | `/api/modules/:code` | GraphView details panel, ComparisonView radar |
| PATCH | `/api/modules/:code` | Mark module completed/available |
| GET | `/api/modules/compare?a=X&b=Y` | ComparisonView AI recommendation |
| GET | `/api/majors` | ExplorerView major cards |
| GET | `/api/majors/:id` | ExplorerView "Preview Path" |
| GET | `/api/schedule` | ScheduleView course rows + conflicts |
| POST | `/api/schedule` | GraphView "Add to Planner" button |
| DELETE | `/api/schedule/:id` | Remove course from schedule |
| GET | `/api/schedule/conflicts` | ScheduleView conflict banner |
| GET | `/api/chat/threads` | HomeView recent threads sidebar |
| POST | `/api/chat/threads` | Create new chat thread |
| DELETE | `/api/chat/threads/:id` | Delete chat thread |
| GET | `/api/chat/threads/:id/messages` | HomeView message history |
| POST | `/api/chat/threads/:id/messages` | HomeView send button |
| GET | `/api/user/profile` | Sidebar user card |
| PATCH | `/api/user/profile` | Edit profile fields |
| GET | `/api/user/stats` | HomeView academic stats + alerts |
| POST | `/api/user/reset` | SettingsView "Initialize Reset" |
| GET | `/api/transcripts` | SettingsView transcript table |
| POST | `/api/transcripts` | SettingsView "Upload New Transcript" |
| DELETE | `/api/transcripts/:id` | SettingsView transcript delete button |
| GET | `/api/settings` | SettingsView API key display |
| PATCH | `/api/settings` | SettingsView save API key |
