import AuthHeader from "../components/layout/AuthHeader";

export default function KeyLayout({ children }) {
  return (
    <div className="app-shell min-h-screen">
      <AuthHeader
        title="Key Management Console"
        subtitle="Generate and manage secure keys, certificate requests, and key lifecycle operations."
      />

      <main className="px-6 pb-8 md:px-12">
        {children}
      </main>
    </div>
  );
}
