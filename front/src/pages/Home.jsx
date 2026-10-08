import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Layers3,
  LockKeyhole,
  Radar,
  ScrollText,
  ShieldCheck,
} from 'lucide-react';

import { GlassCard } from "../components/ui/GlassCard";
import { Button } from '../components/ui/Button';

const features = [
  {
    title: "Identity And Session Security",
    desc: "JWT-based authentication, role-aware access control, and secure operator workflows across the PKI platform.",
    icon: <LockKeyhole className="text-indigo-500" size={24} />
  },
  {
    title: "Certificate Lifecycle Control",
    desc: "Generate keys, process CSRs, issue certificates, revoke trust chains, and publish CRLs from one control surface.",
    icon: <ShieldCheck className="text-emerald-500" size={24} />
  },
  {
    title: "Audit And Compliance Visibility",
    desc: "Centralized event logs, correlation tracing, high-risk event review, and exportable evidence for governance teams.",
    icon: <ScrollText className="text-sky-500" size={24} />
  },
  {
    title: "Threat Monitoring",
    desc: "Security alerts, severity review, and response workflows that complement PKI operations in real time.",
    icon: <Radar className="text-rose-500" size={24} />
  }
];

const documentationHighlights = [
  "How identities, operators, and auditors move through the platform",
  "How HSM keys, CSRs, certificates, and revocations connect together",
  "How audit logs and threat monitoring support compliance and investigations"
];

export const Home = () => {
  return (
    <div className="app-shell overflow-hidden">
      <section className="relative px-6 pb-20 pt-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.18),_transparent_34%),radial-gradient(circle_at_80%_10%,_rgba(14,165,233,0.12),_transparent_28%)]" />

        <div className="mx-auto max-w-6xl text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.24em] text-indigo-300">
              <Layers3 size={14} />
              Enterprise Trust Infrastructure
            </div>

            <h1 className="app-heading mx-auto mb-6 max-w-5xl text-5xl font-extrabold tracking-tight md:text-7xl">
              Secure digital trust with a full PKI control plane.
            </h1>

            <p className="app-muted mx-auto mb-10 max-w-3xl text-lg leading-8">
              This platform combines authentication, HSM-backed key workflows, CSR processing,
              certificate issuance, revocation handling, audit visibility, and threat monitoring
              into one operational security system for enterprise environments.
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/signup">
                <Button variant="primary">Initialize Security Node</Button>
              </Link>

              <Link to="/about">
                <Button variant="secondary">
                  <span className="inline-flex items-center gap-2">
                    View Documentation
                    <ArrowRight size={16} />
                  </span>
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="border-y border-[rgb(var(--app-border))] bg-[rgb(var(--app-surface-muted))/0.55] py-20">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 text-center md:grid-cols-4">
          {[["Active Users", "1.2M+"], ["Blocked IPs", "450k"], ["Requests Secured", "2.4B"], ["Certificates Issued", "85k"]].map(([label, val]) => (
            <div key={label}>
              <div className="text-3xl font-bold text-indigo-500">{val}</div>
              <div className="app-muted text-sm uppercase tracking-widest">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24">
        <h2 className="app-heading mb-12 text-center text-3xl font-bold">Security Capabilities</h2>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature) => (
            <motion.div key={feature.title} whileHover={{ y: -10 }}>
              <GlassCard className="h-full">
                <div className="mb-4 inline-flex rounded-2xl bg-[rgb(var(--app-surface-strong))] p-3">
                  {feature.icon}
                </div>
                <h3 className="app-heading mb-2 text-xl font-semibold">{feature.title}</h3>
                <p className="app-muted text-sm leading-6">{feature.desc}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <GlassCard className="relative overflow-hidden bg-[linear-gradient(135deg,rgba(99,102,241,0.1),transparent_55%),linear-gradient(180deg,rgb(var(--app-surface)),rgb(var(--app-surface)))]">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-sky-400">
                <ScrollText size={14} />
                Documentation
              </div>
              <h2 className="app-heading text-3xl font-black tracking-tight">
                The documentation now explains the system, not just the icon.
              </h2>
              <p className="app-muted mt-4 max-w-2xl text-sm leading-7">
                The architecture section now describes how operators generate HSM keys,
                create or review CSRs, sign certificates, publish revocations, inspect audit
                trails, and respond to threat events. It is written as a walkthrough of how the
                platform actually works rather than a shallow feature list.
              </p>
            </div>

            <div className="space-y-4">
              {documentationHighlights.map((item) => (
                <div key={item} className="app-surface-strong flex items-start gap-3 rounded-2xl px-4 py-4">
                  <ShieldCheck size={18} className="mt-0.5 text-emerald-500" />
                  <p className="app-heading text-sm leading-6">{item}</p>
                </div>
              ))}

              <Link to="/about" className="inline-flex">
                <Button variant="secondary">Open Deep System Explanation</Button>
              </Link>
            </div>
          </div>
        </GlassCard>
      </section>
    </div>
  );
};

export default Home;
