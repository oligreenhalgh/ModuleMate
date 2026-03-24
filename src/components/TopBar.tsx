import React from 'react';
import { Bell, User, Cpu } from 'lucide-react';

export function TopBar() {
  return (
    <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-background/60 backdrop-blur-md border-b border-outline-variant/20 shadow-2xl shadow-primary/5">
      <div className="flex items-center gap-4">
        <span className="text-xl font-bold tracking-tighter text-primary font-headline">ModuleMate</span>
        <div className="h-4 w-px bg-outline-variant/30 hidden md:block"></div>
        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full">
          <div className="w-2 h-2 rounded-full bg-primary ai-pulse"></div>
          <span className="text-xs font-mono font-medium text-primary uppercase tracking-widest">AI Status: Connected</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 text-slate-400/70 hover:bg-primary/10 hover:text-primary transition-all rounded-lg">
          <Bell size={20} />
        </button>
        <button className="flex items-center gap-2 p-1 pl-3 bg-surface rounded-full border border-outline-variant/20 group">
          <span className="text-[10px] font-mono text-on-surface-variant/70">ADVISOR_MODE</span>
          <div className="w-8 h-8 rounded-full bg-surface-high flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
            <Cpu size={16} />
          </div>
        </button>
      </div>
    </header>
  );
}
