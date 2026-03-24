import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  MessageSquare,
  Compass,
  Calendar,
  GitBranch,
  Settings,
  Zap,
  User,
  BarChart2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { getProfile } from '../services/api';
import type { UserProfile } from '../services/api';

const navItems = [
  { icon: MessageSquare, label: 'Home', path: '/' },
  { icon: Compass, label: 'Major Explorer', path: '/explorer' },
  { icon: BarChart2, label: 'Comparison', path: '/comparison' },
  { icon: Calendar, label: 'My Schedule', path: '/schedule' },
  { icon: GitBranch, label: 'Dependency Graph', path: '/graph' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export function Sidebar() {
  const [profile, setProfile] = useState<UserProfile>({
    name: 'Alex Chen',
    program: 'L4 Computer Science',
    gpa: 0,
    gpa_max: 0,
    gpa_trend: 0,
    total_credits: 0,
    required_credits: 0,
    major_credits: 0,
    major_required: 0,
    ue_credits: 0,
    ue_required: 0,
    ai_credits_used: 750,
    ai_credits_max: 1000,
  });

  useEffect(() => {
    getProfile()
      .then(setProfile)
      .catch(() => {});
  }, []);

  const creditPercent = profile.ai_credits_max > 0
    ? (profile.ai_credits_used / profile.ai_credits_max) * 100
    : 0;

  return (
    <aside className="fixed left-0 top-0 h-full w-[250px] bg-background border-r border-outline-variant/20 flex flex-col pt-20 z-40">
      <div className="px-6 mb-8">
        <h2 className="text-lg font-black text-primary font-headline tracking-tighter">ModuleMate</h2>
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">AI University Advisor</p>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-3 rounded transition-all font-headline text-sm tracking-wide",
              isActive
                ? "bg-primary/10 text-primary border-r-4 border-primary font-bold translate-x-1"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-6 mt-auto">
        <div className="bg-surface-high p-4 rounded-lg border border-outline-variant/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center text-primary">
              <Zap size={14} />
            </div>
            <span className="text-xs font-bold text-on-surface">Pro Plan</span>
          </div>
          <div className="w-full bg-surface rounded-full h-1.5 mb-2">
            <div className="bg-primary h-1.5 rounded-full" style={{ width: `${creditPercent}%` }}></div>
          </div>
          <p className="text-[10px] text-on-surface-variant font-mono">{profile.ai_credits_used}/{profile.ai_credits_max} AI Credits Used</p>
        </div>

        <div className="mt-4 flex items-center gap-3 p-2 bg-surface rounded-lg border border-outline-variant/10">
          <div className="w-8 h-8 rounded-full bg-surface-high flex items-center justify-center border border-primary/20">
            <User size={14} className="text-primary" />
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold truncate">{profile.name}</p>
            <p className="text-[10px] text-slate-500 font-mono">{profile.program}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
