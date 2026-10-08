import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  UserPlus,
  Loader2,
  ShieldAlert,
  FileSearch,
  User,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

import { GlassCard, Button, Input } from '../components/ui/Core';
import { authApi } from '../api/axios';
import { decodeJWT } from '../utils/jwt';
import { useAuthStore } from '../store/authStore';

export default function Signup() {

  const navigate = useNavigate();

  const setTokens = useAuthStore((s) => s.setTokens);

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'USER',
    caType: null
  });

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');

  const roles = [
    {
      id: 'USER',
      label: 'End User',
      icon: <User size={18} />,
      desc: 'Standard requests'
    },

    {
      id: 'AUDITOR',
      label: 'Auditor',
      icon: <FileSearch size={18} />,
      desc: 'View compliance'
    },

    {
      id: 'CA_OPERATOR',
      label: 'CA Operator',
      icon: <ShieldAlert size={18} />,
      desc: 'Manage certificate authority'
    }
  ];

  const caTypes = [
    {
      id: 'ROOT',
      label: 'Root CA',
      desc: 'Trust Anchor'
    },

    {
      id: 'INTERMEDIATE',
      label: 'Intermediate CA',
      desc: 'Subordinate Authority'
    }
  ];

  const updateForm = (field, value) => {

    setForm(prev => {

      const updated = {
        ...prev,
        [field]: value
      };

      // PASSWORD VALIDATION

      if (
        (field === "password" || field === "confirmPassword") &&
        updated.confirmPassword
      ) {

        if (updated.password !== updated.confirmPassword) {
          setError("Passwords do not match");
        } else {
          setError("");
        }

      } else {
        setError("");
      }

      return updated;
    });
  };

  const handleSignup = async (e) => {

    e.preventDefault();

    setError('');

    // VALIDATION

    if (!form.password || !form.confirmPassword) {
      return setError("Please fill in both password fields");
    }

    if (form.password !== form.confirmPassword) {
      return setError("Passwords do not match");
    }

    if (form.role === "CA_OPERATOR" && !form.caType) {
      return setError("Please select CA type");
    }

    setLoading(true);

    try {

      const payload = {
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
        role: form.role,
        caType:
          form.role === "CA_OPERATOR"
            ? form.caType
            : null
      };

      const res = await authApi.post("/auth/signup", payload);

      // =========================
      // AUTO LOGIN FOR USER
      // =========================

      if (res.data.accessToken) {

        const { accessToken, refreshToken } = res.data;

        const decoded = decodeJWT(accessToken);

        const user = {
          username: decoded?.sub,
          role: decoded?.role,
          caType: decoded?.caType
        };

        setTokens({
          accessToken,
          refreshToken,
          user
        });

        navigate("/keys");
      }

      // =========================
      // PENDING APPROVAL
      // =========================

      else {

        navigate(
          "/login?message=awaiting_approval"
        );
      }

    } catch (err) {

      console.log(err);

      const msg =
        err?.response?.data?.message ||
        err?.response?.data ||
        err?.message ||
        "Signup failed";

      setError(
        typeof msg === "string"
          ? msg
          : JSON.stringify(msg)
      );

    } finally {

      setLoading(false);
    }
  };

  const passwordsMatch =
    form.password &&
    form.confirmPassword &&
    form.password === form.confirmPassword;

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-6 py-12">

      <GlassCard className="w-full max-w-2xl p-8 md:p-12 border-slate-200/10 dark:border-slate-800/50">

        {/* HEADER */}

        <div className="text-center mb-8">

          <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 mb-4">
            <UserPlus className="text-indigo-500" size={32} />
          </div>

          <h2 className="text-3xl font-bold dark:text-white text-slate-900">
            Infrastructure Enrollment
          </h2>

          <p className="text-slate-500 text-sm mt-2">
            Request access to the PKI Management System
          </p>

        </div>

        <form className="space-y-6" onSubmit={handleSignup}>

          {/* ERROR */}

          <AnimatePresence>

            {error && (

              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-sm"
              >
                <AlertCircle size={18} />
                {error}
              </motion.div>

            )}

          </AnimatePresence>

          {/* USER INFO */}

          <div className="grid md:grid-cols-2 gap-5">

            <Input
              label="Username"
              required
              onChange={(e) =>
                updateForm('username', e.target.value)
              }
            />

            <Input
              label="Email"
              type="email"
              required
              onChange={(e) =>
                updateForm('email', e.target.value)
              }
            />

          </div>

          {/* PASSWORDS */}

          <div className="grid md:grid-cols-2 gap-5">

            <Input
              type="password"
              label="Password"
              required
              onChange={(e) =>
                updateForm('password', e.target.value)
              }
            />

            <Input
              type="password"
              label="Confirm Password"
              required
              onChange={(e) =>
                updateForm('confirmPassword', e.target.value)
              }
            />

          </div>

          {/* PASSWORD MATCH */}

          {passwordsMatch && (

            <p className="text-green-500 text-sm flex items-center gap-2">
              <CheckCircle2 size={16} />
              Passwords match
            </p>

          )}

          {/* ROLES */}

          <div className="space-y-3">

            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
              Security Assignment
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

              {roles.map((r) => (

                <div
                  key={r.id}
                  onClick={() =>
                    setForm({
                      ...form,
                      role: r.id,
                      caType: null
                    })
                  }
                  className={`relative p-4 rounded-xl cursor-pointer border transition-all ${
                    form.role === r.id
                      ? "border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/50"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30"
                  }`}
                >

                  <div className={`${
                    form.role === r.id
                      ? 'text-indigo-500'
                      : 'text-slate-500'
                  }`}>
                    {r.icon}
                  </div>

                  <p className="text-sm font-bold mt-2">
                    {r.label}
                  </p>

                  <p className="text-[10px] text-slate-500 mt-1">
                    {r.desc}
                  </p>

                  {form.role === r.id && (
                    <div className="absolute top-2 right-2 text-indigo-500">
                      <CheckCircle2 size={14} />
                    </div>
                  )}

                </div>

              ))}

            </div>

          </div>

          {/* CA TYPE */}

          <AnimatePresence>

            {form.role === "CA_OPERATOR" && (

              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >

                <div className="grid grid-cols-2 gap-3">

                  {caTypes.map((type) => (

                    <div
                      key={type.id}
                      onClick={() =>
                        updateForm('caType', type.id)
                      }
                      className={`p-3 rounded-xl cursor-pointer border ${
                        form.caType === type.id
                          ? "border-yellow-400 bg-yellow-400/10"
                          : "border-slate-200 dark:border-slate-800"
                      }`}
                    >

                      <p className="text-sm font-bold">
                        {type.label}
                      </p>

                      <p className="text-[10px] text-slate-500">
                        {type.desc}
                      </p>

                    </div>

                  ))}

                </div>

              </motion.div>

            )}

          </AnimatePresence>

          {/* SUBMIT */}

          <Button
            type="submit"
            className="w-full py-4 text-lg font-bold"
            variant="primary"
            disabled={loading || !passwordsMatch}
          >

            {loading ? (

              <span className="flex items-center gap-2">
                <Loader2 className="animate-spin" size={18} />
                Provisioning...
              </span>

            ) : (

              "Complete Registration"

            )}

          </Button>

          <p className="text-center text-sm text-slate-500">

            Already registered?{" "}

            <Link
              to="/login"
              className="text-indigo-500 hover:underline"
            >
              System Login
            </Link>

          </p>

        </form>

      </GlassCard>

    </div>
  );
}
