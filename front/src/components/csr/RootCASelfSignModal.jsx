import { useEffect, useState } from "react";
import {
  X,
  ShieldCheck,
  Loader2,
  Info
} from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../api/axios";
import { getAllKeys } from "../../services/keys";

const KEY_USAGE_OPTIONS = [
  {
    value: "digitalSignature",
    label: "Digital Signature"
  },
  {
    value: "nonRepudiation",
    label: "Non Repudiation"
  },
  {
    value: "keyEncipherment",
    label: "Key Encipherment"
  },
  {
    value: "dataEncipherment",
    label: "Data Encipherment"
  },
  {
    value: "keyAgreement",
    label: "Key Agreement"
  },
  {
    value: "keyCertSign",
    label: "Key Cert Sign"
  },
  {
    value: "cRLSign",
    label: "CRL Sign"
  },
  {
    value: "encipherOnly",
    label: "Encipher Only"
  },
  {
    value: "decipherOnly",
    label: "Decipher Only"
  }
];

const EXTENDED_KEY_USAGE_OPTIONS = [
  {
    value: "serverAuth",
    label: "Server Auth"
  },
  {
    value: "clientAuth",
    label: "Client Auth"
  },
  {
    value: "codeSigning",
    label: "Code Signing"
  },
  {
    value: "emailProtection",
    label: "Email Protection"
  },
  {
    value: "timeStamping",
    label: "Time Stamping"
  },
  {
    value: "OCSPSigning",
    label: "OCSP Signing"
  }
];

const createInitialForm = () => ({
  alias: "",
  keyAlias: "",
  pin: "",
  commonName: "",
  organization: "",
  organizationalUnit: "",
  country: "",
  state: "",
  locality: "",
  email: "",
  validityDays: 3650,
  ca: true,
  pathLength: 0,
  keyUsages: [
    "keyCertSign",
    "cRLSign"
  ],
  extendedKeyUsages: [],
  dnsNames: "",
  ipAddresses: "",
  crlUrls: "",
  csrHash: "",
  correlationId: ""
});

const normalizeText = (value) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const parseList = (value) => (
  value
    .split(/\r?\n|,/)
    .map(item => item.trim())
    .filter(Boolean)
);

