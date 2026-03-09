import { motion } from 'motion/react';
import { Activity, Globe, Radio, Shield, Zap, ChevronRight, MapPin } from 'lucide-react';
import SEOHead from '../components/SEOHead';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../lib/auth';
import AuthModal from '../components/AuthModal';
import { useState } from 'react';

export default function Landing() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const features = [
    {
      icon: Globe,
      title: 'Global Coverage',
      desc: 'Real-time news stream from 380+ sources. BBC, AP, Al Jazeera and more.',
    },
    {
      icon: Radio,
      title: 'Multi-Source Setup',
      desc: 'Every event is cross-verified via multiple sources. Transparent confidence score.',
    },
    {
      icon: Zap,
      title: 'Instant Updates',
      desc: 'Map refreshes automatically every 5 minutes. Live military aircraft tracking.',
    },
  ];

  const stats = [
    { value: '380+', label: 'Active Sources' },
    { value: '6', label: 'Global Regions' },
    { value: '24/7', label: 'Live Tracking' },
    { value: '150+', label: 'Strategic Points' },
  ];

  return (
    <>
      <SEOHead />
      <div className="min-h-screen bg-[#020509] text-white overflow-x-hidden">
        {/* Hero Section */}
        <div className="relative min-h-screen flex flex-col items-center justify-center text-center px-6">
          {/* Background radial glow */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-500/5 rounded-full blur-[120px]" />
            <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] bg-red-900/10 rounded-full blur-[80px]" />
          </div>

          {/* Logo & Top Bar */}
          <div className="absolute top-0 w-full px-6 py-4 flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-red-500/30 rounded-full animate-ping" />
                <Activity size={36} className="text-red-500 relative z-10" />
              </div>
              <span className="text-2xl font-black tracking-[0.3em] uppercase text-white">
                PulseMap
              </span>
            </motion.div>

            <motion.button
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => (user ? navigate('/map') : setIsAuthModalOpen(true))}
              className="px-5 py-2 glass rounded-xl text-xs font-black uppercase tracking-widest text-white/70 hover:text-white border border-white/10 hover:border-white/30 transition-all hover:bg-white/5"
            >
              {user ? 'Strategic Command' : 'Connect'}
            </motion.button>
          </div>

          <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight uppercase leading-none mb-6"
          >
            Monitor the World's Pulse
            <br />
            <span className="text-red-500">In Real-Time</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-base md:text-lg text-white/50 max-w-2xl mb-10 leading-relaxed font-medium"
          >
            Track global conflicts, military movements, and security events live on the map,
            aggregated from 380+ reliable intelligence sources.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <button
              onClick={() => navigate('/map')}
              className="group flex items-center justify-center gap-3 px-10 py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-[0_0_40px_rgba(239,68,68,0.3)] hover:shadow-[0_0_60px_rgba(239,68,68,0.5)] hover:scale-105"
            >
              <MapPin size={18} />
              Launch Map
              <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>

          {/* Stats Bar */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6"
          >
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-black text-red-400 mb-1">{s.value}</div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-white/30">
                  {s.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Features Section */}
        <div className="px-6 py-24 max-w-5xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-black uppercase tracking-tight text-center mb-16"
          >
            Why PulseMap?
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:border-red-500/20 hover:bg-red-500/5 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-4">
                  <f.icon size={22} className="text-red-400" />
                </div>
                <h3 className="font-black uppercase tracking-wider text-base mb-2">{f.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Warning / Editorial Note */}
        <div className="px-6 pb-16 max-w-3xl mx-auto text-center">
          <p className="text-[11px] text-white/20 font-mono leading-relaxed">
            PulseMap is not a news agency. Content is automatically aggregated from open sources.
            Please verify information using official channels. © 2026 Onur Celik.
          </p>
        </div>
      </div>
    </>
  );
}
