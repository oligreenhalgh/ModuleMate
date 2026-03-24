import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, TrendingUp, AlertTriangle, Plus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { getThreads, createThread, getMessages, sendMessage, getStats, Thread, UserStats } from '../services/api';
import { Message } from '../types';
import { cn } from '../lib/utils';

export function HomeView() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Fetch threads and stats on mount
  useEffect(() => {
    async function init() {
      try {
        const [fetchedThreads, fetchedStats] = await Promise.all([
          getThreads(),
          getStats(),
        ]);
        setStats(fetchedStats);

        if (fetchedThreads.length === 0) {
          const newThread = await createThread('New Chat');
          setThreads([newThread]);
          setActiveThreadId(newThread.id);
        } else {
          setThreads(fetchedThreads);
          setActiveThreadId(fetchedThreads[0].id);
        }
      } catch (error) {
        toast.error('Failed to load data. Please try again.');
        console.error('Init error:', error);
      } finally {
        setLoadingThreads(false);
      }
    }
    init();
  }, []);

  // Fetch messages when active thread changes
  useEffect(() => {
    if (!activeThreadId) return;
    async function fetchMessages() {
      try {
        const msgs = await getMessages(activeThreadId!);
        setMessages(msgs);
      } catch (error) {
        toast.error('Failed to load messages.');
        console.error('Messages error:', error);
      }
    }
    fetchMessages();
  }, [activeThreadId]);

  const handleThreadClick = (threadId: string) => {
    setActiveThreadId(threadId);
  };

  const handleSend = async () => {
    if (!input.trim() || !activeThreadId) return;

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
      const aiResponse = await sendMessage(activeThreadId, input);

      const modelMsg: Message = {
        id: aiResponse.id,
        role: 'model',
        content: aiResponse.content,
        timestamp: new Date(aiResponse.timestamp),
        modules: aiResponse.modules,
      };

      setMessages(prev => [...prev, modelMsg]);
    } catch (error) {
      toast.error('Failed to send message. Please try again.');
      console.error('Send error:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const creditPercent = stats
    ? Math.round((stats.total_credits / stats.required_credits) * 100)
    : 70;

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left Pane: Threads */}
      <aside className="w-64 bg-surface border-r border-outline-variant/20 flex flex-col hidden lg:flex">
        <div className="p-4 border-b border-outline-variant/10 flex items-center justify-between">
          <span className="text-[10px] font-mono text-on-surface-variant/50 uppercase tracking-widest">Recent Threads</span>
          <button
            onClick={async () => {
              try {
                const newThread = await createThread('New Chat');
                setThreads(prev => [newThread, ...prev]);
                setActiveThreadId(newThread.id);
                setMessages([]);
              } catch { toast.error('Failed to create thread'); }
            }}
            className="p-1 hover:bg-surface-high rounded transition-colors text-on-surface-variant/50 hover:text-primary"
            title="New chat"
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {loadingThreads ? (
            <div className="p-3 animate-pulse">
              <div className="h-3 bg-surface-high rounded w-3/4 mb-2"></div>
              <div className="h-2 bg-surface-high rounded w-1/2"></div>
            </div>
          ) : (
            threads.map((thread) => (
              <div
                key={thread.id}
                onClick={() => handleThreadClick(thread.id)}
                className={cn(
                  "p-3 rounded transition-colors cursor-pointer",
                  thread.id === activeThreadId
                    ? "bg-surface-high border-l-2 border-primary"
                    : "hover:bg-surface-high group"
                )}
              >
                <p className={cn(
                  "text-xs font-medium truncate",
                  thread.id === activeThreadId
                    ? "text-on-surface"
                    : "text-on-surface-variant group-hover:text-on-surface"
                )}>
                  {thread.title}
                </p>
                <p className="text-[10px] font-mono text-on-surface-variant/40 mt-1">
                  {new Date(thread.updated_at).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Center Pane: Chat */}
      <section className="flex-1 flex flex-col bg-background relative">
        {/* Compact Stats Bar - visible on screens where sidebar is hidden */}
        <div className="xl:hidden flex items-center gap-6 px-6 py-3 bg-surface border-b border-outline-variant/20 overflow-x-auto">
          <div className="flex items-center gap-2 shrink-0">
            <TrendingUp size={14} className="text-secondary" />
            <span className="text-xs font-mono text-on-surface font-bold">{stats ? stats.gpa.toFixed(2) : '--'}</span>
            <span className="text-[10px] font-mono text-on-surface-variant/50">GPA</span>
          </div>
          <div className="w-px h-4 bg-outline-variant/20 shrink-0" />
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-mono text-on-surface font-bold">{stats ? stats.total_credits : '--'}</span>
            <span className="text-[10px] font-mono text-on-surface-variant/50">/ {stats ? stats.required_credits : '--'} credits</span>
          </div>
          <div className="w-px h-4 bg-outline-variant/20 shrink-0" />
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-mono text-on-surface font-bold">{stats ? `${stats.major_credits + stats.ue_credits}` : '--'}</span>
            <span className="text-[10px] font-mono text-on-surface-variant/50">modules completed</span>
          </div>
          {stats && stats.alerts.length > 0 && (
            <>
              <div className="w-px h-4 bg-outline-variant/20 shrink-0" />
              <div className="flex items-center gap-1.5 shrink-0">
                <AlertTriangle size={12} className="text-error" />
                <span className="text-[10px] font-mono text-error">{stats.alerts.length} alert{stats.alerts.length !== 1 ? 's' : ''}</span>
              </div>
            </>
          )}
        </div>

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
                <span className="text-4xl font-headline font-bold text-on-surface">{stats ? stats.gpa.toFixed(2) : '--'}</span>
                <span className="text-xs font-mono text-secondary">/ {stats ? stats.gpa_max.toFixed(2) : '5.00'}</span>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <TrendingUp size={14} className="text-secondary" />
                <span className="text-[10px] text-on-surface-variant/60">
                  {stats ? `${stats.gpa_trend >= 0 ? '+' : ''}${stats.gpa_trend.toFixed(2)} from last sem` : '...'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xs font-mono text-on-surface-variant/50 uppercase tracking-[0.2em] mb-4">Credit Progress</h2>
            <div className="bg-surface p-6 border border-outline-variant/10">
              <div className="flex justify-between items-end mb-3">
                <span className="text-[10px] font-mono text-primary uppercase">Total Earned</span>
                <span className="text-lg font-headline font-bold text-on-surface">
                  {stats ? stats.total_credits : '--'} <span className="text-[10px] font-mono text-on-surface-variant/40">/ {stats ? stats.required_credits : '--'}</span>
                </span>
              </div>
              <div className="w-full bg-surface-high h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full" style={{ width: `${creditPercent}%` }}></div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="bg-background p-2">
                  <p className="text-[10px] text-on-surface-variant/40 mb-1">Major</p>
                  <p className="text-xs font-mono text-on-surface">
                    {stats ? `${stats.major_credits}/${stats.major_required}` : '--/--'}
                  </p>
                </div>
                <div className="bg-background p-2">
                  <p className="text-[10px] text-on-surface-variant/40 mb-1">UEs</p>
                  <p className="text-xs font-mono text-on-surface">
                    {stats ? `${stats.ue_credits}/${stats.ue_required}` : '--/--'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xs font-mono text-on-surface-variant/50 uppercase tracking-[0.2em] mb-4">Prerequisite Alert</h2>
            <div className="space-y-3">
              {stats && stats.alerts.length > 0 ? (
                stats.alerts.map((alert, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-error/5 border-l-2 border-error">
                    <AlertTriangle size={14} className="text-error" />
                    <p className="text-[10px] leading-tight text-on-surface-variant">
                      {alert.module} requires {alert.unmetPrereqs.join(', ')}.
                    </p>
                  </div>
                ))
              ) : stats ? (
                <p className="text-[10px] text-on-surface-variant/40">No prerequisite alerts.</p>
              ) : (
                <div className="animate-pulse h-10 bg-surface-high rounded"></div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
