// pages/Contact.jsx
import { useState } from 'react';
import { Button, Input, GlassCard } from '../components/ui/Core';
import { Mail, Phone,  Loader2 } from 'lucide-react';

export default function Contact() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => setLoading(false), 2000); // Mock API call
  };

  return (
    <div className="app-shell max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-3 gap-12">
      <div className="lg:col-span-1 space-y-8">
        <div>
          <h1 className="app-heading text-4xl font-bold mb-4">Get in Touch</h1>
          <p className="app-muted text-lg">Our security experts are available 24/7 for enterprise support.</p>
        </div>
        
        <div className="space-y-6">
          <div className="flex gap-4 items-center">
            <div className="p-3 bg-indigo-500/10 rounded-lg text-indigo-400"><Mail /></div>
            <div><p className="app-muted text-sm uppercase font-bold">Email</p><p className="app-heading">support@pkisecure.io</p></div>
          </div>
          <div className="flex gap-4 items-center">
            <div className="p-3 bg-indigo-500/10 rounded-lg text-indigo-400"><Phone /></div>
            <div><p className="app-muted text-sm uppercase font-bold">Emergency</p><p className="app-heading">+1 (888) PKI-SAFE</p></div>
          </div>
        </div>
      </div>

      <GlassCard className="lg:col-span-2">
        <form className="grid md:grid-cols-2 gap-6" onSubmit={handleSubmit}>
          <Input label="Name" placeholder="Full Name" required />
          <Input label="Email" type="email" placeholder="email@company.com" required />
          <div className="md:col-span-2">
            <Input label="Subject" placeholder="Inquiry Type" />
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <label className="app-muted text-xs uppercase tracking-widest font-bold">Message</label>
            <textarea rows="4" className="app-textarea w-full rounded-lg px-4 py-2.5" />
          </div>
          <Button variant="primary" className="md:col-span-2 py-4 flex items-center justify-center gap-2">
            {loading && <Loader2 className="animate-spin h-5 w-5" />}
            {loading ? "Transmitting..." : "Send Secure Message"}
          </Button>
        </form>
      </GlassCard>
    </div>
  );
}
