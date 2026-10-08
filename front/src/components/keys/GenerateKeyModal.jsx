import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Eye, EyeOff, Cpu } from 'lucide-react';
import { Button, Input } from '../ui/Core';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';

export default function GenerateKeyModal({ onClose, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    alias: '',
    algorithm: 'RSA',
    keySize: 2048,
    curveName: 'secp256r1',
    password: '',
    signingAlgorithm: 'SHA256withRSA'
  });

  // 🔁 Sync algorithm → signing algorithm defaults
  useEffect(() => {
    if (form.algorithm === 'RSA') {
      setForm(prev => ({
        ...prev,
        signingAlgorithm: 'SHA256withRSA',
        keySize: 2048
      }));
    } else {
      setForm(prev => ({
        ...prev,
        signingAlgorithm: 'SHA256withECDSA',
        curveName: 'secp256r1'
      }));
    }
  }, [form.algorithm]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.alias || !form.password) {
      return toast.error("Alias and PIN are required");
    }

    if (form.password.length < 4) {
      return toast.error("PIN must be at least 4 characters");
    }

    setLoading(true);

    try {
      // 🎯 MATCH BACKEND KeyRequest DTO EXACTLY
      const payload = {
        alias: form.alias,
        algorithm: form.algorithm,
        keySize: form.algorithm === 'RSA' ? Number(form.keySize) : 0,
        curveName: form.algorithm === 'EC' ? form.curveName : null,
        password: form.password,
        signingAlgorithm: form.signingAlgorithm
      };

      await api.post('/hsm/generate', payload);

      toast.success("🔐 Key generated securely in HSM");

      onRefresh();
      onClose();

    } catch (err) {
      toast.error(
        err.response?.data?.message ||
        err.response?.data ||
        "Key generation failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-950/70 backdrop-blur-md z-50 p-4">

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
      >

        {/* HEADER */}
        <div className="p-5 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Cpu className="text-blue-400" />
            <div>
              <h2 className="text-white font-bold">Generate HSM Key</h2>
              <p className="text-xs text-slate-400">Secure hardware key generation</p>
            </div>
          </div>

          <button onClick={onClose}>
            <X className="text-slate-400 hover:text-white" />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Alias */}
          <Input
            label="Key Alias"
            placeholder="e.g. prod-root-key"
            value={form.alias}
            onChange={(e) => setForm({ ...form, alias: e.target.value })}
          />

          {/* Algorithm */}
          <div>
            <label className="text-xs text-slate-400">Algorithm</label>
            <select
              className="w-full bg-slate-950 border border-slate-800 p-2 rounded"
              value={form.algorithm}
              onChange={(e) => setForm({ ...form, algorithm: e.target.value })}
            >
              <option value="RSA">RSA</option>
              <option value="EC">EC</option>
            </select>
          </div>

          {/* Key Size / Curve */}
          {form.algorithm === 'RSA' ? (
            <div>
              <label className="text-xs text-slate-400">Key Size</label>
              <select
                className="w-full bg-slate-950 border border-slate-800 p-2 rounded"
                value={form.keySize}
                onChange={(e) => setForm({ ...form, keySize: e.target.value })}
              >
                <option value={2048}>2048</option>
                <option value={3072}>3072</option>
                <option value={4096}>4096</option>
              </select>
            </div>
          ) : (
            <div className="text-sm text-slate-400">
              Curve: <b>secp256r1</b>
            </div>
          )}

          {/* Signing Algorithm */}
          <div>
            <label className="text-xs text-slate-400">Signing Algorithm</label>
            <select
              className="w-full bg-slate-950 border border-slate-800 p-2 rounded"
              value={form.signingAlgorithm}
              onChange={(e) => setForm({ ...form, signingAlgorithm: e.target.value })}
            >
              {form.algorithm === 'RSA' ? (
                <>
                  <option value="SHA256withRSA">SHA256withRSA</option>
                  <option value="SHA384withRSA">SHA384withRSA</option>
                  <option value="SHA512withRSA">SHA512withRSA</option>
                </>
              ) : (
                <>
                  <option value="SHA256withECDSA">SHA256withECDSA</option>
                  <option value="SHA384withECDSA">SHA384withECDSA</option>
                  <option value="SHA512withECDSA">SHA512withECDSA</option>
                </>
              )}
            </select>
          </div>

          {/* Password */}
          <div className="relative">
            <Input
              label="HSM PIN"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />

            <button
              type="button"
              className="absolute right-3 top-9 text-slate-500"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* ACTIONS */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>

            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Generating..." : "Generate Key"}
            </Button>
          </div>

        </form>
      </motion.div>
    </div>
  );
}