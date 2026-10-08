import {
  Activity,
  Cpu,
  FileCheck2,
  Layers3,
  Lock,
  Network,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

import { GlassCard } from '../components/ui/Core';

const stack = [
  { name: "Spring Boot Services", desc: "Core backend orchestration, workflow APIs, role-aware business logic, and request validation.", icon: <Cpu className="text-indigo-500" /> },
  { name: "JWT Security", desc: "Authenticated sessions, role decoding, access control, and token refresh for protected operations.", icon: <Lock className="text-cyan-500" /> },
  { name: "Audit Pipeline", desc: "Event capture, export flows, correlation tracing, and visibility into sensitive administrative activity.", icon: <Activity className="text-emerald-500" /> },
  { name: "Threat Engine", desc: "Security alert aggregation, severity scoring, and operational response for suspicious traffic.", icon: <ShieldCheck className="text-red-500" /> }
];

const documentationSections = [
  {
    title: "1. Identity And Access Layer",
    icon: <Lock className="text-indigo-500" size={18} />,
    body:
      "The system starts with authenticated identities. Users sign in through JWT-based sessions, and the frontend decodes the token to determine which workflows are available. Administrators can review pending users, auditors can inspect operational evidence, CA operators can manage trust material, and end users can work through request-driven certificate flows."
  },
  {
    title: "2. HSM Key Management",
    icon: <ShieldCheck className="text-emerald-500" size={18} />,
    body:
      "Before certificates can exist, keys must be generated and protected. The HSM workflow lets operators create personal or authority-backed key material, keep private keys isolated, and reuse those key aliases during Root CA creation, CSR signing, and downstream issuance operations. This ensures the trust chain begins from managed cryptographic material rather than ad hoc files."
  },
  {
    title: "3. CSR And Issuance Workflow",
    icon: <FileCheck2 className="text-sky-500" size={18} />,
    body:
      "Certificate Signing Requests move through the platform as structured records. A user or operator generates or imports a CSR, the request is reviewed, and an authorized signing workflow selects the issuing key and validity period. Once approved, the CSR is transformed into an X.509 certificate and becomes part of the managed certificate inventory."
  },
  {
    title: "4. Certificate Lifecycle And Revocation",
    icon: <Layers3 className="text-amber-500" size={18} />,
    body:
      "Issued certificates are not treated as static artifacts. The platform tracks active, revoked, and expiring certificates, supports verification and PEM export, and records administrative changes such as revocations. CRL generation and revoked-certificate review provide the controls needed to invalidate trust when credentials are compromised or no longer valid."
  },
  {
    title: "5. Audit, Compliance, And Forensics",
    icon: <Activity className="text-violet-500" size={18} />,
    body:
      "Operational trust is only useful if actions are observable. The audit subsystem captures events like sign-ins, certificate issuance, revocations, and failures. High-risk events can be surfaced separately, correlation traces help investigators connect related actions, and export capabilities allow the data to support reviews, audits, and incident documentation."
  },
  {
    title: "6. Threat Monitoring And Defensive Context",
    icon: <AlertTriangle className="text-rose-500" size={18} />,
    body:
      "The security layer complements PKI operations by tracking alerts and suspicious network behavior. It provides visibility into alert counts, severity levels, and live security events so operators can correlate infrastructure abuse with certificate or identity activity. This matters because trust services themselves are high-value operational targets."
  }
];

export default function About() {
  return (
    <div className="app-shell">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-20 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.24em] text-indigo-400">
            <Network size={14} />
            Security Documentation
          </div>
          <h1 className="app-heading mb-4 text-4xl font-black tracking-tight md:text-5xl">
            Deep Explanation Of The System
          </h1>
          <p className="app-muted mx-auto max-w-3xl text-lg leading-8">
            This platform is not only a certificate screen. It is a connected trust system that
            links identity approval, HSM key generation, CSR processing, certificate issuance,
            revocation control, audit evidence, and threat monitoring into one operational model.
          </p>
        </div>

        <div className="mb-20 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {stack.map((item) => (
            <GlassCard key={item.name} className="h-full">
              <div className="mb-4 inline-flex rounded-2xl bg-[rgb(var(--app-surface-strong))] p-3">
                {item.icon}
              </div>
              <h3 className="app-heading text-lg font-bold">{item.name}</h3>
              <p className="app-muted mt-3 text-sm leading-6">{item.desc}</p>
            </GlassCard>
          ))}
        </div>

        <div className="grid gap-6">
          {documentationSections.map((section) => (
            <GlassCard key={section.title}>
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-[rgb(var(--app-surface-strong))] p-3">
                  {section.icon}
                </div>
                <div>
                  <h2 className="app-heading text-2xl font-bold">{section.title}</h2>
                  <p className="app-muted mt-3 max-w-4xl text-sm leading-7">
                    {section.body}
                  </p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}
