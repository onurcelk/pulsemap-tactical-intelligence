import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Flame,
  ExternalLink,
  Bell,
  ChevronDown,
  ChevronUp,
  Clock,
  Crosshair,
  Zap,
  Users,
  Landmark,
  Heart,
  Info,
} from 'lucide-react';
import { HistoricalAlert, getAlertHistory, clearAlertHistory } from '../lib/alerts';

/* ─── Category config ─── */
const CAT_CONFIG: Record<
  string,
  { color: string; bg: string; border: string; icon: React.ReactNode; label: string }
> = {
  explosion: {
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    icon: <Flame size={18} />,
    label: 'EXPLOSION',
  },
  military: {
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: <Crosshair size={18} />,
    label: 'MILITARY',
  },
  politics: {
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    icon: <Landmark size={18} />,
    label: 'POLITICS',
  },
  humanitarian: {
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: <Heart size={18} />,
    label: 'HUMANITARIAN',
  },
  protest: {
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    icon: <Users size={18} />,
    label: 'PROTEST',
  },
  other: {
    color: 'text-gray-400',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/30',
    icon: <Info size={18} />,
    label: 'Intel',
  },
};

/* ─── Single alert card ─── */
interface AlertCardProps {
  id: string;
  title: string;
  category: string;
  region?: string;
  sourceUrl?: string;
  hotScore: number;
  onDismiss: (id: string) => void;
  onEventClick?: (id: string) => void;
}

