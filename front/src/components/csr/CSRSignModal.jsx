import { useEffect, useState } from "react";
import {
  X,
  Check,
  Loader2,
  Info,
  FileText
} from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../api/axios";
import { getAllKeys } from "../../services/keys";

const createInitialForm = (csr) => ({
  csrId: csr?.id || "",
  caAlias: "",
  pin: "",
  validityDays: 365
});

const SIGN_ENDPOINTS = [
  () => ({
    url: "/certificates/sign",
    payloadFactory: (payload) => payload
  })
];

const buildSignPayload = ({
  csrId,
  caAlias,
  pin,
  validityDays
}) => ({
  csrId,
  caAlias,
  pin,
  validityDays
});

const trySignRequest = async (payload) => {
  let lastError = null;

  for (const endpointFactory of SIGN_ENDPOINTS) {
    try {
      const endpoint = endpointFactory(payload.csrId);

      return await api.post(
        endpoint.url,
        endpoint.payloadFactory(payload)
      );
    } catch (err) {
      const status = err.response?.status;

      if (status === 404 || status === 405) {
        lastError = err;
        continue;
      }

      throw err;
    }
  }

  throw lastError || new Error("No CSR signing endpoint responded");
};

const CSRSignModal = ({
  csr,
  onClose,
  onSigned
}) => {
  const [loading, setLoading] = useState(false);
  const [availableKeys, setAvailableKeys] = useState([]);
  const [displayError, setDisplayError] = useState("");
  const [form, setForm] = useState(() => createInitialForm(csr));

  useEffect(() => {
    setForm(createInitialForm(csr));
  }, [csr]);

  useEffect(() => {
    fetchAvailableKeys();
  }, []);

  const fetchAvailableKeys = async () => {
    try {
      const data = await getAllKeys();
      setAvailableKeys(data);
    } catch (err) {
      console.error(err);
      setAvailableKeys([]);
    }
  };

  const updateField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    const csrId = Number(form.csrId);
    const caAlias = form.caAlias.trim();
    const pin = form.pin.trim();
    const validityDays = Number(form.validityDays);

    if (!Number.isInteger(csrId) || csrId <= 0) {
      toast.error("Select a CSR to sign");
      return;
    }

    if (!caAlias) {
      toast.error("CA alias is required");
      return;
    }

    if (!pin) {
      toast.error("PIN is required");
      return;
    }

    if (!Number.isInteger(validityDays) || validityDays <= 0) {
      toast.error("Validity Days must be a positive whole number");
      return;
    }

    try {
      setLoading(true);

      const payload = buildSignPayload({
        csrId,
        caAlias,
        pin,
        validityDays
      });

      await trySignRequest(payload);

      toast.success("CSR signed successfully");

      if (onSigned) {
        onSigned();
      }

      onClose();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || err.response?.data || err.message || "Failed to sign CSR";
      setDisplayError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#161b22] border border-slate-800 rounded-xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Check
              size={18}
              className="text-blue-500"
            />

            <div>
              <h2 className="text-sm font-bold text-white uppercase">
                Sign Selected CSR
              </h2>

              <p className="text-xs text-slate-500 mt-1">
                Issue a certificate from the CSR you selected.
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
            title="Selected CSR"
            description="This is the request that will be issued as a certificate."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ReadOnlyField
                label="CSR Alias"
                value={csr?.csrAlias || "N/A"}
              />

              <ReadOnlyField
                label="Common Name"
                value={csr?.commonName || "N/A"}
              />

              <ReadOnlyField
                label="Subject"
                value={csr?.subject || "N/A"}
              />

              <ReadOnlyField
                label="Signature Algorithm"
                value={csr?.signatureAlgorithm || "N/A"}
              />
            </div>
          </Section>

          <Section
            title="Issuance"
            description="Select one of your generated HSM keys, then provide the PIN and validity period required by the signing request."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ReadOnlyField
                label="CSR ID"
                value={String(form.csrId || "N/A")}
              />

              <SelectField
                label="CA Key Alias"
                value={form.caAlias}
                onChange={(value) =>
                  updateField("caAlias", value)
                }
                placeholder="Select one of your HSM keys"
                options={availableKeys.map((key) => ({
                  value: key.alias,
                  label: buildKeyOptionLabel(key)
                }))}
                required
              />

              <Input
                label="PIN"
                type="password"
                value={form.pin}
                onChange={(value) =>
                  updateField("pin", value)
                }
                placeholder="Enter issuer PIN"
                required
              />

              <Input
                label="Validity Days"
                type="number"
                value={form.validityDays}
                onChange={(value) =>
                  updateField("validityDays", value)
                }
                min={1}
                required
              />
            </div>

            <InlineHint>
              {availableKeys.length > 0
                ? `${availableKeys.length} HSM key alias${availableKeys.length > 1 ? "es are" : " is"} available for CSR signing.`
                : "No HSM keys were loaded for your account yet."}
            </InlineHint>
          </Section>

          <Section
            title="Notes"
            description="The modal now exists because the previous sign button only changed state and never rendered a signing interface."
          >
            <InlineHint>
              This form now sends only `csrId`, `caAlias`, `pin`, and `validityDays` to match the backend request model.
            </InlineHint>
          </Section>
        </div>

        {displayError && (
          <div className="px-6 py-2 text-red-400 text-xs border-t border-red-500/20 bg-red-500/5">
            {displayError}
          </div>
        )}

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-70 rounded text-sm font-bold text-white flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2
                  size={14}
                  className="animate-spin"
                />
                Signing...
              </>
            ) : (
              <>
                <FileText size={14} />
                Sign CSR
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const Section = ({
  title,
  description,
  children
}) => (
  <section className="bg-[#0d1117] border border-slate-800 rounded-xl p-4 space-y-4">
    <div>
      <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-white">
        {title}
      </h3>

      <p className="text-xs text-slate-500 mt-1">
        {description}
      </p>
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
  listId,
  min
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[11px] uppercase font-bold text-slate-500">
      {label}
      {required ? " *" : ""}
    </label>

    <input
      type={type}
      value={value}
      onChange={(e) =>
        onChange(e.target.value)
      }
      placeholder={placeholder}
      list={listId}
      min={min}
      className="bg-[#111827] border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
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
      {label}
      {required ? " *" : ""}
    </label>

    <select
      value={value}
      onChange={(e) =>
        onChange(e.target.value)
      }
      className="bg-[#111827] border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
    >
      <option value="">
        {placeholder}
      </option>

      {options.map((option) => (
        <option
          key={option.value}
          value={option.value}
        >
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

const ReadOnlyField = ({
  label,
  value
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[11px] uppercase font-bold text-slate-500">
      {label}
    </label>

    <div className="bg-[#111827] border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-200 break-all">
      {value}
    </div>
  </div>
);

const InlineHint = ({ children }) => (
  <div className="flex items-center gap-2 text-xs text-slate-500">
    <Info size={12} />
    <span>{children}</span>
  </div>
);

const buildKeyOptionLabel = (key) => {
  const details = [key.algorithm, key.keySize || key.curveName]
    .filter(Boolean)
    .join(" - ");

  return details
    ? `${key.alias} (${details})`
    : key.alias;
};

export default CSRSignModal;
