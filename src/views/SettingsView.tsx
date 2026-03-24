import React, { useState, useEffect, useRef } from 'react';
import {
  Brain,
  Database,
  Palette,
  AlertTriangle,
  Eye,
  EyeOff,
  Trash2,
  Upload,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getSettings,
  updateSettings,
  getTranscripts,
  uploadTranscript,
  deleteTranscript,
  resetProfile,
} from '../services/api';
import type { Transcript } from '../services/api';

export function SettingsView() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const [s, t] = await Promise.all([getSettings(), getTranscripts()]);
        setSettings(s);
        // Don't populate apiKeyInput with masked value — keep it empty
        // so user must type fresh key. Masked value shown as placeholder.
        setApiKeyInput('');
        setTranscripts(t);
      } catch (e: any) {
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const refreshTranscripts = async () => {
    try {
      const t = await getTranscripts();
      setTranscripts(t);
    } catch {
      toast.error('Failed to refresh transcripts');
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) {
      toast.error('Please enter a valid API key');
      return;
    }
    if (apiKeyInput.includes('••')) {
      toast.error('Please enter a fresh API key, not the masked value');
      return;
    }
    try {
      await updateSettings({ gemini_api_key: apiKeyInput });
      setSettings(prev => ({ ...prev, gemini_api_key: '••••••••' + apiKeyInput.slice(-4) }));
      setApiKeyInput('');
      toast.success('API key saved');
    } catch {
      toast.error('Failed to save API key');
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadTranscript(file);
      toast.success('Transcript uploaded');
      await refreshTranscripts();
    } catch {
      toast.error('Failed to upload transcript');
    }
    // reset so the same file can be re-selected
    e.target.value = '';
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTranscript(id);
      toast.success('Transcript deleted');
      await refreshTranscripts();
    } catch {
      toast.error('Failed to delete transcript');
    }
  };

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset your academic profile? This will purge all course history and majors.')) {
      try {
        await resetProfile();
        toast.success('Profile has been reset');
      } catch {
        toast.error('Failed to reset profile');
      }
    }
  };

  const maskedKey = apiKeyInput ? apiKeyInput.slice(0, 8) + '••••••••••••••••' : '';

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
                <div className="relative flex items-center gap-2">
                  <input
                    className="w-full bg-surface-low border-b border-outline-variant/20 focus:border-primary outline-none py-3 px-4 font-mono text-sm text-on-surface transition-all"
                    type={apiKeyVisible ? 'text' : 'password'}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder={settings.gemini_api_key || 'Enter your Gemini API key'}
                  />
                  <button
                    className="absolute right-16 text-outline-variant hover:text-primary transition-colors"
                    onClick={() => setApiKeyVisible(!apiKeyVisible)}
                  >
                    {apiKeyVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  <button
                    className="px-4 py-2 bg-primary text-background font-headline font-bold text-xs uppercase tracking-tighter hover:shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all"
                    onClick={handleSaveApiKey}
                  >
                    Save
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
                  {transcripts.map((t) => (
                    <tr key={t.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4 font-mono text-sm text-on-surface">{t.filename}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-[10px] font-mono border border-secondary/20 uppercase">{t.type}</span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-on-surface-variant">{t.processed_date}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          className="text-outline-variant hover:text-error transition-colors"
                          onClick={() => handleDelete(t.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-6 bg-surface-low border-t border-outline-variant/10 flex justify-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleUpload}
                />
                <button
                  className="flex items-center gap-2 px-6 py-2 bg-secondary text-background font-headline font-bold text-sm uppercase tracking-tighter hover:shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all"
                  onClick={() => fileInputRef.current?.click()}
                >
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
                  <button
                    className="px-4 py-2 border border-error/50 text-error font-mono text-[10px] uppercase tracking-widest hover:bg-error/10 transition-all"
                    onClick={handleReset}
                  >
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
