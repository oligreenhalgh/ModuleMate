import { getDb, closeDb } from './db.js';
import { randomUUID } from 'crypto';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ModuleData {
  code: string;
  name: string;
  description: string;
  credits: number;
  historicalARate: number;
  avgWeeklyHours: number;
  prerequisites: string[];
  status: 'completed' | 'available' | 'locked';
  type: 'Core' | 'Elective';
  workload: number;
  difficulty: number;
  theory: number;
  project: number;
  exam: number;
}

interface MajorData {
  id: string;
  name: string;
  description: string;
  aiMatch: number;
  careerOutcomes: string[];
  foundationalModules: string[];
}

interface ScheduleEntry {
  id: string;
  moduleCode: string;
  courseName: string;
  schedule: string;
  professor: string;
  credits: number;
  semester: string;
}

// ─── Modules ─────────────────────────────────────────────────────────────────

const MODULES: ModuleData[] = [
  // ═══ YEAR 1 (Level 4) — All completed ═══
  {
    code: 'CS1010',
    name: 'Programming Methodology',
    description: 'Introduction to programming using Python and C. Covers control flow, functions, recursion, basic data structures, and problem-solving strategies. Weekly lab sessions reinforce lecture material with hands-on coding exercises.',
    credits: 4,
    historicalARate: 42.5,
    avgWeeklyHours: 10,
    prerequisites: [],
    status: 'completed',
    type: 'Core',
    workload: 35,
    difficulty: 25,
    theory: 25,
    project: 45,
    exam: 50,
  },
  {
    code: 'CS1020',
    name: 'Discrete Mathematics',
    description: 'Mathematical foundations for computer science: propositional and predicate logic, sets, relations, functions, proof techniques, combinatorics, graph theory, and recurrence relations.',
    credits: 4,
    historicalARate: 30.2,
    avgWeeklyHours: 12,
    prerequisites: [],
    status: 'completed',
    type: 'Core',
    workload: 45,
    difficulty: 45,
    theory: 80,
    project: 10,
    exam: 70,
  },
  {
    code: 'CS1030',
    name: 'Computer Architecture',
    description: 'Digital logic, Boolean algebra, combinational and sequential circuits, assembly language programming, CPU organisation, memory hierarchy, and I/O systems. Includes MIPS assembly labs.',
    credits: 4,
    historicalARate: 28.8,
    avgWeeklyHours: 11,
    prerequisites: [],
    status: 'completed',
    type: 'Core',
    workload: 45,
    difficulty: 50,
    theory: 60,
    project: 30,
    exam: 65,
  },
  {
    code: 'CS1040',
    name: 'Web Fundamentals',
    description: 'Introduction to web technologies: HTML5, CSS3, JavaScript, responsive design, accessibility, and basic server-side concepts. Students build a portfolio website as a term project.',
    credits: 4,
    historicalARate: 55.0,
    avgWeeklyHours: 9,
    prerequisites: [],
    status: 'completed',
    type: 'Elective',
    workload: 30,
    difficulty: 20,
    theory: 20,
    project: 60,
    exam: 25,
  },
  {
    code: 'CS1050',
    name: 'Linear Algebra',
    description: 'Vectors, matrices, systems of linear equations, determinants, eigenvalues and eigenvectors, vector spaces, linear transformations. Applications to computer graphics and data analysis.',
    credits: 4,
    historicalARate: 32.0,
    avgWeeklyHours: 11,
    prerequisites: [],
    status: 'completed',
    type: 'Core',
    workload: 42,
    difficulty: 48,
    theory: 75,
    project: 15,
    exam: 70,
  },
  {
    code: 'CS1060',
    name: 'Professional Computing',
    description: 'Ethics in computing, intellectual property, data protection law (GDPR), professional bodies (BCS), teamwork and communication skills, technical writing, and career development.',
    credits: 2,
    historicalARate: 65.0,
    avgWeeklyHours: 8,
    prerequisites: [],
    status: 'completed',
    type: 'Core',
    workload: 30,
    difficulty: 20,
    theory: 40,
    project: 35,
    exam: 20,
  },

  // ═══ YEAR 2 (Level 5) — Mix of completed and available ═══
  {
    code: 'CS2010',
    name: 'Data Structures & Algorithms',
    description: 'Arrays, linked lists, stacks, queues, trees, heaps, hash tables, graphs. Sorting and searching algorithms, complexity analysis (Big-O), and algorithm design strategies including divide-and-conquer and greedy approaches.',
    credits: 4,
    historicalARate: 22.5,
    avgWeeklyHours: 14,
    prerequisites: ['CS1010', 'CS1020'],
    status: 'completed',
    type: 'Core',
    workload: 65,
    difficulty: 70,
    theory: 55,
    project: 40,
    exam: 70,
  },
  {
    code: 'CS2020',
    name: 'Object-Oriented Programming',
    description: 'OOP principles in Java: encapsulation, inheritance, polymorphism, abstraction. Design patterns (Factory, Observer, Strategy), SOLID principles, unit testing with JUnit, and GUI development.',
    credits: 4,
    historicalARate: 35.0,
    avgWeeklyHours: 12,
    prerequisites: ['CS1010'],
    status: 'completed',
    type: 'Core',
    workload: 50,
    difficulty: 45,
    theory: 35,
    project: 55,
    exam: 45,
  },
  {
    code: 'CS2030',
    name: 'Database Systems',
    description: 'Relational model, SQL, ER modelling, normalisation (1NF–BCNF), transaction management, concurrency control, indexing, and query optimisation. Practical work with PostgreSQL.',
    credits: 4,
    historicalARate: 30.5,
    avgWeeklyHours: 12,
    prerequisites: ['CS1010'],
    status: 'completed',
    type: 'Core',
    workload: 50,
    difficulty: 50,
    theory: 50,
    project: 45,
    exam: 55,
  },
  {
    code: 'CS2040',
    name: 'Operating Systems',
    description: 'Process management, threads, CPU scheduling, synchronisation, deadlocks, memory management (paging, segmentation), virtual memory, file systems, and I/O. Labs in C on Linux.',
    credits: 4,
    historicalARate: 20.0,
    avgWeeklyHours: 15,
    prerequisites: ['CS1030'],
    status: 'completed',
    type: 'Core',
    workload: 70,
    difficulty: 72,
    theory: 55,
    project: 45,
    exam: 65,
  },
  {
    code: 'CS2050',
    name: 'Software Engineering',
    description: 'Software development lifecycle, Agile/Scrum, requirements engineering, UML modelling, version control (Git), CI/CD, testing strategies, and team-based project delivery.',
    credits: 4,
    historicalARate: 38.0,
    avgWeeklyHours: 13,
    prerequisites: ['CS1010', 'CS2020'],
    status: 'available',
    type: 'Core',
    workload: 55,
    difficulty: 42,
    theory: 35,
    project: 60,
    exam: 35,
  },
  {
    code: 'CS2060',
    name: 'Computer Networks',
    description: 'OSI and TCP/IP models, Ethernet, IP addressing, routing protocols, TCP/UDP, DNS, HTTP, network security basics, and socket programming. Wireshark labs for packet analysis.',
    credits: 4,
    historicalARate: 26.0,
    avgWeeklyHours: 12,
    prerequisites: ['CS1030'],
    status: 'available',
    type: 'Core',
    workload: 52,
    difficulty: 50,
    theory: 55,
    project: 35,
    exam: 60,
  },
  {
    code: 'CS2070',
    name: 'Statistics for CS',
    description: 'Probability theory, random variables, distributions, hypothesis testing, confidence intervals, regression analysis, Bayesian inference. Applications in A/B testing and data-driven decision making.',
    credits: 4,
    historicalARate: 25.5,
    avgWeeklyHours: 13,
    prerequisites: ['CS1020', 'CS1050'],
    status: 'available',
    type: 'Core',
    workload: 55,
    difficulty: 58,
    theory: 70,
    project: 25,
    exam: 65,
  },
  {
    code: 'CS2080',
    name: 'Human-Computer Interaction',
    description: 'User-centred design, usability evaluation, cognitive psychology for interfaces, prototyping (Figma), accessibility standards (WCAG), and interaction design patterns.',
    credits: 4,
    historicalARate: 45.0,
    avgWeeklyHours: 10,
    prerequisites: ['CS1040'],
    status: 'available',
    type: 'Elective',
    workload: 40,
    difficulty: 32,
    theory: 30,
    project: 55,
    exam: 30,
  },

  // ═══ YEAR 3 (Level 6) — Available or Locked ═══
  {
    code: 'CS3010',
    name: 'Algorithm Design & Analysis',
    description: 'Dynamic programming, network flow, NP-completeness, approximation algorithms, randomised algorithms, amortised analysis. Emphasis on formal proofs of correctness and complexity bounds.',
    credits: 4,
    historicalARate: 18.0,
    avgWeeklyHours: 16,
    prerequisites: ['CS2010'],
    status: 'available',
    type: 'Core',
    workload: 75,
    difficulty: 82,
    theory: 80,
    project: 20,
    exam: 70,
  },
  {
    code: 'CS3020',
    name: 'Machine Learning',
    description: 'Supervised learning (regression, classification, SVMs, decision trees), unsupervised learning (clustering, PCA), neural networks, model evaluation, bias-variance tradeoff. Practical work in Python with scikit-learn.',
    credits: 4,
    historicalARate: 24.0,
    avgWeeklyHours: 15,
    prerequisites: ['CS2070', 'CS2010'],
    status: 'locked',
    type: 'Elective',
    workload: 70,
    difficulty: 72,
    theory: 60,
    project: 50,
    exam: 50,
  },
  {
    code: 'CS3030',
    name: 'Computer Security',
    description: 'Threat modelling, authentication, access control, cryptographic primitives, web security (XSS, CSRF, SQLi), network security, penetration testing, and security policy. CTF-style practical exercises.',
    credits: 4,
    historicalARate: 27.0,
    avgWeeklyHours: 14,
    prerequisites: ['CS2060', 'CS2040'],
    status: 'locked',
    type: 'Elective',
    workload: 60,
    difficulty: 62,
    theory: 45,
    project: 50,
    exam: 50,
  },
  {
    code: 'CS3040',
    name: 'Distributed Systems',
    description: 'Distributed architectures, consensus protocols (Paxos, Raft), replication, consistency models, fault tolerance, MapReduce, microservices, and container orchestration (Docker, Kubernetes).',
    credits: 4,
    historicalARate: 20.0,
    avgWeeklyHours: 16,
    prerequisites: ['CS2040', 'CS2060'],
    status: 'locked',
    type: 'Elective',
    workload: 75,
    difficulty: 78,
    theory: 55,
    project: 50,
    exam: 55,
  },
  {
    code: 'CS3050',
    name: 'Compiler Design',
    description: 'Lexical analysis, parsing (LL, LR), abstract syntax trees, semantic analysis, intermediate representations, code generation, and optimisation. Students build a compiler for a subset of C.',
    credits: 4,
    historicalARate: 16.5,
    avgWeeklyHours: 17,
    prerequisites: ['CS2010', 'CS1030'],
    status: 'available',
    type: 'Elective',
    workload: 80,
    difficulty: 85,
    theory: 65,
    project: 55,
    exam: 55,
  },
  {
    code: 'CS3060',
    name: 'Software Architecture',
    description: 'Architectural patterns (MVC, microservices, event-driven), quality attributes, architectural decision records, domain-driven design, API design, and system documentation.',
    credits: 4,
    historicalARate: 35.0,
    avgWeeklyHours: 13,
    prerequisites: ['CS2050'],
    status: 'locked',
    type: 'Elective',
    workload: 55,
    difficulty: 50,
    theory: 45,
    project: 55,
    exam: 35,
  },
  {
    code: 'CS3070',
    name: 'Computer Vision',
    description: 'Image processing, feature detection, object recognition, segmentation, stereo vision, optical flow, and deep learning for vision (CNNs). Practical work with OpenCV and PyTorch.',
    credits: 4,
    historicalARate: 22.0,
    avgWeeklyHours: 15,
    prerequisites: ['CS2070', 'CS1050'],
    status: 'locked',
    type: 'Elective',
    workload: 70,
    difficulty: 74,
    theory: 55,
    project: 50,
    exam: 45,
  },
  {
    code: 'CS3080',
    name: 'Natural Language Processing',
    description: 'Text preprocessing, language models, word embeddings, sequence models (RNNs, Transformers), sentiment analysis, named entity recognition, and machine translation fundamentals.',
    credits: 4,
    historicalARate: 23.0,
    avgWeeklyHours: 15,
    prerequisites: ['CS2010', 'CS2070'],
    status: 'locked',
    type: 'Elective',
    workload: 70,
    difficulty: 72,
    theory: 55,
    project: 50,
    exam: 45,
  },
  {
    code: 'CS3090',
    name: 'Cloud Computing',
    description: 'Cloud service models (IaaS, PaaS, SaaS), virtualisation, serverless computing, AWS/Azure fundamentals, infrastructure as code (Terraform), auto-scaling, and cost optimisation.',
    credits: 4,
    historicalARate: 32.0,
    avgWeeklyHours: 13,
    prerequisites: ['CS2040', 'CS2060'],
    status: 'locked',
    type: 'Elective',
    workload: 58,
    difficulty: 52,
    theory: 35,
    project: 55,
    exam: 40,
  },
  {
    code: 'CS3100',
    name: 'Mobile App Development',
    description: 'Cross-platform development with React Native and Flutter. Mobile UI/UX patterns, state management, device APIs (camera, GPS), offline storage, and app store deployment.',
    credits: 4,
    historicalARate: 40.0,
    avgWeeklyHours: 13,
    prerequisites: ['CS2020', 'CS1040'],
    status: 'locked',
    type: 'Elective',
    workload: 55,
    difficulty: 45,
    theory: 25,
    project: 60,
    exam: 30,
  },
  {
    code: 'CS3110',
    name: 'Data Mining',
    description: 'Association rules, classification, clustering, anomaly detection, text mining, recommender systems, and ethical considerations. Hands-on projects with real-world datasets using Python and Weka.',
    credits: 4,
    historicalARate: 28.0,
    avgWeeklyHours: 14,
    prerequisites: ['CS2030', 'CS2070'],
    status: 'locked',
    type: 'Elective',
    workload: 62,
    difficulty: 58,
    theory: 50,
    project: 50,
    exam: 45,
  },
  {
    code: 'CS3120',
    name: 'Final Year Project',
    description: 'Independent research or development project supervised by academic staff. Students propose, design, implement, evaluate, and present a substantial piece of work. Assessed via dissertation and viva.',
    credits: 8,
    historicalARate: 30.0,
    avgWeeklyHours: 18,
    prerequisites: ['CS2050'],
    status: 'locked',
    type: 'Core',
    workload: 85,
    difficulty: 70,
    theory: 30,
    project: 60,
    exam: 20,
  },

  // ═══ YEAR 4 / Masters Electives — All locked ═══
  {
    code: 'CS4010',
    name: 'Advanced Algorithms',
    description: 'Parameterised complexity, streaming algorithms, online algorithms, competitive analysis, advanced graph algorithms, and algorithmic game theory.',
    credits: 4,
    historicalARate: 15.0,
    avgWeeklyHours: 18,
    prerequisites: ['CS3010'],
    status: 'locked',
    type: 'Elective',
    workload: 85,
    difficulty: 90,
    theory: 80,
    project: 20,
    exam: 70,
  },
  {
    code: 'CS4020',
    name: 'Deep Learning',
    description: 'CNNs, RNNs, GANs, Transformers, attention mechanisms, transfer learning, reinforcement learning. Advanced topics in generative models and self-supervised learning. GPU computing with PyTorch.',
    credits: 4,
    historicalARate: 20.0,
    avgWeeklyHours: 17,
    prerequisites: ['CS3020'],
    status: 'locked',
    type: 'Elective',
    workload: 80,
    difficulty: 82,
    theory: 55,
    project: 55,
    exam: 45,
  },
  {
    code: 'CS4030',
    name: 'Cryptography',
    description: 'Symmetric and asymmetric encryption, digital signatures, zero-knowledge proofs, elliptic curve cryptography, post-quantum cryptography, and formal security proofs.',
    credits: 4,
    historicalARate: 17.0,
    avgWeeklyHours: 17,
    prerequisites: ['CS3030', 'CS1020'],
    status: 'locked',
    type: 'Elective',
    workload: 78,
    difficulty: 85,
    theory: 75,
    project: 25,
    exam: 65,
  },
  {
    code: 'CS4040',
    name: 'Parallel Computing',
    description: 'Shared-memory and distributed-memory parallelism, OpenMP, MPI, GPU programming (CUDA), parallel algorithm design, performance analysis, and scalability.',
    credits: 4,
    historicalARate: 18.5,
    avgWeeklyHours: 16,
    prerequisites: ['CS3040'],
    status: 'locked',
    type: 'Elective',
    workload: 78,
    difficulty: 80,
    theory: 50,
    project: 50,
    exam: 55,
  },
  {
    code: 'CS4050',
    name: 'Quantum Computing',
    description: 'Qubits, quantum gates, entanglement, quantum circuits, Shor\'s and Grover\'s algorithms, quantum error correction, and programming with Qiskit. Requires strong linear algebra background.',
    credits: 4,
    historicalARate: 15.5,
    avgWeeklyHours: 19,
    prerequisites: ['CS4010', 'CS1050'],
    status: 'locked',
    type: 'Elective',
    workload: 88,
    difficulty: 95,
    theory: 80,
    project: 25,
    exam: 65,
  },
  {
    code: 'CS4060',
    name: 'Robotics & AI',
    description: 'Robot kinematics, path planning, SLAM, sensor fusion, reinforcement learning for control, computer vision for robotics, and ROS2 framework. Simulation and physical robot labs.',
    credits: 4,
    historicalARate: 22.0,
    avgWeeklyHours: 17,
    prerequisites: ['CS3020', 'CS3070'],
    status: 'locked',
    type: 'Elective',
    workload: 78,
    difficulty: 78,
    theory: 45,
    project: 55,
    exam: 40,
  },
];

