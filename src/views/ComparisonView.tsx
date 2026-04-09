import React, { useState, useEffect } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer
} from 'recharts';
import { getUoBModules, compareModules } from '../services/api';
import type { Module } from '../types';

export function ComparisonView() {
  const [modules, setModules] = useState<Module[]>([]);
  const [moduleA, setModuleA] = useState<Module | null>(null);
  const [moduleB, setModuleB] = useState<Module | null>(null);
  const [codeA, setCodeA] = useState('06-34253');
  const [codeB, setCodeB] = useState('06-34248');
  const [recommendation, setRecommendation] = useState(
    '"Select two modules and click Compare to get an AI recommendation."'
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUoBModules().then(mods => {
      setModules(mods);
      const a = mods.find(m => m.code === codeA);
      const b = mods.find(m => m.code === codeB);
      if (a) setModuleA(a);
      if (b) setModuleB(b);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleCompare = async () => {
    const a = modules.find(m => m.code === codeA);
    const b = modules.find(m => m.code === codeB);
    if (a) setModuleA(a);
    if (b) setModuleB(b);
    try {
      const res = await compareModules(codeA, codeB);
      setRecommendation(`"${res.recommendation}"`);
    } catch {
      setRecommendation('"AI recommendation unavailable. Configure your Gemini API key in Settings."');
    }
  };

  const data = moduleA && moduleB ? [
    { subject: 'Workload', A: moduleA.workload, B: moduleB.workload, fullMark: 100 },
    { subject: 'Difficulty', A: moduleA.difficulty, B: moduleB.difficulty, fullMark: 100 },
    { subject: 'Theory', A: moduleA.theory, B: moduleB.theory, fullMark: 100 },
    { subject: 'Project', A: moduleA.project, B: moduleB.project, fullMark: 100 },
    { subject: 'Exam Weight', A: moduleA.exam, B: moduleB.exam, fullMark: 100 },
  ] : [];

  return (
    <div className="flex-1 h-screen overflow-y-auto custom-scrollbar bg-background">
      <div className="pt-24 pb-20 px-10 max-w-7xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-bold font-headline tracking-tighter text-on-surface mb-2">Module Comparison</h1>
          <p className="text-on-surface-variant font-body">Multivariate analysis of academic load and complexity.</p>
          <div className="mt-4 flex items-center gap-4">
            <select
              value={codeA}
              onChange={e => setCodeA(e.target.value)}
              className="bg-surface-low border border-outline-variant/20 text-sm font-mono px-3 py-2 rounded outline-none focus:border-primary"
            >
              {modules.map(m => <option key={m.code} value={m.code}>{m.code}: {m.name}</option>)}
            </select>
            <span className="text-on-surface-variant text-sm">vs</span>
            <select
              value={codeB}
              onChange={e => setCodeB(e.target.value)}
              className="bg-surface-low border border-outline-variant/20 text-sm font-mono px-3 py-2 rounded outline-none focus:border-secondary"
            >
              {modules.map(m => <option key={m.code} value={m.code}>{m.code}: {m.name}</option>)}
            </select>
            <button
              onClick={handleCompare}
              className="px-4 py-2 bg-primary text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-primary/90 transition-colors"
            >
              Compare
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chart Section */}
          <div className="lg:col-span-2 bg-surface p-8 border border-outline-variant/20 rounded-lg">
            {loading || !moduleA || !moduleB ? (
              <div className="h-[400px] flex items-center justify-center text-on-surface-variant text-sm">Loading modules...</div>
            ) : (
              <>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                      <PolarGrid stroke="#2A2A35" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#D2C1D7', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar
                        name={moduleA.code}
                        dataKey="A"
                        stroke="#B026FF"
                        fill="#B026FF"
                        fillOpacity={0.4}
                      />
                      <Radar
                        name={moduleB.code}
                        dataKey="B"
                        stroke="#00F0FF"
                        fill="#00F0FF"
                        fillOpacity={0.4}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-8 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-primary rounded-full"></div>
                    <span className="text-xs font-mono text-on-surface">{moduleA.code}: {moduleA.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-secondary rounded-full"></div>
                    <span className="text-xs font-mono text-on-surface">{moduleB.code}: {moduleB.name}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Stats Section */}
          <div className="space-y-6">
            {/* Quick Facts */}
            {moduleA && moduleB && (
              <div className="bg-surface p-6 border border-outline-variant/20 rounded-lg">
                <h3 className="text-[10px] font-mono text-secondary uppercase tracking-widest mb-4">Quick Facts</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] font-mono text-slate-500 uppercase mb-1">{moduleA.code}</p>
                    <p className="text-sm font-bold text-on-surface mb-1">{moduleA.credits} MC · {moduleA.type}</p>
                    <p className="text-[10px] text-slate-400">{moduleA.avgWeeklyHours}h/week</p>
                    {moduleA.prerequisites.length > 0 && (
                      <div className="mt-2">
                        <p className="text-[9px] font-mono text-slate-500 uppercase mb-1">Prerequisites</p>
                        <div className="flex flex-wrap gap-1">
                          {moduleA.prerequisites.map(p => (
                            <span key={p} className="text-[9px] font-mono bg-surface-high px-1.5 py-0.5 rounded text-slate-300">{p}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-[9px] font-mono text-slate-500 uppercase mb-1">{moduleB.code}</p>
                    <p className="text-sm font-bold text-on-surface mb-1">{moduleB.credits} MC · {moduleB.type}</p>
                    <p className="text-[10px] text-slate-400">{moduleB.avgWeeklyHours}h/week</p>
                    {moduleB.prerequisites.length > 0 && (
                      <div className="mt-2">
                        <p className="text-[9px] font-mono text-slate-500 uppercase mb-1">Prerequisites</p>
                        <div className="flex flex-wrap gap-1">
                          {moduleB.prerequisites.map(p => (
                            <span key={p} className="text-[9px] font-mono bg-surface-high px-1.5 py-0.5 rounded text-slate-300">{p}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-surface p-6 border border-outline-variant/20 rounded-lg">
              <h3 className="text-[10px] font-mono text-primary uppercase tracking-widest mb-4">Historical Performance</h3>
              <div className="space-y-4">
                {moduleA && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-on-surface-variant">{moduleA.code} A-Rate</span>
                      <span className="text-on-surface font-bold">{moduleA.historicalARate}%</span>
                    </div>
                    <div className="w-full bg-surface-high h-1.5 rounded-full overflow-hidden">
                      <div className="bg-primary h-full" style={{ width: `${moduleA.historicalARate}%` }}></div>
                    </div>
                  </div>
                )}
                {moduleB && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-on-surface-variant">{moduleB.code} A-Rate</span>
                      <span className="text-on-surface font-bold">{moduleB.historicalARate}%</span>
                    </div>
                    <div className="w-full bg-surface-high h-1.5 rounded-full overflow-hidden">
                      <div className="bg-secondary h-full" style={{ width: `${moduleB.historicalARate}%` }}></div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-surface p-6 border border-outline-variant/20 rounded-lg">
              <h3 className="text-[10px] font-mono text-secondary uppercase tracking-widest mb-4">AI Recommendation</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {recommendation}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
