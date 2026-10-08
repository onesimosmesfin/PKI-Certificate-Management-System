import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Search,
  ShieldAlert,
  Terminal,
} from 'lucide-react';

import { Button, GlassCard } from '../../components/ui/Core';
import {
  exportAuditCsv,
  exportAuditPdf,
  getAuditCorrelation,
  getAuditLogs,
  getAuditStats,
  getHighRiskLogs,
} from '../../services/audit';

const DATE_BUCKETS = [
  { id: 'all', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'older', label: 'Older' },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const ACTION_LABELS = {
  LOGIN: 'LOGIN',
  CERT_ISSUE: 'CERT_ISSUE',
  CERT_REVOKE: 'CERT_REVOKE',
  KEY_ROTATION: 'KEY_ROTATION',
  VERIFY_CERTIFICATE: 'VERIFY_CERTIFICATE',
};

const STATUS_STYLES = {
  FAILED: 'bg-red-500/20 text-red-300',
  SUCCESS: 'bg-emerald-500/20 text-emerald-300',
};

const parseLogDate = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isSameDay = (left, right) =>
  left.getFullYear() === right.getFullYear()
  && left.getMonth() === right.getMonth()
  && left.getDate() === right.getDate();

const getStartOfWeek = (date) => {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? 6 : day - 1;

  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - diff);

  return start;
};

const matchesDateBucket = (timestamp, bucket) => {
  if (bucket === 'all') {
    return true;
  }

  const logDate = parseLogDate(timestamp);
  if (!logDate) {
    return false;
  }

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  if (bucket === 'today') {
    return isSameDay(logDate, now);
  }

  if (bucket === 'week') {
    return logDate >= getStartOfWeek(now);
  }

  if (bucket === 'month') {
    return logDate.getFullYear() === now.getFullYear() && logDate.getMonth() === now.getMonth();
  }

  if (bucket === 'older') {
    return logDate < new Date(now.getFullYear(), now.getMonth(), 1) && logDate < startOfToday;
  }

  return true;
};

