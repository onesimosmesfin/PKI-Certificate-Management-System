import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Check,
  Globe2,
  LockKeyhole,
  Mail,
  Monitor,
  MoonStar,
  Save,
  ShieldCheck,
  Smartphone,
  Sun,
  UserCircle2,
} from 'lucide-react';

import { Button, GlassCard } from '../../components/ui/Core';
import ThemeToggle from '../../components/ui/ThemeToggle';
import { useTheme } from '../../context/ThemeContext';
import { useAuthStore } from '../../store/authStore';

const THEME_OPTIONS = [
  {
    value: 'light',
    label: 'Light',
    description: 'Bright workspace for daytime operations.',
    icon: <Sun size={18} className="text-amber-500" />,
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Lower glare and stronger contrast for monitoring.',
    icon: <MoonStar size={18} className="text-indigo-400" />,
  },
  {
    value: 'system',
    label: 'System',
    description: 'Follow the operating system appearance.',
    icon: <Monitor size={18} className="text-sky-400" />,
  },
];

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const {
    preferences,
    resolvedTheme,
    setThemeMode,
    updatePreferences,
    resetPreferences,
  } = useTheme();

  const [form, setForm] = useState(preferences);
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    setForm(preferences);
  }, [preferences]);

  const displayUsername = useMemo(
    () => preferences.displayName?.trim() || user?.username || 'Operator',
    [preferences.displayName, user?.username],
  );

  const handleChange = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
    setSavedMessage('');
  };

  const handleSave = () => {
    updatePreferences(form);
    setSavedMessage('Preferences saved successfully.');
  };

  const handleReset = () => {
    resetPreferences();
    setSavedMessage('Preferences reset to defaults.');
  };

  return (
    <div className="app-shell min-h-screen pb-6">
      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <GlassCard className="bg-[linear-gradient(135deg,rgba(99,102,241,0.12),transparent_55%),linear-gradient(180deg,rgb(var(--app-surface)),rgb(var(--app-surface)))]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-2xl font-black text-white shadow-lg shadow-indigo-500/20">
                  {displayUsername.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="app-heading text-2xl font-black tracking-tight">
                    {displayUsername}
                  </div>
                  <div className="app-muted mt-1 text-sm">
                    {user?.role || 'Authenticated user'} account
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button variant="secondary" onClick={handleReset}>
                  Reset
                </Button>
                <Button className="flex items-center gap-2" onClick={handleSave}>
                  <Save size={16} />
                  Save changes
                </Button>
              </div>
            </div>

            {savedMessage && (
              <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
                {savedMessage}
              </div>
            )}
          </GlassCard>

          <GlassCard>
            <div className="mb-5 flex items-center gap-3">
              <UserCircle2 className="text-indigo-500" size={22} />
              <div>
                <h2 className="app-heading text-xl font-bold">Profile</h2>
                <p className="app-muted text-sm">
                  Update how your account appears throughout the platform.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Display Name"
                value={form.displayName}
                onChange={(value) => handleChange('displayName', value)}
                placeholder={user?.username || 'Operator'}
              />
              <Field
                label="Contact Email"
                value={form.contactEmail}
                onChange={(value) => handleChange('contactEmail', value)}
                placeholder="security@nexuspki.local"
                type="email"
              />
              <Field
                label="Timezone"
                value={form.timezone}
                onChange={(value) => handleChange('timezone', value)}
                placeholder="America/Los_Angeles"
              />
              <Field
                label="Language"
                value={form.language}
                onChange={(value) => handleChange('language', value)}
                placeholder="English"
              />
            </div>
          </GlassCard>

          <GlassCard>
            <div className="mb-5 flex items-center gap-3">
              <Bell className="text-amber-500" size={22} />
              <div>
                <h2 className="app-heading text-xl font-bold">Notifications</h2>
                <p className="app-muted text-sm">
                  Control how operational updates reach you.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <PreferenceRow
                icon={<Mail size={18} className="text-sky-400" />}
                title="Email alerts"
                description="Receive security and approval activity by email."
                active={form.emailNotifications}
                onToggle={() => handleChange('emailNotifications', !form.emailNotifications)}
              />
              <PreferenceRow
                icon={<Smartphone size={18} className="text-violet-400" />}
                title="SMS alerts"
                description="Receive urgent incident and revocation updates by SMS."
                active={form.smsNotifications}
                onToggle={() => handleChange('smsNotifications', !form.smsNotifications)}
              />
            </div>
          </GlassCard>
        </div>

        <div className="space-y-6">
          <GlassCard>
            <div className="mb-5 flex items-center gap-3">
              <Monitor className="text-indigo-500" size={22} />
              <div>
                <h2 className="app-heading text-xl font-bold">Appearance</h2>
                <p className="app-muted text-sm">
                  Choose how light and dark mode behave across the entire system.
                </p>
              </div>
            </div>

            <div className="mb-5 flex items-center justify-between rounded-2xl border border-[rgb(var(--app-border))] bg-[rgb(var(--app-surface-muted))] px-4 py-3">
              <div>
                <div className="app-heading text-sm font-semibold">Quick toggle</div>
                <div className="app-muted text-xs">
                  Current resolved theme: {resolvedTheme}
                </div>
              </div>
              <ThemeToggle />
            </div>

            <div className="grid gap-3">
              {THEME_OPTIONS.map((option) => {
                const active = form.themeMode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      handleChange('themeMode', option.value);
                      setThemeMode(option.value);
                    }}
                    className={`rounded-2xl border p-4 text-left transition-all ${
                      active
                        ? 'border-indigo-500/30 bg-indigo-500/10'
                        : 'border-[rgb(var(--app-border))] bg-[rgb(var(--app-surface-muted))] hover:bg-[rgb(var(--app-surface-strong))]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-[rgb(var(--app-surface-strong))] p-2">
                          {option.icon}
                        </div>
                        <div>
                          <div className="app-heading font-semibold">{option.label}</div>
                          <div className="app-muted text-sm">{option.description}</div>
                        </div>
                      </div>
                      {active && <Check size={18} className="text-indigo-400" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </GlassCard>

          <GlassCard>
            <div className="mb-5 flex items-center gap-3">
              <ShieldCheck className="text-emerald-500" size={22} />
              <div>
                <h2 className="app-heading text-xl font-bold">Security</h2>
                <p className="app-muted text-sm">
                  Keep your session and operator experience aligned with policy.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <PreferenceRow
                icon={<LockKeyhole size={18} className="text-red-400" />}
                title="Two-factor authentication"
                description="Require a second factor for administrative access."
                active={form.twoFactor}
                onToggle={() => handleChange('twoFactor', !form.twoFactor)}
              />
              <PreferenceRow
                icon={<Globe2 size={18} className="text-sky-400" />}
                title="Reduced motion"
                description="Minimize animation intensity in the interface."
                active={form.reducedMotion}
                onToggle={() => handleChange('reducedMotion', !form.reducedMotion)}
              />
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <label className="space-y-2">
      <span className="app-muted text-xs font-bold uppercase tracking-[0.24em]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="app-input w-full rounded-xl px-4 py-3 text-sm"
      />
    </label>
  );
}

function PreferenceRow({ icon, title, description, active, onToggle }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[rgb(var(--app-border))] bg-[rgb(var(--app-surface-muted))] px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-[rgb(var(--app-surface-strong))] p-2">
          {icon}
        </div>
        <div>
          <div className="app-heading text-sm font-semibold">{title}</div>
          <div className="app-muted text-sm">{description}</div>
        </div>
      </div>

      <Toggle active={active} onClick={onToggle} />
    </div>
  );
}

function Toggle({ active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative h-7 w-14 rounded-full p-1 transition-colors ${
        active ? 'bg-indigo-600' : 'bg-[rgb(var(--app-border-strong))]'
      }`}
    >
      <div
        className={`h-5 w-5 rounded-full bg-white shadow-md transition-transform ${
          active ? 'translate-x-7' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