// ─── Majors ──────────────────────────────────────────────────────────────────

const MAJORS: MajorData[] = [
  {
    id: 'cs-general',
    name: 'B.Sc. Computer Science',
    description: 'A broad foundation in computing covering algorithms, systems, and software development. Provides maximum flexibility to specialise through elective choices in later years.',
    aiMatch: 92,
    careerOutcomes: ['Software Engineer', 'Full-Stack Developer', 'Systems Architect', 'Technical Consultant', 'Graduate Researcher'],
    foundationalModules: ['CS1010', 'CS1020', 'CS2010', 'CS2040', 'CS2050', 'CS3010', 'CS3120'],
  },
  {
    id: 'software-eng',
    name: 'Software Engineering',
    description: 'Emphasis on building reliable, maintainable software at scale. Covers modern development practices, architecture patterns, testing, and team-based delivery.',
    aiMatch: 88,
    careerOutcomes: ['Software Engineer', 'DevOps Engineer', 'Engineering Manager', 'QA Lead', 'Solutions Architect'],
    foundationalModules: ['CS1010', 'CS2020', 'CS2050', 'CS2030', 'CS3060', 'CS3090', 'CS3120'],
  },
  {
    id: 'ai-ml',
    name: 'Artificial Intelligence & ML',
    description: 'Deep dive into machine learning, neural networks, and intelligent systems. Strong mathematical foundations combined with practical implementation skills.',
    aiMatch: 85,
    careerOutcomes: ['ML Engineer', 'Data Scientist', 'AI Researcher', 'NLP Engineer', 'Computer Vision Engineer'],
    foundationalModules: ['CS1050', 'CS2010', 'CS2070', 'CS3020', 'CS3070', 'CS3080', 'CS4020'],
  },
  {
    id: 'cyber-security',
    name: 'Cyber Security',
    description: 'Focused on protecting systems and networks from threats. Covers cryptography, network security, ethical hacking, and security policy — aligned with NCSC certification.',
    aiMatch: 78,
    careerOutcomes: ['Security Analyst', 'Penetration Tester', 'Security Architect', 'SOC Analyst', 'Forensic Investigator'],
    foundationalModules: ['CS1030', 'CS2040', 'CS2060', 'CS3030', 'CS4030', 'CS3040'],
  },
  {
    id: 'data-science',
    name: 'Data Science',
    description: 'Combines statistics, databases, and machine learning to extract insights from data. Strong emphasis on practical analytics, visualisation, and real-world datasets.',
    aiMatch: 82,
    careerOutcomes: ['Data Analyst', 'Data Scientist', 'Business Intelligence Developer', 'Quantitative Analyst', 'Analytics Consultant'],
    foundationalModules: ['CS1050', 'CS2030', 'CS2070', 'CS3020', 'CS3110', 'CS2010'],
  },
  {
    id: 'networks-systems',
    name: 'Computer Networks & Systems',
    description: 'Specialisation in network infrastructure, operating systems, distributed computing, and cloud platforms. Ideal for those interested in infrastructure and platform engineering.',
    aiMatch: 74,
    careerOutcomes: ['Network Engineer', 'Cloud Engineer', 'Platform Engineer', 'Site Reliability Engineer', 'Infrastructure Architect'],
    foundationalModules: ['CS1030', 'CS2040', 'CS2060', 'CS3040', 'CS3090', 'CS4040'],
  },
];

