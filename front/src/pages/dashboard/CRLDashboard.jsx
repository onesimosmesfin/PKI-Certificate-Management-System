import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Plus,
  Info,
  Loader2,
  ShieldAlert,
  CalendarDays,
  Activity,
  KeyRound,
  FileText,
  AlertTriangle,
} from 'lucide-react';

import { generateCrlFile, getMyRevokedCertificates } from '../../services/certificates';

const CRLDashboardOnly = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [revokedCertificates, setRevokedCertificates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [caAlias, setCaAlias] = useState('');
  const [pin, setPin] = useState('');
  const [stats, setStats] = useState({
    totalRevoked: 0,
    thisWeek: 0,
    expiredCrls: 0,
  });

  const calculateStats = (data) => {
    const totalRevoked = data.length;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const thisWeek = data.filter(
      (certificate) =>
        certificate.revocationDate && new Date(certificate.revocationDate) >= oneWeekAgo,
    ).length;

    setStats({
      totalRevoked,
      thisWeek,
      expiredCrls: 0,
    });
  };

  const fetchRevokedCertificates = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await getMyRevokedCertificates();

      if (!Array.isArray(response)) {
        throw new Error('Invalid response format (expected array)');
      }

      setRevokedCertificates(response);
      calculateStats(response);
    } catch (err) {
      console.error('CRL fetch error:', err);

      if (err.response?.status === 401) {
        setError('Unauthorized (401) - token expired or missing');
      } else if (err.response?.status === 403) {
        setError("Forbidden (403) - you don't have permission for this CRL scope");
      } else {
        setError(err.message || 'Failed to load revoked certificates');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevokedCertificates();
  }, []);

  const handleGenerateCRL = async () => {
    if (!caAlias || !pin) {
      alert('CA alias and PIN are required');
      return;
    }

    try {
      const response = await generateCrlFile(caAlias, pin);
      const blob = new Blob([response], {
        type: 'application/pkix-crl',
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${caAlias}.crl`;

      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      alert('CRL generated successfully');
      fetchRevokedCertificates();
    } catch (err) {
      console.error(err);
      alert('Failed to generate CRL');
    }
  };

  const filteredData = useMemo(() => {
    const search = searchTerm.toLowerCase();

    return revokedCertificates.filter((certificate) => (
      certificate.serialNumber?.toLowerCase().includes(search) ||
      certificate.commonName?.toLowerCase().includes(search) ||
      certificate.certificateAlias?.toLowerCase().includes(search)
    ));
  }, [revokedCertificates, searchTerm]);

  return (
    <div className="app-shell min-h-screen space-y-5 p-6 select-none">
      <div className="flex flex-col gap-4 border-b border-[rgb(var(--app-border))] pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldAlert className="text-red-400" size={22} />
            <h2 className="app-heading text-xl font-bold tracking-tight">
              Certificate Revocation List (CRL)
            </h2>
          </div>
          <p className="app-muted text-xs">
            Manage revoked certificates and generate updated CRL distributions.
          </p>
        </div>

        <div className="app-surface-soft flex items-center gap-4 self-start rounded-xl p-2 shadow-inner lg:self-auto">
          <MetricStrip
            icon={<AlertTriangle size={15} className="text-red-400" />}
            label="Total revoked"
            value={`${stats.totalRevoked} Records`}
          />
          <MetricStrip
            icon={<CalendarDays size={15} className="text-amber-500" />}
            label="This week"
            value={`+${stats.thisWeek} New`}
            bordered
          />
          <MetricStrip
            icon={<Activity size={14} className="text-emerald-500" />}
            label="Expired CRLs"
            value={`${stats.expiredCrls} Stale`}
            bordered
          />
        </div>
      </div>

      <div className="app-surface flex flex-col gap-4 rounded-xl p-4 shadow-md md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative min-w-[180px]">
            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input
              value={caAlias}
              onChange={(event) => setCaAlias(event.target.value)}
              placeholder="CA Template Alias"
              className="app-input w-full rounded-lg px-9 py-1.5 text-xs"
            />
          </div>

          <div className="relative min-w-[140px]">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              placeholder="HSM Token PIN"
              type="password"
              className="app-input w-full rounded-lg px-9 py-1.5 text-xs"
            />
          </div>

          <button
            onClick={handleGenerateCRL}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white transition-all hover:bg-blue-500 shadow-lg shadow-blue-900/20"
          >
            <Plus size={14} />
            Generate CRL
          </button>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search records (Common Name, Alias...)"
            className="app-input w-full rounded-lg px-9 py-1.5 text-xs"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
          <Info size={16} className="mt-0.5 shrink-0" />
          <div>
            <span className="font-bold">Execution Error:</span> {error}
          </div>
        </div>
      )}

      <div className="app-surface flex min-h-[300px] flex-col overflow-hidden rounded-xl shadow-2xl">
        <div className="w-full overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 p-12 text-xs font-medium text-slate-400">
              <Loader2 className="mb-1 animate-spin text-blue-500" size={22} />
              Synchronizing structural revocation list registers...
            </div>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="app-surface-strong app-muted border-b border-[rgb(var(--app-border))] text-[10px] font-bold uppercase tracking-wider">
                  <th className="border-r border-[rgb(var(--app-border))] px-4 py-3">Common Name / Identifier</th>
                  <th className="border-r border-[rgb(var(--app-border))] px-4 py-3">Certificate Alias Mapping</th>
                  <th className="border-r border-[rgb(var(--app-border))] px-4 py-3">Invalidation Reason Code</th>
                  <th className="px-4 py-3 text-center">Execution Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgb(var(--app-border))] text-xs">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-16 text-center italic text-slate-500">
                      No matching historical records identified in this directory scope.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((certificate, index) => (
                    <tr key={certificate.id ?? `${certificate.serialNumber}-${index}`} className="transition-colors hover:bg-slate-800/30">
                      <td className="app-heading border-r border-[rgb(var(--app-border))] px-4 py-3 font-semibold">
                        {certificate.commonName || 'N/A'}
                      </td>
                      <td className="border-r border-[rgb(var(--app-border))] px-4 py-3 font-mono text-[11px]">
                        {certificate.certificateAlias || 'N/A'}
                      </td>
                      <td className="border-r border-[rgb(var(--app-border))] px-4 py-3">
                        <span className="inline-flex items-center rounded border border-red-500/10 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold tracking-tight text-red-400">
                          {certificate.reason || 'UNSPECIFIED'}
                        </span>
                      </td>
                      <td className="app-muted px-4 py-3 text-center font-mono text-[11px]">
                        {certificate.revocationDate
                          ? new Date(certificate.revocationDate).toLocaleString()
                          : 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

function MetricStrip({ icon, label, value, bordered = false }) {
  return (
    <div className={`flex items-center gap-2.5 px-3 py-1 ${bordered ? 'border-l border-[rgb(var(--app-border))]' : ''}`}>
      {icon}
      <div className="flex flex-col">
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
        <span className="app-heading text-xs font-bold">{value}</span>
      </div>
    </div>
  );
}

export default CRLDashboardOnly;
