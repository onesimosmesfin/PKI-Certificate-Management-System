import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import {
  Plus,
  LayoutDashboard,
  Key,
  FileText,
  ShieldCheck,
  FileCode,
  Ban,
  Settings,
  Lock as LockIcon,
} from "lucide-react";

import KeyTable from "../../components/keys/KeyTable";
import GenerateKeyModal from "../../components/keys/GenerateKeyModal";
import CSRManagement from "../../components/csr/CSRManagement";
import CSRSigningDashboard from "../../pages/dashboard/CSRSigningDashboard";
import CertificatesTab from "./CertificatesTab";
import CRLDashboard from "./CRLDashboard";
import SettingsPage from "./SettingsPage";

import { getMyKeys } from "../../services/keys";
import { toast } from "react-hot-toast";

import { useAuthStore } from "../../store/authStore";

export default function KeyManagement() {
  const user = useAuthStore((s) => s.user);

  const role = user?.role;

  // DEBUG
  console.log("USER =", user);
  console.log("ROLE =", role);

  // UPDATED ROLE CHECKS
  const isAdmin = role === "ADMIN" || role === "ROLE_ADMIN";

  const isRootOperator =
    role === "CA_OPERATOR" ||
    role === "ADMIN" ||
    role === "ROLE_ADMIN" ||
    role === "ROLE_OPERATOR_ROOT" ||
    role === "ROOT" ||
    role === "ROLE_ROOT";

  const isIntermediateOperator =
    role === "INTERMEDIATE_OPERATOR" ||
    role === "INTERMEDIATE" ||
    role === "ROLE_OPERATOR_INTERMEDIATE" ||
    role === "ROLE_INTERMEDIATE";

  const isEndUser =
    role === "ENDUSER" || role === "ROLE_ENDUSER" || role === "USER";

  // DEBUG - Show which role matched
  useEffect(() => {
    console.log("=== ROLE DEBUG ===");
    console.log("Raw role:", role);
    console.log("isRootOperator:", isRootOperator);
    console.log("isIntermediateOperator:", isIntermediateOperator);
    console.log("isEndUser:", isEndUser);
  }, [role, isRootOperator, isIntermediateOperator, isEndUser]);

  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showGenerateModal, setShowGenerateModal] = useState(false);

  const [activeTab, setActiveTab] = useState("Private Keys");

  const fetchKeys = async () => {
    try {
      setLoading(true);

      const res = await getMyKeys();

      setKeys(res);
    } catch (err) {
      console.error(err);

      toast.error("Failed to load keys");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  // =========================
  // ROLE BASED SIDEBAR
  // =========================

  const allNavItems = [
    {
      icon: <Key size={18} />,
      label: "Private Keys",
    },

    // ROOT + INTERMEDIATE ONLY
    ...(isRootOperator || isIntermediateOperator
      ? [
          {
            icon: <ShieldCheck size={18} />,
            label: "Signing",
          },
        ]
      : []),

    // INTERMEDIATE + ENDUSER ONLY (not ROOT)
    ...(isIntermediateOperator || isEndUser
      ? [
          {
            icon: <FileText size={18} />,
            label: "CSRs",
          },
        ]
      : []),

    {
      icon: <FileCode size={18} />,
      label: "Certificates",
    },

    // ROOT + INTERMEDIATE ONLY (not ENDUSER)
    ...(isRootOperator || isIntermediateOperator
      ? [
          {
            icon: <Ban size={18} />,
            label: "CRLs",
          },
        ]
      : []),

    {
      icon: <Settings size={18} />,
      label: "Settings",
    },
  ];

  const navItems = isAdmin
    ? allNavItems.filter((i) => i.label === "Certificates" || i.label === "Settings")
    : allNavItems;

  return (
    <div className="flex h-screen bg-[#0A0D12] text-slate-300 font-sans">
      {/* SIDEBAR */}
      <aside className="w-64 border-r border-slate-800 flex flex-col bg-[#0D1117] z-20">
        <div className="p-6 flex items-center gap-2 border-b border-slate-800">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white">
            S
          </div>

          <span className="font-bold text-white tracking-tight">
            SecurKey PKI
          </span>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <div
              key={item.label}
              onClick={() => setActiveTab(item.label)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer transition-all ${
                activeTab === item.label
                  ? "bg-blue-600/10 text-blue-400 border border-blue-600/20"
                  : "hover:bg-slate-800/50 text-slate-400"
              }`}
            >
              {item.icon}

              <span className="text-sm font-medium">{item.label}</span>
            </div>
          ))}
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-14 border-b border-slate-800 flex items-center justify-between px-8 bg-[#0D1117]/50 z-10">
          <h1 className="text-lg font-semibold text-white">{activeTab}</h1>

          <div className="flex items-center gap-4 text-xs text-slate-500">
            <LockIcon size={14} />
            Database:
            <span className="text-slate-300">PKI_Vault.secdb</span>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          {/* PRIVATE KEYS */}
          {activeTab === "Private Keys" ? (
            <div className="p-6 h-full overflow-y-auto">
              <KeyTable data={keys} loading={loading} onRefresh={fetchKeys} />
            </div>
          ) : /* CSRs */
          activeTab === "CSRs" ? (
            <div className="p-6 h-full overflow-y-auto">
              <CSRManagement />
            </div>
          ) : /* SIGNING */
          activeTab === "Signing" ? (
            <CSRSigningDashboard />
          ) : /* CERTIFICATES */
          activeTab === "Certificates" ? (
            <CertificatesTab />
          ) : /* CRLs */
          activeTab === "CRLs" ? (
            <CRLDashboard />
          ) : /* SETTINGS */
          activeTab === "Settings" ? (
            <SettingsPage />
          ) : (
            /* FALLBACK */
            <div className="flex items-center justify-center h-full text-slate-500">
              <div className="text-center">
                <div className="mb-2 opacity-20 flex justify-center">
                  {navItems.find((i) => i.label === activeTab)?.icon}
                </div>

                <p>{activeTab} Content Coming Soon</p>
              </div>
            </div>
          )}
        </div>

        {/* UPDATED FLOATING BUTTON */}
        {activeTab === "Private Keys" && (
          <button
            onClick={() => setShowGenerateModal(true)}
            className="
              fixed
              bottom-8
              right-8
              bg-blue-600
              hover:bg-blue-500
              text-white
              flex
              items-center
              gap-2
              px-6
              py-3
              rounded-full
              shadow-2xl
              shadow-blue-900/40
              transition-all
              active:scale-95
              z-[9999]
            "
          >
            <Plus size={20} />

            <span className="font-bold">New Key</span>
          </button>
        )}
      </main>

      {/* MODAL */}
      <AnimatePresence>
        {showGenerateModal && (
          <GenerateKeyModal
            onClose={() => setShowGenerateModal(false)}
            onRefresh={fetchKeys}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
