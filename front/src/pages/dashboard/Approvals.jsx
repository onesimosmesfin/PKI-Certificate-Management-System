import {
  Check,
  X,
  UserCircle2,
  ShieldAlert,
  Mail,
  Users2,
  Activity,
  RefreshCw,
} from "lucide-react";

import { GlassCard } from "../../components/ui/Core";
import { motion, AnimatePresence } from "framer-motion";

import { useEffect, useState } from "react";
import { approvePendingUser, getPendingUsers, rejectPendingUser } from "../../services/approvals";

export default function Approvals() {

  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);

 

  const fetchPendingUsers = async () => {

    try {

      const res = await getPendingUsers();

      setPendingUsers(res);

    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);
    }
  };

  useEffect(() => {

    fetchPendingUsers();

  }, []);

  // =========================
  // APPROVE
  // =========================

  const approveUser = async (id) => {

    try {

      await approvePendingUser(id);

      setPendingUsers((prev) =>
        prev.filter((u) => u.id !== id)
      );

    } catch (err) {

      console.error(err);
      alert("Failed to approve user");
    }
  };

  // =========================
  // REJECT
  // =========================

  const rejectUser = async (id) => {

    try {

      await rejectPendingUser(id);

      setPendingUsers((prev) =>
        prev.filter((u) => u.id !== id)
      );

    } catch (err) {

      console.error(err);
      alert("Failed to reject user");
    }
  };

  return (
    <div className="space-y-6 select-none max-w-5xl mx-auto">

      {/* HEADER */}
      <div className="flex flex-col gap-4 border-b border-[rgb(var(--app-border))] pb-4 md:flex-row md:items-center md:justify-between">

        <div className="space-y-1">

          <div className="flex items-center gap-2">
            <ShieldAlert className="text-indigo-400" size={20} />
            <h2 className="app-heading text-xl font-bold tracking-tight">
              Access Requests
            </h2>
          </div>

          <p className="app-muted text-xs">
            Review and authorize incoming PKI identities.
          </p>
        </div>

        {/* METRICS */}
        <div className="app-surface-soft flex items-center gap-3 rounded-xl p-2 shadow-inner">

          <div className="flex items-center gap-2 border-r border-[rgb(var(--app-border))] px-3 py-1">

            <Users2 size={14} className="text-indigo-400" />

            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                Awaiting
              </span>

              <span className="app-heading text-xs font-mono font-bold">
                {pendingUsers.length} Requests
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 border-r border-[rgb(var(--app-border))] px-3 py-1">

            <Activity size={14} className="text-emerald-500 animate-pulse" />

            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                Guard Status
              </span>

              <span className="text-xs font-bold text-emerald-400">
                Nominal
              </span>
            </div>
          </div>

          <button
            onClick={fetchPendingUsers}
            className="app-muted flex items-center gap-2 px-3 py-1 transition hover:text-[rgb(var(--app-heading))]"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="text-center text-slate-500 py-10">
          Loading pending users...
        </div>
      )}

      {/* USERS */}
      <div className="grid gap-3.5">

        <AnimatePresence>

          {!loading && pendingUsers.length === 0 ? (

            <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs italic">
              No pending approval requests.
            </div>

          ) : (

            pendingUsers.map((user) => (

              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -16 }}
              >

                <GlassCard className="relative flex flex-col gap-4 rounded-xl border border-[rgb(var(--app-border))] p-4 transition-all hover:border-indigo-500/30 sm:flex-row sm:items-center sm:justify-between">

                  {/* LEFT */}
                  <div className="flex items-start gap-4">

                    <div className="app-surface-strong app-muted flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">

                      <UserCircle2 size={24} />

                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">

                        <h4 className="app-heading text-sm font-bold tracking-wide">
                          {user.username}
                        </h4>

                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">

                          {user.role}

                        </span>

                        {user.caType && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">

                            {user.caType}

                          </span>
                        )}
                      </div>

                      <div className="app-muted flex flex-wrap items-center gap-2.5 text-[11px] font-medium">

                        <span className="app-surface-strong flex items-center gap-1 rounded px-2 py-1">

                          <Mail size={11} className="text-slate-500" />

                          {user.email}

                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-[rgb(var(--app-border))] pt-3 sm:border-t-0 sm:pt-0">

                    <button
                      onClick={() => rejectUser(user.id)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800/40 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-slate-700/60 hover:border-red-500/20 rounded-lg transition-all font-bold text-xs tracking-wide"
                    >

                      <X size={14} />

                      Reject

                    </button>

                    <button
                      onClick={() => approveUser(user.id)}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500/10 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/20 hover:border-emerald-600 rounded-lg transition-all font-bold text-xs tracking-wide"
                    >

                      <Check size={14} />

                      Approve

                    </button>
                  </div>

                </GlassCard>

              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
