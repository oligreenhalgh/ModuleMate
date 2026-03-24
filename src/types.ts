export interface Module {
  code: string;
  name: string;
  description: string;
  credits: number;
  historicalARate: number;
  avgWeeklyHours: number;
  prerequisites: string[];
  unlocks: string[];
  status: 'completed' | 'available' | 'locked';
  type: 'Core' | 'Elective';
  workload: number; // 0-100
  difficulty: number; // 0-100
  theory: number; // 0-100
  project: number; // 0-100
  exam: number; // 0-100
}

export interface Major {
  id: string;
  name: string;
  description: string;
  aiMatch: number;
  careerOutcomes: string[];
  foundationalModules: string[];
}

export interface RoadmapData {
  semesters: { name: string; modules: { code: string; name: string; credits: number }[] }[];
  summary: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
  modules?: string[];
  roadmap?: RoadmapData;
}
