import  { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Plus,
  Eye,
  Download,
  ShieldCheck,
  Trash2,

  CheckCircle2,
  Clock,
  AlertCircle,
  RotateCcw,
  
  Upload,
  X
} from 'lucide-react';

import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

import { deleteCsrById, exportCsrById, getMyCsrs, importCsr } from '../../services/csr';
import GenerateCSRModal from '../../components/csr/GenerateCSRModal';

const CSRTable = ({ onSelect }) => {

  // =========================
  // STATE
  // =========================

  const [loading, setLoading] = useState(false);

  const [showGenerateModal, setShowGenerateModal] = useState(false);

  const [csrList, setCsrList] = useState([]);

  const [selectedItem, setSelectedItem] = useState(null);

  const [search, setSearch] = useState('');

  const [statusFilter, setStatusFilter] = useState('ALL');

  const [showImportModal, setShowImportModal] = useState(false);

  const [importAlias, setImportAlias] = useState('');

  const [importPem, setImportPem] = useState('');

  // =========================
  // FETCH CSR
  // =========================

  const fetchCsrs = async () => {

    try {

      setLoading(true);

      const res = await getMyCsrs();

      setCsrList(res || []);

    } catch (err) {

      console.error(err);

      toast.error('Failed to fetch CSRs');

    } finally {

      setLoading(false);
    }
  };

  // =========================
  // INITIAL LOAD
  // =========================

  useEffect(() => {

    fetchCsrs();

  }, []);

  // =========================
  // AUTO REFRESH
  // =========================

  useEffect(() => {

    const handleCSRGenerated = () => {
      fetchCsrs();
    };

    window.addEventListener('csr-generated', handleCSRGenerated);

    return () => {
      window.removeEventListener('csr-generated', handleCSRGenerated);
    };

  }, []);

  // =========================
  // FILTERED DATA
  // =========================

  const filteredData = useMemo(() => {

    return csrList.filter(item => {

      const matchesSearch =
        item.csrAlias?.toLowerCase().includes(search.toLowerCase()) ||
        item.commonName?.toLowerCase().includes(search.toLowerCase()) ||
        item.organization?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL'
          ? true
          : item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

  }, [csrList, search, statusFilter]);

  // =========================
  // DELETE CSR
  // =========================

  const handleDelete = async (id) => {

    try {

      await deleteCsrById(id);

      toast.success('CSR deleted successfully');

      if (selectedItem?.id === id) {
        setSelectedItem(null);
      }

      fetchCsrs();

    } catch (err) {

      console.error(err);

      toast.error(
        err.response?.data?.message || 'Failed to delete CSR'
      );
    }
  };

  // =========================
  // EXPORT CSR
  // =========================

  const handleExport = async (id, alias) => {

    try {

      const res = await exportCsrById(id);

      const blob = new Blob([res], {
        type: 'application/x-pem-file'
      });

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');

      link.href = url;

      link.download = `${alias}.csr.pem`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);

      toast.success('CSR exported successfully');

    } catch (err) {

      console.error(err);

      toast.error('Failed to export CSR');
    }
  };

  // =========================
  // IMPORT CSR
  // =========================

  const handleImport = async () => {

    try {

      if (!importAlias || !importPem) {
        return toast.error('Alias and PEM are required');
      }

      await importCsr({
        alias: importAlias,
        pem: importPem,
      });

      toast.success('CSR imported successfully');

      setShowImportModal(false);

      setImportAlias('');
      setImportPem('');

      fetchCsrs();

    } catch (err) {

      console.error(err);

      toast.error(
        err.response?.data?.message || 'Failed to import CSR'
      );
    }
  };

  // =========================
  // STATS
  // =========================

  const stats = [
    {
      label: 'TOTAL CSRS',
      value: csrList.length.toString(),
      icon: <ShieldCheck className="text-blue-400" />,
      color: 'border-blue-500/20'
    },
    {
      label: 'PENDING',
      value: csrList.filter(d => d.status === 'PENDING').length.toString(),
      icon: <Clock className="text-amber-400" />,
      color: 'border-amber-500/20'
    },
    {
      label: 'SIGNED',
      value: csrList.filter(d => d.status === 'SIGNED').length.toString(),
      icon: <CheckCircle2 className="text-emerald-400" />,
      color: 'border-emerald-500/20'
    },
    {
      label: 'REJECTED',
      value: csrList.filter(d => d.status === 'REJECTED').length.toString(),
      icon: <AlertCircle className="text-red-400" />,
      color: 'border-red-500/20'
    }
  ];

  return (

    <div className="p-6 space-y-6 text-slate-300 font-sans bg-[#0A0D12] min-h-screen relative">

      {/* HEADER */}

      <div className="flex justify-between items-center">

        <div className="flex items-center gap-2">

          <h1 className="text-lg font-bold text-white">
            Certificate Signing Requests (CSRs)
          </h1>

        </div>

        <div className="flex gap-2">

          {/* REFRESH */}

          <button
            onClick={fetchCsrs}
            className="p-2 bg-[#161b22] border border-slate-800 rounded hover:bg-slate-700 text-slate-400 transition-colors"
          >
            <RotateCcw size={16} />
          </button>

          {/* IMPORT */}

          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 bg-[#161b22] border border-slate-700 hover:border-slate-500 text-slate-300 px-4 py-2 rounded text-xs font-bold transition-all"
          >
            <Upload size={16} />
            Import
          </button>

          {/* NEW CSR */}

          <button
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-xs font-bold transition-all shadow-lg shadow-blue-900/20"
          >
            <Plus size={16} />
            New CSR
          </button>

        </div>
      </div>

      {/* STATS */}

      <div className="grid grid-cols-4 gap-4">

        {stats.map((stat, i) => (

          <div
            key={i}
            className="bg-[#0d1117] border border-slate-800 p-5 rounded flex justify-between items-start relative overflow-hidden"
          >

            <div>

              <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-1">
                {stat.label}
              </p>

              <p className="text-2xl font-bold text-white">
                {stat.value}
              </p>

            </div>

            <div className="p-2 bg-[#161b22] rounded border border-slate-800">
              {stat.icon}
            </div>

          </div>

        ))}

      </div>

      {/* TABLE */}

      <div className="bg-[#0d1117] border border-slate-800 rounded overflow-hidden mb-20">

        {/* TABLE HEADER */}

        <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-[#161b22]/50">

          <div className="flex gap-2 flex-1">

            {/* SEARCH */}

            <div className="relative w-64">

              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                size={14}
              />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#0d1117] border border-slate-700 rounded pl-9 pr-4 py-1.5 text-xs outline-none focus:border-blue-500 transition-all"
                placeholder="Search CSRs..."
              />

            </div>

            {/* FILTER */}

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#0d1117] border border-slate-700 rounded text-[11px] text-slate-300 outline-none"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="SIGNED">Signed</option>
              <option value="REJECTED">Rejected</option>
            </select>

          </div>

        </div>

        {/* TABLE */}

        <table className="w-full text-left border-collapse">

          <thead>

            <tr className="bg-[#161b22] text-slate-400 text-[10px] font-bold uppercase tracking-wider">

              <th className="px-4 py-3 border-r border-slate-800 w-12 text-center">
                #
              </th>

              <th className="px-4 py-3 border-r border-slate-800">
                CSR Alias
              </th>

              <th className="px-4 py-3 border-r border-slate-800">
                Common Name
              </th>

              <th className="px-4 py-3 border-r border-slate-800">
                Organization
              </th>

              <th className="px-4 py-3 border-r border-slate-800">
                Created By
              </th>

              <th className="px-4 py-3 border-r border-slate-800">
                Created At
              </th>

              <th className="px-4 py-3">
                Status
              </th>

            </tr>

          </thead>

          <tbody className="text-[12px]">

            {filteredData.map((item, i) => (

              <tr
                key={item.id}
                onClick={() => setSelectedItem(item)}
                onDoubleClick={() => onSelect && onSelect(item)}
                className={`border-t border-slate-800 transition-colors cursor-pointer ${
                  selectedItem?.id === item.id
                    ? 'bg-blue-600/20'
                    : 'hover:bg-blue-600/5'
                }`}
              >

                <td className="px-4 py-3 border-r border-slate-800 text-center text-slate-500 font-mono">
                  {i + 1}
                </td>

                <td className="px-4 py-3 border-r border-slate-800 font-bold text-blue-400">
                  {item.csrAlias}
                </td>

                <td className="px-4 py-3 border-r border-slate-800 text-slate-300">
                  {item.commonName || '-'}
                </td>

                <td className="px-4 py-3 border-r border-slate-800 text-slate-300">
                  {item.organization || '-'}
                </td>

                <td className="px-4 py-3 border-r border-slate-800 text-slate-300">
                  {item.createdBy}
                </td>

                <td className="px-4 py-3 border-r border-slate-800 text-slate-400">
                  {item.createdAt
                    ? new Date(item.createdAt).toLocaleString()
                    : '-'}
                </td>

                <td className="px-4 py-3">

                  <div className="flex items-center gap-2">

                    {item.status === 'SIGNED' ? (
                      <CheckCircle2
                        size={14}
                        className="text-emerald-500"
                      />
                    ) : (
                      <Clock
                        size={14}
                        className="text-amber-500"
                      />
                    )}

                    <span
                      className={
                        item.status === 'SIGNED'
                          ? 'text-emerald-500'
                          : 'text-amber-500'
                      }
                    >
                      {item.status}
                    </span>

                  </div>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

        {/* EMPTY */}

        {!loading && filteredData.length === 0 && (

          <div className="p-10 text-center text-slate-500 text-sm">
            No CSR records found
          </div>

        )}

      </div>

      {/* ACTION BAR */}

      <AnimatePresence>

        {selectedItem && (

          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#161b22] border border-blue-500/30 shadow-2xl shadow-black rounded-full px-6 py-3 flex items-center gap-6 z-50 min-w-[550px]"
          >

            <div className="flex items-center gap-3 pr-6 border-r border-slate-700">

              <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400">
                <ShieldCheck size={18} />
              </div>

              <div>

                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight leading-none">
                  Selected CSR
                </p>

                <p className="text-sm font-bold text-white leading-tight">
                  {selectedItem.csrAlias}
                </p>

              </div>

            </div>

            {/* VIEW */}

            <button
              onClick={() => onSelect && onSelect(selectedItem)}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-700 rounded-lg text-xs font-bold transition-colors"
            >
              <Eye size={16} className="text-blue-400" />
              View Details
            </button>

            {/* EXPORT */}

            <button
              onClick={() =>
                handleExport(
                  selectedItem.id,
                  selectedItem.csrAlias
                )
              }
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-700 rounded-lg text-xs font-bold transition-colors"
            >
              <Download size={16} className="text-emerald-400" />
              Export
            </button>

            {/* DELETE */}

            <button
              onClick={() => handleDelete(selectedItem.id)}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-red-900/20 text-red-400 rounded-lg text-xs font-bold transition-colors"
            >
              <Trash2 size={16} />
              Delete
            </button>

            {/* CLOSE */}

            <button
              onClick={() => setSelectedItem(null)}
              className="ml-auto p-1.5 hover:bg-slate-700 rounded-full text-slate-500"
            >
              <X size={16} />
            </button>

          </motion.div>

        )}

      </AnimatePresence>

      {/* GENERATE MODAL */}

      <AnimatePresence>

        {showGenerateModal && (

          <GenerateCSRModal
            onClose={() => setShowGenerateModal(false)}
            onRefresh={() => {
              fetchCsrs();
              setShowGenerateModal(false);
            }}
          />

        )}

      </AnimatePresence>

      {/* IMPORT MODAL */}

      <AnimatePresence>

        {showImportModal && (

          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-2xl bg-[#0d1117] border border-slate-800 rounded-xl overflow-hidden"
            >

              {/* HEADER */}

              <div className="p-5 border-b border-slate-800 flex items-center justify-between">

                <div>

                  <h2 className="text-lg font-bold text-white">
                    Import CSR
                  </h2>

                  <p className="text-xs text-slate-500 mt-1">
                    Import an external CSR PEM file
                  </p>

                </div>

                <button
                  onClick={() => setShowImportModal(false)}
                  className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"
                >
                  <X size={18} />
                </button>

              </div>

              {/* BODY */}

              <div className="p-5 space-y-5">

                <div className="space-y-2">

                  <label className="text-[11px] uppercase font-bold text-slate-500">
                    CSR Alias
                  </label>

                  <input
                    value={importAlias}
                    onChange={(e) => setImportAlias(e.target.value)}
                    className="w-full bg-[#161b22] border border-slate-700 rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-500"
                    placeholder="external-api-csr"
                  />

                </div>

                <div className="space-y-2">

                  <label className="text-[11px] uppercase font-bold text-slate-500">
                    CSR PEM
                  </label>

                  <textarea
                    value={importPem}
                    onChange={(e) => setImportPem(e.target.value)}
                    rows={12}
                    className="w-full bg-[#161b22] border border-slate-700 rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-500 font-mono"
                    placeholder="-----BEGIN CERTIFICATE REQUEST-----"
                  />

                </div>

              </div>

              {/* FOOTER */}

              <div className="p-5 border-t border-slate-800 flex justify-end gap-3">

                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 border border-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>

                <button
                  onClick={handleImport}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-bold text-white"
                >
                  Import CSR
                </button>

              </div>

            </motion.div>

          </div>

        )}

      </AnimatePresence>

    </div>
  );
};

export default CSRTable;