// ─── Schedule (current semester — Spring Year 3) ─────────────────────────────

const SCHEDULE: ScheduleEntry[] = [
  {
    id: randomUUID(),
    moduleCode: 'CS2050',
    courseName: 'Software Engineering',
    schedule: 'Mon 09:00-11:00 (Lecture), Wed 14:00-16:00 (Lab)',
    professor: 'Dr. Sarah Mitchell',
    credits: 4,
    semester: 'Spring 2026',
  },
  {
    id: randomUUID(),
    moduleCode: 'CS2060',
    courseName: 'Computer Networks',
    schedule: 'Tue 10:00-12:00 (Lecture), Thu 09:00-11:00 (Lab)',
    professor: 'Prof. James Walker',
    credits: 4,
    semester: 'Spring 2026',
  },
  {
    id: randomUUID(),
    moduleCode: 'CS2070',
    courseName: 'Statistics for CS',
    schedule: 'Mon 14:00-16:00 (Lecture), Fri 10:00-11:00 (Tutorial)',
    professor: 'Dr. Priya Kapoor',
    credits: 4,
    semester: 'Spring 2026',
  },
  {
    id: randomUUID(),
    moduleCode: 'CS3010',
    courseName: 'Algorithm Design & Analysis',
    schedule: 'Wed 10:00-12:00 (Lecture), Fri 13:00-15:00 (Problem Class)',
    professor: 'Prof. Richard Chen',
    credits: 4,
    semester: 'Spring 2026',
  },
  {
    id: randomUUID(),
    moduleCode: 'CS2080',
    courseName: 'Human-Computer Interaction',
    schedule: 'Thu 14:00-16:00 (Lecture), Tue 15:00-17:00 (Design Studio)',
    professor: 'Dr. Emma Lindström',
    credits: 4,
    semester: 'Spring 2026',
  },
];

