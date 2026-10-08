export const GlassCard = ({ children, className = "" }) => (
  <div
    className={`app-surface rounded-2xl p-6 backdrop-blur-md transition-colors duration-300 hover:border-indigo-500/30 ${className}`}
  >
    {children}
  </div>
);
