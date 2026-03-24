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

    CREATE TABLE IF NOT EXISTS uob_modules (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      credits REAL NOT NULL DEFAULT 20,
      year INTEGER NOT NULL DEFAULT 1,
      historical_a_rate REAL NOT NULL DEFAULT 0,
      avg_weekly_hours REAL NOT NULL DEFAULT 0,
      type TEXT NOT NULL DEFAULT 'Core' CHECK(type IN ('Core','Elective')),
      workload INTEGER NOT NULL DEFAULT 0,
      difficulty INTEGER NOT NULL DEFAULT 0,
      theory INTEGER NOT NULL DEFAULT 0,
      project INTEGER NOT NULL DEFAULT 0,
      exam INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS uob_prerequisites (
      module_code TEXT NOT NULL REFERENCES uob_modules(code),
      prerequisite_code TEXT NOT NULL REFERENCES uob_modules(code),
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
      roadmap_modules TEXT DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      name TEXT NOT NULL DEFAULT 'Alex Chen',
      program TEXT NOT NULL DEFAULT 'L4 Computer Science',
      gpa REAL NOT NULL DEFAULT 68,
      gpa_max REAL NOT NULL DEFAULT 100,
      gpa_trend REAL NOT NULL DEFAULT 3,
      total_credits INTEGER NOT NULL DEFAULT 40,
      required_credits INTEGER NOT NULL DEFAULT 360,
      major_credits INTEGER NOT NULL DEFAULT 40,
      major_required INTEGER NOT NULL DEFAULT 280,
      ue_credits INTEGER NOT NULL DEFAULT 0,
      ue_required INTEGER NOT NULL DEFAULT 80,
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

  // Migrations
  const cols = db.prepare("PRAGMA table_info(chat_messages)").all() as { name: string }[];
  if (!cols.some(c => c.name === 'roadmap_modules')) {
    db.exec("ALTER TABLE chat_messages ADD COLUMN roadmap_modules TEXT DEFAULT '[]'");
  }
  if (!cols.some(c => c.name === 'roadmap_data')) {
    db.exec("ALTER TABLE chat_messages ADD COLUMN roadmap_data TEXT DEFAULT NULL");
  }

  // Seed UoB modules if empty
  const uobCount = db.prepare('SELECT COUNT(*) as c FROM uob_modules').get() as { c: number };
  if (uobCount.c === 0) {
    seedUoBModules(db);
  }
}

function seedUoBModules(db: Database.Database) {
  const insert = db.prepare(
    `INSERT OR IGNORE INTO uob_modules (code, name, description, credits, year, historical_a_rate, avg_weekly_hours, type, workload, difficulty, theory, project, exam)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertPrereq = db.prepare(
    `INSERT OR IGNORE INTO uob_prerequisites (module_code, prerequisite_code) VALUES (?, ?)`
  );

  const modules = [
    // Year 1
    ['06-34253', 'Software Workshop 1', 'Introduction to programming in Java covering fundamentals, control flow, arrays, and basic OOP concepts.', 20, 1, 32, 10, 'Core', 70, 45, 40, 75, 50],
    ['06-34254', 'Software Workshop 2', 'Continuation of Software Workshop 1, covering advanced Java, GUI programming, and software design.', 20, 1, 28, 10, 'Core', 65, 50, 35, 80, 45],
    ['06-34252', 'Object Oriented Programming', 'Core OOP principles including inheritance, polymorphism, encapsulation, and design patterns in Java.', 20, 1, 25, 9, 'Core', 60, 55, 50, 65, 60],
    ['06-34248', 'Data Structures and Algorithms', 'Fundamental data structures (lists, trees, graphs, hash tables) and algorithm design and analysis.', 20, 1, 22, 11, 'Core', 75, 70, 80, 30, 80],
    ['06-34249', 'Mathematical Foundations of CS', 'Discrete mathematics, set theory, proof techniques, combinatorics, and probability for computer science.', 20, 1, 18, 10, 'Core', 65, 65, 95, 5, 90],
    ['06-34251', 'Logic and Computation', 'Propositional and predicate logic, formal proof systems, computability theory, and introduction to formal methods.', 20, 1, 15, 9, 'Core', 60, 70, 95, 10, 85],
    // Year 2
    ['06-35340', 'Software Engineering', 'Software development methodologies, requirements engineering, testing, version control, and team-based development.', 20, 2, 30, 10, 'Core', 70, 55, 40, 80, 40],
    ['06-35342', 'Functional Programming', 'Functional programming paradigm using Haskell, covering recursion, higher-order functions, types, and monads.', 20, 2, 20, 10, 'Core', 65, 72, 75, 40, 70],
    ['06-35341', 'Security of Real-World Systems', 'Cryptography, network security, authentication, access control, and security analysis of real systems.', 20, 2, 24, 9, 'Core', 60, 60, 65, 45, 65],
    ['06-35343', 'Databases', 'Relational database design, SQL, normalisation, transaction processing, and NoSQL databases.', 20, 2, 28, 8, 'Core', 55, 50, 55, 60, 55],
    ['06-35344', 'Operating Systems', 'Process management, memory management, file systems, concurrency, and systems programming in C.', 20, 2, 18, 11, 'Core', 75, 75, 70, 45, 75],
    ['06-35345', 'Theories of Computation', 'Formal languages, automata theory, Turing machines, decidability, and computational complexity.', 20, 2, 15, 10, 'Core', 65, 80, 95, 5, 90],
    ['06-35346', 'Team Project', 'Large-scale group software project applying software engineering principles to a real client brief.', 40, 2, 35, 15, 'Core', 85, 60, 15, 95, 10],
    ['06-35347', 'Computer Vision and Imaging', 'Image processing, feature detection, object recognition, and introduction to deep learning for vision.', 20, 2, 22, 9, 'Elective', 60, 65, 70, 50, 60],
    ['06-35348', 'Artificial Intelligence 2', 'Search algorithms, knowledge representation, planning, probabilistic reasoning, and machine learning basics.', 20, 2, 20, 10, 'Elective', 65, 68, 75, 40, 70],
    // Year 3
    ['06-36550', 'Final Year Project', 'Independent research or development project supervised by an academic, with dissertation and demo.', 40, 3, 40, 20, 'Core', 90, 70, 30, 90, 10],
    ['06-36551', 'Machine Learning', 'Supervised and unsupervised learning, neural networks, SVMs, ensemble methods, and practical applications.', 20, 3, 25, 12, 'Elective', 75, 78, 70, 50, 65],
    ['06-36552', 'Natural Language Processing', 'Text processing, language models, sentiment analysis, named entity recognition, and transformer architectures.', 20, 3, 22, 11, 'Elective', 70, 75, 65, 55, 60],
    ['06-36553', 'Intelligent Robotics', 'Robot kinematics, sensors, path planning, SLAM, and autonomous decision making.', 20, 3, 20, 10, 'Elective', 65, 72, 60, 60, 55],
    ['06-36554', 'Neural Computation', 'Biological neural networks, perceptrons, deep learning architectures, backpropagation, and applications.', 20, 3, 18, 11, 'Elective', 70, 80, 80, 35, 70],
    ['06-36555', 'Advanced Networking', 'Network protocols, software-defined networking, network security, cloud networking, and performance analysis.', 20, 3, 20, 9, 'Elective', 60, 65, 70, 40, 70],
    ['06-36556', 'Human Computer Interaction', 'User-centred design, usability evaluation, prototyping, accessibility, and interaction paradigms.', 20, 3, 30, 8, 'Elective', 50, 45, 45, 75, 40],
    ['06-36557', 'Computer Science Masters Research', 'Advanced topics seminar covering current research frontiers in computer science.', 20, 3, 15, 10, 'Elective', 60, 70, 85, 25, 75],
    ['06-34250', 'Artificial Intelligence 1', 'Introduction to AI concepts, intelligent agents, search, game playing, and knowledge representation.', 20, 1, 20, 9, 'Core', 60, 60, 70, 40, 70],
    ['06-36558', 'Cyber Security', 'Advanced security topics including penetration testing, malware analysis, digital forensics, and security policy.', 20, 3, 22, 10, 'Elective', 65, 68, 55, 60, 60],
    ['06-34255', 'Computer Systems', 'Computer architecture, assembly language, digital logic, memory hierarchy, and low-level programming.', 20, 1, 18, 10, 'Core', 70, 65, 75, 35, 75],
  ];

  for (const m of modules) {
    insert.run(...m);
  }

  // Prerequisites - building realistic dependency chains
  const prereqs: [string, string][] = [
    // Year 1 → Year 1 (within-year dependencies)
    ['06-34254', '06-34253'],  // SW2 requires SW1
    ['06-34252', '06-34253'],  // OOP requires SW1

    // Year 1 → Year 2 (core progression)
    ['06-35340', '06-34254'],  // SE requires SW2
    ['06-35340', '06-34252'],  // SE requires OOP
    ['06-35342', '06-34251'],  // FP requires Logic
    ['06-35342', '06-34249'],  // FP requires Maths
    ['06-35341', '06-34255'],  // Security requires Computer Systems
    ['06-35343', '06-34254'],  // Databases requires SW2
    ['06-35343', '06-34252'],  // Databases requires OOP
    ['06-35344', '06-34255'],  // OS requires Computer Systems
    ['06-35344', '06-34253'],  // OS requires SW1
    ['06-35345', '06-34251'],  // ToC requires Logic
    ['06-35345', '06-34249'],  // ToC requires Maths
    ['06-35347', '06-34248'],  // CV requires DSA
    ['06-35347', '06-34249'],  // CV requires Maths
    ['06-35348', '06-34250'],  // AI2 requires AI1
    ['06-35348', '06-34248'],  // AI2 requires DSA

    // Year 2 → Year 2 (within-year)
    ['06-35346', '06-35340'],  // Team Project requires SE
    ['06-35346', '06-35343'],  // Team Project requires Databases

    // Year 2 → Year 3 (specialisation paths)
    ['06-36550', '06-35346'],  // FYP requires Team Project
    ['06-36550', '06-35340'],  // FYP requires SE
    ['06-36551', '06-35348'],  // ML requires AI2
    ['06-36551', '06-34248'],  // ML requires DSA
    ['06-36552', '06-35348'],  // NLP requires AI2
    ['06-36552', '06-35342'],  // NLP requires FP (text processing)
    ['06-36553', '06-35348'],  // Robotics requires AI2
    ['06-36553', '06-35344'],  // Robotics requires OS (systems)
    ['06-36554', '06-34249'],  // Neural Comp requires Maths
    ['06-36554', '06-35348'],  // Neural Comp requires AI2
    ['06-36555', '06-35341'],  // Adv Networking requires Security
    ['06-36555', '06-35344'],  // Adv Networking requires OS
    ['06-36556', '06-35340'],  // HCI requires SE
    ['06-36556', '06-35346'],  // HCI requires Team Project
    ['06-36557', '06-35345'],  // CS Masters Research requires ToC
    ['06-36557', '06-35342'],  // CS Masters Research requires FP
    ['06-36558', '06-35341'],  // Cyber Sec requires Security
    ['06-36558', '06-35344'],  // Cyber Sec requires OS
  ];

  for (const [mod, prereq] of prereqs) {
    insertPrereq.run(mod, prereq);
  }

  console.log('✅ Seeded UoB BSc Computer Science modules');
}

export function closeDb() {
  if (db) {
    db.close();
    db = undefined as any;
  }
}
