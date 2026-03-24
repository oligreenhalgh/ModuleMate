import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { HomeView } from './views/HomeView';
import { ExplorerView } from './views/ExplorerView';
import { ScheduleView } from './views/ScheduleView';
import { GraphView } from './views/GraphView';
import { SettingsView } from './views/SettingsView';
import { ComparisonView } from './views/ComparisonView';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <Router>
      <div className="h-screen flex flex-col bg-background overflow-hidden">
        <Toaster position="top-right" theme="dark" richColors />
        <TopBar />
        <div className="flex flex-1 pt-16 overflow-hidden">
          <Sidebar />
          <main className="flex-1 ml-0 md:ml-[250px] flex overflow-hidden pb-14">
            <Routes>
              <Route path="/" element={<HomeView />} />
              <Route path="/explorer" element={<ExplorerView />} />
              <Route path="/comparison" element={<ComparisonView />} />
              <Route path="/schedule" element={<ScheduleView />} />
              <Route path="/graph" element={<GraphView />} />
              <Route path="/settings" element={<SettingsView />} />
            </Routes>
          </main>
        </div>
        
        {/* Global Footer */}
        <footer className="fixed bottom-0 right-0 w-full md:w-[calc(100%-250px)] h-14 bg-surface/80 backdrop-blur-lg border-t border-outline-variant/30 flex justify-between items-center px-8 z-40">
          <div className="flex gap-6">
            <a className="font-mono text-[10px] uppercase tracking-widest text-slate-500 hover:text-primary transition-colors" href="#">Status</a>
            <a className="font-mono text-[10px] uppercase tracking-widest text-slate-500 hover:text-primary transition-colors" href="#">Documentation</a>
            <a className="font-mono text-[10px] uppercase tracking-widest text-slate-500 hover:text-primary transition-colors" href="#">Support</a>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
            ModuleMate AI © 2026
          </div>
        </footer>
      </div>
    </Router>
  );
}
