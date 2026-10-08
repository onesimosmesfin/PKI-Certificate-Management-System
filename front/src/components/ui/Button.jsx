// components/ui/Button.jsx
import { motion } from 'framer-motion';

export const Button = ({ children, variant = 'primary', ...props }) => {
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]",
    secondary: "border border-[rgb(var(--app-border))] bg-[rgb(var(--app-surface-strong))] text-[rgb(var(--app-text))] hover:bg-[rgb(var(--app-surface-muted))]",
    outline: "border-2 border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/10"
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02, translateY: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${variants[variant]}`}
      {...props}
    >
      {children}
    </motion.button>
  );
};

// components/ui/GlassCard.jsx
