// pages/dashboard/Settings.jsx
import { Settings as SettingsIcon, Lock,  Palette } from 'lucide-react';
import { GlassCard } from '../../components/ui/Core';
import ThemeToggle from '../../components/ui/ThemeToggle';

export default function Settings() {
  return (
    <div className="max-w-4xl space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <SettingsIcon className="text-slate-400" /> System Preferences
      </h2>

      <div className="grid gap-6">
        {/* Appearance Settings */}
        <GlassCard className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl"><Palette size={24}/></div>
            <div>
              <h4 className="font-bold text-slate-200">Appearance</h4>
              <p className="text-xs text-slate-500">Switch between light and dark interface.</p>
            </div>
          </div>
          <ThemeToggle />
        </GlassCard>

        {/* Security Settings */}
        <GlassCard className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-red-500/10 text-red-500 rounded-xl"><Lock size={24}/></div>
            <div>
              <h4 className="font-bold text-slate-200">Security Policy</h4>
              <p className="text-xs text-slate-500">Configure JWT and Session lifetimes.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-500">JWT Expiry (Minutes)</label>
              <input type="number" defaultValue={60} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-500">Max Failed Logins</label>
              <input type="number" defaultValue={5} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}