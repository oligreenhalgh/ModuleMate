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

export async function getComparisonRecommendation(moduleA: string, moduleB: string, apiKey: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ role: 'user', parts: [{ text: `Compare these two university modules: ${moduleA} vs ${moduleB}. Consider workload, difficulty, career relevance. Be concise (2-3 sentences).` }] }],
    config: { systemInstruction: SYSTEM_INSTRUCTION },
  });
  return response.text || '';
}
