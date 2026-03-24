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
  const modulePattern = /\b[A-Z]{2,4}\d{4}[A-Z]?\b/g;
  const modules = [...new Set(content.match(modulePattern) || [])];
  return { content, modules };
}

export async function generateMajorPath(
  majorName: string,
  foundationalModules: string[],
  apiKey: string
): Promise<{ semesters: { name: string; modules: { code: string; name: string; credits: number }[] }[]; summary: string }> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
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
    model: 'gemini-2.0-flash',
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
    model: 'gemini-3-flash-preview',
    contents: [{ role: 'user', parts: [{ text: `Compare these two university modules: ${moduleA} vs ${moduleB}. Consider workload, difficulty, career relevance. Be concise (2-3 sentences).` }] }],
    config: { systemInstruction: SYSTEM_INSTRUCTION },
  });
  return response.text || '';
}
