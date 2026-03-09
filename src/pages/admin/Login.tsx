import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Shield, Lock, Activity, ArrowRight } from 'lucide-react';
import SEOHead from '../../components/SEOHead';

function friendlyError(msg: string): string {
  if (msg.includes('Invalid login credentials'))
    return 'Access denied. Email or password is incorrect.';
  if (msg.includes('Email not confirmed')) return 'Email not verified yet. Check your inbox.';
  if (msg.includes('Too many requests'))
    return 'Too many attempts. Wait a few minutes and try again.';
  if (msg.includes('not allowed')) return 'This email address cannot be used.';
  return msg;
}

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.session) navigate('/admin/dashboard');
    } catch (err: any) {
      setError(friendlyError(err.message || 'Login failed. Please check your credentials.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEOHead title="Admin Login | PulseMap" description="PulseMap secure admin panel login." />
      <div className="min-h-screen bg-[#020509] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background ambient glows */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-red-900/10 rounded-full blur-[80px] pointer-events-none" />

        {/* Tactical grid */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          <div className="flex flex-col items-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-red-500/20 rounded-2xl blur-xl animate-pulse" />
              <div className="relative w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center justify-center">
                <Shield size={32} />
              </div>
            </div>
            <h1 className="text-3xl font-black uppercase tracking-[0.2em] text-white">
              Control Panel
            </h1>
            <p className="mt-2 text-xs text-white/30 font-mono tracking-widest uppercase">
              Authorized access required
            </p>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          <div className="bg-white/[0.03] border border-white/10 backdrop-blur-xl py-10 px-8 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.5)]">
            <form className="space-y-5" onSubmit={handleLogin}>
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-4 rounded-xl flex items-start gap-3 font-mono leading-relaxed">
                  <Activity size={14} className="mt-0.5 shrink-0 text-red-500" />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500/30 transition-all font-mono text-sm"
                  placeholder="admin@pulsemap.com"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock size={15} className="text-white/20" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500/30 transition-all font-mono text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-3 py-4 px-4 rounded-xl text-sm font-black uppercase tracking-[0.2em] text-white bg-red-600 hover:bg-red-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(239,68,68,0.25)] hover:shadow-[0_0_40px_rgba(239,68,68,0.4)] group mt-2"
              >
                {loading ? 'Connecting...' : 'Secure Sign In'}
                {!loading && (
                  <ArrowRight
                    size={16}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/5 text-center">
              <p className="text-[9px] font-mono text-white/15 uppercase tracking-widest">
                Unauthorized access is monitored and logged
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
