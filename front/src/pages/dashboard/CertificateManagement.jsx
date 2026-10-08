// pages/dashboard/CertificateManagement.jsx

import { useEffect, useMemo, useState } from "react";

import {
  Shield,
  Search,
  RefreshCw,
  Eye,
  X,
  ShieldAlert,
  Download,
  Layers,
  Cpu,
  CheckCircle,
  Key,
  Terminal,
  Trash2,
  Ban,
  FileCheck,
  FileWarning,
} from "lucide-react";

import {
  deleteCertificateById,
  getCertificatePemById,
  getCertificates,
  getRevokedCertificates,
  revokeCertificateById,
  verifyCertificateById,
} from '../../services/certificates';

export default function CertificateManagement() {

  const [certificates, setCertificates] = useState([]);
  const [revokedCertificates, setRevokedCertificates] = useState([]);

  const [selectedCert, setSelectedCert] = useState(null);

  const [loading, setLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");

  const [activeCategory, setActiveCategory] =
    useState("ALL_CERTIFICATES");

  const [showRevokeModal, setShowRevokeModal] = useState(false);

  const [revokeReason, setRevokeReason] = useState("");

  const role = localStorage.getItem("role");

  // =========================================
  // AXIOS AUTH
  // =========================================

 


  // =========================================
  // LOAD DATA
  // =========================================

  useEffect(() => {
    fetchCertificates();
    fetchRevokedCertificates();
  }, []);

  const fetchCertificates = async () => {

    try {

      setLoading(true);

      const response = await getCertificates();

      setCertificates(response);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRevokedCertificates = async () => {

    try {

      const response = await getRevokedCertificates();

      setRevokedCertificates(response);

    } catch (err) {
      console.error(err);
    }
  };

  // =========================================
  // FILTERING
  // =========================================

  const filteredCertificates = useMemo(() => {

    let data = certificates;

    if (activeCategory === "ACTIVE") {
      data = data.filter(cert => !cert.revoked);
    }

    if (activeCategory === "REVOKED") {
      data = data.filter(cert => cert.revoked);
    }

    if (activeCategory === "EXPIRING") {
      data = data.filter(cert => cert.daysRemaining <= 30);
    }

    return data.filter(cert =>
      cert.subjectDn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.alias?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  }, [certificates, searchQuery, activeCategory]);

  

  const verifyCertificate = async (id) => {

    try {

      const response = await verifyCertificateById(id);

      alert(
        response
          ? "Certificate is VALID"
          : "Certificate is INVALID"
      );

    } catch (err) {
      console.error(err);
    }
  };

  // =========================================
  // DOWNLOAD PEM
  // =========================================

  const downloadPem = async (id, alias) => {

    try {

      const response = await getCertificatePemById(id);

      const blob = new Blob(
        [response],
        { type: "application/x-pem-file" }
      );

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;

      link.download = `${alias}.pem`;

      link.click();

    } catch (err) {
      console.error(err);
    }
  };

  // =========================================
  // REVOKE CERTIFICATE
  // =========================================

  const revokeCertificate = async () => {

    if (!selectedCert) return;

    try {

      await revokeCertificateById(selectedCert.id, revokeReason);

      alert("Certificate revoked successfully");

      setShowRevokeModal(false);

      setRevokeReason("");

      fetchCertificates();

      fetchRevokedCertificates();

    } catch (err) {
      console.error(err);
    }
  };

  // =========================================
  // DELETE CERTIFICATE
  // =========================================

  const deleteCertificate = async (id) => {

    const confirmed = window.confirm(
      "Delete certificate permanently?"
    );

    if (!confirmed) return;

    try {

      await deleteCertificateById(id);

      alert("Certificate deleted");

      fetchCertificates();

    } catch (err) {
      console.error(err);
    }
  };

  // =========================================
  // METRICS
  // =========================================

  const totalCertificates = certificates.length;

  const activeCertificates =
    certificates.filter(c => !c.revoked).length;

  const revokedCount =
    revokedCertificates.length;

  const expiringCertificates =
    certificates.filter(c => c.daysRemaining <= 30).length;

  // =========================================
  // ROLE ACCESS
  // =========================================

  const isOperatorOrAdmin = role === "ADMIN" || role === "CA_OPERATOR";
  if (false) {

    return (
      <div className="p-10 text-red-400 text-xl">
        Access Denied
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen">

      {/* ========================================= */}
      {/* TOP BAR */}
      {/* ========================================= */}

      <div className="app-surface flex items-center justify-between border-x-0 border-t-0 px-6 py-4">

        <div className="flex items-center gap-3">

          <div className="app-surface-strong rounded p-2">
            <Shield size={18} />
          </div>

          <div>

            <div className="app-muted text-xs uppercase">
              SoftHSM Certificate Infrastructure
            </div>

            <div className="app-heading font-bold">
              Certificate Management Dashboard
            </div>

          </div>

        </div>

        <button
          onClick={fetchCertificates}
          className="app-surface-strong app-heading flex items-center gap-2 rounded px-3 py-2 hover:bg-[rgb(var(--app-surface-muted))]"
        >
          <RefreshCw
            size={15}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>

      </div>

      {/* ========================================= */}
      {/* METRICS */}
      {/* ========================================= */}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6">

        <MetricCard
          icon={<Layers size={16} />}
          title="Total Certificates"
          value={totalCertificates}
        />

        <MetricCard
          icon={<CheckCircle size={16} />}
          title="Active"
          value={activeCertificates}
        />

        <MetricCard
          icon={<ShieldAlert size={16} />}
          title="Revoked"
          value={revokedCount}
        />

        <MetricCard
          icon={<Cpu size={16} />}
          title="Expiring Soon"
          value={expiringCertificates}
        />

      </div>

      {/* ========================================= */}
      {/* FILTERS */}
      {/* ========================================= */}

      <div className="px-6 flex flex-wrap gap-3 items-center">

        <CategoryButton
          active={activeCategory === "ALL_CERTIFICATES"}
          onClick={() => setActiveCategory("ALL_CERTIFICATES")}
          label="All"
        />

        <CategoryButton
          active={activeCategory === "ACTIVE"}
          onClick={() => setActiveCategory("ACTIVE")}
          label="Active"
        />

        <CategoryButton
          active={activeCategory === "REVOKED"}
          onClick={() => setActiveCategory("REVOKED")}
          label="Revoked"
        />

        <CategoryButton
          active={activeCategory === "EXPIRING"}
          onClick={() => setActiveCategory("EXPIRING")}
          label="Expiring"
        />

        <div className="relative ml-auto">

          <Search
            size={14}
            className="absolute left-3 top-3 text-zinc-500"
          />

          <input
            type="text"
            placeholder="Search certificates..."
            value={searchQuery}
            onChange={(e) =>
              setSearchQuery(e.target.value)
            }
            className="app-input rounded pl-9 pr-3 py-2 text-sm"
          />

        </div>

      </div>

      {/* ========================================= */}
      {/* TABLE */}
      {/* ========================================= */}

      <div className="p-6">

        <div className="app-surface overflow-hidden rounded">

          <table className="w-full text-sm">

            <thead className="app-surface-strong app-muted border-b border-[rgb(var(--app-border))] text-xs uppercase">

              <tr>
                <th className="text-left px-4 py-3">Alias</th>
                <th className="text-left px-4 py-3">Subject</th>
                <th className="text-left px-4 py-3">Issuer</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>

            </thead>

            <tbody>

              {filteredCertificates.map(cert => (

                <tr
                  key={cert.id}
                  className="border-b border-[rgb(var(--app-border))] hover:bg-[rgb(var(--app-surface-muted))]"
                >

                  <td className="px-4 py-3 font-mono">
                    {cert.alias}
                  </td>

                  <td className="px-4 py-3">
                    {cert.subject}
                  </td>

                  <td className="px-4 py-3">
                    {cert.issuer}
                  </td>

                  <td className="px-4 py-3">
                    {cert.type}
                  </td>

                  <td className="px-4 py-3">

                    {cert.revoked ? (

                      <span className="text-red-400 flex items-center gap-1">
                        <FileWarning size={13} />
                        Revoked
                      </span>

                    ) : (

                      <span className="text-emerald-400 flex items-center gap-1">
                        <FileCheck size={13} />
                        Active
                      </span>

                    )}

                  </td>

                  <td className="px-4 py-3">

                    <div className="flex justify-end gap-2">

                      <button
                        onClick={() => setSelectedCert(cert)}
                        className="app-surface-strong rounded p-2 hover:bg-[rgb(var(--app-surface-muted))]"
                      >
                        <Eye size={14} />
                      </button>

                      <button
                        onClick={() =>
                          verifyCertificate(cert.id)
                        }
                        className="app-surface-strong rounded p-2 hover:bg-[rgb(var(--app-surface-muted))]"
                      >
                        <Shield size={14} />
                      </button>

                      <button
                        onClick={() =>
                          downloadPem(cert.id, cert.alias)
                        }
                        className="app-surface-strong rounded p-2 hover:bg-[rgb(var(--app-surface-muted))]"
                      >
                        <Download size={14} />
                      </button>

                      {/* ADMIN ONLY */}

                      {isOperatorOrAdmin && !cert.revoked && (

                        <button
                          onClick={() => {
                            setSelectedCert(cert);
                            setShowRevokeModal(true);
                          }}
                          className="p-2 bg-red-900 rounded hover:bg-red-800"
                        >
                          <Ban size={14} />
                        </button>

                      )}

                      {isOperatorOrAdmin && (

                        <button
                          onClick={() =>
                            deleteCertificate(cert.id)
                          }
                          className="p-2 bg-red-950 rounded hover:bg-red-900"
                        >
                          <Trash2 size={14} />
                        </button>

                      )}

                    </div>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </div>

      {/* ========================================= */}
      {/* DETAILS DRAWER */}
      {/* ========================================= */}

      {selectedCert && !showRevokeModal && (

        <div className="app-surface fixed right-0 top-0 z-50 h-full w-[450px] overflow-auto border-y-0 border-r-0 p-5">

          <div className="flex justify-between items-center mb-5">

            <div>

              <div className="app-muted text-xs uppercase">
                Certificate Details
              </div>

              <div className="app-heading font-bold">
                {selectedCert.alias}
              </div>

            </div>

            <button
              onClick={() => setSelectedCert(null)}
              className="rounded p-2 hover:bg-[rgb(var(--app-surface-muted))]"
            >
              <X size={15} />
            </button>

          </div>

          <DetailItem
            icon={<Key size={14} />}
            label="Subject DN"
            value={selectedCert.subject}
          />

          <DetailItem
            icon={<Shield size={14} />}
            label="Issuer DN"
            value={selectedCert.issuer}
          />

          <DetailItem
            icon={<Cpu size={14} />}
            label="Algorithm"
            value={selectedCert.signatureAlgorithm}
          />

          <DetailItem
            icon={<Terminal size={14} />}
            label="SoftHSM Alias"
            value={selectedCert.alias}
          />

          <DetailItem
            icon={<CheckCircle size={14} />}
            label="Serial Number"
            value={selectedCert.serialNumber}
          />

        </div>

      )}

      {/* ========================================= */}
      {/* REVOKE MODAL */}
      {/* ========================================= */}

      {showRevokeModal && (

        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">

          <div className="app-surface w-[400px] rounded-lg p-6">

            <h2 className="app-heading mb-4 text-lg font-bold">
              Revoke Certificate
            </h2>

            <textarea
              value={revokeReason}
              onChange={(e) =>
                setRevokeReason(e.target.value)
              }
              placeholder="Enter revoke reason..."
              className="app-textarea h-28 w-full rounded p-3"
            />

            <div className="flex justify-end gap-3 mt-5">

              <button
                onClick={() => setShowRevokeModal(false)}
                className="app-surface-strong rounded px-4 py-2"
              >
                Cancel
              </button>

              <button
                onClick={revokeCertificate}
                className="px-4 py-2 bg-red-700 rounded hover:bg-red-600"
              >
                Revoke
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

// =========================================
// COMPONENTS
// =========================================

function MetricCard({ icon, title, value }) {

  return (
    <div className="app-surface flex justify-between rounded p-4">

      <div>

        <div className="app-muted text-xs uppercase">
          {title}
        </div>

        <div className="app-heading mt-2 text-2xl font-bold">
          {value}
        </div>

      </div>

      <div className="app-surface-strong h-fit rounded p-3">
        {icon}
      </div>

    </div>
  );
}

function CategoryButton({
  active,
  onClick,
  label,
}) {

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded text-sm ${
        active
          ? "bg-indigo-600 text-white"
          : "app-surface-strong app-muted"
      }`}
    >
      {label}
    </button>
  );
}

function DetailItem({
  icon,
  label,
  value,
}) {

  return (
    <div className="app-surface-soft mb-3 rounded p-3">

      <div className="app-muted mb-2 flex items-center gap-2 text-xs uppercase">
        {icon}
        {label}
      </div>

      <div className="app-heading break-all">
        {value}
      </div>

    </div>
  );
}
