import { getDb, closeDb } from './db.js';

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

const MODULES: ModuleData[] = [
  {
    code: 'CS1010',
    name: 'Programming Methodology',
    description: 'Introduction to computer programming and problem solving.',
    credits: 4.0,
    historicalARate: 35.2,
    avgWeeklyHours: 10.5,
    prerequisites: [],
    status: 'completed',
    type: 'Core',
    workload: 40,
    difficulty: 30,
    theory: 20,
    project: 50,
    exam: 60,
  },
  {
    code: 'CS2030',
    name: 'Programming Methodology II',
    description: 'Advanced programming paradigms including OOP and functional programming.',
    credits: 4.0,
    historicalARate: 28.5,
    avgWeeklyHours: 12.0,
    prerequisites: ['CS1010'],
    status: 'completed',
    type: 'Core',
    workload: 60,
    difficulty: 50,
    theory: 40,
    project: 70,
    exam: 50,
  },
  {
    code: 'CS2040',
    name: 'Data Structures & Algos',
    description: 'Fundamental data structures and algorithms for efficient computation.',
    credits: 4.0,
    historicalARate: 22.1,
    avgWeeklyHours: 14.5,
    prerequisites: ['CS1010'],
    status: 'completed',
    type: 'Core',
    workload: 70,
    difficulty: 75,
    theory: 60,
    project: 40,
    exam: 80,
  },
  {
    code: 'CS3230',
    name: 'Design and Analysis of Algorithms',
    description: 'Advanced study of algorithm design paradigms and theoretical complexity analysis.',
    credits: 4.0,
    historicalARate: 18.2,
    avgWeeklyHours: 16.8,
    prerequisites: ['CS2030', 'CS2040'],
    status: 'available',
    type: 'Core',
    workload: 85,
    difficulty: 90,
    theory: 95,
    project: 30,
    exam: 90,
  },
  {
    code: 'CS2105',
    name: 'Intro to Computer Networks',
    description: 'Fundamental concepts of computer networking and protocols.',
    credits: 4.0,
    historicalARate: 24.5,
    avgWeeklyHours: 12.5,
    prerequisites: ['CS1010'],
    status: 'available',
    type: 'Core',
    workload: 50,
    difficulty: 45,
    theory: 55,
    project: 60,
    exam: 70,
  },
  {
    code: 'CS2106',
    name: 'Introduction to OS',
    description: 'Concepts and principles of operating systems.',
    credits: 4.0,
    historicalARate: 18.2,
    avgWeeklyHours: 16.8,
    prerequisites: ['CS1010'],
    status: 'available',
    type: 'Core',
    workload: 80,
    difficulty: 85,
    theory: 70,
    project: 90,
    exam: 80,
  },
  {
    code: 'CS4231',
    name: 'Parallel and Distributed Algorithms',
    description: 'Algorithms for parallel and distributed computing systems.',
    credits: 4.0,
    historicalARate: 15.5,
    avgWeeklyHours: 18.0,
    prerequisites: ['CS3230'],
    status: 'locked',
    type: 'Elective',
    workload: 90,
    difficulty: 95,
    theory: 90,
    project: 60,
    exam: 85,
  },
];

const MAJORS: MajorData[] = [
  {
    id: 'cs',
    name: 'B.S. Computer Science',
    description: 'Focus on foundational computation theory, algorithm design, and scalable systems architecture.',
    aiMatch: 92,
    careerOutcomes: ['Systems Architect', 'Full-stack Engineer', 'Security Analyst'],
    foundationalModules: ['CS1010', 'MA1521', 'CS2030S', 'CS2040C'],
  },
  {
    id: 'dsai',
    name: 'Data Science & AI',
    description: 'Harness statistical modeling and machine learning to derive intelligence from complex datasets.',
    aiMatch: 88,
    careerOutcomes: ['ML Engineer', 'Data Scientist', 'Quantitative Analyst'],
    foundationalModules: ['ST2334', 'DSA1101', 'CS3244', 'ST3131'],
  },
  {
    id: 'media',
    name: 'Interactive Media',
    description: 'Intersection of design, HCI, and game development to create immersive digital experiences.',
    aiMatch: 76,
    careerOutcomes: ['UX Engineer', 'Game Designer', 'XR Developer'],
    foundationalModules: ['NM2101', 'CS3240', 'NM3216', 'NM4210'],
  },
  {
    id: 'biz',
    name: 'Business Analytics',
    description: 'Synthesizing data insight with business strategy to optimize organizational decision-making.',
    aiMatch: 64,
    careerOutcomes: ['Product Manager', 'Business Consultant', 'Analytics Manager'],
    foundationalModules: ['BT1101', 'BT2102', 'IS2101', 'EC1101E'],
  },
];

function seed() {
  const db = getDb();

  // Clear existing data
  db.exec('DELETE FROM module_prerequisites');
  db.exec('DELETE FROM modules');
  db.exec('DELETE FROM majors');

  // Insert modules
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
  console.log(`Seeded ${MODULES.length} modules`);

  // Insert majors
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
  console.log(`Seeded ${MAJORS.length} majors`);

  closeDb();
  console.log('Seed complete!');
}

seed();
