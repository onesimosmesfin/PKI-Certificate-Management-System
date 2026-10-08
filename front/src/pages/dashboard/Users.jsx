import { useEffect, useMemo, useState } from 'react';
import {
  Search, Trash2, Loader2, RefreshCw, Users, UserCheck, Shield,
  Eye, Edit3, AlertTriangle, ShieldCheck, CheckCircle2, XCircle, 
  UserX, Fingerprint, Calendar, Activity, Lock, User
} from 'lucide-react';

import { GlassCard, Button } from '../../components/ui/Core';
import { deleteUserById, getUsers } from '../../services/users';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [activeTab, setActiveTab] = useState('All');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [error, setError] = useState('');

  const role = localStorage.getItem('role');
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

  // Mock Data Fallback
  const mockUsers = [
    { id: 1, username: "teklewold", email: "teklewold@insa.local", role: "ADMIN", enabled: true, approved: true, lastLogin: "2026-05-22T10:15:00", createdAt: "2025-01-15" },
    { id: 2, username: "admin01", email: "admin@insa.local", role: "ADMIN", enabled: true, approved: true, lastLogin: "2026-05-23T08:45:00", createdAt: "2024-11-20" },
    { id: 3, username: "auditor01", email: "audit@insa.local", role: "AUDITOR", enabled: true, approved: true, lastLogin: "2026-05-20T14:30:00", createdAt: "2025-03-10" },
    { id: 4, username: "operator22", email: "op22@insa.local", role: "USER", enabled: false, approved: false, lastLogin: "2026-04-15T09:10:00", createdAt: "2025-02-05" },
  ];

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await getUsers();
      setUsers(res.length ? res : mockUsers);
    } catch (err) {
      console.error(err);
      setUsers(mockUsers); 
      setError('Using demo data - Backend not responding');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Statistics
  const stats = {
    total: users.length,
    active: users.filter(u => u.enabled).length,
    inactive: users.filter(u => !u.enabled).length,
    admins: users.filter(u => u.role === 'ADMIN').length,
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    let result = users;

    // Tab Filter
    if (activeTab === 'Active') result = result.filter(u => u.enabled);
    if (activeTab === 'Inactive') result = result.filter(u => !u.enabled);
    if (activeTab === 'Admins') result = result.filter(u => u.role === 'ADMIN');

    // Search + Filters
    result = result.filter(user => {
      const matchesSearch = 
        user.username?.toLowerCase().includes(search.toLowerCase()) ||
        user.email?.toLowerCase().includes(search.toLowerCase());

      const matchesRole = roleFilter === 'All' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'All' || 
        (statusFilter === 'Active' && user.enabled) || 
        (statusFilter === 'Inactive' && !user.enabled);

      return matchesSearch && matchesRole && matchesStatus;
    });

    return result;
  }, [users, search, roleFilter, statusFilter, activeTab]);

  const handleDelete = async (id) => {
    if (!isAdmin) return;
    if (!window.confirm('Delete this user permanently?')) return;

    try {
      await deleteUserById(id);
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (err) {
      alert('Delete failed');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const formatLastLogin = (date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

  return (
    <div className="app-shell mx-auto min-h-screen max-w-[1700px] space-y-6 p-6 select-none font-sans">
      
      {/* ========================================================================= */}
      {/* 1. ENTERPRISE COMMAND HEADER */}
      {/* ========================================================================= */}
      <div className="app-surface relative flex flex-col gap-4 overflow-hidden rounded-2xl p-5 shadow-2xl lg:flex-row lg:items-center lg:justify-between">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-violet-500" />
        <div className="absolute top-0 right-0 w-[400px] h-full bg-gradient-to-l from-violet-500/5 to-transparent pointer-events-none" />
        
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shadow-lg shrink-0">
            <Fingerprint className="text-violet-400" size={24} />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h1 className="app-heading text-xl font-black uppercase tracking-wider font-mono">IAM Subsystem Gateway</h1>
              <span className="bg-blue-500/10 text-blue-400 font-mono text-[9px] font-bold border border-blue-500/20 px-2 py-0.5 rounded uppercase tracking-widest">
                RBAC Active
              </span>
            </div>
            <p className="app-muted text-xs font-medium">Orchestrate structural authorization keys, identity contexts, and authentication lifecycles.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto shrink-0 font-mono">
          {error && (
            <span className="text-[11px] text-amber-400 bg-amber-500/5 border border-amber-500/10 px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 animate-pulse">
              <AlertTriangle size={13} /> Demo Scope Fallback
            </span>
          )}
          <button 
            onClick={fetchUsers}
            className="app-surface-strong app-heading flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all hover:bg-[rgb(var(--app-surface-muted))] lg:w-auto shadow-md"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-violet-400" : "text-slate-500"} />
            REFRESH_REGISTRY
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SYSTEM TELEMETRY STRIP */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard icon={<Users size={18} className="text-blue-400" />} label="Total Identities" value={stats.total} details="Registered Accounts" barColor="bg-blue-500" />
        <MetricCard icon={<UserCheck size={18} className="text-emerald-400" />} label="Active Contexts" value={stats.active} details="Passing Token Validation" barColor="bg-emerald-500" />
        <MetricCard icon={<Shield size={18} className="text-violet-400" />} label="Privileged Cores" value={stats.admins} details="Administrative Roles" barColor="bg-violet-500" />
        <MetricCard icon={<UserX size={18} className="text-amber-400" />} label="Quarantined Nodes" value={stats.inactive} details="Suspended Or Inactive" barColor="bg-amber-500" />
      </div>

      {/* ========================================================================= */}
      {/* 3. WORKSPACE INTERACTIVE FILTERS */}
      {/* ========================================================================= */}
      <div className="app-surface flex flex-col gap-4 rounded-2xl p-4 shadow-xl xl:flex-row xl:items-center xl:justify-between">
        
        {/* Navigation Segments */}
        <div className="app-surface-strong flex max-w-max rounded-xl p-1">
          {['All', 'Active', 'Inactive', 'Admins'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all font-mono uppercase ${activeTab === tab 
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md' 
                : 'app-muted hover:text-[rgb(var(--app-heading))]'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Input Toolsets */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <div className="relative flex-1 sm:flex-initial sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search identity or routing address..."
              className="app-input w-full rounded-xl pl-9 pr-4 py-1.5 text-xs"
            />
          </div>

          <select 
            value={roleFilter} 
            onChange={e => setRoleFilter(e.target.value)} 
            className="app-select rounded-xl px-3 py-1.5 text-xs font-mono cursor-pointer"
          >
            <option value="All">ALL_ROLES</option>
            <option value="ADMIN">ADMIN</option>
            <option value="AUDITOR">AUDITOR</option>
            <option value="USER">USER</option>
          </select>

          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)} 
            className="app-select rounded-xl px-3 py-1.5 text-xs font-mono cursor-pointer"
          >
            <option value="All">ALL_STATUS</option>
            <option value="Active">ACTIVE</option>
            <option value="Inactive">INACTIVE</option>
          </select>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MASTER DIRECTORY MATRIX */}
      {/* ========================================================================= */}
      <div className="app-surface overflow-hidden rounded-2xl shadow-2xl">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="app-surface-strong app-muted border-b border-[rgb(var(--app-border))] text-[10px] font-mono font-bold uppercase tracking-wider">
                <th className="w-14 px-5 py-4 text-center">Sel</th>
                <th className="px-5 py-4">Identity / Routing Profile</th>
                <th className="px-5 py-4">Role Key</th>
                <th className="px-5 py-4">Operational Status</th>
                <th className="px-5 py-4 text-center">Auth Status</th>
                <th className="px-5 py-4">Last Kernel Login</th>
                <th className="px-5 py-4">Creation Date</th>
                <th className="w-16 px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-24 text-center">
                    <Loader2 className="animate-spin text-violet-500 mx-auto mb-2" size={24} />
                    <span className="text-slate-500 font-mono text-[11px]">SYNCHRONIZING SECURE ACCOUNT REGISTERS...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center text-slate-500 font-medium italic">
                    No matching identities identified within current directory scopes.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => {
                  const isChecked = selectedIds.includes(user.id);
                  return (
                    <tr 
                      key={user.id} 
                      className={`hover:bg-[#161b22]/40 transition-colors cursor-pointer group ${isChecked ? 'bg-violet-500/5' : ''}`}
                      onClick={() => setSelectedUser(user)}
                    >
                      <td className="px-5 py-4 text-center" onClick={e => e.stopPropagation()}>
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(user.id)}
                          className="rounded border-slate-800 bg-[#07090e] text-violet-600 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer accent-violet-600"
                        />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-black font-mono text-sm shadow-md">
                            {user.username[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-200 group-hover:text-white transition-colors">{user.username}</div>
                            <div className="text-[11px] text-slate-500 font-medium truncate max-w-[200px]">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-[#07090e] border border-slate-800 rounded text-slate-300">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 font-medium">
                          <div className={`w-1.5 h-1.5 rounded-full ${user.enabled ? 'bg-emerald-500 shadow-sm shadow-emerald-500' : 'bg-red-500'}`} />
                          <span className={user.enabled ? 'text-emerald-400' : 'text-red-400'}>
                            {user.enabled ? 'Active' : 'Suspended'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center text-base">
                        {user.approved ? (
                          <span title="Cryptographically Approved" className="text-emerald-500">
                            <CheckCircle2 size={15} className="mx-auto" />
                          </span>
                        ) : (
                          <span title="Awaiting Validation Signature" className="text-amber-500">
                            <Activity size={15} className="mx-auto animate-pulse" />
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 font-mono text-[11px] text-slate-400">
                        {formatLastLogin(user.lastLogin)}
                      </td>
                      <td className="px-5 py-4 font-mono text-[11px] text-slate-400">
                        {new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={() => setSelectedUser(user)}
                            className="p-1.5 hover:bg-[#161b22] text-slate-500 hover:text-slate-200 rounded-lg transition-colors"
                            title="Inspect Parameters"
                          >
                            <Eye size={14} />
                          </button>
                          {isAdmin && (
                            <button 
                              onClick={() => handleDelete(user.id)}
                              className="p-1.5 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                              title="Revoke Identity Permanent"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. USER PROFILE OVERLAY HUD */}
      {/* ========================================================================= */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all animate-fadeIn">
          <div className="app-surface relative w-full max-w-md overflow-hidden rounded-2xl shadow-2xl">
            <div className="h-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 w-full" />
            
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-4 border-b border-slate-800/60 pb-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-xl text-white font-black font-mono shadow-md">
                  {selectedUser.username[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="app-heading text-lg font-bold tracking-wide">{selectedUser.username}</h3>
                  <p className="app-muted text-xs font-medium font-mono">{selectedUser.email}</p>
                </div>
              </div>

              {/* Data Property Node Blocks */}
              <div className="grid grid-cols-2 gap-3 font-mono text-[11px]">
                <ProfileProperty icon={<Lock size={12} />} label="RBAC_ROLE" value={selectedUser.role} />
                <ProfileProperty 
                  icon={<Activity size={12} />} 
                  label="SYS_STATE" 
                  value={selectedUser.enabled ? 'ACTIVE' : 'SUSPENDED'} 
                  customClass={selectedUser.enabled ? 'text-emerald-400' : 'text-red-400'}
                />
                <ProfileProperty icon={<ShieldCheck size={12} />} label="SIGN_AUTH" value={selectedUser.approved ? 'VERIFIED' : 'PENDING'} />
                <ProfileProperty icon={<Calendar size={12} />} label="CREATION_INDEX" value={new Date(selectedUser.createdAt).toLocaleDateString()} />
              </div>

              <div className="app-surface-strong app-muted space-y-1 rounded-xl p-3 text-[11px] font-mono">
                <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Last Sync Handshake</span>
                <div className="truncate text-slate-300">{formatLastLogin(selectedUser.lastLogin)}</div>
              </div>

              {/* Action Operations footer */}
              <div className="flex gap-2.5 pt-2">
                <button 
                  onClick={() => setSelectedUser(null)} 
                  className="flex-1 py-2 bg-[#161b22] hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-xl text-xs font-bold font-mono transition-all uppercase"
                >
                  Close_HUD
                </button>
                {isAdmin && (
                  <button className="flex-1 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold font-mono transition-all shadow-lg shadow-indigo-950 uppercase">
                    Modify_Node
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Micro-Component: High density statistics display panel
const MetricCard = ({ icon, label, value, details, barColor }) => (
  <div className="bg-[#0d1117] border border-slate-800/80 rounded-2xl p-4 flex items-center gap-4 shadow-xl relative overflow-hidden group hover:bg-[#0d1117]/80 transition-all">
    <div className="absolute top-0 left-0 w-full h-[2px] bg-slate-800 group-hover:bg-slate-700 transition-colors" />
    <div className={`absolute bottom-0 left-0 h-[2px] ${barColor} w-0 group-hover:w-full transition-all duration-300`} />
    <div className="p-3 rounded-xl bg-[#07090e] border border-slate-800 group-hover:border-slate-700 transition-colors shrink-0 shadow-inner">
      {icon}
    </div>
    <div className="space-y-0.5 min-w-0">
      <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider block truncate">{label}</span>
      <span className="text-xl font-black text-slate-100 block font-mono tracking-tight">{value}</span>
      <span className="text-[10px] text-slate-400 block truncate font-medium">{details}</span>
    </div>
  </div>
);

// Micro-Component: High density parameters inspector layout
const ProfileProperty = ({ icon, label, value, customClass = 'text-slate-200' }) => (
  <div className="bg-[#07090e] border border-slate-800/60 p-2.5 rounded-xl space-y-1">
    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
      {icon} {label}
    </span>
    <span className={`font-bold block truncate text-xs ${customClass}`}>{value}</span>
  </div>
);