const formatTimestamp = (value) => {
  const date = parseLogDate(value);

  if (!date) {
    return value || 'Unknown time';
  }

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const buildPageWindow = (currentPage, totalPages) => {
  const windowSize = 5;
  const start = Math.max(0, currentPage - 2);
  const end = Math.min(totalPages, start + windowSize);
  const adjustedStart = Math.max(0, end - windowSize);

  return Array.from({ length: end - adjustedStart }, (_, index) => adjustedStart + index);
};

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [highRiskLogs, setHighRiskLogs] = useState([]);

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const [pagination, setPagination] = useState({
    totalPages: 1,
    totalElements: 0,
    numberOfElements: 0,
    first: true,
    last: true,
  });

  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateBucket, setDateBucket] = useState('all');

  const [loading, setLoading] = useState(false);

  const [selectedLog, setSelectedLog] = useState(null);
  const [correlationLogs, setCorrelationLogs] = useState([]);

  const fetchLogs = async () => {
    setLoading(true);

    try {
      const res = await getAuditLogs({ page, size });
      const nextLogs = Array.isArray(res?.content) ? res.content : [];

      setLogs(nextLogs);
      setPagination({
        totalPages: Math.max(res?.totalPages ?? 1, 1),
        totalElements: res?.totalElements ?? nextLogs.length,
        numberOfElements: res?.numberOfElements ?? nextLogs.length,
        first: res?.first ?? page === 0,
        last: res?.last ?? page >= Math.max((res?.totalPages ?? 1) - 1, 0),
      });
    } catch (err) {
      console.error('Failed to fetch logs', err);
      setLogs([]);
      setPagination({
        totalPages: 1,
        totalElements: 0,
        numberOfElements: 0,
        first: true,
        last: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await getAuditStats();
      setStats(res);
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  };

  const fetchHighRiskLogs = async () => {
    try {
      const res = await getHighRiskLogs();
      setHighRiskLogs(res || []);
    } catch (err) {
      console.error('Failed to fetch high risk logs', err);
    }
  };

  const fetchCorrelation = async (id) => {
    if (!id) {
      setCorrelationLogs([]);
      return;
    }

    try {
      const res = await getAuditCorrelation(id);
      setCorrelationLogs(res);
    } catch (err) {
      console.error('Correlation fetch failed', err);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, size]);

  useEffect(() => {
    fetchStats();
    fetchHighRiskLogs();
  }, []);

  useEffect(() => {
    setPage(0);
  }, [search, actionFilter, statusFilter, dateBucket]);

  useEffect(() => {
    setSelectedLog(null);
    setCorrelationLogs([]);
  }, [page, size]);

  const actionOptions = useMemo(() => {
    const actions = new Set(Object.keys(ACTION_LABELS));

    logs.forEach((log) => {
      if (log?.action) {
        actions.add(log.action);
      }
    });

    return ['All', ...Array.from(actions)];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return logs.filter((log) => {
      const matchesSearch = !normalizedSearch
        || log.username?.toLowerCase().includes(normalizedSearch)
        || log.action?.toLowerCase().includes(normalizedSearch)
        || log.target?.toLowerCase().includes(normalizedSearch)
        || log.correlationId?.toLowerCase().includes(normalizedSearch)
        || log.ip?.toLowerCase().includes(normalizedSearch);

      const matchesAction = actionFilter === 'All' || log.action === actionFilter;
      const matchesStatus = statusFilter === 'All' || log.status === statusFilter;
      const matchesDate = matchesDateBucket(log.timestamp, dateBucket);

      return matchesSearch && matchesAction && matchesStatus && matchesDate;
    });
  }, [logs, search, actionFilter, statusFilter, dateBucket]);

  const bucketCounts = useMemo(() => {
    return DATE_BUCKETS.reduce((acc, bucket) => {
      acc[bucket.id] = logs.filter((log) => matchesDateBucket(log.timestamp, bucket.id)).length;
      return acc;
    }, {});
  }, [logs]);

  const pageButtons = useMemo(
    () => buildPageWindow(page, pagination.totalPages),
    [page, pagination.totalPages],
  );

  const exportLogs = async (type) => {
    try {
      if (type === 'csv') {
        const res = await exportAuditCsv();
        const url = window.URL.createObjectURL(new Blob([res]));
        const a = document.createElement('a');

        a.href = url;
        a.download = 'audit.csv';

        document.body.appendChild(a);
        a.click();
        a.remove();
      }

      if (type === 'pdf') {
        const res = await exportAuditPdf();
        const url = window.URL.createObjectURL(
          new Blob([res], {
            type: 'application/pdf',
          }),
        );
        const a = document.createElement('a');

        a.href = url;
        a.download = 'audit.pdf';

        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      console.error('Export failed', err);
    }
  };

  return (
    <div className="app-shell mx-auto min-h-screen max-w-[1750px] space-y-8 p-6">
      <div className="flex items-center justify-between border-b border-[rgb(var(--app-border))] pb-6">
        <div className="flex items-center gap-4">
          <Terminal className="h-10 w-10 text-indigo-400" />

          <div>
            <h1 className="app-heading text-3xl font-bold">
              PKI Audit and SIEM Center
            </h1>

            <p className="app-muted">
              Real-time immutable security event monitoring
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={() => exportLogs('csv')} variant="secondary">
            <Download size={18} />
            CSV
          </Button>

          <Button onClick={() => exportLogs('pdf')} variant="secondary">
            <Download size={18} />
            PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <GlassCard className="p-6">
          <p className="app-muted">
            Total Events
          </p>

          <p className="app-heading mt-2 text-4xl font-bold">
            {stats?.totalEvents ?? 0}
          </p>
        </GlassCard>

        <GlassCard className="p-6">
          <p className="app-muted">
            Failed Actions
          </p>

          <p className="mt-2 text-4xl font-bold text-red-400">
            {stats?.failedActions ?? 0}
          </p>
        </GlassCard>

        <GlassCard className="p-6">
          <p className="app-muted">
            Revocations
          </p>

          <p className="mt-2 text-4xl font-bold text-amber-400">
            {stats?.revocationsToday ?? 0}
          </p>
        </GlassCard>

        <GlassCard className="p-6">
          <p className="app-muted">
            CRL Generated
          </p>

          <p className="mt-2 text-4xl font-bold text-emerald-400">
            {stats?.crlGenerated ?? 0}
          </p>
        </GlassCard>
      </div>

      {highRiskLogs.length > 0 && (
        <GlassCard className="border border-red-500/30 bg-red-950/10 p-6">
          <div className="mb-5 flex items-center gap-3">
            <ShieldAlert className="text-red-400" size={26} />

            <div>
              <h2 className="text-xl font-bold text-red-400">
                Critical Security Events
              </h2>

              <p className="text-sm text-slate-400">
                Top 20 high-risk audit events
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {highRiskLogs.map((log) => (
              <div
                key={log.id}
                className="app-surface-strong rounded-xl border border-red-500/20 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-red-300">
                      {log.action}
                    </p>

                    <p className="app-muted text-sm">
                      @{log.username} - {log.ip}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {formatTimestamp(log.timestamp)}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="rounded-full border border-red-500/30 bg-red-500/20 px-3 py-1 text-xs text-red-300">
                      {log.severity || 'CRITICAL'}
                    </span>

                    <p className="mt-2 text-xs text-slate-500">
                      {log.status}
                    </p>
                  </div>
                </div>

                {log.details && (
                  <div className="app-muted mt-3 border-t border-[rgb(var(--app-border))] pt-3 text-sm">
                    {log.details}
                  </div>
                )}
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      <GlassCard className="space-y-5 p-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="relative min-w-[320px] flex-1">
            <Search className="absolute left-4 top-3.5 text-slate-500" size={20} />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search SIEM logs..."
              className="app-input w-full rounded-2xl py-3 pl-11"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="app-input min-w-[180px] rounded-2xl px-4 py-3"
          >
            {actionOptions.map((action) => (
              <option key={action} value={action}>
                {action === 'All' ? 'All Actions' : ACTION_LABELS[action] || action}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="app-input min-w-[160px] rounded-2xl px-4 py-3"
          >
            <option value="All">
              All Status
            </option>
            <option value="SUCCESS">
              SUCCESS
            </option>
            <option value="FAILED">
              FAILED
            </option>
          </select>

          <select
            value={size}
            onChange={(e) => {
              setPage(0);
              setSize(Number(e.target.value));
            }}
            className="app-input min-w-[160px] rounded-2xl px-4 py-3"
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option} rows
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
            <CalendarDays size={16} className="text-indigo-300" />
            Date categories
          </div>

          {DATE_BUCKETS.map((bucket) => {
            const active = dateBucket === bucket.id;

            return (
              <button
                key={bucket.id}
                type="button"
                onClick={() => setDateBucket(bucket.id)}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  active
                    ? 'border-indigo-500/40 bg-indigo-500/15 text-indigo-200'
                    : 'border-[rgb(var(--app-border))] bg-[rgb(var(--app-surface-strong))] text-slate-400 hover:text-slate-200'
                }`}
              >
                {bucket.label} ({bucketCounts[bucket.id] ?? 0})
              </button>
            );
          })}
        </div>
      </GlassCard>

      <GlassCard className="overflow-hidden p-0">
        {loading ? (
          <div className="p-6 text-slate-400">
            Loading logs...
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgb(var(--app-border))] px-6 py-4">
              <div>
                <h2 className="app-heading text-lg font-semibold">
                  Audit Event Stream
                </h2>

                <p className="app-muted mt-1 text-sm">
                  Showing {filteredLogs.length} filtered rows from {pagination.numberOfElements} rows on page {page + 1}
                  {' '}of {pagination.totalPages}
                </p>
              </div>

              <div className="rounded-full border border-[rgb(var(--app-border))] bg-[rgb(var(--app-surface-strong))] px-4 py-2 text-sm text-slate-300">
                Total records: {pagination.totalElements}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px]">
                <thead className="app-surface-strong border-b border-[rgb(var(--app-border))]">
                  <tr>
                    <th className="px-6 py-5 text-left text-xs uppercase text-slate-500">
                      Time
                    </th>
                    <th className="px-4 py-5 text-left text-xs uppercase text-slate-500">
                      User
                    </th>
                    <th className="px-4 py-5 text-left text-xs uppercase text-slate-500">
                      Action
                    </th>
                    <th className="px-4 py-5 text-left text-xs uppercase text-slate-500">
                      Target
                    </th>
                    <th className="px-4 py-5 text-left text-xs uppercase text-slate-500">
                      Status
                    </th>
                    <th className="px-4 py-5 text-left text-xs uppercase text-slate-500">
                      IP
                    </th>
                    <th className="px-4 py-5 text-left text-xs uppercase text-slate-500">
                      Correlation
                    </th>
                    <th className="px-4 py-5 text-right text-xs uppercase text-slate-500">
                      Details
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map((log) => (
                      <tr
                        key={log.id}
                        onClick={() => {
                          setSelectedLog(log);
                          fetchCorrelation(log.correlationId);
                        }}
                        className={`cursor-pointer transition hover:bg-slate-800/50 ${
                          selectedLog?.id === log.id ? 'bg-slate-800/60' : ''
                        }`}
                      >
                        <td className="app-muted px-6 py-4 font-mono text-sm">
                          {formatTimestamp(log.timestamp)}
                        </td>

                        <td className="px-4 py-4 text-indigo-400">
                          @{log.username || 'unknown'}
                        </td>

                        <td className="px-4 py-4">
                          {log.action}
                        </td>

                        <td className="app-muted max-w-[320px] px-4 py-4 truncate">
                          {log.target || '-'}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`rounded px-2 py-1 text-xs ${
                              STATUS_STYLES[log.status] || 'bg-slate-500/20 text-slate-300'
                            }`}
                          >
                            {log.status || 'UNKNOWN'}
                          </span>
                        </td>

                        <td className="px-4 py-4 font-mono text-sm text-slate-500">
                          {log.ip || '-'}
                        </td>

                        <td className="px-4 py-4 font-mono text-xs text-violet-400">
                          {log.correlationId || '-'}
                        </td>

                        <td className="px-4 py-4 text-right text-slate-400">
                          <Eye size={16} className="ml-auto" />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-sm text-slate-500">
                        No audit events match the selected date category and filters on this page.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-4 border-t border-[rgb(var(--app-border))] px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="app-muted text-sm">
                Use pagination to browse all audit data. Date filters apply to the currently loaded page.
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setPage((current) => Math.max(current - 1, 0))}
                  disabled={pagination.first}
                  className="flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                  Previous
                </Button>

                {pageButtons.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    className={`h-10 min-w-10 rounded-xl px-3 text-sm transition ${
                      pageNumber === page
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                        : 'border border-[rgb(var(--app-border))] bg-[rgb(var(--app-surface-strong))] text-slate-300 hover:bg-[rgb(var(--app-surface-muted))]'
                    }`}
                  >
                    {pageNumber + 1}
                  </button>
                ))}

                <Button
                  variant="ghost"
                  onClick={() => setPage((current) => Math.min(current + 1, pagination.totalPages - 1))}
                  disabled={pagination.last}
                  className="flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          </>
        )}
      </GlassCard>

      {correlationLogs.length > 0 && (
        <GlassCard className="p-6">
          <h3 className="app-heading mb-3 font-bold">
            Correlation Trace
          </h3>

          {correlationLogs.map((c) => (
            <div
              key={c.id}
              className="app-muted border-b border-[rgb(var(--app-border))] py-2 text-sm"
            >
              {formatTimestamp(c.timestamp)}
              {' - '}
              {c.action}
              {' - '}
              {c.status}
            </div>
          ))}
        </GlassCard>
      )}
    </div>
  );
}
