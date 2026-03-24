import { GoogleGenAI } from '@google/genai';

const SYSTEM_INSTRUCTION = `You are ModuleMate, an AI university advisor for a 1st year student studying BSc Computer Science at the University of Birmingham (UoB).

IMPORTANT: Always use REAL module codes and names from the University of Birmingham BSc Computer Science programme. Key modules include:
- Year 1: Software Workshop 1 (LM), Software Workshop 2 (LM), Object Oriented Programming (LM), Data Structures and Algorithms (LM), Mathematical Foundations of Computer Science (LM), Logic and Computation (LM), Computer Systems (LM), Artificial Intelligence 1 (LM)
- Year 2: Software Engineering (LM), Functional Programming (LM), Security of Real-World Systems (LM), Computer Vision and Imaging (LM), Databases (LM), Operating Systems (LM), Theories of Computation (LM), Team Project (LM)
- Year 3: Final Year Project (LM), Machine Learning (LM), Computer Science Masters Option modules, Natural Language Processing (LM), Intelligent Robotics (LM), Neural Computation (LM), Advanced Networking (LM)

The student is in Year 1. Use UK grading conventions (percentage-based marks, degree classifications: First 70%+, 2:1 60-69%, 2:2 50-59%, Third 40-49%). Use 20-credit UK modules. Be concise, technical, and helpful. Use markdown for formatting. When you reference module codes, wrap them in backticks.`;

const ROADMAP_KEYWORDS = /\b(road\s*map|roadmap|study plan|module plan|degree plan|semester plan|course plan|path|pathway|generate.*plan)\b/i;

export async function chatWithGemini(
  messages: { role: string; content: string }[],
  apiKey: string
): Promise<{ content: string; modules: string[] }> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: messages.map(m => ({
      role: m.role as 'user' | 'model',
      parts: [{ text: m.content }],
    })),
    config: { systemInstruction: SYSTEM_INSTRUCTION },
  });
  const content = response.text || "I'm sorry, I couldn't process that request.";
  const modulePattern = /\b[A-Z]{2,4}\d{4}[A-Z]?\b/g;
  const modules = [...new Set(content.match(modulePattern) || [])];
  return { content, modules };
}

export function isRoadmapRequest(content: string): boolean {
  return ROADMAP_KEYWORDS.test(content);
}

export async function generateRoadmap(
  messages: { role: string; content: string }[],
  userContext: { program: string; gpa: number; total_credits: number; required_credits: number; completed_modules: string[] },
  apiKey: string
): Promise<{ semesters: { name: string; modules: { code: string; name: string; credits: number }[] }[]; summary: string }> {
  const ai = new GoogleGenAI({ apiKey });

  const contextBlock = `
STUDENT PROFILE:
- University: University of Birmingham
- Program: BSc Computer Science (Year 1)
- Overall Average: ${userContext.gpa}%
- Credits completed: ${userContext.total_credits}/${userContext.required_credits}
- Completed modules: ${userContext.completed_modules.length > 0 ? userContext.completed_modules.join(', ') : 'None yet'}

CONVERSATION CONTEXT:
${messages.map(m => `${m.role}: ${m.content}`).join('\n')}

Generate a personalized semester-by-semester module roadmap using REAL modules from the University of Birmingham BSc Computer Science programme. If the conversation mentions a specific specialization, tailor elective choices to that. The student is in Year 1.

Use 20-credit UK modules, 3 semesters per year (Autumn, Spring, Summer where applicable), and real UoB module names.

Only include remaining semesters (skip completed ones). Do not include modules the student has already completed.

Return ONLY valid JSON (no markdown fences) in this exact format:
{
  "semesters": [
    { "name": "Year 1 Autumn", "modules": [{ "code": "LM", "name": "Software Workshop 1", "credits": 20 }] }
  ],
  "summary": "Brief 1-2 sentence summary of this personalized roadmap."
}

Include 3 modules per semester (60 credits per semester, 120 per year). Use real University of Birmingham module codes and names.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: contextBlock }] }],
    config: { systemInstruction: SYSTEM_INSTRUCTION },
  });

  const text = response.text || '{}';
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) return JSON.parse(match[1].trim());
    return { semesters: [], summary: text };
  }
}

export async function generateMajorPath(
  majorName: string,
  foundationalModules: string[],
  apiKey: string
): Promise<{ semesters: { name: string; modules: { code: string; name: string; credits: number }[] }[]; summary: string }> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{
      role: 'user',
      parts: [{ text: `Generate a 4-year (8 semester) recommended module pathway for a "${majorName}" degree. Foundational modules include: ${foundationalModules.join(', ')}.

Return ONLY valid JSON (no markdown fences) in this exact format:
{
  "semesters": [
    { "name": "Year 1 Sem 1", "modules": [{ "code": "CS1010", "name": "Programming Methodology", "credits": 4 }] }
  ],
  "summary": "Brief 1-2 sentence summary of the pathway focus."
}

Include 4-5 modules per semester, 4 credits each. Use realistic module codes. Cover foundations first, then specialization.` }],
    }],
    config: { systemInstruction: SYSTEM_INSTRUCTION },
  });
  const text = response.text || '{}';
  try {
    return JSON.parse(text);
  } catch {
    // Try extracting JSON from markdown fences
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) return JSON.parse(match[1].trim());
    return { semesters: [], summary: text };
  }
}

export async function searchMajors(
  query: string,
  apiKey: string
): Promise<{ results: { name: string; description: string; relevance: string }[] }> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{
      role: 'user',
      parts: [{ text: `The user searched for: "${query}". Suggest 3 university degree specializations related to this query.

Return ONLY valid JSON (no markdown fences):
{
  "results": [
    { "name": "Degree Name", "description": "One sentence description", "relevance": "Why this matches the query" }
  ]
}` }],
    }],
    config: { systemInstruction: SYSTEM_INSTRUCTION },
  });
  const text = response.text || '{}';
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) return JSON.parse(match[1].trim());
    return { results: [] };
  }
}

export async function getComparisonRecommendation(moduleA: string, moduleB: string, apiKey: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: `Compare these two university modules: ${moduleA} vs ${moduleB}. Consider workload, difficulty, career relevance. Be concise (2-3 sentences).` }] }],
    config: { systemInstruction: SYSTEM_INSTRUCTION },
  });
  return response.text || '';
}
