import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { GoogleGenAI } from '@google/genai';
import { Message } from '../types';
import { cn } from '../lib/utils';

const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'model',
    content: "Hello! I've analyzed your current progression. Based on your interest in systems engineering, I recommend prioritizing **CS3230** next semester. It's a prerequisite for three of your desired level-4000 modules.",
    timestamp: new Date(),
    modules: ['CS3230', 'MA1521']
  }
];

export function HomeView() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [...messages, userMsg].map(m => ({
          role: m.role,
          parts: [{ text: m.content }]
        })),
        config: {
          systemInstruction: "You are ModuleMate, an AI university advisor. Help students plan their degrees, understand prerequisites, and manage workload. Be concise, technical, and helpful. Use markdown for formatting."
        }
      });

      const modelMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: response.text || "I'm sorry, I couldn't process that request.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, modelMsg]);
    } catch (error) {
      console.error('AI Error:', error);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left Pane: Threads */}
      <aside className="w-64 bg-surface border-r border-outline-variant/20 flex flex-col hidden lg:flex">
        <div className="p-4 border-b border-outline-variant/10">
          <span className="text-[10px] font-mono text-on-surface-variant/50 uppercase tracking-widest">Recent Threads</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          <div className="p-3 bg-surface-high rounded border-l-2 border-primary">
            <p className="text-xs font-medium truncate">Spring 2025 CS Modules</p>
            <p className="text-[10px] font-mono text-on-surface-variant/40 mt-1">2m ago</p>
          </div>
          <div className="p-3 hover:bg-surface-high rounded transition-colors group cursor-pointer">
            <p className="text-xs font-medium truncate text-on-surface-variant group-hover:text-on-surface">GPA Optimization Plan</p>
            <p className="text-[10px] font-mono text-on-surface-variant/40 mt-1">1h ago</p>
          </div>
        </div>
      </aside>

      {/* Center Pane: Chat */}
      <section className="flex-1 flex flex-col bg-background relative">
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-8 space-y-8 custom-scrollbar">
          {messages.map((msg) => (
            <div 
              key={msg.id}
              className={cn(
                "flex flex-col gap-3 max-w-[85%]",
                msg.role === 'user' ? "ml-auto items-end" : "items-start"
              )}
            >
              <div className="flex items-center gap-2">
                {msg.role === 'model' && <span className="text-[10px] font-mono text-primary uppercase tracking-widest">ModuleMate AI</span>}
                <div className={cn("w-1.5 h-1.5 rounded-full", msg.role === 'model' ? "bg-primary/40" : "bg-slate-600")} />
                {msg.role === 'user' && <span className="text-[10px] font-mono text-on-surface-variant/50 uppercase tracking-widest">User</span>}
              </div>
              
              <div className={cn(
                "p-5 shadow-xl",
                msg.role === 'model' 
                  ? "bg-surface border-l-4 border-primary" 
                  : "bg-surface-low border border-outline-variant/30"
              )}>
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
                
                {msg.modules && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {msg.modules.map(code => (
                      <div key={code} className="bg-surface-high px-3 py-1.5 rounded border border-outline-variant/30 flex items-center gap-2 group cursor-pointer hover:border-secondary transition-all">
                        <span className="font-mono text-xs text-secondary">{code}</span>
                        <Sparkles size={10} className="text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex items-center gap-2 text-primary animate-pulse">
              <Sparkles size={14} />
              <span className="text-[10px] font-mono uppercase tracking-widest">AI Thinking...</span>
            </div>
          )}
        </div>

        <div className="h-24 px-6 flex items-center bg-background border-t border-outline-variant/20">
          <div className="w-full relative">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="w-full h-14 bg-surface-low border-b border-outline-variant/20 focus:border-primary focus:ring-0 text-sm font-body px-4 pr-32 placeholder:text-on-surface-variant/30 outline-none transition-all" 
              placeholder="Ask about your academic path..." 
              type="text"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-3">
              <div className="flex items-center gap-1 opacity-40 hidden sm:flex">
                <span className="text-[10px] font-mono uppercase">Powered by</span>
                <span className="text-[10px] font-headline font-bold">Gemini</span>
              </div>
              <button 
                onClick={handleSend}
                className="w-10 h-10 flex items-center justify-center bg-primary text-white rounded hover:scale-105 transition-transform"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Right Pane: Stats */}
      <aside className="w-[25%] bg-background border-l border-outline-variant/20 flex flex-col hidden xl:flex">
        <div className="p-6 space-y-8">
          <div>
            <h2 className="text-xs font-mono text-on-surface-variant/50 uppercase tracking-[0.2em] mb-4">Academic Status</h2>
            <div className="bg-surface p-6 border border-outline-variant/10">
              <p className="text-[10px] font-mono text-secondary uppercase mb-1">Current GPA</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-headline font-bold text-on-surface">4.21</span>
                <span className="text-xs font-mono text-secondary">/ 5.00</span>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <TrendingUp size={14} className="text-secondary" />
                <span className="text-[10px] text-on-surface-variant/60">+0.12 from last sem</span>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xs font-mono text-on-surface-variant/50 uppercase tracking-[0.2em] mb-4">Credit Progress</h2>
            <div className="bg-surface p-6 border border-outline-variant/10">
              <div className="flex justify-between items-end mb-3">
                <span className="text-[10px] font-mono text-primary uppercase">Total Earned</span>
                <span className="text-lg font-headline font-bold text-on-surface">84 <span className="text-[10px] font-mono text-on-surface-variant/40">/ 120</span></span>
              </div>
              <div className="w-full bg-surface-high h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full w-[70%]"></div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="bg-background p-2">
                  <p className="text-[10px] text-on-surface-variant/40 mb-1">Major</p>
                  <p className="text-xs font-mono text-on-surface">52/64</p>
                </div>
                <div className="bg-background p-2">
                  <p className="text-[10px] text-on-surface-variant/40 mb-1">UEs</p>
                  <p className="text-xs font-mono text-on-surface">12/20</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xs font-mono text-on-surface-variant/50 uppercase tracking-[0.2em] mb-4">Prerequisite Alert</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-error/5 border-l-2 border-error">
                <AlertTriangle size={14} className="text-error" />
                <p className="text-[10px] leading-tight text-on-surface-variant">CS4231 requires CS3230 with B+ or higher.</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