function AlertCard({
  id,
  title,
  category,
  region,
  sourceUrl,
  hotScore,
  onDismiss,
  onEventClick,
}: AlertCardProps) {
  const cfg = CAT_CONFIG[category] || CAT_CONFIG.other;
  const isVeryHot = hotScore >= 6;

  return (
    <motion.div
      layout
      initial={{ x: 400, opacity: 0, scale: 0.9 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: 400, opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', damping: 22, stiffness: 280 }}
      className={`relative rounded-2xl border ${cfg.border} ${cfg.bg} backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/50 max-w-sm w-full`}
    >
      {/* Animated top bar */}
      <div
        className={`h-0.5 w-full ${isVeryHot ? 'bg-gradient-to-r from-red-600 via-orange-500 to-red-600 animate-pulse' : `bg-gradient-to-r from-transparent ${cfg.color.replace('text-', 'via-')} to-transparent opacity-60`}`}
      />

      {/* Scanline effect */}
      {isVeryHot && (
        <div
          className="absolute inset-0 pointer-events-none opacity-5"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(255,255,255,0.15) 0px, rgba(255,255,255,0.15) 1px, transparent 1px, transparent 4px)',
          }}
        />
      )}

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className={`${cfg.color} flex-shrink-0`}>{cfg.icon}</span>
            <div>
              <span className={`text-[9px] font-black uppercase tracking-[0.25em] ${cfg.color}`}>
                {isVeryHot ? '🔴 BREAKING' : '⚡ ALERT'} · {cfg.label}
              </span>
              {region && (
                <span className="text-[9px] font-mono text-white/30 ml-2 uppercase">{region}</span>
              )}
            </div>
          </div>
          <button
            onClick={() => onDismiss(id)}
            className="p-1 hover:bg-white/10 rounded-full transition-colors flex-shrink-0 text-white/30 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>

        {/* Title */}
        <p
          className="text-sm font-bold leading-snug text-white/90 mb-3 cursor-pointer hover:text-white transition-colors line-clamp-3"
          onClick={() => onEventClick?.(id)}
        >
          {title}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span
            className={`text-[10px] font-black font-mono px-2 py-0.5 rounded-md ${cfg.bg} ${cfg.color} flex items-center gap-1 border ${cfg.border}`}
          >
            🔥 {hotScore}
          </span>
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={`text-[10px] font-black uppercase tracking-wider ${cfg.color} hover:opacity-80 flex items-center gap-1`}
            >
              Source <ExternalLink size={10} />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Alert History Panel ─── */
function AlertHistoryPanel({ onClose }: { onClose: () => void }) {
  const [history, setHistory] = useState<HistoricalAlert[]>(() => getAlertHistory());

  const handleClear = () => {
    clearAlertHistory();
    setHistory([]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute top-full mt-2 right-0 w-80 max-h-96 overflow-y-auto bg-[#0a0f1a]/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl z-50"
    >
      <div className="sticky top-0 flex items-center justify-between px-4 py-3 bg-[#0a0f1a]/95 border-b border-white/10">
        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
          Alert History ({history.length})
        </span>
        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <button
              onClick={handleClear}
              className="text-[9px] text-red-400/60 hover:text-red-400 font-mono uppercase"
            >
              Clear
            </button>
          )}
          <button onClick={onClose} className="text-white/30 hover:text-white">
            <X size={14} />
          </button>
        </div>
      </div>
      {history.length === 0 ? (
        <div className="py-8 text-center text-white/20 text-xs font-mono">No alerts yet</div>
      ) : (
        <div className="divide-y divide-white/5">
          {history.map((h) => {
            const cfg = CAT_CONFIG[h.category] || CAT_CONFIG.other;
            return (
              <div
                key={`${h.id}-${h.seenAt}`}
                className="px-4 py-3 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`${cfg.color} flex-shrink-0`}>
                    {React.cloneElement(cfg.icon as React.ReactElement<{ size?: number }>, { size: 12 })}
                  </span>
                  <span className={`text-[9px] font-black uppercase tracking-wider ${cfg.color}`}>
                    {cfg.label}
                  </span>
                  {h.region && (
                    <span className="text-[9px] font-mono text-white/20">{h.region}</span>
                  )}
                </div>
                <p className="text-xs text-white/60 font-medium leading-snug line-clamp-2">
                  {h.title}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[9px] font-mono text-white/20 flex items-center gap-1">
                    <Clock size={9} /> {new Date(h.seenAt).toLocaleTimeString()}
                  </span>
                  <span className="text-[9px] font-mono text-orange-400/60">🔥{h.hotScore}</span>
                  {h.sourceUrl && (
                    <a
                      href={h.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] text-white/30 hover:text-white/60 flex items-center gap-0.5 ml-auto"
                    >
                      <ExternalLink size={9} /> src
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

/* ─── Main Alert System Component ─── */
interface BreakingAlertSystemProps {
  /** New incoming alerts to display — cleared by parent after handing off */
  pendingAlerts: Omit<AlertCardProps, 'onDismiss' | 'onEventClick'>[];
  onDismiss: (id: string) => void;
  onEventClick?: (id: string) => void;
}

export function BreakingAlertSystem({
  pendingAlerts,
  onDismiss,
  onEventClick,
}: BreakingAlertSystemProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [notifGranted, setNotifGranted] = useState(Notification?.permission === 'granted');
  const historyCount = getAlertHistory().length;

  const handleRequestPermission = async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setNotifGranted(result === 'granted');
  };

  return (
    <>
      {/* ── Notification Bell (top-right fixed above maps) ── */}
      <div className="fixed top-24 right-4 z-[2000] flex flex-col items-end gap-2">
        <div className="relative">
          <button
            onClick={() => setHistoryOpen((v) => !v)}
            className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all text-xs font-bold ${historyCount > 0
              ? 'bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20'
              : 'bg-white/5 border-white/10 text-white/30 hover:bg-white/10 hover:text-white/60'
              }`}
            title="Alert History"
          >
            <Bell size={14} />
            {historyCount > 0 && (
              <span className="bg-orange-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                {historyCount > 9 ? '9+' : historyCount}
              </span>
            )}
            {historyOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          <AnimatePresence>
            {historyOpen && <AlertHistoryPanel onClose={() => setHistoryOpen(false)} />}
          </AnimatePresence>
        </div>

        {/* Push notification request (only show if not yet decided) */}
        {!notifGranted && Notification?.permission === 'default' && (
          <button
            onClick={handleRequestPermission}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-blue-500/20 bg-blue-500/5 text-blue-400 text-[10px] font-bold hover:bg-blue-500/10 transition-all"
          >
            <Zap size={11} /> Enable Push Alerts
          </button>
        )}
      </div>

      {/* ── Stacked Alert Cards ── */}
      <div className="fixed bottom-20 right-4 z-[1999] flex flex-col-reverse gap-3 items-end pointer-events-none">
        <AnimatePresence mode="popLayout">
          {pendingAlerts.map((alert) => (
            <div key={alert.id} className="pointer-events-auto">
              <AlertCard {...alert} onDismiss={onDismiss} onEventClick={onEventClick} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}

export default BreakingAlertSystem;