// ─── Seed Function ───────────────────────────────────────────────────────────

function seed() {
  const db = getDb();

  console.log('🌱 Seeding ModuleMate database...\n');

  // ── Clear all existing data ──
  db.exec('DELETE FROM chat_messages');
  db.exec('DELETE FROM chat_threads');
  db.exec('DELETE FROM schedule_entries');
  db.exec('DELETE FROM module_prerequisites');
  db.exec('DELETE FROM modules');
  db.exec('DELETE FROM majors');

  // ── Insert modules ──
  const insertModule = db.prepare(`
    INSERT INTO modules (code, name, description, credits, historical_a_rate, avg_weekly_hours, status, type, workload, difficulty, theory, project, exam)
    VALUES (@code, @name, @description, @credits, @historicalARate, @avgWeeklyHours, @status, @type, @workload, @difficulty, @theory, @project, @exam)
  `);

  const insertPrereq = db.prepare(`
    INSERT INTO module_prerequisites (module_code, prerequisite_code)
    VALUES (@moduleCode, @prerequisiteCode)
  `);

  const insertModules = db.transaction(() => {
    for (const mod of MODULES) {
      insertModule.run({
        code: mod.code,
        name: mod.name,
        description: mod.description,
        credits: mod.credits,
        historicalARate: mod.historicalARate,
        avgWeeklyHours: mod.avgWeeklyHours,
        status: mod.status,
        type: mod.type,
        workload: mod.workload,
        difficulty: mod.difficulty,
        theory: mod.theory,
        project: mod.project,
        exam: mod.exam,
      });

      for (const prereq of mod.prerequisites) {
        insertPrereq.run({
          moduleCode: mod.code,
          prerequisiteCode: prereq,
        });
      }
    }
  });

  insertModules();
  console.log(`✅ Seeded ${MODULES.length} modules (with prerequisites)`);

  // ── Insert majors ──
  const insertMajor = db.prepare(`
    INSERT INTO majors (id, name, description, ai_match, career_outcomes, foundational_modules)
    VALUES (@id, @name, @description, @aiMatch, @careerOutcomes, @foundationalModules)
  `);

  const insertMajors = db.transaction(() => {
    for (const major of MAJORS) {
      insertMajor.run({
        id: major.id,
        name: major.name,
        description: major.description,
        aiMatch: major.aiMatch,
        careerOutcomes: JSON.stringify(major.careerOutcomes),
        foundationalModules: JSON.stringify(major.foundationalModules),
      });
    }
  });

  insertMajors();
  console.log(`✅ Seeded ${MAJORS.length} majors`);

  // ── Insert schedule entries ──
  const insertSchedule = db.prepare(`
    INSERT INTO schedule_entries (id, module_code, course_name, schedule, professor, credits, semester)
    VALUES (@id, @moduleCode, @courseName, @schedule, @professor, @credits, @semester)
  `);

  const insertScheduleEntries = db.transaction(() => {
    for (const entry of SCHEDULE) {
      insertSchedule.run(entry);
    }
  });

  insertScheduleEntries();
  console.log(`✅ Seeded ${SCHEDULE.length} schedule entries`);

  // ── Update user profile ──
  db.prepare(`
    UPDATE user_profile SET
      name = 'Alex Johnson',
      program = 'BSc Computer Science (Year 1)',
      gpa = 68,
      gpa_max = 100,
      gpa_trend = 3,
      total_credits = 40,
      required_credits = 360,
      major_credits = 40,
      major_required = 280,
      ue_credits = 0,
      ue_required = 80,
      ai_credits_used = 0,
      ai_credits_max = 1000
    WHERE id = 1
  `).run();
  console.log('✅ Updated user profile (Alex Johnson)');

  // ── Create welcome chat thread ──
  const welcomeThreadId = randomUUID();
  const welcomeMessageId = randomUUID();

  db.prepare(`
    INSERT INTO chat_threads (id, title, created_at, updated_at)
    VALUES (?, 'Welcome to ModuleMate', datetime('now'), datetime('now'))
  `).run(welcomeThreadId);

  db.prepare(`
    INSERT INTO chat_messages (id, thread_id, role, content, modules, created_at)
    VALUES (?, ?, 'model', ?, '[]', datetime('now'))
  `).run(
    welcomeMessageId,
    welcomeThreadId,
    `👋 Hi Alex! Welcome to ModuleMate — your AI-powered academic advisor.

Here's what I can help you with:

📚 **Module Planning** — Explore available modules, check prerequisites, and find what fits your schedule.

🎯 **Major Pathways** — Compare specialisations and see which modules align with your career goals.

📊 **Workload Analysis** — Balance your semester load by reviewing difficulty ratings and weekly hour estimates.

🗓️ **Schedule Conflicts** — I'll flag any timetable clashes before you commit.

You're in Year 3 with 72 credits completed — great progress! You've got some strong options opening up this semester. Just ask me anything to get started.`
  );
  console.log('✅ Created welcome chat thread');

  // ── Done ──
  closeDb();
  console.log('\n🎉 Seed complete!');
}

seed();
