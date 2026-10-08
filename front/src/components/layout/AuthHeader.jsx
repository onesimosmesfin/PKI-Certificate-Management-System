import ThemeToggle from '../ui/ThemeToggle';
import UserMenu from './UserMenu';

export default function AuthHeader({ title, subtitle }) {
  return (
    <header className="app-topbar sticky top-0 z-40 mb-6">
      <div className="flex flex-col gap-4 px-4 py-4 md:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="app-heading truncate text-2xl font-black tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="app-muted mt-1 max-w-2xl text-sm">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3">
          <div className="app-surface-soft rounded-2xl px-3 py-2">
            <ThemeToggle />
          </div>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
