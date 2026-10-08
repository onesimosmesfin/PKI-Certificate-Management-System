import  { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  ShieldCheck,
  Cpu,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Plus,
  Info,
  Fingerprint,
  Key,
  MousePointer2,
  Hash
} from 'lucide-react';

import api from '../../api/axios';
import { toast } from 'react-hot-toast';

const GenerateCSRModal = ({ onClose, onRefresh }) => {

  const [loading, setLoading] = useState(false);

  // =========================================================
  // LOADED KEYS
  // =========================================================

  const [availableKeys, setAvailableKeys] = useState([]);
  const [loadingKeys, setLoadingKeys] = useState(false);

  // =========================================================
  // CSR METADATA
  // =========================================================

  const [csrAlias, setCsrAlias] = useState('');
  const [selectedKeyAlias, setSelectedKeyAlias] = useState('');
  const [pin, setPin] = useState('');

  // =========================================================
  // SUBJECT DN
  // =========================================================

  const [commonName, setCommonName] = useState('');
  const [organization, setOrganization] = useState('');
  const [organizationalUnit, setOrganizationalUnit] = useState('');
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [locality, setLocality] = useState('');
  const [email, setEmail] = useState('');

  // =========================================================
  // SIGNING
  // =========================================================

  const [signatureAlgorithm, setSignatureAlgorithm] =
    useState('SHA256withRSA');

  const [generatedCsr, setGeneratedCsr] = useState(null);

  // =========================================================
  // VALIDITY
  // =========================================================

  const [notBefore, setNotBefore] = useState('');
  const [notAfter, setNotAfter] = useState('');

  // =========================================================
  // EXTENSIONS
  // =========================================================

  const [ca, setCa] = useState(false);
  const [pathLength, setPathLength] = useState(0);

  const [selectedKeyUsages, setSelectedKeyUsages] = useState([
    'Digital Signature',
    'Key Encipherment'
  ]);

  const [selectedEkus, setSelectedEkus] = useState([
    'Server Authentication'
  ]);

  const [dnsNames, setDnsNames] = useState(['']);
  const [ipAddresses, setIpAddresses] = useState(['']);

  const [ocspUrl, setOcspUrl] = useState('');
  const [caIssuersUrl, setCaIssuersUrl] = useState('');

  const [crlUrls, setCrlUrls] = useState(['']);

  const [subjectKeyIdentifier, setSubjectKeyIdentifier] =
    useState(true);

  const [authorityKeyIdentifier, setAuthorityKeyIdentifier] =
    useState(true);

  // =========================================================
  // FETCH USER KEYS
  // =========================================================

  useEffect(() => {

    fetchKeys();

  }, []);

  const fetchKeys = async () => {

    try {

      setLoadingKeys(true);

      const res = await api.get('/hsm/my-keys');

      console.log('MY KEYS =>', res.data);

      setAvailableKeys(res.data || []);

      // If user has keys, default to the first one for convenience
      if ((res.data || []).length > 0 && !selectedKeyAlias) {
        setSelectedKeyAlias(res.data[0].alias);
      }

    } catch (err) {

      console.error(err);

      toast.error('Failed to load user keys');

    } finally {

      setLoadingKeys(false);
    }
  };

  // =========================================================
  // HELPERS
  // =========================================================

  const toggleKeyUsage = (usage) => {

    setSelectedKeyUsages(prev =>
      prev.includes(usage)
        ? prev.filter(v => v !== usage)
        : [...prev, usage]
    );
  };

  const toggleEku = (eku) => {

    setSelectedEkus(prev =>
      prev.includes(eku)
        ? prev.filter(v => v !== eku)
        : [...prev, eku]
    );
  };

  const updateDnsName = (index, value) => {

    const updated = [...dnsNames];
    updated[index] = value;

    setDnsNames(updated);
  };

  const updateIpAddress = (index, value) => {

    const updated = [...ipAddresses];
    updated[index] = value;

    setIpAddresses(updated);
  };

  const updateCrlUrl = (index, value) => {

    const updated = [...crlUrls];
    updated[index] = value;

    setCrlUrls(updated);
  };

  // =========================================================
  // GENERATE CSR
  // =========================================================

  const handleGenerateCSR = async () => {

    try {

      if (!selectedKeyAlias) {
        toast.error('Please select a signing key');
        return;
      }

      if (!csrAlias) {
        toast.error('CSR Alias is required');
        return;
      }

      if (!commonName) {
        toast.error('Common Name is required');
        return;
      }

      if (!pin) {
        toast.error('PIN is required');
        return;
      }

      setLoading(true);

      const payload = {
        alias: selectedKeyAlias,
        csrAlias,
        pin,
        commonName,
        organization,
        organizationalUnit,
        country,
        state,
        locality,
        email,
        serialNumber: '',
        domainComponent: '',
        signatureAlgorithm,
        keyUsages: selectedKeyUsages
          .map(u => u.toLowerCase().replace(/ /g, ''))
          .filter(Boolean),
        extendedKeyUsages: selectedEkus
          .map(u => u.toLowerCase().replace(/ /g, ''))
          .filter(Boolean),
        dnsNames: dnsNames.filter(v => v.trim() !== ''),
        ipAddresses: ipAddresses.filter(v => v.trim() !== ''),
        ca,
        pathLength: Number(pathLength),
        ocspUrl: ocspUrl || null,
        caIssuersUrl: caIssuersUrl || null,
        crlUrls: crlUrls.filter(v => v.trim() !== ''),
        subjectKeyIdentifier,
        authorityKeyIdentifier
      };

      console.log('CSR PAYLOAD =>', JSON.stringify(payload, null, 2));

      const res = await api.post('/csr/generate', payload);

      console.log(res.data);

      // Try to extract CSR PEM from common response fields
      const csrPem = res.data?.csrPem || res.data?.pem || res.data?.csr || (typeof res.data === 'string' ? res.data : null);

      if (csrPem) {
        setGeneratedCsr(csrPem);
      }

      toast.success('CSR Generated Successfully');

      // Notify parent and other listeners so lists refresh
      try {
        onRefresh && onRefresh();
      } catch (e) {
        // ignore
      }

      window.dispatchEvent(new Event('csr-generated'));

    } catch (err) {

      console.error(err);

      toast.error(
        err.response?.data?.message ||
        'CSR Generation Failed'
      );

    } finally {

      setLoading(false);
    }
  };

  // =========================================================
  // X500 PREVIEW
  // =========================================================

  const x500Preview = `
CN=${commonName || ''}
, O=${organization || ''}
, OU=${organizationalUnit || ''}
, C=${country || ''}
, ST=${state || ''}
, L=${locality || ''}
, EMAILADDRESS=${email || ''}
`.replace(/\n/g, '').trim();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#eef1f5] w-full max-w-[1150px] h-[92vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
      >

        {/* HEADER */}

        <div className="px-6 py-4 bg-white border-b border-slate-200 flex justify-between items-center shrink-0">

          <div className="flex items-center gap-3">

            <div className="text-slate-700">
              <Plus size={22} className="stroke-[3px]" />
            </div>

            <div>

              <div className="flex items-center gap-2">

                <h2 className="text-lg font-bold text-slate-800">
                  Generate Certificate Signing Request
                </h2>

                <span className="px-1.5 py-0.5 bg-[#dcfce7] text-[#15803d] text-[9px] font-bold rounded border border-[#bbf7d0]">
                  FIPS 140-3
                </span>

              </div>

              <p className="text-[12px] text-slate-500 font-medium">
                Compose a PKCS#10 request bound to an HSM-protected key.
                Private key material never leaves the secure boundary.
              </p>

            </div>

          </div>

          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded text-slate-400 transition-colors"
          >
            <X size={20} />
          </button>

        </div>

        {/* BODY */}

        <div className="flex-1 overflow-hidden flex">

          {/* LEFT */}

          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-custom">

            {/* CSR METADATA */}

            <Section
              icon={<Info size={14} />}
              title="CSR Metadata"
            >

              <div className="grid grid-cols-2 gap-x-6 gap-y-4">

                <FormGroup
                  label="CSR Alias"
                  required
                  value={csrAlias}
                  onChange={setCsrAlias}
                  placeholder="api-prod-2026"
                />

                <FormGroup
                  label="PIN"
                  required
                  type="password"
                  value={pin}
                  onChange={setPin}
                  placeholder="Enter HSM PIN"
                />

                <FormGroup
                  label="Profile Template"
                  type="select"
                  value="TLS Server"
                  onChange={() => {}}
                  options={['TLS Server']}
                />

                <FormGroup
                  label="CA Profile"
                  type="select"
                  value="Internal Issuing CA 2026"
                  onChange={() => {}}
                  options={['Internal Issuing CA 2026']}
                />

              </div>

            </Section>

            {/* KEY SELECTION */}

            <Section
              icon={<Key size={14} />}
              title="Existing Key Selection"
            >

              <div className="space-y-4">

                <FormGroup
                  label="Signing Key Alias"
                  required
                  type="select"
                  value={selectedKeyAlias}
                  onChange={setSelectedKeyAlias}
                  options={[
                    'Select an existing key...',
                    ...availableKeys.map(
                      key => key.alias
                    )
                  ]}
                />

                {loadingKeys && (
                  <p className="text-xs text-slate-400 font-medium">
                    Loading user keys...
                  </p>
                )}

              </div>

            </Section>

            {/* SUBJECT DN */}

            <Section
              icon={<Fingerprint size={14} />}
              title="Subject Distinguished Name"
            >

              <div className="grid grid-cols-3 gap-4">

                <FormGroup
                  label="Common Name (CN)"
                  required
                  value={commonName}
                  onChange={setCommonName}
                  placeholder="api.company.com"
                />

                <FormGroup
                  label="Organization (O)"
                  value={organization}
                  onChange={setOrganization}
                  placeholder="Company Ltd"
                />

                <FormGroup
                  label="Org. Unit (OU)"
                  value={organizationalUnit}
                  onChange={setOrganizationalUnit}
                  placeholder="Security"
                />

                <FormGroup
                  label="Country (C)"
                  value={country}
                  onChange={setCountry}
                  placeholder="ET"
                />

                <FormGroup
                  label="State (ST)"
                  value={state}
                  onChange={setState}
                  placeholder="Addis Ababa"
                />

                <FormGroup
                  label="Locality (L)"
                  value={locality}
                  onChange={setLocality}
                  placeholder="Addis Ababa"
                />

                <FormGroup
                  label="Email"
                  value={email}
                  onChange={setEmail}
                  placeholder="security@company.com"
                />

              </div>

              <div className="mt-4">

                <FormGroup
                  label="X.500 Preview"
                  value={x500Preview}
                  onChange={() => {}}
                  disabled
                />

              </div>

            </Section>

            {/* EXTENSIONS */}

            <Section
              icon={<ShieldCheck size={14} />}
              title="X.509 V3 Extensions"
            >

              {/* BASIC CONSTRAINTS */}

              <Accordion label="Basic Constraints" isOpen>

                <div className="flex items-center gap-8">

                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">

                    <input
                      type="checkbox"
                      checked={ca}
                      onChange={(e) => setCa(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300"
                    />

                    CA: TRUE

                  </label>

                  <div className="flex flex-col gap-1">

                    <span className="text-[9px] font-bold text-slate-400 uppercase">
                      Path Length
                    </span>

                    <input
                      type="number"
                      value={pathLength}
                      onChange={(e) => setPathLength(e.target.value)}
                      className="w-20 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm font-bold"
                    />

                  </div>

                </div>

              </Accordion>

              {/* VALIDITY */}

              <Accordion label="Validity Period (Time Length)" isOpen>

                <div className="grid grid-cols-2 gap-4">

                  <FormGroup
                    label="Not Before"
                    type="datetime-local"
                    value={notBefore}
                    onChange={setNotBefore}
                  />

                  <FormGroup
                    label="Not After"
                    type="datetime-local"
                    value={notAfter}
                    onChange={setNotAfter}
                  />

                </div>

              </Accordion>

              {/* KEY USAGE */}

              <Accordion label="Key Usage" isOpen>

                <div className="grid grid-cols-3 gap-y-3">

                  {[
                    'Digital Signature',
                    'Non Repudiation',
                    'Key Encipherment',
                    'Data Encipherment',
                    'Key Agreement',
                    'Key Cert Sign',
                    'CRL Sign',
                    'Encipher Only',
                    'Decipher Only'
                  ].map(use => (

                    <label
                      key={use}
                      className="flex items-center gap-2 text-sm text-slate-600 font-medium cursor-pointer"
                    >

                      <input
                        type="checkbox"
                        checked={selectedKeyUsages.includes(use)}
                        onChange={() => toggleKeyUsage(use)}
                        className="w-4 h-4"
                      />

                      {use}

                    </label>
                  ))}

                </div>

              </Accordion>

              {/* EKU */}

              <Accordion label="Extended Key Usage (EKU)" isOpen>

                <div className="grid grid-cols-3 gap-y-3">

                  {[
                    'Server Authentication',
                    'Client Authentication',
                    'Code Signing',
                    'Email Protection',
                    'OCSP Signing',
                    'Time Stamping'
                  ].map(eku => (

                    <label
                      key={eku}
                      className="flex items-center gap-2 text-sm text-slate-600 font-medium cursor-pointer"
                    >

                      <input
                        type="checkbox"
                        checked={selectedEkus.includes(eku)}
                        onChange={() => toggleEku(eku)}
                        className="w-4 h-4"
                      />

                      {eku}

                    </label>
                  ))}

                </div>

              </Accordion>

              {/* SAN */}

              <Accordion label="Subject Alternative Names" isOpen>

                <div className="space-y-5">

                  {/* DNS */}

                  <div className="space-y-3">

                    <h4 className="text-[10px] font-bold uppercase text-slate-400">
                      DNS Names
                    </h4>

                    {dnsNames.map((dns, index) => (

                      <input
                        key={index}
                        value={dns}
                        onChange={(e) =>
                          updateDnsName(index, e.target.value)
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium"
                        placeholder="*.company.com"
                      />

                    ))}

                    <button
                      type="button"
                      onClick={() =>
                        setDnsNames([...dnsNames, ''])
                      }
                      className="flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Plus size={14} />
                      Add DNS
                    </button>

                  </div>

                  {/* IP */}

                  <div className="space-y-3">

                    <h4 className="text-[10px] font-bold uppercase text-slate-400">
                      IP Addresses
                    </h4>

                    {ipAddresses.map((ip, index) => (

                      <input
                        key={index}
                        value={ip}
                        onChange={(e) =>
                          updateIpAddress(index, e.target.value)
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium"
                        placeholder="192.168.1.10"
                      />

                    ))}

                    <button
                      type="button"
                      onClick={() =>
                        setIpAddresses([...ipAddresses, ''])
                      }
                      className="flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Plus size={14} />
                      Add IP
                    </button>

                  </div>

                </div>

              </Accordion>

              {/* AIA */}

              <Accordion label="Authority Information Access" isOpen>

                <div className="grid grid-cols-2 gap-4">

                  <FormGroup
                    label="OCSP URL"
                    value={ocspUrl}
                    onChange={setOcspUrl}
                    placeholder="http://ocsp.company.com"
                  />

                  <FormGroup
                    label="CA Issuers URL"
                    value={caIssuersUrl}
                    onChange={setCaIssuersUrl}
                    placeholder="http://pki.company.com/ca.crt"
                  />

                </div>

              </Accordion>

              {/* CRL */}

              <Accordion label="CRL Distribution Points" isOpen>

                <div className="space-y-3">

                  {crlUrls.map((url, index) => (

                    <input
                      key={index}
                      value={url}
                      onChange={(e) =>
                        updateCrlUrl(index, e.target.value)
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium"
                      placeholder="http://pki.company.com/crl/root.crl"
                    />

                  ))}

                  <button
                    type="button"
                    onClick={() =>
                      setCrlUrls([...crlUrls, ''])
                    }
                    className="flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Plus size={14} />
                    Add CRL URL
                  </button>

                </div>

              </Accordion>

              {/* KEY IDENTIFIERS */}

              <Accordion label="Key Identifiers" isOpen>

                <div className="flex gap-8">

                  <label className="flex items-center gap-2 text-sm text-slate-600 font-bold cursor-pointer">

                    <input
                      type="checkbox"
                      checked={subjectKeyIdentifier}
                      onChange={(e) =>
                        setSubjectKeyIdentifier(e.target.checked)
                      }
                      className="w-4 h-4"
                    />

                    Subject Key Identifier

                  </label>

                  <label className="flex items-center gap-2 text-sm text-slate-600 font-bold cursor-pointer">

                    <input
                      type="checkbox"
                      checked={authorityKeyIdentifier}
                      onChange={(e) =>
                        setAuthorityKeyIdentifier(e.target.checked)
                      }
                      className="w-4 h-4"
                    />

                    Authority Key Identifier

                  </label>

                </div>

              </Accordion>

            </Section>

            {/* SIGNING */}

            <Section
              icon={<Hash size={14} />}
              title="Signing Options"
            >

              <FormGroup
                label="Signature Algorithm"
                type="select"
                value={signatureAlgorithm}
                onChange={setSignatureAlgorithm}
                options={[
                  'SHA256withRSA',
                  'SHA384withRSA',
                  'SHA512withRSA',
                  'SHA256withECDSA'
                ]}
              />

            </Section>

          </div>

          {/* RIGHT SIDEBAR */}

          <div className="w-[340px] bg-[#e2e8f0]/40 border-l border-slate-200 p-6 flex flex-col gap-6 shrink-0">

            <div>

              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">
                Security Posture
              </h3>

              <div className="space-y-3">

                <StatusCard
                  icon={<Cpu size={16} />}
                  label="HSM Protected"
                  desc="Hardware module"
                  status="success"
                />

                <StatusCard
                  icon={<ShieldCheck size={16} />}
                  label="FIPS 140-3 Level 3"
                  desc="Validated"
                  status="success"
                />

                <StatusCard
                  icon={<CheckCircle2 size={16} />}
                  label="Algorithm Compatibility"
                  desc="Compliant"
                  status="success"
                />

                <StatusCard
                  icon={<AlertCircle size={16} />}
                  label="Subject CN Check"
                  desc="Validated"
                  status="success"
                />

              </div>

            </div>

            <div className="space-y-3">

              <div className="flex justify-between items-center">

                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Entropy Source
                </h3>

                <MousePointer2
                  size={14}
                  className="text-slate-400"
                />

              </div>

              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full w-[98%] bg-gradient-to-r from-slate-700 via-emerald-500 to-emerald-400" />
              </div>

            </div>

            <div className="mt-auto p-4 bg-white border border-slate-200 rounded-xl">

              <p className="text-[11px] text-slate-500 italic leading-relaxed">
                The CSR will be generated using the selected hardware
                security module. Your private key never leaves the
                secure boundary.
              </p>

            </div>

          </div>

        </div>

        {/* FOOTER */}

        <div className="px-6 py-4 bg-white border-t border-slate-200 flex justify-end gap-3 shrink-0">

          <button
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2 transition-colors"
          >
            <X size={16} strokeWidth={3} />
            Cancel
          </button>

          <button
            onClick={handleGenerateCSR}
            disabled={loading}
            className="px-5 py-2 text-sm font-bold bg-[#0f172a] text-white hover:bg-slate-800 rounded-lg flex items-center gap-2 shadow-lg transition-colors disabled:opacity-50"
          >

            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                Generate CSR
              </>
            )}

          </button>

        </div>

        {/* GENERATED CSR RESULT */}
        {generatedCsr && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-2xl bg-white rounded-xl p-6 border border-slate-200 shadow-lg">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-slate-800">Generated CSR</h3>
                <button onClick={() => setGeneratedCsr(null)} className="text-slate-500">Close</button>
              </div>

              <textarea
                readOnly
                value={generatedCsr}
                className="w-full h-64 p-3 border border-slate-200 rounded text-sm font-mono bg-[#0f172a] text-emerald-200"
              />

              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(generatedCsr);
                    toast.success('CSR copied to clipboard');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                  Copy
                </button>

                <button
                  onClick={() => {
                    setGeneratedCsr(null);
                    onClose && onClose();
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-800 rounded border"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              .scrollbar-custom::-webkit-scrollbar {
                width: 6px;
              }

              .scrollbar-custom::-webkit-scrollbar-track {
                background: transparent;
              }

              .scrollbar-custom::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 10px;
              }

              .scrollbar-custom::-webkit-scrollbar-thumb:hover {
                background: #94a3b8;
              }
            `
          }}
        />

      </motion.div>

    </div>
  );
};

// =========================================================
// REUSABLE COMPONENTS
// =========================================================

const Section = ({ icon, title, children }) => (
  <div className="bg-white rounded-xl p-5 border border-white shadow-sm space-y-5">

    <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
      {icon}
      {title}
    </div>

    {children}

  </div>
);

const FormGroup = ({
  label,
  required,
  value,
  onChange,
  placeholder,
  type = 'input',
  options = [],
  disabled = false
}) => (

  <div className="flex flex-col gap-1.5">

    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-0.5">

      {label}

      {required && (
        <span className="text-red-500 text-[14px]">*</span>
      )}

    </label>

    <div className="relative">

      {type === 'select' ? (
        <>
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm appearance-none outline-none focus:border-slate-400 font-bold text-slate-700"
          >

            {options.map(opt => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}

          </select>

          <ChevronDown
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={14}
          />
        </>
      ) : (
        <input
          type={type}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full ${
            disabled
              ? 'bg-slate-50 text-slate-400'
              : 'bg-white text-slate-700'
          } border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-400 font-bold placeholder:text-slate-300`}
          placeholder={placeholder}
        />
      )}

    </div>

  </div>
);

const Accordion = ({
  label,
  children,
  isOpen = false
}) => {

  const [open, setOpen] = useState(isOpen);

  return (
    <div className="border border-slate-100 rounded-lg overflow-hidden mb-3">

      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 bg-slate-50/50 hover:bg-slate-50 text-[11px] font-black text-slate-600 uppercase tracking-tight"
      >

        {label}

        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />

      </button>

      {open && (
        <div className="p-4 border-t border-slate-100 bg-white">
          {children}
        </div>
      )}

    </div>
  );
};

const StatusCard = ({
  icon,
  label,
  desc,
  status
}) => (

  <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-3 shadow-sm">

    <div
      className={`p-2 rounded-lg ${
        status === 'success'
          ? 'bg-emerald-50 text-emerald-500'
          : 'bg-amber-50 text-amber-500'
      }`}
    >
      {icon}
    </div>

    <div className="flex-1">

      <p className="text-[12px] font-bold text-slate-800 leading-none mb-1">
        {label}
      </p>

      <p className="text-[10px] text-slate-400 font-bold uppercase">
        {desc}
      </p>

    </div>

    <CheckCircle2
      size={14}
      className="text-emerald-500"
    />

  </div>
);

export default GenerateCSRModal;
