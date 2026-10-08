import { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Eye,
  Search,
  Trash2,
  RotateCw,
  Ban,
  X,
  Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import api from '../../api/axios';
import CertificateDetailsModal from '../../components/cert/CertificateDetailsModal';
import { useAuthStore } from '../../store/authStore';

const REVOKE_REASONS = [
  { value: 'UNSPECIFIED', label: 'Unspecified' },
  { value: 'KEY_COMPROMISE', label: 'Key Compromise' },
  { value: 'CA_COMPROMISE', label: 'CA Compromise' },
  { value: 'AFFILIATION_CHANGED', label: 'Affiliation Changed' },
  { value: 'SUPERSEDED', label: 'Superseded' },
  { value: 'CESSATION_OF_OPERATION', label: 'Cessation of Operation' },
  { value: 'CERTIFICATE_HOLD', label: 'Certificate Hold' }
];

export default function CertificatesTab() {

  const role = useAuthStore((s) => s.user?.role) || '';
  const isOperatorOrAdmin =
    role === 'CA_OPERATOR' ||
    role === 'ADMIN' ||
    role === 'ROLE_ADMIN' ||
    role === 'ROLE_OPERATOR_ROOT' ||
    role === 'ROOT' ||
    role === 'ROLE_ROOT' ||
    role === 'INTERMEDIATE_OPERATOR' ||
    role === 'INTERMEDIATE' ||
    role === 'ROLE_OPERATOR_INTERMEDIATE' ||
    role === 'ROLE_INTERMEDIATE';
  const [selectedCert, setSelectedCert] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Renew state
  const [renewTarget, setRenewTarget] = useState(null);
  const [renewAlias, setRenewAlias] = useState("");
  const [renewValidity, setRenewValidity] = useState(365);
  const [renewLoading, setRenewLoading] = useState(false);

  // Revoke state
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revokeReason, setRevokeReason] = useState("KEY_COMPROMISE");
  const [revokeLoading, setRevokeLoading] = useState(false);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const certEndpoint = isOperatorOrAdmin
        ? "/certificates/all-certificates"
        : "/certificates/my-certificates";
      const csrEndpoint = isOperatorOrAdmin
        ? "/csr/list"
        : "/csr/my";

      const [certRes, csrRes] = await Promise.all([
        api.get(certEndpoint).catch(() => ({ data: [] })),
        api.get(csrEndpoint).catch(() => ({ data: [] }))
      ]);

      const certs = Array.isArray(certRes.data) ? certRes.data : [];
      const csrs = Array.isArray(csrRes.data) ? csrRes.data : [];

      const certAliases = new Set(certs.map(c => c.alias?.toLowerCase()).filter(Boolean));

      const unissuedCsrs = csrs.filter(csr => (csr.status === "PENDING" || csr.status === "APPROVED") && !certAliases.has(csr.csrAlias?.toLowerCase())).map(csr => ({
        id: csr.id,
        alias: csr.csrAlias,
        type: csr.ca ? "CA_CSR" : "USER_CSR",
        status: csr.status || "PENDING",
        expiryDate: csr.notAfter || null,
        isCsr: true,
        commonName: csr.commonName,
        organization: csr.organization,
        createdBy: csr.createdBy
      }));

      setCertificates([...certs, ...unissuedCsrs]);
    } catch (err) {
      console.error("Failed to load certificates", err);
      toast.error("Failed to load certificates");
    } finally {
      setLoading(false);
    }
  };

  const openRenew = (cert) => {
    setRenewTarget(cert);
    setRenewAlias(`${cert.alias}-renewed-${Date.now()}`);
    setRenewValidity(365);
  };

  const openRevoke = (cert) => {
    setRevokeTarget(cert);
    setRevokeReason("KEY_COMPROMISE");
  };

  const handleRenew = async () => {
    if (!renewAlias.trim()) {
      toast.error("New alias is required");
      return;
    }
    if (!renewValidity || renewValidity <= 0) {
      toast.error("Validity days must be positive");
      return;
    }

    try {
        setRenewLoading(true);
        if (renewTarget.isCsr) {
          await api.post(`/csr/${renewTarget.id}/approve-and-issue`, {
            alias: renewAlias.trim(),
            validityDays: Number(renewValidity),
            caAlias: "root-ca-key-2026",
            pin: "12345678"
          });
          toast.success("CSR approved and certificate issued");
        } else {
          await api.post(`/certificates/${renewTarget.id}/renew`, {
            alias: renewAlias.trim(),
            validityDays: Number(renewValidity)
          });
          toast.success("Certificate renewed");
        }
        setRenewTarget(null);
        fetchCertificates();
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || err.response?.data || "Renew failed"
      );
    } finally {
      setRenewLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeReason) {
      toast.error("Reason is required");
      return;
    }

    try {
      setRevokeLoading(true);
      if (revokeTarget.isCsr) {
        await api.post(
          `/csr/${revokeTarget.id}/revoke?reason=${encodeURIComponent(revokeReason)}`
        );
        toast.success("CSR revoked successfully");
      } else {
        await api.post(
          `/certificates/${revokeTarget.id}/revoke?reason=${encodeURIComponent(revokeReason)}`
        );
        toast.success("Certificate revoked");
      }
      setRevokeTarget(null);
      fetchCertificates();
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || err.response?.data || "Revoke failed"
      );
    } finally {
      setRevokeLoading(false);
    }
  };

  const handleDelete = async (cert) => {
    if (!window.confirm(`Are you sure you want to delete "${cert.alias}"?`)) {
      return;
    }

    try {
      if (cert.isCsr) {
        await api.delete(`/csr/${cert.id}`);
      } else {
        await api.delete(`/certificates/${cert.id}`);
      }
      toast.success("Deleted successfully");
      fetchCertificates();
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || err.response?.data || "Delete failed"
      );
    }
  };

  const filteredCertificates = certificates.filter((cert) =>
    cert.alias?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 h-full flex flex-col gap-4 bg-[#0A0D12]">

      <div className="flex justify-between items-center bg-[#161b22] p-4 rounded-lg border border-slate-800">
        <div className="relative w-96">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            size={16}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0d1117] border border-slate-700 rounded px-10 py-2 text-sm text-white"
            placeholder="Filter certificates..."
          />
        </div>
      </div>

      <div className="flex-1 bg-[#161b22]/50 border border-slate-800 rounded-lg overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#161b22] text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 border-b border-slate-800">Alias</th>
              <th className="px-4 py-3 border-b border-slate-800">Type</th>
              <th className="px-4 py-3 border-b border-slate-800">Status</th>
              <th className="px-4 py-3 border-b border-slate-800">Expiry</th>
              <th className="px-4 py-3 border-b border-slate-800 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {loading ? (
              <tr>
                <td colSpan="5" className="text-center py-10 text-slate-500">
                  Loading certificates...
                </td>
              </tr>
            ) : filteredCertificates.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-10 text-slate-500">
                  No certificates found
                </td>
              </tr>
            ) : (
              filteredCertificates.map((cert) => (
                <tr
                  key={cert.id}
                  className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors group"
                >
                  <td className="px-4 py-3 flex items-center gap-3">
                    <ShieldCheck size={16} className="text-emerald-500" />
                    <span className="font-medium text-slate-200">{cert.alias}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{cert.type}</td>
                  <td className="px-4 py-3">
                    {cert.status === 'REVOKED' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-red-500/10 text-red-400">
                        REVOKED
                      </span>
                    ) : cert.status === 'PENDING' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-400">
                        PENDING
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-400">
                        APPROVED
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {cert.expiryDate
                      ? new Date(cert.expiryDate).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => setSelectedCert(cert)}
                        className="p-1.5 hover:bg-blue-500/20 text-blue-400 rounded transition-all"
                        title="View details"
                      >
                        <Eye size={16} />
                      </button>

                      {cert.status !== "REVOKED" && (
                        <>
                          <button
                            onClick={() => openRenew(cert)}
                            className="p-1.5 hover:bg-emerald-500/20 text-emerald-400 rounded transition-all"
                            title="Renew"
                          >
                            <RotateCw size={16} />
                          </button>

                          <button
                            onClick={() => openRevoke(cert)}
                            className="p-1.5 hover:bg-red-500/20 text-red-400 rounded transition-all"
                            title="Revoke"
                          >
                            <Ban size={16} />
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => handleDelete(cert)}
                        className="p-1.5 hover:bg-slate-500/20 text-slate-400 hover:text-red-400 rounded transition-all"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedCert && (
        <CertificateDetailsModal
          cert={selectedCert}
          onClose={() => setSelectedCert(null)}
        />
      )}

      {/* RENEW MODAL */}
      {renewTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-slate-800 rounded-xl w-full max-w-md">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400">
                <RotateCw size={18} />
                <h2 className="text-sm font-bold uppercase">Renew Certificate</h2>
              </div>
              <button
                onClick={() => setRenewTarget(null)}
                className="text-slate-500 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-xs text-slate-400">
                Renewing: <span className="text-slate-200 font-bold">{renewTarget.alias}</span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase">
                  New Alias
                </label>
                <input
                  value={renewAlias}
                  onChange={(e) => setRenewAlias(e.target.value)}
                  className="w-full mt-1 bg-[#111827] border border-slate-700 rounded px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase">
                  Validity Days
                </label>
                <input
                  type="number"
                  value={renewValidity}
                  onChange={(e) => setRenewValidity(e.target.value)}
                  min={1}
                  className="w-full mt-1 bg-[#111827] border border-slate-700 rounded px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-800">
              <button
                onClick={() => setRenewTarget(null)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleRenew}
                disabled={renewLoading}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-70 rounded text-sm font-bold text-white flex items-center gap-2"
              >
                {renewLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Renewing...
                  </>
                ) : (
                  <>
                    <RotateCw size={14} />
                    Renew
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVOKE MODAL */}
      {revokeTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-slate-800 rounded-xl w-full max-w-md">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2 text-red-400">
                <Ban size={18} />
                <h2 className="text-sm font-bold uppercase">Revoke Certificate</h2>
              </div>
              <button
                onClick={() => setRevokeTarget(null)}
                className="text-slate-500 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-xs text-slate-400">
                Revoking: <span className="text-slate-200 font-bold">{revokeTarget.alias}</span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase">
                  Reason
                </label>
                <select
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  className="w-full mt-1 bg-[#111827] border border-slate-700 rounded px-3 py-2 text-sm text-white"
                >
                  {REVOKE_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-800">
              <button
                onClick={() => setRevokeTarget(null)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleRevoke}
                disabled={revokeLoading}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-70 rounded text-sm font-bold text-white flex items-center gap-2"
              >
                {revokeLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Revoking...
                  </>
                ) : (
                  <>
                    <Ban size={14} />
                    Revoke
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}