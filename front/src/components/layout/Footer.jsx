import { ShieldCheck, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { FaGithub, FaTwitter, FaLinkedin } from "react-icons/fa";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-surface rounded-none border-x-0 border-b-0 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-16 grid grid-cols-2 gap-12 md:grid-cols-4 lg:grid-cols-5">
          <div className="col-span-2 space-y-6 lg:col-span-2">
            <Link to="/" className="flex items-center space-x-2">
              <ShieldCheck className="h-8 w-8 text-indigo-500" />
              <span className="app-heading text-xl font-bold tracking-tight uppercase">
                PKI Cetficate Management
              </span>
            </Link>

            <p className="app-muted max-w-sm text-sm leading-relaxed">
              Advanced Public Key Infrastructure and certificate lifecycle
              management for zero-trust enterprise environments. Secure,
              automated, and compliant.
            </p>

            <div className="flex w-fit items-center space-x-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-xs font-medium text-emerald-500">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <span>SYSTEMS OPERATIONAL</span>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="app-heading font-semibold">Platform</h4>
            <ul className="app-muted space-y-2 text-sm">
              <li><Link to="/about" className="transition-colors hover:text-indigo-400">Certificate Manager</Link></li>
              <li><Link to="/about" className="transition-colors hover:text-indigo-400">Audit Logging</Link></li>
              <li><Link to="/about" className="transition-colors hover:text-indigo-400">Documentation</Link></li>
              <li><Link to="/about" className="transition-colors hover:text-indigo-400">Compliance Vault</Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="app-heading font-semibold">Security</h4>
            <ul className="app-muted space-y-2 text-sm">
              <li><Link to="/about" className="transition-colors hover:text-indigo-400">Architecture Overview</Link></li>
              <li><Link to="/about" className="transition-colors hover:text-indigo-400">Trust Model</Link></li>
              <li><Link to="/about" className="transition-colors hover:text-indigo-400">Audit And Forensics</Link></li>
              <li><Link to="/about" className="transition-colors hover:text-indigo-400">Threat Monitoring</Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="app-heading font-semibold">Connect</h4>
            <div className="flex space-x-4">
              <FaGithub className="h-5 w-5 cursor-pointer text-slate-500 transition-colors hover:text-[rgb(var(--app-heading))]" />
              <FaTwitter className="h-5 w-5 cursor-pointer text-slate-500 transition-colors hover:text-[rgb(var(--app-heading))]" />
              <FaLinkedin className="h-5 w-5 cursor-pointer text-slate-500 transition-colors hover:text-[rgb(var(--app-heading))]" />
              <Mail className="h-5 w-5 cursor-pointer text-slate-500 transition-colors hover:text-[rgb(var(--app-heading))]" />
            </div>
          </div>
        </div>

        <div className="app-muted flex flex-col items-center justify-between gap-4 border-t border-[rgb(var(--app-border))] pt-8 text-xs uppercase tracking-widest md:flex-row">
          <p>© {currentYear} PKI Security Platform. All rights reserved.</p>
          <div className="flex space-x-6">
            <span>ISO 27001 Certified</span>
            <span>SOC2 Type II Compliant</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
