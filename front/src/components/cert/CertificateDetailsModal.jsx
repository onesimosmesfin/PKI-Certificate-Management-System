import React, { useEffect, useState } from "react";
import {
  X,
  Shield,
 
  HelpCircle,
  
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import api from "../../api/axios";
const API_BASE = `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8081/api"}/certificates`;

export default function CertificateDetailsModal({
  certId,
  cert,
  onClose,
}) {
  const [certificate, setCertificate] = useState(cert || null);
  const [loading, setLoading] = useState(false);
  const [activeSubModal, setActiveSubModal] = useState(null);

  const [verifyResult, setVerifyResult] = useState(null);

  // hierarchy state
  const [isRootExpanded, setIsRootExpanded] = useState(true);
  const [isIntermediateExpanded, setIsIntermediateExpanded] =
    useState(true);

  // =====================================================
  // LOAD CERTIFICATE FROM BACKEND
  // =====================================================
  useEffect(() => {
    if (!certId) return;

    fetchCertificate();
  }, [certId]);

  const fetchCertificate = async () => {
  try {
    setLoading(true);

    const id =
      certId ||
      certificate?.id ||
      cert?.id;

    if (!id) {
      throw new Error("Certificate ID missing");
    }

    const response = await api.get(
      `/certificates/${id}`
    );

    setCertificate(response.data);

  } catch (err) {
    console.error(err);
    alert("Failed to load certificate");
  } finally {
    setLoading(false);
  }
};

  // =====================================================
  // VERIFY CERTIFICATE
  // =====================================================
  const verifyCertificate = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/${certificate.id}/verify`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const result = await response.json();

      setVerifyResult(result);
      setActiveSubModal("verify-result");
    } catch (err) {
      console.error(err);
      alert("Verification failed");
    }
  };

  // =====================================================
  // DOWNLOAD PEM
  // =====================================================
  const downloadPem = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/${certificate.id}/pem`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const pem = await response.text();

      const blob = new Blob([pem], {
        type: "application/x-pem-file",
      });

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");

      a.href = url;
      a.download = `${certificate.alias}.pem`;

      document.body.appendChild(a);

      a.click();

      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Failed to download PEM");
    }
  };

  // =====================================================
  // REVOKE CERTIFICATE
  // =====================================================
  const revokeCertificate = async () => {
  const reason = prompt(
    "Enter revocation reason:\n\nKEY_COMPROMISE\nCA_COMPROMISE\nAFFILIATION_CHANGED\nSUPERSEDED\nCESSATION_OF_OPERATION\nCERTIFICATE_HOLD"
  );

  if (!reason) return;

  try {
    await api.post(
      `/certificates/${certificate.id}/revoke`,
      null,
      {
        params: {
          reason,
        },
      }
    );

    alert("Certificate revoked");

    fetchCertificate();

  } catch (err) {
    console.error(err);

    alert(
      err?.response?.data?.message ||
      "Revocation failed"
    );
  }
};
  if (loading || !certificate) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
        <div className="bg-white p-6 shadow-lg text-sm">
          Loading certificate...
        </div>
      </div>
    );
  }

  const validityPercentage =
    certificate.validityPercentage?.toFixed(1) || 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-[#F0F0F0] border border-[#707070] w-full max-w-[650px] shadow-xl flex flex-col text-[#000000]">

        {/* HEADER */}
        <div className="flex items-center justify-between px-2 py-1 bg-white border-b">
          <div className="flex items-center gap-2">
            <Shield
              className="text-[#DAA520]"
              size={16}
              fill="#DAA520"
            />

            <span className="text-[12px]">
              Certificate Details - {certificate.alias}
            </span>
          </div>

          <button
            onClick={onClose}
            className="hover:bg-red-500 hover:text-white px-2 py-0.5"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-4 space-y-3">

          {/* ===================================================== */}
          {/* HIERARCHY */}
          {/* ===================================================== */}
          <div className="flex flex-col">
            <label className="text-[11px] mb-1">
              Certificate Hierarchy:
            </label>

            <div className="bg-white border border-[#A0A0A0] p-2 h-36 overflow-y-auto shadow-inner">
              <div className="space-y-1 text-[11px]">

                {/* ROOT */}
                <div
                  className="flex items-center gap-2 py-1 px-1 hover:bg-[#E5F1FB] cursor-pointer"
                  onClick={() =>
                    setIsRootExpanded(!isRootExpanded)
                  }
                >
                  <span className="w-3 text-center">
                    {isRootExpanded ? "−" : "+"}
                  </span>

                  <Shield
                    size={12}
                    className="text-[#DAA520]"
                    fill="#DAA520"
                  />

                  <span>
                    {certificate.issuerAlias || "Root CA"}
                  </span>
                </div>

                {/* CHILD */}
                {isRootExpanded && (
                  <div
                    className="flex items-center gap-2 py-1 px-1 ml-6 bg-[#005FB8] text-white"
                    onClick={() =>
                      setIsIntermediateExpanded(
                        !isIntermediateExpanded
                      )
                    }
                  >
                    <Shield size={12} fill="white" />

                    <span>{certificate.alias}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ===================================================== */}
          {/* DETAILS */}
          {/* ===================================================== */}
          <div className="grid grid-cols-[140px_1fr_30px] gap-y-2 items-center text-[11px]">

            <label className="text-right pr-3">
              Subject:
            </label>

            <input
              readOnly
              value={certificate.subject || ""}
              className="bg-[#EBEBEB] border border-[#C8C8C8] px-1 h-6 outline-none"
            />

            <button className="flex justify-center text-[#707070]">
              <HelpCircle size={14} />
            </button>

            <label className="text-right pr-3">
              Issuer:
            </label>

            <input
              readOnly
              value={certificate.issuerAlias || ""}
              className="bg-[#EBEBEB] border border-[#C8C8C8] px-1 h-6 outline-none"
            />

            <button className="flex justify-center text-[#707070]">
              <HelpCircle size={14} />
            </button>

            <label className="text-right pr-3">
              Serial Number:
            </label>

            <input
              readOnly
              value={certificate.serialNumber || ""}
              className="bg-[#EBEBEB] border border-[#C8C8C8] px-1 h-6 outline-none font-mono"
            />

            <div />

            <label className="text-right pr-3">
              Type:
            </label>

            <input
              readOnly
              value={certificate.type || ""}
              className="bg-[#EBEBEB] border border-[#C8C8C8] px-1 h-6 outline-none"
            />

            <div />

            <label className="text-right pr-3">
              Status:
            </label>

            <input
              readOnly
              value={certificate.status || ""}
              className={`border px-1 h-6 outline-none font-semibold ${
                certificate.status === "ACTIVE"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            />

            <div />

            <label className="text-right pr-3">
              Signature Algorithm:
            </label>

            <input
              readOnly
              value={certificate.signatureAlgorithm || ""}
              className="bg-[#EBEBEB] border border-[#C8C8C8] px-1 h-6 outline-none"
            />

            <div />

            <label className="text-right pr-3">
              Created At:
            </label>

            <input
              readOnly
              value={certificate.createdAt || ""}
              className="bg-[#EBEBEB] border border-[#C8C8C8] px-1 h-6 outline-none"
            />

            <div />

            <label className="text-right pr-3">
              Expiry Date:
            </label>

            <input
              readOnly
              value={certificate.expiryDate || ""}
              className="bg-[#EBEBEB] border border-[#C8C8C8] px-1 h-6 outline-none"
            />

            <div />

            {/* VALIDITY */}
            <label className="text-right pr-3">
              Validity Progress:
            </label>

            <div className="relative h-6 bg-[#E1E1E1] border border-[#BCBCBC] flex items-center">
              <div
                className="h-full bg-gradient-to-b from-[#A5D1F7] via-[#2489E1] to-[#A5D1F7]"
                style={{
                  width: `${validityPercentage}%`,
                }}
              />

              <span className="absolute inset-0 flex justify-center items-center text-[10px] font-bold">
                {validityPercentage}%
              </span>
            </div>

            <div />
          </div>

          {/* ===================================================== */}
          {/* ACTION BUTTONS */}
          {/* ===================================================== */}
          <div className="flex justify-center gap-2 pt-3">

            <button
              onClick={downloadPem}
              className="px-4 py-1 bg-[#E1E1E1] border border-[#ADADAD] text-[11px] hover:bg-[#D5D5D5]"
            >
              Download PEM
            </button>

            <button
              onClick={verifyCertificate}
              className="px-4 py-1 bg-[#E1E1E1] border border-[#ADADAD] text-[11px] hover:bg-[#D5D5D5]"
            >
              Verify
            </button>

            <button
              onClick={() =>
                setActiveSubModal("pem")
              }
              className="px-4 py-1 bg-[#E1E1E1] border border-[#ADADAD] text-[11px] hover:bg-[#D5D5D5]"
            >
              View PEM
            </button>

            {certificate.status !== "REVOKED" && (
              <button
                onClick={revokeCertificate}
                className="px-4 py-1 bg-red-100 border border-red-400 text-[11px] hover:bg-red-200"
              >
                Revoke
              </button>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex justify-end p-3 border-t bg-[#F0F0F0]">
          <button
            onClick={onClose}
            className="px-8 py-1 bg-white border border-[#0078D7] text-[11px]"
          >
            OK
          </button>
        </div>

        {/* ===================================================== */}
        {/* PEM MODAL */}
        {/* ===================================================== */}
        {activeSubModal === "pem" && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <div className="bg-white w-[600px] p-4 shadow-xl">
              <div className="flex justify-between mb-2">
                <h3 className="font-semibold text-sm">
                  PEM Certificate
                </h3>

                <button onClick={() => setActiveSubModal(null)}>
                  <X size={16} />
                </button>
              </div>

              <textarea
                readOnly
                value={certificate.certificatePem || ""}
                className="w-full h-[350px] border p-2 text-[11px] font-mono"
              />
            </div>
          </div>
        )}

        {/* ===================================================== */}
        {/* VERIFY RESULT MODAL */}
        {/* ===================================================== */}
        {activeSubModal === "verify-result" && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <div className="bg-white w-[350px] p-5 shadow-xl">
              <div className="flex justify-between mb-4">
                <h3 className="font-semibold text-sm">
                  Verification Result
                </h3>

                <button onClick={() => setActiveSubModal(null)}>
                  <X size={16} />
                </button>
              </div>

              <div className="flex items-center gap-3">
                {verifyResult ? (
                  <>
                    <CheckCircle
                      className="text-green-600"
                      size={32}
                    />

                    <div>
                      <p className="font-semibold text-green-700">
                        Certificate is valid
                      </p>

                      <p className="text-xs text-gray-600">
                        Status: ACTIVE
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertTriangle
                      className="text-red-600"
                      size={32}
                    />

                    <div>
                      <p className="font-semibold text-red-700">
                        Certificate invalid
                      </p>

                      <p className="text-xs text-gray-600">
                        Certificate revoked or expired
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end mt-5">
                <button
                  onClick={() => setActiveSubModal(null)}
                  className="px-5 py-1 border"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
