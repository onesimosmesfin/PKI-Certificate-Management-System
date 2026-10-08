import { useEffect, useState } from "react";
import {
  Search,
  Loader2,
  Check,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Info,
  Ban,
  Trash2
} from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../api/axios";

import { getAllCsrs } from "../../services/csr";
import CSRSignModal from "../../components/csr/CSRSignModal";
import RootCASelfSignModal from "../../components/csr/RootCASelfSignModal";
import IntermediateCASignModal from "../../components/csr/IntermediateCASignModal";

const CSRSigningDashboard = () => {
  const [selectedRow, setSelectedRow] = useState(null);
  const [showSignModal, setShowSignModal] = useState(false);
  const [showRootModal, setShowRootModal] = useState(false);
  const [showIntermediateModal, setShowIntermediateModal] = useState(false);
  const [csrData, setCsrData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [diag, setDiag] = useState("");

  const fetchAllCsrs = async () => {
    try {
      setLoading(true);
      const data = await getAllCsrs();
      setDiag(`Loaded ${data.length} CSR(s)`);
      setCsrData(data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to load CSR requests");
      setCsrData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeCsr = async () => {
    if (!selectedRow) return;
    try {
      setLoading(true);
      await api.post(`/csr/${selectedRow.id}/revoke?reason=KEY_COMPROMISE`);
      // Optimistically update status in local state immediately
      setCsrData(prev =>
        prev.map(c => c.id === selectedRow.id ? { ...c, status: 'REVOKED' } : c)
      );
      setSelectedRow(prev => prev ? { ...prev, status: 'REVOKED' } : null);
      toast.success("CSR revoked successfully");
      fetchAllCsrs();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.response?.data || "Failed to revoke CSR");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveCsr = async () => {
    if (!selectedRow) return;
    try {
      setLoading(true);
      // approve-and-issue: sets CSR to SIGNED and issues the certificate in one call
      await api.post(`/csr/${selectedRow.id}/approve-and-issue`, {
        alias: selectedRow.csrAlias,
        validityDays: 365,
        caAlias: "root-ca-key-2026",
        pin: "12345678"
      });
      // Optimistically update status in local state immediately
      setCsrData(prev =>
        prev.map(c => c.id === selectedRow.id ? { ...c, status: 'SIGNED' } : c)
      );
      setSelectedRow(prev => prev ? { ...prev, status: 'SIGNED' } : null);
      toast.success("CSR approved and certificate issued");
      fetchAllCsrs();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.response?.data || "Failed to approve and issue");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCsr = async () => {
    if (!selectedRow) return;
    if (!window.confirm(`Delete CSR "${selectedRow.csrAlias}"?`)) return;
    try {
      setLoading(true);
      await api.delete(`/csr/${selectedRow.id}`);
      toast.success("CSR deleted successfully");
      setSelectedRow(null);
      fetchAllCsrs();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.response?.data || "Failed to delete CSR");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllCsrs();
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#0d1117] text-slate-300 p-6 space-y-4">
      <div className="flex justify-between items-center bg-[#161b22] p-3 rounded-lg border border-slate-800 shadow-md">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-md">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              size={16}
            />
            <input
              className="w-full bg-[#0d1117] border border-slate-700 rounded px-9 py-2 text-sm outline-none focus:border-blue-500 text-slate-200 placeholder-slate-500"
              placeholder="Search CSR Requests..."
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRootModal(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded text-xs font-bold transition-all shadow-lg shadow-emerald-900/20"
          >
            <ShieldCheck size={14} />
            Self Sign Root CA
          </button>

          <button
            onClick={() => setShowIntermediateModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded text-xs font-bold transition-all shadow-lg shadow-indigo-900/20"
          >
            <ShieldCheck size={14} />
            Create Intermediate CA
          </button>

          <button
            disabled={!selectedRow}
            onClick={() => setShowSignModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white px-4 py-2 rounded text-xs font-bold transition-all disabled:cursor-not-allowed shadow-lg shadow-blue-900/20"
          >
            <Check size={14} />
            Sign Selected
          </button>

          <button
            disabled={!selectedRow || selectedRow.status === 'REVOKED'}
            onClick={handleApproveCsr}
            className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 text-white px-4 py-2 rounded text-xs font-bold transition-all disabled:cursor-not-allowed shadow-lg shadow-emerald-900/20"
          >
            <CheckCircle2 size={14} />
            Renew
          </button>

          <button
            disabled={!selectedRow || selectedRow.status === 'REVOKED'}
            onClick={handleRevokeCsr}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-500 text-white px-4 py-2 rounded text-xs font-bold transition-all disabled:cursor-not-allowed shadow-lg shadow-red-900/20"
          >
            <Ban size={14} />
            Revoke
          </button>

          <button
            disabled={!selectedRow}
            onClick={handleDeleteCsr}
            className="flex items-center gap-2 bg-slate-700 hover:bg-red-700 disabled:bg-slate-800 disabled:text-slate-500 text-white px-3 py-2 rounded text-xs font-bold transition-all disabled:cursor-not-allowed"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>

      <div className="text-xs text-emerald-400 mb-2">{diag}</div>
      <div className="flex-1 bg-[#161b22] border border-slate-800 rounded-lg overflow-hidden flex flex-col">
        <div className="overflow-y-auto h-full">
          {loading ? (
            <div className="h-full flex items-center justify-center gap-2 text-slate-400 p-10">
              <Loader2 size={18} className="animate-spin text-blue-500" />
              Loading CSR Requests...
            </div>
          ) : error ? (
            <div className="p-5 text-red-400 flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#161b22] border-b border-slate-800 z-10">
                <tr className="text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 border-r border-slate-800 w-20">ID</th>
                  <th className="px-4 py-3 border-r border-slate-800">Alias</th>
                  <th className="px-4 py-3 border-r border-slate-800">Subject DN</th>
                  <th className="px-4 py-3 text-center w-36">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {csrData.length === 0 ? (
                  <tr>
                    <td
                      colSpan="4"
                      className="text-center py-16 text-slate-500 italic text-xs"
                    >
                      No CSR Requests Found.
                    </td>
                  </tr>
                ) : (
                  csrData.map((csr) => (
                    <tr
                      key={csr.id}
                      onClick={() => setSelectedRow(csr)}
                      className={`cursor-pointer transition-all ${
                        selectedRow?.id === csr.id
                          ? "bg-blue-600/10 text-white"
                          : "hover:bg-slate-800/30"
                      }`}
                    >
                      <td className="px-4 py-3 border-r border-slate-800 text-blue-400 font-mono text-xs">
                        {csr.id}
                      </td>
                      <td className="px-4 py-3 border-r border-slate-800 text-sm font-semibold text-slate-200">
                        {csr.csrAlias || "N/A"}
                      </td>
                      <td
                        className="px-4 py-3 border-r border-slate-800 text-sm text-slate-400 truncate max-w-[400px]"
                        title={csr.subject}
                      >
                        {csr.subject || csr.commonName || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={csr.status || "PENDING"} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="h-60 bg-[#161b22] border border-slate-800 rounded-lg overflow-hidden flex flex-col">
        <div className="px-4 py-2 border-b border-slate-800 bg-[#0f172a]">
          <h2 className="text-xs uppercase tracking-widest text-white font-bold">
            CSR Inspection Panel
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {selectedRow ? (
            <div className="grid grid-cols-2 gap-4 max-w-3xl">
              <DetailItem label="CSR Alias" value={selectedRow.csrAlias} />
              <DetailItem label="Common Name" value={selectedRow.commonName} />
              <DetailItem label="Organization" value={selectedRow.organization} />
              <DetailItem label="Country" value={selectedRow.country} />
              <DetailItem label="Email" value={selectedRow.email} />
              <DetailItem
                label="Signature Algorithm"
                value={selectedRow.signatureAlgorithm}
              />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-2">
              <Info size={18} className="text-slate-700" />
              <span className="text-xs">
                Select a CSR row to inspect details.
              </span>
            </div>
          )}
        </div>
      </div>

      {showRootModal && (
        <RootCASelfSignModal onClose={() => setShowRootModal(false)} />
      )}

      {showIntermediateModal && (
        <IntermediateCASignModal
          onClose={() => setShowIntermediateModal(false)}
          onSigned={() => {
            setShowIntermediateModal(false);
            fetchAllCsrs();
          }}
        />
      )}

      {showSignModal && selectedRow && (
        <CSRSignModal
          csr={selectedRow}
          onClose={() => setShowSignModal(false)}
          onSigned={() => {
            setShowSignModal(false);
            setSelectedRow(null);
            fetchAllCsrs();
          }}
        />
      )}
    </div>
  );
};

const DetailItem = ({ label, value }) => (
  <div className="flex flex-col">
    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
      {label}
    </span>
    <span className="text-sm text-slate-200 mt-1">{value || "---"}</span>
  </div>
);

const StatusBadge = ({ status }) => {
  const normalized = status?.toUpperCase() || "PENDING";
  const isApproved = normalized === "APPROVED" || normalized === "SIGNED" || normalized === "ACTIVE" || normalized === "RENEWED";
  const isRevoked = normalized === "REVOKED";

  if (isRevoked) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold bg-red-500/10 text-red-500">
        <AlertCircle size={12} />
        REVOKED
      </div>
    );
  }

  if (isApproved) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
        <CheckCircle2 size={12} />
        APPROVED
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500">
      <Clock size={12} />
      PENDING
    </div>
  );
};

export default CSRSigningDashboard;