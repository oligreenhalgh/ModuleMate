import React from 'react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer 
} from 'recharts';
import { MODULES } from '../constants';

const data = [
  { subject: 'Workload', A: 85, B: 40, fullMark: 100 },
  { subject: 'Difficulty', A: 90, B: 30, fullMark: 100 },
  { subject: 'Theory', A: 95, B: 20, fullMark: 100 },
  { subject: 'Project', A: 30, B: 50, fullMark: 100 },
  { subject: 'Exam Weight', A: 90, B: 60, fullMark: 100 },
];

export function ComparisonView() {
  return (
    <div className="flex-1 h-screen overflow-y-auto custom-scrollbar bg-background">
      <div className="pt-24 pb-20 px-10 max-w-7xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-bold font-headline tracking-tighter text-on-surface mb-2">Module Comparison</h1>
          <p className="text-on-surface-variant font-body">Multivariate analysis of academic load and complexity.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chart Section */}
          <div className="lg:col-span-2 bg-surface p-8 border border-outline-variant/20 rounded-lg">
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                  <PolarGrid stroke="#2A2A35" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#D2C1D7', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name="CS3230"
                    dataKey="A"
                    stroke="#B026FF"
                    fill="#B026FF"
                    fillOpacity={0.4}
                  />
                  <Radar
                    name="CS1010"
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
                <span className="text-xs font-mono text-on-surface">CS3230: Algos</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-secondary rounded-full"></div>
                <span className="text-xs font-mono text-on-surface">CS1010: Intro</span>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="space-y-6">
            <div className="bg-surface p-6 border border-outline-variant/20 rounded-lg">
              <h3 className="text-[10px] font-mono text-primary uppercase tracking-widest mb-4">Historical Performance</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-on-surface-variant">CS3230 A-Rate</span>
                    <span className="text-on-surface font-bold">18.2%</span>
                  </div>
                  <div className="w-full bg-surface-high h-1.5 rounded-full overflow-hidden">
                    <div className="bg-primary h-full w-[18%]"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-on-surface-variant">CS1010 A-Rate</span>
                    <span className="text-on-surface font-bold">35.2%</span>
                  </div>
                  <div className="w-full bg-surface-high h-1.5 rounded-full overflow-hidden">
                    <div className="bg-secondary h-full w-[35%]"></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-surface p-6 border border-outline-variant/20 rounded-lg">
              <h3 className="text-[10px] font-mono text-secondary uppercase tracking-widest mb-4">AI Recommendation</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                "CS3230 presents a significantly higher theoretical load (95/100) compared to CS1010. While CS1010 is project-heavy, CS3230 will require intensive mathematical proofing. Ensure your semester load is balanced with at least two lower-difficulty electives."
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
