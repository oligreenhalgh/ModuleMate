import React from 'react';
import { 
  Brain, 
  Database, 
  Palette, 
  AlertTriangle, 
  Eye, 
  Trash2, 
  Upload,
  Zap
} from 'lucide-react';

export function SettingsView() {
  return (
    <div className="flex-1 h-screen overflow-y-auto custom-scrollbar bg-background">
      <div className="pt-24 pb-20 px-10 max-w-4xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-bold font-headline tracking-tighter text-on-surface mb-2">System Configuration</h1>
          <p className="text-on-surface-variant font-body">Manage your architectural parameters and AI engine dependencies.</p>
        </header>

        <div className="space-y-12">
          {/* AI Engine */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Zap className="text-primary" size={20} />
              <h3 className="text-lg font-headline font-bold uppercase tracking-widest text-on-surface">AI Engine Core</h3>
            </div>
            <div className="bg-surface p-8 rounded-lg border border-outline-variant/5">
              <div className="max-w-xl">
                <label className="block text-xs font-mono text-primary uppercase tracking-tighter mb-4">Gemini API Key</label>
                <div className="relative flex items-center">
                  <input 
                    className="w-full bg-surface-low border-b border-outline-variant/20 focus:border-primary outline-none py-3 px-4 font-mono text-sm text-on-surface transition-all" 
                    readOnly 
                    type="password" 
                    value="sk-gemini-v1-alpha-29384kdjfh20934"
                  />
                  <button className="absolute right-4 text-outline-variant hover:text-primary transition-colors">
                    <Eye size={18} />
                  </button>
                </div>
                <p className="mt-4 text-xs text-on-surface-variant leading-relaxed">
                  Your API key is stored locally in an encrypted vault. ModuleMate uses this to orchestrate degree planning logic via the Gemini 1.5 Pro model.
                </p>
              </div>
            </div>
          </section>

          {/* Data Management */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Database className="text-secondary" size={20} />
              <h3 className="text-lg font-headline font-bold uppercase tracking-widest text-on-surface">Transcript Artifacts</h3>
            </div>
            <div className="bg-surface rounded-lg border border-outline-variant/5 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-high">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-mono text-secondary uppercase tracking-widest">Document ID</th>
                    <th className="px-6 py-4 text-[10px] font-mono text-secondary uppercase tracking-widest">Type</th>
                    <th className="px-6 py-4 text-[10px] font-mono text-secondary uppercase tracking-widest">Processed Date</th>
                    <th className="px-6 py-4 text-[10px] font-mono text-secondary uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  <tr className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 font-mono text-sm text-on-surface">trans_fall_2023_v2.pdf</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-[10px] font-mono border border-secondary/20 uppercase">Official</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-on-surface-variant">2023.11.24 14:22</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-outline-variant hover:text-error transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="p-6 bg-surface-low border-t border-outline-variant/10 flex justify-center">
                <button className="flex items-center gap-2 px-6 py-2 bg-secondary text-background font-headline font-bold text-sm uppercase tracking-tighter hover:shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all">
                  <Upload size={16} />
                  <span>Upload New Transcript</span>
                </button>
              </div>
            </div>
          </section>

          {/* Preferences */}
          <section className="grid md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Palette className="text-on-surface" size={20} />
                <h3 className="text-lg font-headline font-bold uppercase tracking-widest text-on-surface">Interface</h3>
              </div>
              <div className="bg-surface p-6 rounded-lg border border-outline-variant/5">
                <div className="flex items-center justify-between opacity-50 cursor-not-allowed group relative">
                  <div>
                    <p className="text-sm font-bold text-on-surface">Light Mode</p>
                    <p className="text-xs text-on-surface-variant">Switch to high-contrast light theme.</p>
                  </div>
                  <div className="w-10 h-5 bg-outline-variant/20 rounded-full relative">
                    <div className="absolute left-1 top-1 w-3 h-3 bg-outline-variant rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-6">
                <AlertTriangle className="text-error" size={20} />
                <h3 className="text-lg font-headline font-bold uppercase tracking-widest text-on-surface">Danger Zone</h3>
              </div>
              <div className="bg-surface p-6 rounded-lg border border-error/20">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-bold text-on-surface">Academic Profile Reset</p>
                    <p className="text-xs text-on-surface-variant">Purge all course history and majors.</p>
                  </div>
                  <button className="px-4 py-2 border border-error/50 text-error font-mono text-[10px] uppercase tracking-widest hover:bg-error/10 transition-all">
                    Initialize Reset
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
