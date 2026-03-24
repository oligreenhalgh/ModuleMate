import React, { useState, useEffect } from 'react';
import { Sparkles, ChevronRight, GraduationCap, X, Loader2, Search, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { getMajors, getMajorPath, searchMajorsAI } from '../services/api';
import type { MajorPath, SearchResult } from '../services/api';
import { Major } from '../types';
import { cn } from '../lib/utils';

export function ExplorerView() {
  const [majors, setMajors] = useState<Major[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);

  // Path preview state
  const [pathMajor, setPathMajor] = useState<Major | null>(null);
  const [pathData, setPathData] = useState<MajorPath | null>(null);
  const [pathLoading, setPathLoading] = useState(false);

  useEffect(() => {
    getMajors()
      .then(setMajors)
      .catch(() => toast.error('Failed to load majors.'))
      .finally(() => setLoading(false));
  }, []);

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

  const handlePreviewPath = async (major: Major) => {
    setPathMajor(major);
    setPathData(null);
    setPathLoading(true);
    try {
      const data = await getMajorPath(major.id);
      setPathData(data);
    } catch {
      toast.error('Failed to generate path. Check your API key in Settings.');
      setPathMajor(null);
    } finally {
      setPathLoading(false);
    }
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
        {/* Header + Search */}
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
          {loading ? (
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
                    disabled={pathLoading && pathMajor?.id === major.id}
                    className="w-full py-2 border border-secondary text-secondary text-xs font-bold uppercase tracking-widest hover:bg-secondary/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait"
                  >
                    {pathLoading && pathMajor?.id === major.id ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Generating Path...</span>
                      </>
                    ) : (
                      <>
                        <span>Preview Path</span>
                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      </div>

      {/* Path Preview Modal */}
      {pathMajor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setPathMajor(null); setPathData(null); }}>
          <div
            className="bg-surface border border-outline-variant/30 rounded-lg w-full max-w-4xl max-h-[85vh] overflow-y-auto custom-scrollbar shadow-2xl m-4"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-surface border-b border-outline-variant/20 px-8 py-5 flex items-center justify-between z-10">
              <div>
                <h2 className="font-headline text-xl font-bold tracking-tight">{pathMajor.name}</h2>
                <p className="text-[10px] font-mono text-primary uppercase tracking-widest mt-1">Recommended Module Pathway</p>
              </div>
              <button
                onClick={() => { setPathMajor(null); setPathData(null); }}
                className="p-2 hover:bg-white/5 rounded transition-colors text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-8 py-6">
              {pathLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <Loader2 size={32} className="text-primary animate-spin" />
                  <p className="text-sm text-on-surface-variant">Generating your academic pathway with AI...</p>
                  <p className="text-[10px] font-mono text-slate-500">This may take a few seconds</p>
                </div>
              ) : pathData ? (
                <>
                  {/* Summary */}
                  {pathData.summary && (
                    <div className="mb-8 p-4 bg-primary/5 border-l-4 border-primary">
                      <p className="text-sm text-on-surface-variant leading-relaxed">{pathData.summary}</p>
                    </div>
                  )}

                  {/* Semesters Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pathData.semesters.map((sem, i) => (
                      <div key={i} className="bg-surface-low border border-outline-variant/10 rounded overflow-hidden">
                        <div className="bg-surface-high px-4 py-3 flex justify-between items-center border-b border-outline-variant/10">
                          <h4 className="font-headline font-bold text-xs uppercase tracking-wider">{sem.name}</h4>
                          <span className="font-mono text-[10px] text-secondary">
                            {sem.modules.reduce((sum, m) => sum + m.credits, 0)} Credits
                          </span>
                        </div>
                        <div className="p-3 space-y-2">
                          {sem.modules.map((mod, j) => (
                            <div key={j} className="flex items-center justify-between px-3 py-2 bg-surface/50 rounded border border-outline-variant/5">
                              <div className="flex items-center gap-3">
                                <BookOpen size={12} className="text-secondary" />
                                <div>
                                  <span className="font-mono text-[10px] text-secondary">{mod.code}</span>
                                  <p className="text-xs text-on-surface">{mod.name}</p>
                                </div>
                              </div>
                              <span className="font-mono text-[10px] text-slate-500">{mod.credits}MC</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-16">
                  <p className="text-sm text-on-surface-variant/50">Failed to generate path.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
