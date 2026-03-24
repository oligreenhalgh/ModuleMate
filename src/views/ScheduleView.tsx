import React from 'react';
import { 
  AlertTriangle, 
  Calendar as CalendarIcon, 
  Download, 
  RefreshCw,
  Clock,
  User as UserIcon
} from 'lucide-react';

const SCHEDULE = [
  { code: 'CS402-A', name: 'Distributed Systems', schedule: 'Mon/Wed 14:00', professor: 'Dr. Aris Thorne', credits: 4, conflict: false },
  { code: 'MATH301', name: 'Complex Analysis', schedule: 'Wed 14:30', professor: 'Prof. S. Liang', credits: 4, conflict: true },
  { code: 'PHIL220', name: 'Ethics in AI', schedule: 'Tue/Thu 10:00', professor: 'Dr. Elena Vos', credits: 4, conflict: false },
  { code: 'CS490', name: 'Senior Thesis Project', schedule: 'Friday 11:00', professor: 'Academic Board', credits: 3, conflict: false },
];

export function ScheduleView() {
  return (
    <div className="flex-1 h-screen overflow-y-auto custom-scrollbar bg-background">
      <div className="pt-24 pb-32 px-6 flex justify-center">
        <div className="w-full max-w-[800px] flex flex-col gap-8">
          {/* Warning Banner */}
          <div className="flex items-center gap-4 p-4 rounded bg-error/10 border border-error/30 animate-pulse">
            <AlertTriangle className="text-error" size={20} />
            <div>
              <h3 className="font-headline font-bold text-error text-sm uppercase tracking-wider">Schedule Conflict Detected</h3>
              <p className="text-xs text-error/80 font-body">CS402 and MATH301 overlap on Wednesday (14:00 - 15:30). AI suggests alternate MATH301 Lab Section B.</p>
            </div>
          </div>

          {/* Summary Stats */}
          <section className="bg-surface p-8 rounded border border-outline-variant/30">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h1 className="font-headline text-3xl font-bold tracking-tight mb-2">Export Preview</h1>
                <p className="text-on-surface-variant font-body text-sm">Review your curated academic pathway for Fall 2024 before finalizing sync.</p>
              </div>
              <div className="text-right">
                <span className="font-mono text-2xl font-bold text-secondary">84<span className="text-slate-500 font-medium text-lg">/120</span></span>
                <p className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">Degree Credits</p>
              </div>
            </div>
            <div className="relative w-full h-3 bg-surface-high rounded-full overflow-hidden">
              <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-secondary" style={{ width: '70%' }}></div>
            </div>
            <div className="flex justify-between mt-3">
              <span className="font-mono text-[10px] text-slate-500 uppercase">Core Requirements: 92%</span>
              <span className="font-mono text-[10px] text-slate-500 uppercase">Electives: 45%</span>
            </div>
          </section>

          {/* Semester Block */}
          <section className="border border-outline-variant rounded overflow-hidden">
            <div className="bg-surface-low px-6 py-4 flex justify-between items-center border-b border-outline-variant">
              <h2 className="font-headline font-bold tracking-wide uppercase text-sm">Fall Semester 2024</h2>
              <span className="font-mono text-xs text-primary bg-primary/10 px-2 py-1 rounded">15 Credits Total</span>
            </div>
            <div className="divide-y divide-outline-variant/50">
              {SCHEDULE.map((item) => (
                <div 
                  key={item.code} 
                  className={`px-6 py-6 transition-colors group relative overflow-hidden ${
                    item.conflict ? 'bg-error/5 hover:bg-error/10' : 'bg-surface hover:bg-surface-low'
                  }`}
                >
                  {item.conflict && <div className="absolute left-0 top-0 bottom-0 w-1 bg-error"></div>}
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-3">
                      <span className={`font-mono text-[10px] uppercase mb-1 block ${item.conflict ? 'text-error' : 'text-slate-500'}`}>
                        {item.conflict ? 'Conflict Warning' : 'Module Code'}
                      </span>
                      <span className={`font-mono text-lg font-bold ${item.conflict ? 'text-on-surface' : 'text-secondary group-hover:text-white'} transition-colors`}>
                        {item.code}
                      </span>
                    </div>
                    <div className="col-span-4">
                      <span className="font-mono text-[10px] text-slate-500 uppercase mb-1 block">Course Name</span>
                      <span className="font-body text-sm font-medium">{item.name}</span>
                    </div>
                    <div className="col-span-3">
                      <span className="font-mono text-[10px] text-slate-500 uppercase mb-1 block">Schedule</span>
                      <span className={`font-body text-sm flex items-center gap-1 ${item.conflict ? 'text-error' : ''}`}>
                        <Clock size={12} />
                        {item.schedule}
                      </span>
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="font-mono text-[10px] text-slate-500 uppercase mb-1 block">Professor</span>
                      <span className="font-body text-xs italic flex items-center justify-end gap-1">
                        <UserIcon size={10} />
                        {item.professor}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Actions */}
          <div className="flex flex-col md:flex-row gap-4 justify-center mt-4">
            <button className="flex-1 bg-primary text-white h-14 font-headline font-bold uppercase tracking-widest flex items-center justify-center gap-3 rounded hover:shadow-[0_0_20px_rgba(176,38,255,0.4)] transition-all active:scale-95">
              <RefreshCw size={18} />
              Sync to Google Calendar
            </button>
            <button className="flex-1 border border-secondary/30 text-secondary h-14 font-headline font-bold uppercase tracking-widest flex items-center justify-center gap-3 rounded hover:bg-secondary/10 transition-all active:scale-95">
              <Download size={18} />
              Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
