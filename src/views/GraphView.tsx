import React, { useState, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  Focus,
  CheckCircle,
  PlusCircle,
  Info
} from 'lucide-react';
import { getModules, addScheduleEntry } from '../services/api';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import type { Module } from '../types';

export function GraphView() {
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModule, setSelectedModule] = useState<Module | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getModules()
      .then((data) => {
        setModules(data);
        setSelectedModule(data.find(m => m.code === 'CS3230'));
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleAddToPlanner = async () => {
    if (!selectedModule) return;
    try {
      await addScheduleEntry({
        module_code: selectedModule.code,
        course_name: selectedModule.name,
        schedule: 'TBD',
        professor: 'TBD',
        credits: selectedModule.credits,
        semester: 'Next Semester',
      });
      toast.success(`${selectedModule.code} added to planner!`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="flex-1 h-screen relative overflow-hidden bg-background canvas-grid">
      {/* SVG Connections */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <path d="M 180 300 C 250 300, 250 200, 320 200" fill="none" stroke="#2A2A35" strokeWidth="1.5" />
        <path d="M 180 300 C 250 300, 250 400, 320 400" fill="none" stroke="#2A2A35" strokeWidth="1.5" />
        <path d="M 440 200 C 510 200, 510 300, 580 300" fill="none" stroke="#2A2A35" strokeWidth="1.5" />
        <path d="M 440 400 C 510 400, 510 300, 580 300" fill="none" stroke="#2A2A35" strokeWidth="1.5" />

        {/* Active Path */}
        <path
          className="stroke-primary"
          d="M 580 300 C 650 300, 650 300, 720 300"
          fill="none"
          strokeWidth="2"
          strokeDasharray="5"
          style={{ filter: 'drop-shadow(0 0 5px #B026FF)' }}
        />
      </svg>

      {/* Nodes */}
      <div className="absolute inset-0 p-12">
        <div className="absolute" style={{ left: 60, top: 270 }}>
          <ModuleNode code="CS1010" status="completed" />
        </div>
        <div className="absolute" style={{ left: 320, top: 170 }}>
          <ModuleNode code="CS2030" status="completed" />
        </div>
        <div className="absolute" style={{ left: 320, top: 370 }}>
          <ModuleNode code="CS2040" status="completed" />
        </div>
        <div className="absolute" style={{ left: 580, top: 270 }}>
          <ModuleNode
            code="CS3230"
            status="available"
            active
            onClick={() => setSelectedModule(modules.find(m => m.code === 'CS3230'))}
          />
        </div>
        <div className="absolute" style={{ left: 840, top: 270 }}>
          <ModuleNode code="CS4231" status="locked" />
        </div>
      </div>

      {/* Toolbar */}
      <div className="absolute bottom-10 left-10 flex items-center gap-2 p-1.5 bg-surface/80 backdrop-blur-xl border border-outline-variant/30 rounded shadow-2xl">
        <button className="p-2 hover:bg-white/5 text-slate-400 transition-colors"><ZoomIn size={18} /></button>
        <button className="p-2 hover:bg-white/5 text-slate-400 transition-colors"><ZoomOut size={18} /></button>
        <div className="w-px h-4 bg-outline-variant/30 mx-1"></div>
        <button className="p-2 hover:bg-white/5 text-slate-400 transition-colors"><Maximize size={18} /></button>
        <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 text-slate-400 transition-colors">
          <Focus size={14} />
          <span className="text-[10px] font-mono uppercase tracking-widest">Fit to Screen</span>
        </button>
      </div>

      {/* Details Panel */}
      {selectedModule && (
        <aside className="absolute right-0 top-0 h-full w-[320px] bg-surface/90 backdrop-blur-2xl border-l border-outline-variant/30 p-8 flex flex-col gap-6 shadow-[-20px_0_40px_rgba(0,0,0,0.4)]">
          <header>
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-secondary text-sm">{selectedModule.code}</span>
              <span className="px-2 py-0.5 rounded bg-secondary/10 text-secondary text-[10px] font-mono font-bold border border-secondary/20">
                {selectedModule.type}
              </span>
            </div>
            <h3 className="font-headline text-2xl font-bold leading-tight mb-2">{selectedModule.name}</h3>
            <p className="text-xs text-slate-400 leading-relaxed italic">"{selectedModule.description}"</p>
          </header>

          <div className="space-y-6">
            <section>
              <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-3">Prerequisites (Met)</h4>
              <div className="space-y-2">
                {selectedModule.prerequisites.map(pre => (
                  <div key={pre} className="flex items-center gap-3 p-3 bg-surface-high/40 rounded border-l-2 border-green-500">
                    <CheckCircle size={14} className="text-green-500" />
                    <div>
                      <p className="text-[11px] font-mono text-on-surface">{pre}</p>
                      <p className="text-[9px] text-slate-500">Requirement Satisfied</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-3">Unlocks Future Modules</h4>
              <div className="flex flex-wrap gap-2">
                {selectedModule.unlocks.map(unlock => (
                  <span key={unlock} className="px-2 py-1 bg-surface-high rounded text-[10px] font-mono text-slate-300 border border-outline-variant/10">
                    {unlock}
                  </span>
                ))}
              </div>
            </section>

            <section className="mt-auto pt-6">
              <button
                onClick={handleAddToPlanner}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 px-6 rounded flex items-center justify-center gap-2 transition-all group"
              >
                <PlusCircle size={18} className="group-hover:translate-x-1 transition-transform" />
                <span className="text-sm font-headline uppercase tracking-widest">Add to Planner</span>
              </button>
            </section>
          </div>
        </aside>
      )}

      {/* Minimap */}
      <div className="absolute top-24 right-[340px] w-48 h-32 bg-surface-low/80 border border-outline-variant/20 rounded-lg overflow-hidden backdrop-blur-md">
        <div className="w-full h-full p-2 relative">
          <div className="absolute inset-0 canvas-grid opacity-20 scale-50 origin-top-left"></div>
          <div className="absolute top-8 left-4 w-4 h-2 bg-green-500/50 rounded-sm"></div>
          <div className="absolute top-4 left-12 w-4 h-2 bg-green-500/50 rounded-sm"></div>
          <div className="absolute top-12 left-12 w-4 h-2 bg-green-500/50 rounded-sm"></div>
          <div className="absolute top-8 left-20 w-4 h-2 bg-secondary/50 rounded-sm"></div>
          <div className="absolute inset-2 border border-primary/40 bg-primary/5 pointer-events-none"></div>
        </div>
        <div className="absolute bottom-0 w-full bg-surface-high px-2 py-1 border-t border-outline-variant/10">
          <span className="text-[8px] font-mono text-slate-500 uppercase">Navigator View</span>
        </div>
      </div>
    </div>
  );
}

function ModuleNode({ code, status, active, onClick }: { code: string, status: string, active?: boolean, onClick?: () => void }) {
  const isCompleted = status === 'completed';
  const isAvailable = status === 'available';
  const isLocked = status === 'locked';

  return (
    <div
      onClick={onClick}
      className={cn(
        "w-[120px] h-[60px] rounded flex flex-col items-center justify-center transition-all cursor-pointer",
        isCompleted && "bg-surface-low border-2 border-green-500/50 hover:bg-surface-high",
        isAvailable && "bg-surface-high border-2 border-secondary ring-2 ring-secondary/20 shadow-[0_0_15px_rgba(0,240,255,0.1)]",
        isLocked && "bg-surface-low border-2 border-dotted border-slate-600 cursor-not-allowed opacity-60",
        active && "ring-4 ring-primary/30"
      )}
    >
      <span className={cn(
        "font-mono text-xs",
        isCompleted && "text-green-400",
        isAvailable && "text-secondary",
        isLocked && "text-slate-400"
      )}>
        {code}
      </span>
      <span className="text-[9px] uppercase tracking-tighter text-slate-500">
        {status}
      </span>
    </div>
  );
}
