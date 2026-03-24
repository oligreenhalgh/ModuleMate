import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, ChevronRight, GraduationCap, X, Loader2, Search, BookOpen, Layers, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getMajors, searchMajorsAI, getModules } from '../services/api';
import type { SearchResult } from '../services/api';
import { Major, Module } from '../types';
import { cn } from '../lib/utils';

type TabId = 'modules' | 'majors';
type YearFilter = 'all' | '1' | '2' | '3' | '4';
type StatusFilter = 'all' | 'completed' | 'available' | 'locked';
type TypeFilter = 'all' | 'Core' | 'Elective';

function getYearFromCode(code: string): string {
  const match = code.match(/\d/);
  return match ? match[0] : '?';
}

function ModuleCard({ module, onClick }: { module: Module; onClick: () => void }) {
  return (
    <article
      onClick={onClick}
      className="bg-surface border border-outline-variant/20 p-5 rounded-[4px] hover:border-primary/30 transition-all cursor-pointer group flex flex-col"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-secondary group-hover:text-primary transition-colors">{module.code}</span>
          <span className={cn(
            "text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border",
            module.status === 'completed' && "text-green-400 bg-green-500/10 border-green-500/20",
            module.status === 'available' && "text-secondary bg-secondary/10 border-secondary/20",
            module.status === 'locked' && "text-slate-500 bg-slate-500/10 border-slate-500/20",
          )}>
            {module.status}
          </span>
        </div>
        <span className={cn(
          "text-[10px] font-mono px-1.5 py-0.5 rounded border",
          module.type === 'Core' ? "text-primary bg-primary/10 border-primary/20" : "text-slate-400 bg-slate-500/10 border-slate-500/20",
        )}>
          {module.type}
        </span>
      </div>

      <h4 className="font-headline font-bold text-sm mb-2 group-hover:text-on-surface transition-colors">{module.name}</h4>
      <p className="text-xs text-slate-400 mb-4 line-clamp-2">{module.description}</p>

      <div className="mt-auto grid grid-cols-3 gap-3 pt-3 border-t border-outline-variant/10">
        <div>
          <p className="text-[9px] font-mono text-slate-500 uppercase mb-0.5">Credits</p>
          <p className="text-xs font-mono font-bold text-on-surface">{module.credits} MC</p>
        </div>
        <div>
          <p className="text-[9px] font-mono text-slate-500 uppercase mb-0.5">Difficulty</p>
          <div className="flex items-center gap-1">
            <div className="w-full bg-surface-high h-1 rounded-full overflow-hidden">
              <div className="bg-primary h-full rounded-full" style={{ width: `${module.difficulty}%` }}></div>
            </div>
          </div>
        </div>
        <div>
          <p className="text-[9px] font-mono text-slate-500 uppercase mb-0.5">Workload</p>
          <p className="text-xs font-mono text-on-surface">{module.avgWeeklyHours}h/wk</p>
        </div>
      </div>

      {module.prerequisites.length > 0 && (
        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
          <span className="text-[9px] font-mono text-slate-500 uppercase">Prereqs:</span>
          {module.prerequisites.map(p => (
            <span key={p} className="text-[10px] font-mono bg-surface-high px-1.5 py-0.5 text-slate-300 border border-white/5 rounded">
              {p}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

export function ExplorerView() {
  const navigate = useNavigate();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabId>('modules');

  // Module state
  const [modules, setModules] = useState<Module[]>([]);
  const [modulesLoading, setModulesLoading] = useState(true);
  const [moduleSearch, setModuleSearch] = useState('');
  const [yearFilter, setYearFilter] = useState<YearFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);

  // Major state
  const [majors, setMajors] = useState<Major[]>([]);
  const [majorsLoading, setMajorsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);

  useEffect(() => {
    getModules()
      .then(setModules)
      .catch(() => toast.error('Failed to load modules.'))
      .finally(() => setModulesLoading(false));

    getMajors()
      .then(setMajors)
      .catch(() => toast.error('Failed to load majors.'))
      .finally(() => setMajorsLoading(false));
  }, []);

  const filteredModules = useMemo(() => {
    return modules.filter(m => {
      if (yearFilter !== 'all' && getYearFromCode(m.code) !== yearFilter) return false;
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      if (typeFilter !== 'all' && m.type !== typeFilter) return false;
      if (moduleSearch) {
        const q = moduleSearch.toLowerCase();
        if (!m.code.toLowerCase().includes(q) && !m.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [modules, yearFilter, statusFilter, typeFilter, moduleSearch]);

  const moduleCounts = useMemo(() => {
    const completed = modules.filter(m => m.status === 'completed').length;
    const available = modules.filter(m => m.status === 'available').length;
    const locked = modules.filter(m => m.status === 'locked').length;
    return { completed, available, locked, total: modules.length };
  }, [modules]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults(null);
    try {
      const res = await searchMajorsAI(searchQuery);
      setSearchResults(res.results);
    } catch {
      toast.error('Search failed. Check your API key in Settings.');
    } finally {
      setSearching(false);
    }
  };

  const handlePreviewPath = (major: Major) => {
    navigate(`/graph?major=${major.id}`);
  };

  const handleCommandClick = (cmd: string) => {
    setSearchQuery(cmd);
    setSearching(true);
    setSearchResults(null);
    searchMajorsAI(cmd)
      .then(res => setSearchResults(res.results))
      .catch(() => toast.error('Search failed.'))
      .finally(() => setSearching(false));
  };

  return (
    <div className="flex-1 h-screen overflow-y-auto custom-scrollbar bg-background">
      <div className="pt-24 pb-20 px-10 max-w-7xl mx-auto">
        {/* Header */}
        <section className="mb-8">
          <div className="max-w-3xl">
            <h2 className="text-4xl font-bold font-headline tracking-tighter mb-2">
              Architect Your <span className="text-primary">Future.</span>
            </h2>
            <p className="text-on-surface-variant font-body mb-6">Browse modules, explore majors, and plan your degree path.</p>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1 bg-surface-low p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('modules')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded text-xs font-mono uppercase tracking-widest transition-all",
                activeTab === 'modules'
                  ? "bg-surface text-primary shadow"
                  : "text-on-surface-variant/60 hover:text-on-surface"
              )}
            >
              <BookOpen size={14} />
              Modules
              <span className="text-[10px] bg-surface-high px-1.5 py-0.5 rounded">{modules.length}</span>
            </button>
            <button
              onClick={() => setActiveTab('majors')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded text-xs font-mono uppercase tracking-widest transition-all",
                activeTab === 'majors'
                  ? "bg-surface text-primary shadow"
                  : "text-on-surface-variant/60 hover:text-on-surface"
              )}
            >
              <Layers size={14} />
              Majors
              <span className="text-[10px] bg-surface-high px-1.5 py-0.5 rounded">{majors.length}</span>
            </button>
          </div>
        </section>

        {/* ==================== MODULES TAB ==================== */}
        {activeTab === 'modules' && (
          <>
            {/* Stats Bar */}
            <div className="flex items-center gap-6 mb-6 p-4 bg-surface border border-outline-variant/10 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs font-mono text-on-surface">{moduleCounts.completed} completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-secondary" />
                <span className="text-xs font-mono text-on-surface">{moduleCounts.available} available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-500" />
                <span className="text-xs font-mono text-on-surface">{moduleCounts.locked} locked</span>
              </div>
              <div className="ml-auto text-[10px] font-mono text-on-surface-variant/50">
                Showing {filteredModules.length} of {moduleCounts.total}
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-8">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
                <input
                  value={moduleSearch}
                  onChange={e => setModuleSearch(e.target.value)}
                  className="w-full bg-surface-low border border-outline-variant/20 pl-9 pr-4 py-2 text-sm font-body rounded outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/30"
                  placeholder="Search modules..."
                  type="text"
                />
              </div>

              {/* Year Filter */}
              <div className="flex items-center gap-1">
                <Filter size={12} className="text-on-surface-variant/40 mr-1" />
                {(['all', '1', '2', '3', '4'] as YearFilter[]).map(y => (
                  <button
                    key={y}
                    onClick={() => setYearFilter(y)}
                    className={cn(
                      "px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest rounded border transition-all",
                      yearFilter === y
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-surface border-outline-variant/20 text-on-surface-variant/60 hover:border-primary/20"
                    )}
                  >
                    {y === 'all' ? 'All Years' : `Year ${y}`}
                  </button>
                ))}
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                className="bg-surface-low border border-outline-variant/20 text-xs font-mono px-3 py-2 rounded outline-none focus:border-primary"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="available">Available</option>
                <option value="locked">Locked</option>
              </select>

              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as TypeFilter)}
                className="bg-surface-low border border-outline-variant/20 text-xs font-mono px-3 py-2 rounded outline-none focus:border-primary"
              >
                <option value="all">All Types</option>
                <option value="Core">Core</option>
                <option value="Elective">Elective</option>
              </select>
            </div>

            {/* Module Grid */}
            {modulesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-surface border border-outline-variant/20 p-5 rounded-[4px] animate-pulse">
                    <div className="h-4 bg-surface-high rounded w-1/3 mb-3"></div>
                    <div className="h-5 bg-surface-high rounded w-2/3 mb-2"></div>
                    <div className="h-3 bg-surface-high rounded w-full mb-4"></div>
                    <div className="h-8 bg-surface-high rounded w-full"></div>
                  </div>
                ))}
              </div>
            ) : filteredModules.length === 0 ? (
              <div className="text-center py-16 bg-surface border border-outline-variant/20 rounded">
                <p className="text-sm text-on-surface-variant/60 mb-2">No modules match your filters.</p>
                <button
                  onClick={() => { setYearFilter('all'); setStatusFilter('all'); setTypeFilter('all'); setModuleSearch(''); }}
                  className="text-xs text-primary hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredModules.map(mod => (
                  <ModuleCard
                    key={mod.code}
                    module={mod}
                    onClick={() => setSelectedModule(mod)}
                  />
                ))}
              </div>
            )}

            {/* Module Detail Drawer */}
            {selectedModule && (
              <div className="fixed inset-0 z-50 flex justify-end">
                <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedModule(null)} />
                <aside className="relative w-full max-w-md bg-surface border-l border-outline-variant/20 overflow-y-auto custom-scrollbar p-8">
                  <button onClick={() => setSelectedModule(null)} className="absolute top-4 right-4 p-2 hover:bg-surface-high rounded transition-colors">
                    <X size={16} className="text-on-surface-variant" />
                  </button>

                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-lg font-bold text-secondary">{selectedModule.code}</span>
                    <span className={cn(
                      "text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border",
                      selectedModule.status === 'completed' && "text-green-400 bg-green-500/10 border-green-500/20",
                      selectedModule.status === 'available' && "text-secondary bg-secondary/10 border-secondary/20",
                      selectedModule.status === 'locked' && "text-slate-500 bg-slate-500/10 border-slate-500/20",
                    )}>
                      {selectedModule.status}
                    </span>
                    <span className={cn(
                      "text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border",
                      selectedModule.type === 'Core' ? "text-primary bg-primary/10 border-primary/20" : "text-slate-400 bg-slate-500/10 border-slate-500/20",
                    )}>
                      {selectedModule.type}
                    </span>
                  </div>

                  <h2 className="font-headline text-2xl font-bold mb-4">{selectedModule.name}</h2>
                  <p className="text-sm text-on-surface-variant leading-relaxed mb-6">{selectedModule.description}</p>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-surface-high p-4 rounded">
                      <p className="text-[9px] font-mono text-slate-500 uppercase mb-1">Credits</p>
                      <p className="text-lg font-headline font-bold text-on-surface">{selectedModule.credits} MC</p>
                    </div>
                    <div className="bg-surface-high p-4 rounded">
                      <p className="text-[9px] font-mono text-slate-500 uppercase mb-1">A-Rate</p>
                      <p className="text-lg font-headline font-bold text-on-surface">{selectedModule.historicalARate}%</p>
                    </div>
                    <div className="bg-surface-high p-4 rounded">
                      <p className="text-[9px] font-mono text-slate-500 uppercase mb-1">Weekly Hours</p>
                      <p className="text-lg font-headline font-bold text-on-surface">{selectedModule.avgWeeklyHours}h</p>
                    </div>
                    <div className="bg-surface-high p-4 rounded">
                      <p className="text-[9px] font-mono text-slate-500 uppercase mb-1">Year</p>
                      <p className="text-lg font-headline font-bold text-on-surface">Y{getYearFromCode(selectedModule.code)}</p>
                    </div>
                  </div>

                  {/* Metrics Bars */}
                  <div className="space-y-3 mb-6">
                    {[
                      { label: 'Difficulty', value: selectedModule.difficulty, color: 'bg-primary' },
                      { label: 'Workload', value: selectedModule.workload, color: 'bg-secondary' },
                      { label: 'Theory', value: selectedModule.theory, color: 'bg-blue-500' },
                      { label: 'Project', value: selectedModule.project, color: 'bg-green-500' },
                      { label: 'Exam Weight', value: selectedModule.exam, color: 'bg-amber-500' },
                    ].map(({ label, value, color }) => (
                      <div key={label}>
                        <div className="flex justify-between text-[10px] font-mono mb-1">
                          <span className="text-slate-500 uppercase">{label}</span>
                          <span className="text-on-surface">{value}%</span>
                        </div>
                        <div className="w-full bg-surface-high h-1.5 rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full", color)} style={{ width: `${value}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Prerequisites */}
                  {selectedModule.prerequisites.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-3">Prerequisites</h3>
                      <div className="space-y-2">
                        {selectedModule.prerequisites.map(p => {
                          const prereqMod = modules.find(m => m.code === p);
                          return (
                            <div key={p} className="flex items-center gap-2 p-2 bg-surface-high rounded border-l-2 border-green-500/50">
                              <span className="font-mono text-xs font-bold text-secondary">{p}</span>
                              {prereqMod && <span className="text-[10px] text-slate-400">{prereqMod.name}</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Unlocks */}
                  {selectedModule.unlocks.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-3">Unlocks</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedModule.unlocks.map(u => (
                          <span key={u} className="px-2 py-1 bg-surface-high rounded text-[10px] font-mono text-slate-300 border border-outline-variant/10">
                            {u}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 mt-auto pt-4">
                    <button
                      onClick={() => { navigate(`/compare?a=${selectedModule.code}`); }}
                      className="flex-1 py-2 border border-secondary text-secondary text-xs font-bold uppercase tracking-widest hover:bg-secondary/10 transition-colors rounded"
                    >
                      Compare
                    </button>
                    <button
                      onClick={() => { navigate(`/graph`); setSelectedModule(null); }}
                      className="flex-1 py-2 bg-primary text-white text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors rounded"
                    >
                      View in Graph
                    </button>
                  </div>
                </aside>
              </div>
            )}
          </>
        )}

        {/* ==================== MAJORS TAB ==================== */}
        {activeTab === 'majors' && (
          <>
            {/* AI Search */}
            <section className="mb-12">
              <div className="max-w-3xl">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-lg blur opacity-20 group-focus-within:opacity-40 transition duration-1000"></div>
                  <div className="relative bg-surface-low border-b border-white/10 flex items-center px-6 py-4">
                    <Sparkles size={20} className="text-primary mr-4" />
                    <input
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSearch()}
                      className="bg-transparent border-none focus:ring-0 w-full text-lg font-body placeholder:text-slate-600 outline-none"
                      placeholder="What do you want to build or study?"
                      type="text"
                    />
                    {searching ? (
                      <Loader2 size={18} className="text-primary animate-spin ml-2" />
                    ) : (
                      <button onClick={handleSearch} className="ml-2 text-slate-500 hover:text-primary transition-colors">
                        <Search size={18} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                  {['/generate neural_networks', '/path software_engineering', '/compare data_science vs ai'].map(cmd => (
                    <span
                      key={cmd}
                      onClick={() => handleCommandClick(cmd)}
                      className="px-3 py-1 bg-surface-high text-[10px] font-mono text-slate-400 border border-white/5 cursor-pointer hover:border-primary/40 transition-colors whitespace-nowrap"
                    >
                      {cmd}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            {/* AI Search Results */}
            {searchResults && (
              <section className="mb-12">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-mono text-primary uppercase tracking-[0.2em]">AI Search Results</h3>
                  <button onClick={() => setSearchResults(null)} className="text-slate-500 hover:text-white transition-colors">
                    <X size={14} />
                  </button>
                </div>
                {searchResults.length === 0 ? (
                  <p className="text-sm text-on-surface-variant/50">No results found.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {searchResults.map((r, i) => (
                      <div key={i} className="bg-surface border border-outline-variant/20 p-5 rounded-[4px] hover:border-primary/30 transition-colors">
                        <h4 className="font-headline font-bold text-sm mb-2">{r.name}</h4>
                        <p className="text-xs text-slate-400 mb-3">{r.description}</p>
                        <p className="text-[10px] font-mono text-secondary">{r.relevance}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Major Cards */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {majorsLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-surface border border-outline-variant/20 p-6 rounded-[4px] animate-pulse">
                    <div className="flex justify-between items-start mb-4">
                      <div className="h-6 bg-surface-high rounded w-2/3"></div>
                      <div className="h-6 bg-surface-high rounded w-20"></div>
                    </div>
                    <div className="h-4 bg-surface-high rounded w-full mb-2"></div>
                    <div className="h-4 bg-surface-high rounded w-3/4 mb-6"></div>
                    <div className="space-y-2 mb-6">
                      <div className="h-3 bg-surface-high rounded w-1/2"></div>
                      <div className="h-3 bg-surface-high rounded w-2/3"></div>
                    </div>
                    <div className="border-t border-outline-variant/10 pt-6">
                      <div className="h-8 bg-surface-high rounded w-full"></div>
                    </div>
                  </div>
                ))
              ) : majors.length === 0 ? (
                <div className="col-span-2 text-center py-12">
                  <p className="text-sm text-on-surface-variant/50">No majors found.</p>
                </div>
              ) : (
                majors.map((major) => (
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
                      <button
                        onClick={() => handlePreviewPath(major)}
                        className="w-full py-2 border border-secondary text-secondary text-xs font-bold uppercase tracking-widest hover:bg-secondary/10 transition-colors flex items-center justify-center gap-2"
                      >
                        <span>Preview Path</span>
                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </article>
                ))
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
