import { useEffect, useState } from "react";
import {
  X,
  Check,
  Loader2,
  ShieldCheck,
  Download,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../api/axios";
import { getAllKeys } from "../../services/keys";
import { getAllCsrs } from "../../services/csr";

const IntermediateCASignModal = ({ onClose, onSigned }) => {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [availableKeys, setAvailableKeys] = useState([]);
  const [availableCsrs, setAvailableCsrs] = useState([]);
  const [generatedCert, setGeneratedCert] = useState(null);
  const [fetchError, setFetchError] = useState("");

  const [form, setForm] = useState({
    csrId: "",
    caAlias: "",
    pin: "",
    validityDays: 1825
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoadingData(true);
      setFetchError("");

      const [keys, csrs] = await Promise.all([
        getAllKeys(),
        getAllCsrs()
      ]);

      const allKeys = Array.isArray(keys) ? keys : [];
      const allCsrs = Array.isArray(csrs) ? csrs : [];

      setAvailableKeys(allKeys);

      // CA-eligible = ca flag true AND status is PENDING (not yet signed)
      const caCsrs = allCsrs.filter((c) => {
        const caFlag =
          c.ca === true || c.ca === "true" || c.ca === 1 || c.ca === "1";
        const status = (c.status || "PENDING").toUpperCase();
        return caFlag && status === "PENDING";
      });

      setAvailableCsrs(caCsrs);
    } catch (err) {
      console.error(err);
      const status = err.response?.status;
      if (status === 403) {
        setFetchError("You do not have permission to list CSRs. Sign in as ADMIN or CA_OPERATOR.");
      } else {
        setFetchError(err.response?.data?.message || err.message || "Failed to load data");
      }
      setAvailableKeys([]);
      setAvailableCsrs([]);
    } finally {
      setLoadingData(false);
    }
  };

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    const csrId = Number(form.csrId);
    const caAlias = form.caAlias.trim();
    const pin = form.pin.trim();
    const validityDays = Number(form.validityDays);

    if (!Number.isInteger(csrId) || csrId <= 0) {
      toast.error("Select a CA-eligible CSR");
      return;
    }
    if (!caAlias) {
      toast.error("Root CA alias is required");
      return;
    }
    if (!pin) {
      toast.error("PIN is required");
      return;
    }
    if (!Number.isInteger(validityDays) || validityDays <= 0) {
      toast.error("Validity Days must be a positive number");
      return;
    }

    try {
      setLoading(true);

      const url = `/ca/intermediate/sign?csrId=${csrId}&caAlias=${encodeURIComponent(caAlias)}&pin=${encodeURIComponent(pin)}&validityDays=${validityDays}`;

      const response = await api.post(url);

      toast.success("Intermediate CA created successfully");

      const certText =
        typeof response.data === "string"
          ? response.data
          : response.data?.certificate ||
            JSON.stringify(response.data, null, 2);

      setGeneratedCert(certText);

      if (onSigned) onSigned();
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message ||
          err.response?.data ||
          err.message ||
          "Failed to create Intermediate CA"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#161b22] border border-slate-800 rounded-xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-indigo-400" />
            <div>
              <h2 className="text-sm font-bold text-white uppercase">
                Create Intermediate CA
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Sign a CA-eligible CSR using a Root CA private key.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <Section
            title="CA-Eligible CSR"
            description="Only CSRs with the CA flag set and PENDING status are shown."
          >
            {loadingData ? (
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Loader2 size={14} className="animate-spin" />
                Loading CSRs and HSM keys...
              </div>
            ) : fetchError ? (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle size={14} />
                {fetchError}
              </div>
            ) : availableCsrs.length === 0 ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2 text-amber-400 text-xs bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold">No CA-eligible CSRs found.</p>
                    <p className="text-amber-300/80 mt-1">
                      To create an intermediate CA, first generate a CSR with the "CA: TRUE" flag
                      set. The CSR's status must be PENDING (not already signed).
                    </p>
                  </div>
                </div>
                <button
                  onClick={loadData}
                  className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded"
                >
                  <RefreshCw size={12} />
                  Reload
                </button>
              </div>
            ) : (
              <select
                value={form.csrId}
                onChange={(e) => updateField("csrId", e.target.value)}
                className="w-full bg-[#111827] border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
              >
                <option value="">Select a CSR...</option>
                {availableCsrs.map((csr) => (
                  <option key={csr.id} value={csr.id}>
                    #{csr.id} — {csr.csrAlias} — {csr.commonName || "N/A"}
                  </option>
                ))}
              </select>
            )}
          </Section>

          <Section
            title="Issuance"
            description="Pick the Root CA key, enter its PIN, and set validity."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField
                label="Root CA Key Alias"
                value={form.caAlias}
                onChange={(v) => updateField("caAlias", v)}
                options={availableKeys.map((k) => ({
                  value: k.alias,
                  label: `${k.alias} (${k.algorithm}${
                    k.keySize ? " " + k.keySize : ""
                  })`
                }))}
                placeholder={
                  availableKeys.length === 0
                    ? "No keys available"
                    : "Select a Root CA key..."
                }
                required
              />

              <Input
                label="Root CA PIN"
                type="password"
                value={form.pin}
                onChange={(v) => updateField("pin", v)}
                placeholder="HSM PIN"
                required
              />

              <Input
                label="Validity Days"
                type="number"
                value={form.validityDays}
                onChange={(v) => updateField("validityDays", v)}
                min={1}
                required
              />
            </div>
          </Section>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || loadingData || availableCsrs.length === 0}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-bold text-white flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Signing...
              </>
            ) : (
              <>
                <Check size={14} />
                Create Intermediate CA
              </>
            )}
          </button>
        </div>
      </div>

      {generatedCert && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-3xl bg-[#0d1117] border border-slate-800 rounded-xl p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Intermediate CA Certificate
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Copy or download the certificate below.
                </p>
              </div>
              <button
                onClick={() => setGeneratedCert(null)}
                className="text-slate-500 hover:text-white text-lg"
              >
                &times;
              </button>
            </div>

            <textarea
              readOnly
              value={generatedCert}
              className="w-full h-72 p-3 border border-slate-700 rounded text-sm font-mono bg-[#111827] text-emerald-200 resize-none"
            />

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(generatedCert);
                  toast.success("Certificate copied to clipboard");
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold"
              >
                Copy
              </button>

              <button
                onClick={() => {
                  const blob = new Blob([generatedCert], {
                    type: "application/x-pem-file"
                  });
                  const url = window.URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = "intermediate-ca.crt.pem";
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                  window.URL.revokeObjectURL(url);
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded text-sm font-bold flex items-center gap-2"
              >
                <Download size={14} />
                Download
              </button>

              <button
                onClick={() => {
                  setGeneratedCert(null);
                  if (onClose) onClose();
                }}
                className="px-4 py-2 bg-slate-700 text-white rounded text-sm font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Section = ({ title, description, children }) => (
  <section className="bg-[#0d1117] border border-slate-800 rounded-xl p-4 space-y-4">
    <div>
      <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-white">
        {title}
      </h3>
      <p className="text-xs text-slate-500 mt-1">{description}</p>
    </div>
    {children}
  </section>
);

const Input = ({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  min
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[11px] uppercase font-bold text-slate-500">
      {label} {required ? "*" : ""}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      min={min}
      className="bg-[#111827] border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
    />
  </div>
);

const SelectField = ({
  label,
  value,
  onChange,
  options,
  placeholder,
  required
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[11px] uppercase font-bold text-slate-500">
      {label} {required ? "*" : ""}
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-[#111827] border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </div>
);

export default IntermediateCASignModal;