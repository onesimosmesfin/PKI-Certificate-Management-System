// components/layout/Sidebar.jsx
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Users, ShieldCheck, ScrollText,
  Key, ShieldAlert, Settings, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const ALL_ITEMS = [
  { icon: <LayoutDashboard size={20} />, label: 'Overview',    path: '/dashboard',           roles: ['ADMIN', 'AUDITOR'] },
  { icon: <Users size={20} />,           label: 'Users',       path: '/dashboard/users',     roles: ['ADMIN'] },
  { icon: <ShieldCheck size={20} />,     label: 'Approvals',   path: '/dashboard/approvals', roles: ['ADMIN'] },
  { icon: <Key size={20} />,             label: 'Certificates',path: '/dashboard/pki',       roles: ['ADMIN', 'AUDITOR', 'CA_OPERATOR', 'ROLE_CA_OPERATOR', 'ROOT', 'INTERMEDIATE'] },
  { icon: <ScrollText size={20} />,      label: 'Audit Logs',  path: '/dashboard/logs',      roles: ['ADMIN', 'AUDITOR'] },
  { icon: <ShieldAlert size={20} />,     label: 'Threats',     path: '/dashboard/threats',   roles: ['ADMIN', 'AUDITOR'] },
  { icon: <Settings size={20} />,        label: 'Settings',    path: '/dashboard/settings',  roles: ['ADMIN', 'AUDITOR'] },
];

export default function Sidebar({ collapsed, setCollapsed }) {
  const { pathname } = useLocation();
  const user = useAuthStore((s) => s.user);
  const role = user?.role;

  const navItems = ALL_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <motion.aside
      animate={{ width: collapsed ? 80 : 260 }}
      className="app-surface h-screen sticky top-0 flex flex-col rounded-none border-y-0 border-l-0 transition-all z-50"
    >
      <div className="flex items-center justify-between p-6">
        {!collapsed && <span className="text-xl font-bold tracking-tighter text-indigo-500">PKI Management</span>}
        <button onClick={() => setCollapsed(!collapsed)} className="app-muted rounded-lg p-1.5 hover:bg-[rgb(var(--app-surface-muted))]">
          {collapsed ? <ChevronRight size={20}/> : <ChevronLeft size={20}/>}
        </button>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all group ${
              pathname === item.path
                ? 'border border-indigo-500/20 bg-indigo-600/10 text-indigo-400'
                : 'app-muted hover:bg-[rgb(var(--app-surface-muted))] hover:text-[rgb(var(--app-heading))]'
            }`}
          >
            <div className={pathname === item.path ? 'text-indigo-400' : 'text-[rgb(var(--app-muted))] group-hover:text-[rgb(var(--app-heading))]'}>
              {item.icon}
            </div>
            {!collapsed && <span className="font-medium">{item.label}</span>}
          </Link>
        ))}
      </nav>
    </motion.aside>
  );
}