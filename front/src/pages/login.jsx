import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Lock,
  User,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle
} from "lucide-react";

import { authApi } from "../api/axios";
import { useAuthStore } from "../store/authStore";
import { decodeJWT } from "../utils/jwt";
import { GlassCard, Button, Input } from "../components/ui/Core";

export default function Login() {

  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const setTokens = useAuthStore((s) => s.setTokens);

  const navigate = useNavigate();

  // =========================
  // LOGIN HANDLER
  // =========================

  const handleLogin = async (e) => {

    e.preventDefault();

    setLoading(true);
    setError("");

    try {

      const res = await authApi.post("/auth/login", form);

      const { accessToken, refreshToken } = res.data;

      // =========================
      // DECODE JWT
      // =========================

      const decoded = decodeJWT(accessToken);

      const user = {
        username: decoded?.sub,
        role: decoded?.role,
        caType: decoded?.caType,
      };

      // =========================
      // SAVE TOKENS
      // =========================

      setTokens({
        accessToken,
        refreshToken,
        user,
      });

      // =========================
      // ROLE BASED NAVIGATION
      // =========================

      const role = decoded?.role;
      const caType = decoded?.caType;

      console.log("ROLE:", role);
      console.log("CA TYPE:", caType);

      // =========================
      // ADMIN + AUDITOR
      // =========================

      if (
        role === "ADMIN" ||
        role === "AUDITOR"
      ) {

        navigate("/dashboard");
      }

      // =========================
      // CA OPERATORS
      // =========================

      else if (role === "CA_OPERATOR") {

        // ROOT CA
        if (caType === "ROOT") {
          navigate("/keys");
        }

        // INTERMEDIATE CA
        else if (caType === "INTERMEDIATE") {
          navigate("/keys");
        }

        else {
          navigate("/");
        }
      }

      // =========================
      // END USER
      // =========================

      else if (role === "USER") {

        navigate("/keys");
      }

      // =========================
      // FALLBACK
      // =========================

      else {

        navigate("/");
      }

    } catch (err) {

      const msg =
        err.response?.data?.message ||
        err.response?.data ||
        err.message;

      if (msg.includes("Bad credentials")) {

        setError(
          "Invalid credentials. Please verify your identity."
        );

      } else if (
        msg.toLowerCase().includes("pending")
      ) {

        setError(
          "Access Request Pending. Awaiting approval."
        );

      } else if (
        msg.includes("disabled")
      ) {

        setError("Account Suspended.");

      } else {

        setError("Authentication Failed: " + msg);
      }

    } finally {

      setLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-6 relative overflow-hidden">

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 blur-[120px] rounded-full -z-10" />

      <GlassCard className="w-full max-w-md p-8 md:p-10 border-indigo-500/10 shadow-2xl">

        {/* HEADER */}

        <div className="flex flex-col items-center mb-8">

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-4 bg-indigo-500/10 rounded-2xl mb-4 border border-indigo-500/20 shadow-inner"
          >
            <ShieldCheck className="h-10 w-10 text-indigo-500" />
          </motion.div>

          <h2 className="text-3xl font-bold dark:text-white text-slate-900 tracking-tight text-center">
            Vault Access
          </h2>

          <p className="text-slate-500 mt-2 text-[10px] uppercase tracking-[0.2em] font-bold text-center">
            Identity Verification Required
          </p>

        </div>

        {/* ERROR */}

        <AnimatePresence mode="wait">

          {error && (

            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs flex items-center gap-2"
            >
              <AlertCircle
                size={14}
                className="shrink-0"
              />

              <span>{error}</span>

            </motion.div>
          )}

        </AnimatePresence>

        {/* FORM */}

        <form
          onSubmit={handleLogin}
          className="space-y-5"
        >

          {/* USERNAME */}

          <div className="relative group">

            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none z-10">
              <User className="h-4 w-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
            </div>

            <Input
              label="Subject Identifier"
              placeholder="Username"
              className="pl-11 bg-slate-950/20"
              required
              autoComplete="username"
              onChange={(e) =>
                setForm({
                  ...form,
                  username: e.target.value,
                })
              }
            />

          </div>

          {/* PASSWORD */}

          <div className="relative group">

            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none z-10">
              <Lock className="h-4 w-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
            </div>

            <Input
              label="Secret Key"
              type={showPassword ? "text" : "password"}
              placeholder="........"
              className="pl-11 pr-10 bg-slate-950/20"
              required
              autoComplete="current-password"
              onChange={(e) =>
                setForm({
                  ...form,
                  password: e.target.value,
                })
              }
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(!showPassword)
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-slate-500 hover:text-indigo-400 transition-colors z-10 focus:outline-none"
            >
              {showPassword ? (
                <EyeOff size={16} />
              ) : (
                <Eye size={16} />
              )}
            </button>

          </div>

          {/* OPTIONS */}

          <div className="flex items-center justify-between px-1">

            <label className="flex items-center text-xs text-slate-500 cursor-pointer group">

              <input
                type="checkbox"
                className="mr-2 rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500/20 accent-indigo-500 h-3.5 w-3.5"
              />

              <span className="group-hover:text-slate-400 transition-colors">
                Trust this device
              </span>

            </label>

            <Link
              to="/forgot-password"
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Recovery Mode
            </Link>

          </div>

          {/* BUTTON */}

          <Button
            variant="primary"
            type="submit"
            className="w-full py-4 font-bold shadow-lg shadow-indigo-500/10"
            disabled={loading}
          >

            {loading ? (

              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Authenticating...
              </span>

            ) : (

              "Authorize Session"

            )}

          </Button>

          {/* FOOTER */}

          <div className="text-center">

            <p className="text-xs text-slate-500">

              Unregistered entity?{" "}

              <Link
                to="/signup"
                className="text-indigo-400 font-bold hover:text-indigo-300 transition-all"
              >
                Request Access
              </Link>

            </p>

          </div>

        </form>

      </GlassCard>

    </div>
  );
}
