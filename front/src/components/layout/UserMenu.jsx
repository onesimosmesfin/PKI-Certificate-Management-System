import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Settings, UserCircle2 } from 'lucide-react';

import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../context/ThemeContext';

export default function UserMenu() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const { preferences } = useTheme();
  const [open, setOpen] = useState(false);

  const displayName = useMemo(() => {
    return preferences.displayName?.trim() || user?.username || 'Operator';
  }, [preferences.displayName, user?.username]);

  const initial = displayName.charAt(0).toUpperCase() || 'O';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="app-surface-soft flex items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors hover:bg-[rgb(var(--app-surface-muted))]"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white shadow-lg shadow-indigo-500/20">
          {initial}
        </div>

        <div className="hidden sm:block">
          <div className="app-heading text-sm font-semibold">{displayName}</div>
          <div className="app-muted text-xs uppercase tracking-[0.18em]">
            {user?.role || 'Secure User'}
          </div>
        </div>

        <ChevronDown size={16} className={`app-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="app-surface absolute right-0 top-[calc(100%+0.75rem)] z-50 w-64 rounded-2xl p-2">
          <div className="app-surface-soft rounded-xl px-3 py-3">
            <div className="flex items-center gap-3">
              <UserCircle2 className="text-indigo-500" size={20} />
              <div className="min-w-0">
                <div className="app-heading truncate text-sm font-semibold">{displayName}</div>
                <div className="app-muted truncate text-xs">
                  {preferences.contactEmail || 'Authenticated session'}
                </div>
              </div>
            </div>
          </div>

          <Link
            to="/dashboard/settings"
            onClick={() => setOpen(false)}
            className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-[rgb(var(--app-surface-muted))]"
          >
            <Settings size={16} className="text-indigo-500" />
            <span className="app-heading">Settings</span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-red-500/10"
          >
            <LogOut size={16} className="text-red-400" />
            <span className="text-red-400">Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}
