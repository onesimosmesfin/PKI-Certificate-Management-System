// pages/Landing.jsx
import { motion } from "framer-motion";

export default function Landing() {
  return (
    <div className="app-shell min-h-screen">

      <nav className="flex justify-between p-6">
        <h1 className="app-heading text-xl font-bold">PKI System</h1>
        <div>
          <a href="/login" className="app-muted hover:text-indigo-400">Login</a>
          <a href="/signup" className="app-muted ml-4 hover:text-indigo-400">Signup</a>
        </div>
      </nav>

      <section className="text-center mt-20">
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-5xl font-bold">
          Enterprise PKI Security Platform
        </motion.h1>

        <p className="app-muted mt-4">
          Manage certificates, keys, and security threats in one place
        </p>
      </section>
    </div>
  );
}
