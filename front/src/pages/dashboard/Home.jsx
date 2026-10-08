import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import {
  ShieldCheck,
  RefreshCw,
  FileBadge2,
  ShieldAlert,
  Users,
  UserPlus,
  ScrollText,
  KeyRound,
  AlertTriangle,
  Clock3,
  Activity,
  Workflow,
} from 'lucide-react';

import { Button, GlassCard } from '../../components/ui/Core';
import { getDashboardSnapshot } from '../../services/dashboard';

const AREA_COLORS = {
  audits: '#6366f1',
  threats: '#f97316',
  revocations: '#22c55e',
};

const PIE_COLORS = ['#6366f1', '#f59e0b', '#ef4444'];
const BAR_COLOR = '#38bdf8';

const formatNumber = (value) => new Intl.NumberFormat().format(value ?? 0);

const formatRelativeTime = (value) => {
  if (!value) {
    return 'No timestamp';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
};

const severityStyles = {
  CRITICAL: 'bg-red-500/15 text-red-300 border-red-500/30',
  HIGH: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  MEDIUM: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  REVOKED: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  FAILED: 'bg-red-500/15 text-red-300 border-red-500/30',
  SUCCESS: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
};

export default function DashboardHome() {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadDashboard = async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await getDashboardSnapshot();
      setSnapshot(data);
      setError('');
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load dashboard overview', err);
      setError(err?.response?.data?.message || 'Failed to load dashboard overview');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const overviewCards = useMemo(() => {
    const metrics = snapshot?.metrics;

    if (!metrics) {
      return [];
    }

    return [
      {
        label: 'Certificates Issued',
        value: metrics.totalCertificates,
        hint: `${metrics.activeCertificates} active right now`,
        icon: <FileBadge2 className="text-indigo-300" />,
        accent: 'from-indigo-500/20 to-indigo-500/5',
      },
      {
        label: 'Certificates Revoked',
        value: metrics.revokedCertificates,
        hint: `${metrics.revocationsToday} revoked today`,
        icon: <ShieldAlert className="text-rose-300" />,
        accent: 'from-rose-500/20 to-rose-500/5',
      },
      {
        label: 'Audit Events',
        value: metrics.totalAuditEvents,
        hint: `${metrics.failedAuditEvents} failed actions`,
        icon: <ScrollText className="text-sky-300" />,
        accent: 'from-sky-500/20 to-sky-500/5',
      },
      {
        label: 'Pending Approvals',
        value: metrics.pendingApprovals,
        hint: `${metrics.pendingCsrs} CSRs waiting`,
        icon: <UserPlus className="text-amber-300" />,
        accent: 'from-amber-500/20 to-amber-500/5',
      },
      {
        label: 'Threat Alerts',
        value: metrics.totalThreats,
        hint: `${metrics.criticalThreats} critical, ${metrics.highThreats} high`,
        icon: <AlertTriangle className="text-orange-300" />,
        accent: 'from-orange-500/20 to-orange-500/5',
      },
      {
        label: 'Active Users',
        value: metrics.activeUsers,
        hint: `${metrics.totalUsers} total identities`,
        icon: <Users className="text-emerald-300" />,
        accent: 'from-emerald-500/20 to-emerald-500/5',
      },
    ];
  }, [snapshot]);

  const operationalHighlights = useMemo(() => {
    const metrics = snapshot?.metrics;

    if (!metrics) {
      return [];
    }

    return [
      {
        label: 'Keys managed',
        value: metrics.totalKeys,
        icon: <KeyRound size={16} className="text-sky-300" />,
      },
      {
        label: 'CRLs generated',
        value: metrics.crlGenerated,
        icon: <ShieldCheck size={16} className="text-emerald-300" />,
      },
      {
        label: 'Expiring soon',
        value: metrics.expiringCertificates,
        icon: <Clock3 size={16} className="text-amber-300" />,
      },
      {
        label: 'Pending CSR queue',
        value: metrics.pendingCsrs,
        icon: <Workflow size={16} className="text-violet-300" />,
      },
    ];
  }, [snapshot]);

  const expiringCertificates = useMemo(() => {
    const certificates = snapshot?.datasets?.certificates ?? [];

    return [...certificates]
      .filter((certificate) => !certificate.revoked && Number(certificate.daysRemaining) <= 45)
      .sort((left, right) => Number(left.daysRemaining) - Number(right.daysRemaining))
      .slice(0, 5);
  }, [snapshot]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="app-shell mx-auto max-w-[1700px] space-y-8">
      <section className="app-surface relative overflow-hidden rounded-[28px] p-8 shadow-2xl shadow-slate-950/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.18),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(56,189,248,0.12),_transparent_28%)]" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-indigo-200">
              <ShieldCheck size={14} />
              Trust Operations Overview
            </div>
            <div>
              <h1 className="app-heading text-3xl font-black tracking-tight md:text-4xl">
                Live PKI command center for certificates, audits, access, and security.
              </h1>
              <p className="app-muted mt-3 max-w-2xl text-sm md:text-base">
                This overview is now powered by backend data from your certificate, audit, user,
                CSR, CRL, and threat endpoints so the home page reflects the real system state.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="app-surface-strong app-muted rounded-2xl px-4 py-3 text-sm">
              Last sync
              <div className="app-heading mt-1 font-mono text-xs">
                {lastUpdated ? lastUpdated.toLocaleString() : 'Not yet loaded'}
              </div>
            </div>

            <Button
              onClick={() => loadDashboard({ silent: true })}
              className="flex items-center gap-2"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              Refresh overview
            </Button>
          </div>
        </div>

        {error && (
          <div className="relative mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {overviewCards.map((card) => (
          <OverviewCard key={card.label} {...card} />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.8fr_1fr]">
        <GlassCard className="p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                Activity Trend
              </p>
              <h2 className="app-heading mt-1 text-xl font-bold">
                Audits, threats, and revocations over the last 7 days
              </h2>
            </div>
            <div className="app-surface-strong app-muted rounded-2xl px-3 py-2 text-right text-xs">
              <div>Audit failures</div>
              <div className="mt-1 text-base font-bold text-red-300">
                {formatNumber(snapshot?.metrics?.failedAuditEvents)}
              </div>
            </div>
          </div>

          <div className="h-[360px] px-3 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={snapshot?.charts?.activityTimeline ?? []}>
                <defs>
                  <linearGradient id="auditsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={AREA_COLORS.audits} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={AREA_COLORS.audits} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="threatsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={AREA_COLORS.threats} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={AREA_COLORS.threats} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="revocationsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={AREA_COLORS.revocations} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={AREA_COLORS.revocations} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#020617',
                    border: '1px solid #1e293b',
                    borderRadius: '16px',
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="audits"
                  stroke={AREA_COLORS.audits}
                  fill="url(#auditsFill)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="threats"
                  stroke={AREA_COLORS.threats}
                  fill="url(#threatsFill)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="revocations"
                  stroke={AREA_COLORS.revocations}
                  fill="url(#revocationsFill)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-0 overflow-hidden">
          <div className="border-b border-slate-800 px-6 py-5">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
              Certificate State
            </p>
            <h2 className="app-heading mt-1 text-xl font-bold">
              Distribution across the PKI estate
            </h2>
          </div>

          <div className="h-[280px] px-2 pt-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={snapshot?.charts?.certificateDistribution ?? []}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={64}
                  outerRadius={96}
                  paddingAngle={4}
                >
                  {(snapshot?.charts?.certificateDistribution ?? []).map((entry, index) => (
                    <Cell
                      key={`${entry.name}-${entry.value}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#020617',
                    border: '1px solid #1e293b',
                    borderRadius: '16px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-3 border-t border-slate-800 px-6 py-5">
            {(snapshot?.charts?.certificateDistribution ?? []).map((item, index) => (
              <div key={item.name} className="app-surface-strong rounded-2xl p-3">
                <div className="app-muted flex items-center gap-2 text-xs">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                  />
                  {item.name}
                </div>
                <div className="app-heading mt-2 text-xl font-bold">
                  {formatNumber(item.value)}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr_1fr]">
        <GlassCard className="p-0 overflow-hidden">
          <div className="border-b border-slate-800 px-6 py-5">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
              Identity Mix
            </p>
            <h2 className="app-heading mt-1 text-xl font-bold">
              User roles currently registered
            </h2>
          </div>

          <div className="h-[320px] px-4 py-5">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={snapshot?.charts?.roleDistribution ?? []} layout="vertical" margin={{ left: 12, right: 12 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" stroke="#64748b" allowDecimals={false} />
                <YAxis type="category" dataKey="role" stroke="#94a3b8" width={90} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#020617',
                    border: '1px solid #1e293b',
                    borderRadius: '16px',
                  }}
                />
                <Bar dataKey="total" fill={BAR_COLOR} radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-0 overflow-hidden">
          <div className="border-b border-slate-800 px-6 py-5">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
              Live Feed
            </p>
            <h2 className="app-heading mt-1 text-xl font-bold">
              Most recent security and revocation events
            </h2>
          </div>

          <div className="max-h-[320px] space-y-3 overflow-y-auto px-4 py-4">
            {(snapshot?.feed ?? []).length > 0 ? (
              snapshot.feed.map((item) => (
                <FeedItem key={item.id} item={item} />
              ))
            ) : (
              <EmptyState message="No recent events available yet." />
            )}
          </div>
        </GlassCard>

        <GlassCard className="p-0 overflow-hidden">
          <div className="border-b border-slate-800 px-6 py-5">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
              Operations
            </p>
            <h2 className="app-heading mt-1 text-xl font-bold">
              System health at a glance
            </h2>
          </div>

          <div className="space-y-3 px-4 py-4">
            {operationalHighlights.map((item) => (
              <div
                key={item.label}
                className="app-surface-strong flex items-center justify-between rounded-2xl px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="app-surface-strong rounded-xl p-2">
                    {item.icon}
                  </div>
                  <span className="text-sm app-heading">{item.label}</span>
                </div>
                <span className="app-heading text-lg font-bold">{formatNumber(item.value)}</span>
              </div>
            ))}

            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-indigo-200">
                <Activity size={16} />
                Trust posture
              </div>
              <p className="mt-2 text-sm app-heading">
                {snapshot?.metrics?.criticalThreats > 0
                  ? `${formatNumber(snapshot.metrics.criticalThreats)} critical threats need attention.`
                  : 'No critical threats are active right now.'}
              </p>
            </div>
          </div>
        </GlassCard>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <GlassCard className="p-0 overflow-hidden">
          <div className="border-b border-slate-800 px-6 py-5">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
              Expiring Soon
            </p>
            <h2 className="app-heading mt-1 text-xl font-bold">
              Certificates approaching renewal or rotation
            </h2>
          </div>

          <div className="divide-y divide-slate-800">
            {expiringCertificates.length > 0 ? (
              expiringCertificates.map((certificate) => (
                <div
                  key={certificate.id ?? certificate.alias}
                  className="flex flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <p className="app-heading truncate font-semibold">
                      {certificate.alias || certificate.subject || 'Unnamed certificate'}
                    </p>
                    <p className="app-muted truncate text-sm">
                      {certificate.subject || certificate.subjectDn || certificate.issuer || 'No subject available'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">
                      {certificate.daysRemaining} days left
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState message="No certificates are nearing expiry." />
            )}
          </div>
        </GlassCard>

        <GlassCard className="p-0 overflow-hidden">
          <div className="border-b border-slate-800 px-6 py-5">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
              Queue Watch
            </p>
            <h2 className="app-heading mt-1 text-xl font-bold">
              Approvals and request pressure
            </h2>
          </div>

          <div className="grid gap-3 px-4 py-4">
            <QueueCard
              label="Pending user approvals"
              value={snapshot?.metrics?.pendingApprovals}
              caption="Accounts waiting for admin action"
            />
            <QueueCard
              label="Pending CSRs"
              value={snapshot?.metrics?.pendingCsrs}
              caption="Signing workflow items not yet completed"
            />
            <QueueCard
              label="Critical threats"
              value={snapshot?.metrics?.criticalThreats}
              caption="Needs immediate investigation or containment"
            />
          </div>
        </GlassCard>
      </section>
    </div>
  );
}

function OverviewCard({ icon, label, value, hint, accent }) {
  return (
    <GlassCard className="relative overflow-hidden p-0">
      <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-br ${accent}`} />
      <div className="relative flex items-start justify-between px-6 py-5">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">{label}</p>
          <div className="app-heading text-3xl font-black tracking-tight">{formatNumber(value)}</div>
          <p className="app-muted text-sm">{hint}</p>
        </div>
        <div className="app-surface-strong rounded-2xl p-3">{icon}</div>
      </div>
    </GlassCard>
  );
}

function FeedItem({ item }) {
  return (
    <div className="app-surface-strong rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
              {item.category}
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                severityStyles[item.severity] || 'bg-slate-500/10 text-slate-300 border-slate-500/20'
              }`}
            >
              {item.severity}
            </span>
          </div>
          <p className="app-heading mt-2 truncate text-sm font-semibold">{item.title}</p>
          <p className="app-muted mt-1 text-xs">{item.meta}</p>
        </div>
        <span className="shrink-0 text-[11px] text-slate-500">{formatRelativeTime(item.timestamp)}</span>
      </div>
    </div>
  );
}

function QueueCard({ label, value, caption }) {
  return (
    <div className="app-surface-strong rounded-2xl px-4 py-4">
      <div className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">{label}</div>
      <div className="app-heading mt-2 text-3xl font-black">{formatNumber(value)}</div>
      <p className="app-muted mt-2 text-sm">{caption}</p>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="px-6 py-10 text-center text-sm text-slate-500">{message}</div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 max-w-[1700px] mx-auto animate-pulse">
      <div className="h-48 rounded-[28px] border border-slate-800 bg-slate-900/70" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-36 rounded-3xl border border-slate-800 bg-slate-900/70" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.8fr_1fr]">
        <div className="h-[420px] rounded-3xl border border-slate-800 bg-slate-900/70" />
        <div className="h-[420px] rounded-3xl border border-slate-800 bg-slate-900/70" />
      </div>
    </div>
  );
}
