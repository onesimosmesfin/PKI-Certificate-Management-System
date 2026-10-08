// components/ui/Core.jsx
import { motion } from 'framer-motion';

export const Button = ({ children, variant = 'primary', className = '', ...props }) => {
  const styles = {
    primary: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20",
    secondary: "border border-[rgb(var(--app-border))] bg-[rgb(var(--app-surface-strong))] text-[rgb(var(--app-text))] hover:bg-[rgb(var(--app-surface-muted))]",
    ghost: "text-[rgb(var(--app-muted))] hover:bg-[rgb(var(--app-surface-muted))] hover:text-[rgb(var(--app-heading))]"
  };
  return (
    <motion.button 
      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
      className={`px-5 py-2.5 rounded-lg font-medium transition-all ${styles[variant]} ${className}`} 
      {...props}
    >
      {children}
    </motion.button>
  );
};

export const Input = ({ label, className = "", ...props }) => (
  <div className="space-y-1.5">
    {label && (
      <label className="app-muted text-xs font-bold uppercase tracking-widest">
        {label}
      </label>
    )}

    <input
      {...props}
      className={`app-input w-full rounded-lg py-2.5
      ${className}`}
    />
  </div>
);

// Updated GlassCard example
export const GlassCard = ({ children, className = "" }) => (
  <div className={`
    app-surface backdrop-blur-xl transition-colors duration-300
    rounded-2xl p-6 ${className}
  `}>
    {children}
  </div>
);

