import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, ShieldAlert, MapPin, ExternalLink } from 'lucide-react';

interface EmailPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EmailPreviewModal({ isOpen, onClose }: EmailPreviewModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 30 }}
            className="relative w-full max-w-2xl bg-[#0f172a] border border-[#1e293b] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Browser-like window header */}
            <div className="bg-[#020617] p-3 border-b border-[#1e293b] flex justify-between items-center text-[#94a3b8] flex-shrink-0">
              <div className="flex gap-2 items-center">
                <div className="w-3 h-3 rounded-full bg-red-500/20" />
                <div className="w-3 h-3 rounded-full bg-amber-500/20" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/20" />
              </div>
              <div className="text-[10px] font-mono opacity-50 uppercase tracking-widest hidden sm:block">
                PulseMap Mail Relay Preview
              </div>
              <button
                onClick={onClose}
                className="hover:text-white transition-colors p-1 bg-[#1e293b] rounded-full"
              >
                <X size={14} />
              </button>
            </div>

            {/* Email Client UI envelope */}
            <div className="flex-1 overflow-y-auto bg-[#020509] p-4 sm:p-8 scrollbar-thin">
              {/* The Simulated HTML Email Body */}
              <div
                className="max-w-xl mx-auto rounded-xl overflow-hidden shadow-2xl"
                style={{
                  backgroundColor: '#0a0f1c',
                  border: '1px solid #1e293b',
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                {/* Email Header */}
                <div
                  style={{
                    backgroundColor: '#450a0a',
                    borderBottom: '1px solid #ef4444',
                    padding: '24px',
                    textAlign: 'center',
                  }}
                >
                  <ShieldAlert color="#ef4444" size={32} style={{ margin: '0 auto 12px auto' }} />
                  <h1
                    style={{
                      color: '#ffffff',
                      margin: '0',
                      fontSize: '20px',
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      letterSpacing: '0.2em',
                    }}
                  >
                    Tac-Intel Alert
                  </h1>
                  <p
                    style={{
                      color: '#fca5a5',
                      margin: '4px 0 0 0',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      letterSpacing: '0.1em',
                    }}
                  >
                    TARGET SECTOR MATCH CONFIRMED
                  </p>
                </div>

                {/* Email Content */}
                <div style={{ padding: '32px 24px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '16px',
                    }}
                  >
                    <span
                      style={{
                        background: 'rgba(59, 130, 246, 0.1)',
                        color: '#60a5fa',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontSize: '10px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                      }}
                    >
                      Turkey
                    </span>
                    <span style={{ color: '#64748b', fontSize: '11px', fontFamily: 'monospace' }}>
                      {new Date().toLocaleString()}
                    </span>
                  </div>

                  <h2
                    style={{
                      color: '#ffffff',
                      fontSize: '24px',
                      fontWeight: 800,
                      margin: '0 0 16px 0',
                      lineHeight: 1.3,
                    }}
                  >
                    Urgent Diplomatic Summit Convened in Ankara
                  </h2>

                  <p
                    style={{
                      color: '#cbd5e1',
                      fontSize: '15px',
                      lineHeight: 1.6,
                      margin: '0 0 24px 0',
                    }}
                  >
                    Initial telemetry indicates an impromptu gathering of top diplomatic and
                    security officials. Multiple verified sources report heightened security
                    protocols and airspace restrictions around key administrative sectors.
                  </p>

                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid #1e293b',
                      borderRadius: '8px',
                      padding: '16px',
                      marginBottom: '32px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '8px',
                        fontSize: '12px',
                      }}
                    >
                      <span
                        style={{ color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}
                      >
                        Confidence
                      </span>
                      <span style={{ color: '#10b981', fontWeight: 800 }}>HIGH (7/10 Sources)</span>
                    </div>
                    <div
                      style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}
                    >
                      <span
                        style={{ color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}
                      >
                        Primary Relays
                      </span>
                      <span style={{ color: '#cbd5e1' }}>Reuters, Local Intel</span>
                    </div>
                  </div>

                  <a
                    href="https://pulsemap.io/map"
                    style={{
                      display: 'block',
                      background: '#ef4444',
                      color: '#ffffff',
                      textAlign: 'center',
                      padding: '16px',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      fontSize: '14px',
                      boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)',
                    }}
                  >
                    View on Tactical Map
                  </a>
                </div>

                {/* Email Footer */}
                <div
                  style={{
                    borderTop: '1px solid #1e293b',
                    padding: '24px',
                    textAlign: 'center',
                  }}
                >
                  <p
                    style={{
                      color: '#475569',
                      fontSize: '10px',
                      margin: '0',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                    }}
                  >
                    You received this alert because you are tracking TARGET: TURKEY.
                    <br />
                    Adjust your transmission protocols in the Data terminal.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom action bar */}
            <div className="bg-[#020617] p-4 border-t border-[#1e293b] flex justify-between items-center mt-auto flex-shrink-0">
              <div className="text-[#94a3b8] text-xs font-mono">Format: HTML / Inline CSS</div>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-[#1e293b] hover:bg-[#334155] text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
              >
                Close Preview
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
