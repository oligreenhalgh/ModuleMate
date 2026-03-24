import type { Module, Major, Message } from '../types';

const BASE = import.meta.env.VITE_API_URL || '/api';

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
export interface PathSemester {
  name: string;
  modules: { code: string; name: string; credits: number }[];
}
export interface MajorPath {
  semesters: PathSemester[];
  summary: string;
}
export const getMajorPath = (id: string) => request<MajorPath>(`/majors/${id}/path`);
export interface SearchResult {
  name: string;
  description: string;
  relevance: string;
}
export const searchMajorsAI = (query: string) =>
  request<{ results: SearchResult[] }>('/majors/search', {
    method: 'POST',
    body: JSON.stringify({ query }),
  });

// Schedule
export interface ScheduleEntry {
  id: string;
  module_code: string;
  course_name: string;
  schedule: string;
  professor: string;
  credits: number;
  semester: string;
}
export interface Conflict {
  modules: string[];
  day: string;
  description: string;
}
export const getSchedule = () =>
  request<{ entries: ScheduleEntry[]; conflicts: Conflict[] }>('/schedule');
export const addScheduleEntry = (entry: Omit<ScheduleEntry, 'id'>) =>
  request<{ id: string }>('/schedule', { method: 'POST', body: JSON.stringify(entry) });
export const deleteScheduleEntry = (id: string) =>
  request(`/schedule/${id}`, { method: 'DELETE' });

// Chat
export interface Thread {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}
export const getThreads = () => request<Thread[]>('/chat/threads');
export const createThread = (title: string) =>
  request<Thread>('/chat/threads', { method: 'POST', body: JSON.stringify({ title }) });
export const deleteThread = (id: string) =>
  request(`/chat/threads/${id}`, { method: 'DELETE' });
export const getMessages = (threadId: string) =>
  request<Message[]>(`/chat/threads/${threadId}/messages`);
export const sendMessage = (threadId: string, content: string) =>
  request<Message>(`/chat/threads/${threadId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });

// User
export interface UserProfile {
  name: string;
  program: string;
  gpa: number;
  gpa_max: number;
  gpa_trend: number;
  total_credits: number;
  required_credits: number;
  major_credits: number;
  major_required: number;
  ue_credits: number;
  ue_required: number;
  ai_credits_used: number;
  ai_credits_max: number;
}
export interface UserStats extends UserProfile {
  alerts: { module: string; unmetPrereqs: string[] }[];
}
export const getProfile = () => request<UserProfile>('/user/profile');
export const updateProfile = (data: Partial<UserProfile>) =>
  request('/user/profile', { method: 'PATCH', body: JSON.stringify(data) });
export const getStats = () => request<UserStats>('/user/stats');
export const resetProfile = () => request('/user/reset', { method: 'POST' });

// Transcripts
export interface Transcript {
  id: string;
  filename: string;
  type: string;
  processed_date: string;
}
export const getTranscripts = () => request<Transcript[]>('/transcripts');
export const uploadTranscript = (file: File, type?: string) => {
  const form = new FormData();
  form.append('file', file);
  if (type) form.append('type', type);
  return fetch(`${BASE}/transcripts`, {
    method: 'POST',
    body: form,
    credentials: 'include',
  }).then((r) => r.json());
};
export const deleteTranscript = (id: string) =>
  request(`/transcripts/${id}`, { method: 'DELETE' });

// Settings
export const getSettings = () => request<Record<string, string>>('/settings');
export const updateSettings = (data: Record<string, string>) =>
  request('/settings', { method: 'PATCH', body: JSON.stringify(data) });