const RootCASelfSignModal = ({ onClose }) => {
  const [loading, setLoading] = useState(false);
  const [availableKeys, setAvailableKeys] = useState([]);
  const [form, setForm] = useState(createInitialForm);
  const [generatedCert, setGeneratedCert] = useState(null);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const data = await getAllKeys();
      setAvailableKeys(data);
    } catch (err) {
      console.error(err);
      setAvailableKeys([]);
      toast.error("Failed to load HSM keys");
    }
  };

  const updateField = (field, value) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleListValue = (field, value) => {
    setForm(prev => {
      const values = prev[field] || [];
      const exists = values.includes(value);

      return {
        ...prev,
        [field]: exists
          ? values.filter(item => item !== value)
          : [...values, value]
      };
    });
  };

  const handleSubmit = async () => {
  const alias = form.alias.trim();
  const keyAlias = form.keyAlias.trim();
  const pin = form.pin.trim();
  const commonName = form.commonName.trim();

  const validityDays = Number(form.validityDays);

  const pathLength =
    form.pathLength === ""
      ? null
      : Number(form.pathLength);

  if (!alias) {
    toast.error("Certificate alias is required");
    return;
  }

  if (!keyAlias) {
    toast.error("HSM key alias is required");
    return;
  }

  if (!pin) {
    toast.error("PIN is required");
    return;
  }

  if (!commonName) {
    toast.error("Common Name is required");
    return;
  }

  try {
    setLoading(true);

    const payload = {
      alias,
      keyAlias,
      pin,
      commonName,
      organization: normalizeText(form.organization),
      organizationalUnit: normalizeText(form.organizationalUnit),
      country: normalizeText(form.country)?.toUpperCase() || null,
      state: normalizeText(form.state),
      locality: normalizeText(form.locality),
      email: normalizeText(form.email),
      validityDays,
      ca: Boolean(form.ca),
      pathLength,
      keyUsages: form.keyUsages,
      extendedKeyUsages: form.extendedKeyUsages,
      dnsNames: parseList(form.dnsNames),
      ipAddresses: parseList(form.ipAddresses),
      crlUrls: parseList(form.crlUrls),
      csrHash: normalizeText(form.csrHash),
      correlationId: normalizeText(form.correlationId)
    };

    console.log("PAYLOAD:", payload);

    // IMPORTANT
    const response = await api.post(
      "/ca/root",
      payload
    );

    console.log("SERVER RESPONSE:", response);

    toast.success("Root CA created successfully");

    // Show the certificate in a modal instead of an alert
    const certText = typeof response.data === "string"
      ? response.data
      : response.data?.certificate || JSON.stringify(response.data, null, 2);

    setGeneratedCert(certText);
    setForm(createInitialForm());

  } catch (err) {

    console.error("FULL ERROR:", err);

    console.error("ERROR RESPONSE:", err.response);

    console.error("ERROR DATA:", err.response?.data);

    toast.error(
      err.response?.data?.message ||
      err.response?.data ||
      err.message ||
      "Failed to create Root CA"
    );

  } finally {
    setLoading(false);
  }
};

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#161b22] border border-slate-800 rounded-xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck
              size={18}
              className="text-emerald-500"
            />

            <div>
              <h2 className="text-sm font-bold text-white uppercase">
                Self Sign Root CA
              </h2>

              <p className="text-xs text-slate-500 mt-1">
                Build a payload that matches the
                backend `RootCARequest`.
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
            title="Certificate / HSM"
            description="Set the certificate alias and choose the HSM key alias that will be used to issue the Root CA."
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Certificate Alias"
                value={form.alias}
                onChange={(value) =>
                  updateField("alias", value)
                }
                placeholder="root-ca-01"
                required
              />

              <SelectField
                label="HSM Key Alias"
                value={form.keyAlias}
                onChange={(value) =>
                  updateField("keyAlias", value)
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
                placeholder="Enter HSM PIN"
              />
            </div>

            <InlineHint>
              {availableKeys.length > 0
                ? `${availableKeys.length} HSM key alias${availableKeys.length > 1 ? "es are" : " is"} available to select.`
                : "No HSM key aliases were loaded for your account yet."}
            </InlineHint>
          </Section>

          <Section
            title="Subject"
            description="These fields map to the certificate subject on the backend."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Common Name"
                value={form.commonName}
                onChange={(value) =>
                  updateField("commonName", value)
                }
                placeholder="INSA Root CA"
                required
              />

              <Input
                label="Organization"
                value={form.organization}
                onChange={(value) =>
                  updateField("organization", value)
                }
                placeholder="INSA"
              />

              <Input
                label="Organizational Unit"
                value={form.organizationalUnit}
                onChange={(value) =>
                  updateField("organizationalUnit", value)
                }
                placeholder="PKI"
              />

              <Input
                label="Country"
                value={form.country}
                onChange={(value) =>
                  updateField("country", value)
                }
                placeholder="MA"
                maxLength={2}
              />

              <Input
                label="State"
                value={form.state}
                onChange={(value) =>
                  updateField("state", value)
                }
                placeholder="Rabat-Sale-Kenitra"
              />

              <Input
                label="Locality"
                value={form.locality}
                onChange={(value) =>
                  updateField("locality", value)
                }
                placeholder="Rabat"
              />

              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(value) =>
                  updateField("email", value)
                }
                placeholder="pki@example.com"
              />
            </div>
          </Section>

          <Section
            title="Validity And CA"
            description="Root CA defaults are pre-filled, but you can adjust them if your backend flow allows it."
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Validity Days"
                type="number"
                value={form.validityDays}
                onChange={(value) =>
                  updateField("validityDays", value)
                }
                min={1}
              />

              <Input
                label="Path Length"
                type="number"
                value={form.pathLength}
                onChange={(value) =>
                  updateField("pathLength", value)
                }
                min={0}
              />

              <ToggleField
                label="Certificate Authority"
                checked={form.ca}
                onChange={(checked) =>
                  updateField("ca", checked)
                }
                description="Keep this enabled for a Root CA certificate."
              />
            </div>
          </Section>

          <Section
            title="Extensions"
            description="Configure key usage, extended key usage, SAN entries, and CRL distribution URLs."
          >
            <div className="space-y-5">
              <CheckboxGrid
                label="Key Usages"
                options={KEY_USAGE_OPTIONS}
                values={form.keyUsages}
                onToggle={(value) =>
                  toggleListValue("keyUsages", value)
                }
              />

              <CheckboxGrid
                label="Extended Key Usages"
                options={EXTENDED_KEY_USAGE_OPTIONS}
                values={form.extendedKeyUsages}
                onToggle={(value) =>
                  toggleListValue("extendedKeyUsages", value)
                }
              />

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <ListField
                  label="DNS Names"
                  value={form.dnsNames}
                  onChange={(value) =>
                    updateField("dnsNames", value)
                  }
                  placeholder={"ca.example.com\npki.example.com"}
                />

                <ListField
                  label="IP Addresses"
                  value={form.ipAddresses}
                  onChange={(value) =>
                    updateField("ipAddresses", value)
                  }
                  placeholder={"10.10.10.10\n192.168.1.1"}
                />

                <ListField
                  label="CRL URLs"
                  value={form.crlUrls}
                  onChange={(value) =>
                    updateField("crlUrls", value)
                  }
                  placeholder={"http://pki.example.com/root.crl\nhttp://backup.example.com/root.crl"}
                />
              </div>
            </div>
          </Section>

          <Section
            title="Optional Metadata"
            description="Leave these blank unless your backend flow expects them."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="CSR Hash"
                value={form.csrHash}
                onChange={(value) =>
                  updateField("csrHash", value)
                }
                placeholder="sha256:..."
              />

              <Input
                label="Correlation ID"
                value={form.correlationId}
                onChange={(value) =>
                  updateField("correlationId", value)
                }
                placeholder="request-12345"
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
            disabled={loading}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-70 rounded text-sm font-bold text-white flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2
                  size={14}
                  className="animate-spin"
                />
                Creating...
              </>
            ) : (
              <>
                <ShieldCheck size={14} />
                Create Root CA
              </>
            )}
          </button>
        </div>
      </div>

      {/* CERTIFICATE RESULT MODAL */}
      {generatedCert && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl bg-[#0d1117] border border-slate-800 rounded-xl p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Root CA Certificate Generated
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
                  const blob = new Blob([generatedCert], { type: "application/x-pem-file" });
                  const url = window.URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = "root-ca.crt.pem";
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                  window.URL.revokeObjectURL(url);
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded text-sm font-bold"
              >
                Download
              </button>

              <button
                onClick={() => setGeneratedCert(null)}
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
  min,
  maxLength
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
      maxLength={maxLength}
      className="bg-[#111827] border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
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
      className="bg-[#111827] border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
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

const ToggleField = ({
  label,
  checked,
  onChange,
  description
}) => (
  <div className="flex flex-col gap-2">
    <span className="text-[11px] uppercase font-bold text-slate-500">
      {label}
    </span>

    <label className="flex items-start justify-between gap-4 bg-[#111827] border border-slate-700 rounded-lg px-4 py-3 cursor-pointer">
      <div>
        <div className="text-sm text-white">
          {checked ? "Enabled" : "Disabled"}
        </div>

        <div className="text-xs text-slate-500 mt-1">
          {description}
        </div>
      </div>

      <input
        type="checkbox"
        checked={checked}
        onChange={(e) =>
          onChange(e.target.checked)
        }
        className="mt-1 h-4 w-4 accent-emerald-500"
      />
    </label>
  </div>
);

const CheckboxGrid = ({
  label,
  options,
  values,
  onToggle
}) => (
  <div className="space-y-2">
    <h4 className="text-[11px] uppercase font-bold text-slate-500">
      {label}
    </h4>

    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {options.map((option) => {
        const checked = values.includes(option.value);

        return (
          <label
            key={option.value}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
              checked
                ? "border-emerald-500 bg-emerald-500/10"
                : "border-slate-700 bg-[#111827] hover:border-slate-600"
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() =>
                onToggle(option.value)
              }
              className="h-4 w-4 accent-emerald-500"
            />

            <span className="text-sm text-slate-200">
              {option.label}
            </span>
          </label>
        );
      })}
    </div>
  </div>
);

const ListField = ({
  label,
  value,
  onChange,
  placeholder
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[11px] uppercase font-bold text-slate-500">
      {label}
    </label>

    <textarea
      value={value}
      onChange={(e) =>
        onChange(e.target.value)
      }
      rows={6}
      placeholder={placeholder}
      className="bg-[#111827] border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500 resize-none"
    />

    <InlineHint>
      One value per line or separated with commas.
    </InlineHint>
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

export default RootCASelfSignModal;
