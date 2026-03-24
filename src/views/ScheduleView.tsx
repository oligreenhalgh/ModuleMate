import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Download,
  RefreshCw,
  Clock,
  User as UserIcon,
  Trash2,
  Loader2,
  Plus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSchedule, getStats, deleteScheduleEntry } from '../services/api';
import type { ScheduleEntry, Conflict, UserStats } from '../services/api';
import { toast } from 'sonner';

export function ScheduleView() {
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchData = () => {
    setLoading(true);
    Promise.all([getSchedule(), getStats()])
      .then(([scheduleData, statsData]) => {
        setEntries(scheduleData.entries);
        setConflicts(scheduleData.conflicts);
        setStats(statsData);
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteScheduleEntry(id);
      toast.success('Module removed from schedule');
      fetchData();
    } catch {
      toast.error('Failed to remove module');
    }
  };

  const conflictModuleCodes = new Set(conflicts.flatMap(c => c.modules));
  const totalCredits = entries.reduce((sum, e) => sum + e.credits, 0);

  // Group entries by semester
  const semesters = new Map<string, ScheduleEntry[]>();
  entries.forEach(e => {
    const sem = e.semester || 'Unassigned';
    if (!semesters.has(sem)) semesters.set(sem, []);
    semesters.get(sem)!.push(e);
  });
  const semesterList = [...semesters.entries()];

  if (loading) {
    return (
      <div className="flex-1 h-screen flex items-center justify-center bg-background">
        <Loader2 size={24} className="text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 h-screen overflow-y-auto custom-scrollbar bg-background">
      <div className="pt-24 pb-32 px-6 flex justify-center">
        <div className="w-full max-w-[800px] flex flex-col gap-8">
          {/* Warning Banner */}
          {conflicts.length > 0 && (
            <div className="flex items-center gap-4 p-4 rounded bg-error/10 border border-error/30 animate-pulse">
              <AlertTriangle className="text-error" size={20} />
              <div>
                <h3 className="font-headline font-bold text-error text-sm uppercase tracking-wider">Schedule Conflict Detected</h3>
                <p className="text-xs text-error/80 font-body">{conflicts[0].description}</p>
              </div>
            </div>
          )}

          {/* Summary Stats */}
          <section className="bg-surface p-8 rounded border border-outline-variant/30">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h1 className="font-headline text-3xl font-bold tracking-tight mb-2">My Schedule</h1>
                <p className="text-on-surface-variant font-body text-sm">
                  {entries.length > 0
                    ? `${entries.length} modules across ${semesterList.length} semester${semesterList.length !== 1 ? 's' : ''}`
                    : 'No modules scheduled yet. Add modules from the Dependency Graph.'}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="font-mono text-2xl font-bold text-secondary">
                    {totalCredits}
                    <span className="text-slate-500 font-medium text-lg"> MC</span>
                  </span>
                  <p className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">Total Scheduled</p>
                </div>
                <button
                  onClick={() => navigate('/graph')}
                  className="p-2 border border-outline-variant/30 rounded hover:bg-surface-high transition-colors text-on-surface-variant hover:text-primary"
                  title="Add modules from graph"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
            {stats && (
              <>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono text-[10px] text-slate-500 uppercase">Degree Progress</span>
                  <span className="font-mono text-[10px] text-secondary">
                    {stats.total_credits}/{stats.required_credits} credits
                  </span>
                </div>
                <div className="relative w-full h-3 bg-surface-high rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-secondary"
                    style={{ width: stats.required_credits > 0 ? `${Math.min(100, Math.round((stats.total_credits / stats.required_credits) * 100))}%` : '0%' }}
                  ></div>
                </div>
                <div className="flex justify-between mt-3">
                  <span className="font-mono text-[10px] text-slate-500 uppercase">
                    Core: {stats.major_required > 0 ? `${Math.round((stats.major_credits / stats.major_required) * 100)}%` : '--'}
                  </span>
                  <span className="font-mono text-[10px] text-slate-500 uppercase">
                    Electives: {stats.ue_required > 0 ? `${Math.round((stats.ue_credits / stats.ue_required) * 100)}%` : '--'}
                  </span>
                </div>
              </>
            )}
          </section>

          {/* Empty State */}
          {entries.length === 0 && (
            <div className="text-center py-16 bg-surface border border-outline-variant/20 rounded">
              <p className="text-sm text-on-surface-variant/60 mb-2">No modules in your schedule yet.</p>
              <p className="text-xs text-slate-500 mb-4">
                Browse modules or open the prerequisite graph to add modules to your planner.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => navigate('/explorer')}
                  className="px-4 py-2 bg-primary text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-primary/90 transition-colors flex items-center gap-2"
                >
                  <Plus size={14} />
                  Browse Modules
                </button>
                <button
                  onClick={() => navigate('/graph')}
                  className="px-4 py-2 border border-secondary text-secondary text-xs font-bold uppercase tracking-widest rounded hover:bg-secondary/10 transition-colors"
                >
                  View Graph
                </button>
              </div>
            </div>
          )}

          {/* Semester Blocks */}
          {semesterList.map(([semName, semEntries]) => {
            const semCredits = semEntries.reduce((s, e) => s + e.credits, 0);
            return (
              <section key={semName} className="border border-outline-variant rounded overflow-hidden">
                <div className="bg-surface-low px-6 py-4 flex justify-between items-center border-b border-outline-variant">
                  <h2 className="font-headline font-bold tracking-wide uppercase text-sm">{semName}</h2>
                  <span className="font-mono text-xs text-primary bg-primary/10 px-2 py-1 rounded">
                    {semCredits} Credits
                  </span>
                </div>
                <div className="divide-y divide-outline-variant/50">
                  {semEntries.map((item) => {
                    const hasConflict = conflictModuleCodes.has(item.module_code);
                    return (
                      <div
                        key={item.id}
                        className={`px-6 py-5 transition-colors group relative overflow-hidden ${
                          hasConflict ? 'bg-error/5 hover:bg-error/10' : 'bg-surface hover:bg-surface-low'
                        }`}
                      >
                        {hasConflict && <div className="absolute left-0 top-0 bottom-0 w-1 bg-error"></div>}
                        <div className="grid grid-cols-12 gap-4 items-center">
                          <div className="col-span-3">
                            <span className={`font-mono text-[10px] uppercase mb-1 block ${hasConflict ? 'text-error' : 'text-slate-500'}`}>
                              {hasConflict ? 'Conflict' : 'Module'}
                            </span>
                            <span className={`font-mono text-lg font-bold ${hasConflict ? 'text-on-surface' : 'text-secondary group-hover:text-white'} transition-colors`}>
                              {item.module_code}
                            </span>
                          </div>
                          <div className="col-span-3">
                            <span className="font-mono text-[10px] text-slate-500 uppercase mb-1 block">Course</span>
                            <span className="font-body text-sm font-medium">{item.course_name}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="font-mono text-[10px] text-slate-500 uppercase mb-1 block">Schedule</span>
                            <span className={`font-body text-sm flex items-center gap-1 ${hasConflict ? 'text-error' : ''}`}>
                              <Clock size={12} />
                              {item.schedule}
                            </span>
                          </div>
                          <div className="col-span-2">
                            <span className="font-mono text-[10px] text-slate-500 uppercase mb-1 block">Professor</span>
                            <span className="font-body text-xs italic flex items-center gap-1">
                              <UserIcon size={10} />
                              {item.professor}
                            </span>
                          </div>
                          <div className="col-span-2 flex items-center justify-end gap-2">
                            <span className="font-mono text-[10px] text-slate-500">{item.credits} MC</span>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 text-slate-500 hover:text-error transition-colors opacity-0 group-hover:opacity-100"
                              title="Remove from schedule"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {/* Actions */}
          {entries.length > 0 && (
            <div className="flex flex-col md:flex-row gap-4 justify-center mt-4">
              <button
                onClick={() => toast.info('Google Calendar sync coming soon!')}
                className="flex-1 bg-primary text-white h-14 font-headline font-bold uppercase tracking-widest flex items-center justify-center gap-3 rounded hover:shadow-[0_0_20px_rgba(176,38,255,0.4)] transition-all active:scale-95"
              >
                <RefreshCw size={18} />
                Sync to Google Calendar
              </button>
              <button
                onClick={() => toast.info('PDF download coming soon!')}
                className="flex-1 border border-secondary/30 text-secondary h-14 font-headline font-bold uppercase tracking-widest flex items-center justify-center gap-3 rounded hover:bg-secondary/10 transition-all active:scale-95"
              >
                <Download size={18} />
                Download PDF
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
