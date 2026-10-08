import { useState } from "react";
import {
  Key,
  Lock as LockIcon,
  Search,
  ChevronDown,
  Filter,
  
  RotateCw,
  Trash2,

  Upload,
  Save,
} from "lucide-react";
import api from "../../api/axios";
import { toast } from "react-hot-toast";

export default function KeyTable({ data, loading, onRefresh }) {
  const [selectedKey, setSelectedKey] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Key Info");

  const filteredData = data.filter((k) =>
    k.alias?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (alias) => {
    const pin = prompt("Enter HSM PIN to delete key:");
    if (!pin) return;
    try {
      await api.delete(`/keys/manage/${alias}?pin=${pin}`);
      toast.success("Key deleted successfully");
      setSelectedKey(null);
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data || "Deletion failed");
    }
  };

  const handleRotate = async (alias) => {
    const pin = prompt("Enter HSM PIN to rotate key:");
    if (!pin) return;
    try {
      await api.post(`/keys/manage/rotate/${alias}?pin=${pin}`);
      toast.success("Key rotated successfully");
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data || "Rotate failed");
    }
  };

  const handleExport = async (alias) => {
    try {
      const res = await api.get(`/keys/manage/export/public/${alias}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${alias}_public.pem`;
      a.click();
      toast.success("Exported successfully");
    } catch (err) {
      toast.error("Export failed");
    }
  };

  if (loading) return (
    <div className="p-20 flex flex-col items-center justify-center space-y-4">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-xs text-slate-500 uppercase tracking-widest">Loading Secure Database...</p>
    </div>
  );

  return (
    <div className="space-y-6 text-slate-300">
      {/* SEARCH & FILTERS BAR */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
          <input
            className="w-full pl-9 pr-4 py-1.5 bg-[#161B22] border border-[#30363D] rounded text-sm focus:border-blue-500 outline-none placeholder:text-slate-600"
            placeholder="Search Keys (Name, Algorithm, etc...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 bg-[#161B22] border border-[#30363D] rounded text-xs text-slate-400 hover:bg-slate-800 transition-colors">
          Filter by Type: [All] <ChevronDown size={12} />
        </button>
        <button className="flex items-center gap-2 px-3 py-1.5 bg-[#161B22] border border-[#30363D] rounded text-xs text-slate-400 hover:bg-slate-800 transition-colors">
          Filter by Status: [Valid/Active] <ChevronDown size={12} />
        </button>
        <button className="flex items-center gap-2 px-3 py-1.5 bg-[#161B22] border border-[#30363D] rounded text-xs text-slate-400 hover:bg-slate-800 transition-colors">
          <Filter size={12} /> Advanced Filters
        </button>
      </div>

      {/* TABLE AREA */}
      <div className="rounded border border-[#30363D] bg-[#0D1117] overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#161B22] text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
              <th className="px-4 py-2 border-r border-[#30363D] w-12">Type</th>
              <th className="px-4 py-2 border-r border-[#30363D]">Name</th>
              <th className="px-4 py-2 border-r border-[#30363D]">Algorithm</th>
              <th className="px-4 py-2 border-r border-[#30363D]">Size/Curve</th>
              <th className="px-4 py-2 border-r border-[#30363D]">Created</th>
              <th className="px-4 py-2 border-r border-[#30363D]">Valid Until</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="text-[12px] font-medium">
            {filteredData.map((k) => (
              <tr
                key={k.id}
                onClick={() => setSelectedKey(k)}
                className={`group cursor-pointer transition-colors ${
                  selectedKey?.id === k.id ? "bg-[#1C2128] text-blue-400" : "hover:bg-[#161B22]"
                }`}
              >
                <td className="px-4 py-2 border-r border-[#30363D] text-center">
                   <div className="flex justify-center gap-1">
                    <Key size={14} className={k.isHsmKey ? "text-slate-400" : "text-blue-500"} />
                    {k.isHsmKey && <LockIcon size={12} className="text-slate-500" />}
                   </div>
                </td>
                <td className="px-4 py-2 border-r border-[#30363D]">{k.alias}</td>
                <td className="px-4 py-2 border-r border-[#30363D] font-mono text-[11px] text-slate-400">{k.algorithm || 'RSA 4096'}</td>
                <td className="px-4 py-2 border-r border-[#30363D] font-mono text-[11px] text-slate-400">{k.keySize || k.curveName || '4096'}</td>
                <td className="px-4 py-2 border-r border-[#30363D] text-slate-500">{new Date(k.createdAt).toISOString().replace('T', ' ').slice(0, 16)}</td>
                <td className="px-4 py-2 border-r border-[#30363D] text-slate-500">2034-06-12 10:30</td>
                <td className="px-4 py-2">
                  <span className={k.status === 'Valid' ? "text-emerald-500" : "text-blue-400"}>
                    {k.status || 'Valid'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* KEY DETAILS PANEL */}
      {selectedKey && (
        <div className="space-y-0 animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">Key Details</h2>
            
            {/* ACTIONS TOOLBAR */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-bold uppercase mr-2">Actions:</span>
              <button onClick={() => handleExport(selectedKey.alias)} className="flex items-center gap-1.5 px-3 py-1 bg-[#21262D] border border-[#30363D] rounded text-[11px] hover:bg-[#30363D] transition-colors">
                <Save size={14} className="text-slate-400" /> Export Key
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1 bg-[#21262D] border border-[#30363D] rounded text-[11px] hover:bg-[#30363D] transition-colors">
                <Upload size={14} className="text-slate-400" /> Import Key
              </button>
              <button onClick={() => handleDelete(selectedKey.alias)} className="flex items-center gap-1.5 px-3 py-1 bg-[#21262D] border border-[#30363D] rounded text-[11px] hover:bg-red-900/20 text-slate-300 transition-colors">
                <Trash2 size={14} className="text-slate-400" /> Delete Key
              </button>
              <button onClick={() => handleRotate(selectedKey.alias)} className="flex items-center gap-1.5 px-3 py-1 bg-[#21262D] border border-[#30363D] rounded text-[11px] hover:bg-[#30363D] transition-colors">
                <RotateCw size={14} className="text-slate-400" /> Rotate Key
              </button>
            </div>
          </div>

          {/* TABS HEADER */}
          <div className="flex items-center gap-6 border-b border-[#30363D] px-2 mb-4">
            {["Key Info", "Usage", "Raw", "Linked Certificates"].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2 text-[12px] font-semibold transition-all relative ${
                  activeTab === tab ? "text-blue-400" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {tab}
                {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-blue-500" />}
              </button>
            ))}
          </div>

          {/* TAB CONTENT (KEY INFO) */}
          <div className="bg-[#0D1117] border border-[#30363D] rounded p-5 shadow-inner">
            <div className="grid grid-cols-[120px_1fr] gap-y-2 text-[13px]">
              <span className="text-slate-500 font-bold">Name:</span>
              <span className="text-slate-200">{selectedKey.alias}</span>
              
              <span className="text-slate-500 font-bold">Description:</span>
              <span className="text-slate-200">PKI Generated Key</span>
              
              <span className="text-slate-500 font-bold">Type:</span>
              <span className="text-slate-200">{selectedKey.algorithm?.split(' ')[0] || 'RSA'}</span>
              
              <span className="text-slate-500 font-bold">Size:</span>
              <span className="text-slate-200">{selectedKey.keySize || '4096'} bits</span>
              
              <span className="text-slate-500 font-bold">Created:</span>
              <span className="text-slate-200">{new Date(selectedKey.createdAt).toISOString().replace('T', ' ').slice(0, 16)}</span>

              <span className="text-slate-500 font-bold">Usage:</span>
              <span className="text-slate-200">Cert Signing, CRL Signing</span>
            </div>

            {/* PUBLIC KEY BLOCK */}
            <div className="mt-6">
              <label className="text-[12px] font-bold text-slate-400 block mb-2">Public Key:</label>
              <div className="relative group">
                <textarea
                  readOnly
                  className="w-full bg-[#010409] border border-[#30363D] rounded p-3 font-mono text-[11px] text-blue-400/80 h-24 outline-none resize-none"
                  value={`-----BEGIN PUBLIC KEY-----\n${selectedKey.publicKey || 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...'}\n-----END PUBLIC KEY-----`}
                />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-[12px]">
              <span className="text-slate-500 font-bold">Private Key Status:</span>
              <span className="text-slate-300 flex items-center gap-1">
                <LockIcon size={12} className="text-slate-500" /> Encrypted, Password Protected
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}