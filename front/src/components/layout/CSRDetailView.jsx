import  { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Copy,
  Download,
  Shield,
  Key as KeyIcon,
  CheckCircle,
  FileText,
  Trash2,
  Calendar,
  User,
  Globe,
  Building2,
  ShieldCheck,
  Network,
  Fingerprint,
  Server,
  AlertCircle
} from 'lucide-react';

import api from '../../api/axios';
import { toast } from 'react-hot-toast';

const CSRDetailView = ({ csr, onBack, onDeleted }) => {

  const [activeTab, setActiveTab] = useState('Info');

  const [loading, setLoading] = useState(true);

  const [csrDetail, setCsrDetail] = useState(null);

  // =========================
  // FETCH CSR DETAIL
  // =========================

  useEffect(() => {

    if (!csr?.id) return;

    fetchCsrDetail();

  }, [csr]);

  const fetchCsrDetail = async () => {

    try {

      setLoading(true);

      const res = await api.get(`/csr/${csr.id}`);

      setCsrDetail(res.data);

    } catch (err) {

      console.error(err);

      toast.error('Failed to load CSR details');

    } finally {

      setLoading(false);
    }
  };

  // =========================
  // EXPORT CSR
  // =========================

  const handleExport = async () => {

    try {

      const res = await api.get(
        `/csr/export/${csr.id}`,
        {
          responseType: 'blob'
        }
      );

      const url = window.URL.createObjectURL(
        new Blob([res.data])
      );

      const link = document.createElement('a');

      link.href = url;

      link.setAttribute(
        'download',
        `${csrDetail?.csrAlias || 'csr'}.csr`
      );

      document.body.appendChild(link);

      link.click();

      link.remove();

      toast.success('CSR exported');

    } catch (err) {

      console.error(err);

      toast.error('Export failed');
    }
  };

  // =========================
  // COPY PEM
  // =========================

  const handleCopyPem = async () => {

    try {

      await navigator.clipboard.writeText(
        csrDetail?.csrPem || ''
      );

      toast.success('CSR PEM copied');

    } catch (err) {

      toast.error('Copy failed');
    }
  };

  // =========================
  // DELETE CSR
  // =========================

  const handleDelete = async () => {

    const confirmed = window.confirm(
      `Delete CSR "${csrDetail?.csrAlias}" ?`
    );

    if (!confirmed) return;

    try {

      await api.delete(`/csr/${csr.id}`);

      toast.success('CSR deleted');

      if (onDeleted) {
        onDeleted();
      }

      onBack();

    } catch (err) {

      console.error(err);

      toast.error('Delete failed');
    }
  };

  // =========================
  // LOADING
  // =========================

  if (loading) {

    return (
      <div className="min-h-screen bg-[#0A0D12] flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          Loading CSR details...
        </div>
      </div>
    );
  }

  // =========================
  // EMPTY
  // =========================

  if (!csrDetail) {

    return (
      <div className="min-h-screen bg-[#0A0D12] flex items-center justify-center">
        <div className="text-slate-400">
          CSR not found
        </div>
      </div>
    );
  }

  // =========================
  // PARSED VALUES
  // =========================

  const isSigned =
    csrDetail.status === 'SIGNED';

  const dnsNames =
    csrDetail.dnsNames || [];

  const ipAddresses =
    csrDetail.ipAddresses || [];

  const keyUsages =
    csrDetail.keyUsages || [];

  const eku =
    csrDetail.extendedKeyUsages || [];

  return (

    <div className="p-6 space-y-6 text-slate-300 bg-[#0A0D12] min-h-screen">

      {/* HEADER */}

      <div className="flex items-center justify-between">

        <div className="flex items-center gap-4">

          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>

          <div>

            <h2 className="text-xl font-bold text-white flex items-center gap-3">

              {csrDetail.csrAlias}

              <span className={`text-[10px] px-2 py-0.5 rounded uppercase tracking-tighter border ${
                isSigned
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}>
                {csrDetail.status}
              </span>

              <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded uppercase tracking-tighter">
                {csrDetail.signatureAlgorithm}
              </span>

            </h2>

            <p className="text-xs text-slate-500 mt-1">
              PKCS#10 Certificate Signing Request
            </p>

          </div>

        </div>

        <div className="flex gap-2">

          <button
            onClick={handleExport}
            className="p-2 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 transition-colors"
          >
            <Download size={18} />
          </button>

          <button
            onClick={handleDelete}
            className="p-2 bg-slate-800 border border-slate-700 rounded hover:bg-red-900/20 text-red-400 transition-colors"
          >
            <Trash2 size={18} />
          </button>

        </div>

      </div>

      {/* BODY */}

      <div className="grid grid-cols-12 gap-6">

        {/* MAIN */}

        <div className="col-span-9 space-y-6">

          {/* TOP */}

          <div className="space-y-4">

            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Common Name
            </p>

            <h3 className="text-2xl font-bold text-cyan-400">
              {csrDetail.commonName || 'N/A'}
            </h3>

            <p className="text-xs font-mono text-slate-500 break-all">
              CN={csrDetail.commonName},
              O={csrDetail.organization},
              OU={csrDetail.organizationalUnit},
              C={csrDetail.country}
            </p>

          </div>

          {/* TABS */}

          <div className="flex gap-6 border-b border-slate-800">

            {[
              'Info',
              'Subject DN',
              'Extensions',
              'PEM'
            ].map(tab => (

              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-bold transition-all relative ${
                  activeTab === tab
                    ? 'text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >

                {tab}

                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-cyan-500" />
                )}

              </button>
            ))}

          </div>

          {/* CONTENT */}

          <div className="bg-[#0d1117]/50 rounded-xl border border-slate-800/50 min-h-[350px]">

            {/* INFO */}

            {activeTab === 'Info' && (

              <div className="p-6 grid grid-cols-2 gap-4">

                <InfoItem
                  icon={<FileText size={14} />}
                  label="CSR Alias"
                  value={csrDetail.csrAlias}
                />

                <InfoItem
                  icon={<ShieldCheck size={14} />}
                  label="Status"
                  value={csrDetail.status}
                />

                <InfoItem
                  icon={<KeyIcon size={14} />}
                  label="Key Alias"
                  value={csrDetail.keyAlias}
                />

                <InfoItem
                  icon={<Fingerprint size={14} />}
                  label="Signature Algorithm"
                  value={csrDetail.signatureAlgorithm}
                />

                <InfoItem
                  icon={<Calendar size={14} />}
                  label="Created At"
                  value={csrDetail.createdAt}
                />

                <InfoItem
                  icon={<User size={14} />}
                  label="Created By"
                  value={csrDetail.createdBy}
                />

                <InfoItem
                  icon={<Shield size={14} />}
                  label="CA Request"
                  value={csrDetail.ca ? 'TRUE' : 'FALSE'}
                />

                <InfoItem
                  icon={<AlertCircle size={14} />}
                  label="Path Length"
                  value={csrDetail.pathLength ?? 'N/A'}
                />

              </div>
            )}

            {/* SUBJECT */}

            {activeTab === 'Subject DN' && (

              <div className="p-6 space-y-4">

                <div className="p-3 bg-slate-900/50 rounded border border-slate-800 font-mono text-xs text-cyan-500 break-all">

                  CN={csrDetail.commonName},
                  O={csrDetail.organization},
                  OU={csrDetail.organizationalUnit},
                  C={csrDetail.country},
                  ST={csrDetail.state},
                  L={csrDetail.locality},
                  EMAILADDRESS={csrDetail.email}

                </div>

                <div className="grid grid-cols-2 gap-4">

                  <InfoItem
                    icon={<Globe size={14} />}
                    label="Common Name"
                    value={csrDetail.commonName}
                  />

                  <InfoItem
                    icon={<Building2 size={14} />}
                    label="Organization"
                    value={csrDetail.organization}
                  />

                  <InfoItem
                    icon={<Shield size={14} />}
                    label="Organizational Unit"
                    value={csrDetail.organizationalUnit}
                  />

                  <InfoItem
                    icon={<Globe size={14} />}
                    label="Country"
                    value={csrDetail.country}
                  />

                  <InfoItem
                    icon={<Globe size={14} />}
                    label="State"
                    value={csrDetail.state}
                  />

                  <InfoItem
                    icon={<Globe size={14} />}
                    label="Locality"
                    value={csrDetail.locality}
                  />

                  <InfoItem
                    icon={<User size={14} />}
                    label="Email"
                    value={csrDetail.email}
                  />

                </div>

              </div>
            )}

            {/* EXTENSIONS */}

            {activeTab === 'Extensions' && (

              <div className="p-6 space-y-6">

                {/* KEY USAGES */}

                <div>

                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                    Key Usage
                  </h4>

                  <div className="flex flex-wrap gap-2">

                    {keyUsages.map((usage, index) => (

                      <div
                        key={index}
                        className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-xs text-cyan-400"
                      >
                        {usage}
                      </div>

                    ))}

                  </div>

                </div>

                {/* EKU */}

                <div>

                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                    Extended Key Usage
                  </h4>

                  <div className="flex flex-wrap gap-2">

                    {eku.map((item, index) => (

                      <div
                        key={index}
                        className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs text-emerald-400"
                      >
                        {item}
                      </div>

                    ))}

                  </div>

                </div>

                {/* DNS */}

                <div>

                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Server size={12} />
                    DNS Names
                  </h4>

                  <div className="space-y-2">

                    {dnsNames.map((dns, index) => (

                      <div
                        key={index}
                        className="p-3 bg-slate-900/50 rounded border border-slate-800 text-sm font-mono text-cyan-400"
                      >
                        {dns}
                      </div>

                    ))}

                  </div>

                </div>

                {/* IP */}

                <div>

                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Network size={12} />
                    IP Addresses
                  </h4>

                  <div className="space-y-2">

                    {ipAddresses.map((ip, index) => (

                      <div
                        key={index}
                        className="p-3 bg-slate-900/50 rounded border border-slate-800 text-sm font-mono text-emerald-400"
                      >
                        {ip}
                      </div>

                    ))}

                  </div>

                </div>

              </div>
            )}

            {/* PEM */}

            {activeTab === 'PEM' && (

              <div className="p-6 space-y-4">

                <div className="flex justify-between items-center">

                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <FileText size={12} />
                    PKCS#10 PEM
                  </span>

                  <div className="flex gap-2">

                    <button
                      onClick={handleCopyPem}
                      className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs hover:bg-slate-700 transition-colors"
                    >
                      <Copy size={14} />
                      Copy
                    </button>

                    <button
                      onClick={handleExport}
                      className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs hover:bg-slate-700 transition-colors"
                    >
                      <Download size={14} />
                      Export
                    </button>

                  </div>

                </div>

                <div className="bg-[#010409] border border-slate-800 rounded-lg p-5 font-mono text-[11px] leading-relaxed text-slate-400 break-all h-[420px] overflow-y-auto whitespace-pre-wrap">

                  {csrDetail.csrPem}

                </div>

              </div>
            )}

          </div>

        </div>

        {/* SIDEBAR */}

        <div className="col-span-3 space-y-6">

          {/* SECURITY */}

          <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-xl space-y-4">

            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Shield size={12} />
              Security
            </h4>

            <div className="space-y-2">

              <SecurityPill
                label="HSM-resident key"
                active
              />

              <SecurityPill
                label="FIPS 140-3 module"
                active
              />

              <SecurityPill
                label={csrDetail.signatureAlgorithm}
                active
              />

              <SecurityPill
                label={csrDetail.ca ? 'Certificate Authority CSR' : 'End Entity CSR'}
                active
              />

            </div>

          </div>

          {/* QUICK ACTIONS */}

          <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-xl space-y-4">

            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <KeyIcon size={12} />
              Quick Actions
            </h4>

            <div className="grid grid-cols-2 gap-2">

              <ActionButton
                onClick={handleExport}
                icon={<Download size={14} />}
                label="Export"
              />

              <ActionButton
                onClick={handleCopyPem}
                icon={<Copy size={14} />}
                label="Copy PEM"
              />

              <ActionButton
                icon={<CheckCircle size={14} />}
                label="Verified"
                primary
              />

              <ActionButton
                onClick={handleDelete}
                icon={<Trash2 size={14} />}
                label="Delete"
                danger
              />

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

// =========================
// HELPER COMPONENTS
// =========================

const InfoItem = ({
  icon,
  label,
  value
}) => (

  <div className="space-y-1 p-3 bg-slate-900/40 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors">

    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">

      {icon}

      {label}

    </div>

    <p className="text-sm font-medium text-slate-300 break-all">
      {value || 'N/A'}
    </p>

  </div>
);

const SecurityPill = ({
  label,
  active
}) => (

  <div className="flex items-center gap-2 text-[11px] text-slate-400">

    <div className={`w-1.5 h-1.5 rounded-full ${
      active
        ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]'
        : 'bg-slate-700'
    }`} />

    {label}

  </div>
);

const ActionButton = ({
  icon,
  label,
  primary,
  danger,
  onClick
}) => (

  <button
    onClick={onClick}
    className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
      primary
        ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
        : danger
        ? 'bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400'
        : 'bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300'
    }`}
  >

    {icon}

    {label}

  </button>
);

export default CSRDetailView;