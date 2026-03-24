import React from 'react';
import { Sparkles, ChevronRight, GraduationCap } from 'lucide-react';
import { MAJORS } from '../constants';
import { cn } from '../lib/utils';

export function ExplorerView() {
  return (
    <div className="flex-1 h-screen overflow-y-auto custom-scrollbar bg-background">
      <div className="pt-24 pb-20 px-10 max-w-7xl mx-auto">
        <section className="mb-12">
          <div className="max-w-3xl">
            <h2 className="text-4xl font-bold font-headline tracking-tighter mb-6">
              Architect Your <span className="text-primary">Future.</span>
            </h2>
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-lg blur opacity-20 group-focus-within:opacity-40 transition duration-1000"></div>
              <div className="relative bg-surface-low border-b border-white/10 flex items-center px-6 py-4">
                <Sparkles size={20} className="text-primary mr-4" />
                <input 
                  className="bg-transparent border-none focus:ring-0 w-full text-lg font-body placeholder:text-slate-600 outline-none" 
                  placeholder="What do you want to build or study?" 
                  type="text"
                />
                <kbd className="hidden md:inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono text-slate-500 bg-white/5 border border-white/10 rounded">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </div>
            </div>
            <div className="mt-4 flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
              <span className="px-3 py-1 bg-surface-high text-[10px] font-mono text-slate-400 border border-white/5 cursor-pointer hover:border-primary/40 transition-colors">/generate neural_networks</span>
              <span className="px-3 py-1 bg-surface-high text-[10px] font-mono text-slate-400 border border-white/5 cursor-pointer hover:border-primary/40 transition-colors">/path software_engineering</span>
              <span className="px-3 py-1 bg-surface-high text-[10px] font-mono text-slate-400 border border-white/5 cursor-pointer hover:border-primary/40 transition-colors">/compare data_science vs ai</span>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {MAJORS.map((major) => (
            <article 
              key={major.id}
              className="bg-surface border border-outline-variant/20 p-6 rounded-[4px] hover:shadow-[0_0_20px_rgba(176,38,255,0.15)] transition-all duration-300 flex flex-col group"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold font-headline tracking-tight group-hover:text-primary transition-colors">{major.name}</h3>
                <span className={cn(
                  "font-mono text-xs font-bold tracking-tighter px-2 py-1 rounded-sm border",
                  major.aiMatch > 80 
                    ? "text-secondary bg-secondary/10 border-secondary/20" 
                    : "text-slate-500 bg-surface-high border-white/5"
                )}>
                  {major.aiMatch}% AI MATCH
                </span>
              </div>
              <p className="text-sm text-slate-400 mb-6 font-body leading-relaxed">{major.description}</p>
              
              <div className="mb-6">
                <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-3">Career Outcomes</p>
                <ul className="space-y-2">
                  {major.careerOutcomes.map(outcome => (
                    <li key={outcome} className="flex items-center gap-2 text-xs text-on-surface">
                      <div className="w-1 h-1 bg-secondary rounded-full"></div>
                      {outcome}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-auto pt-6 border-t border-outline-variant/10">
                <div className="mb-6">
                  <div className="flex items-center justify-between text-[10px] font-mono text-primary uppercase tracking-widest mb-4">
                    <span>Foundational Modules</span>
                    <GraduationCap size={14} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {major.foundationalModules.map(module => (
                      <span key={module} className="text-[10px] font-mono bg-surface-high px-2 py-1 text-slate-300 border border-white/5">
                        {module}
                      </span>
                    ))}
                  </div>
                </div>
                <button className="w-full py-2 border border-secondary text-secondary text-xs font-bold uppercase tracking-widest hover:bg-secondary/10 transition-colors flex items-center justify-center gap-2 group">
                  <span>Preview Path</span>
                  <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
