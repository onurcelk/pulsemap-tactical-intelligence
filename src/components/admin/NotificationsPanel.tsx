import React, { useState } from 'react';
import { Mail, Send, CheckCircle, AlertCircle, Loader2, MessageCircle } from 'lucide-react';
import { dispatchNotifications } from '../../lib/notifications';

interface Props {
  recentEvents: Array<{
    title: string;
    category: string;
    region: string;
    sourceUrl?: string;
    timestamp: string;
  }>;
}

export default function NotificationsPanel({ recentEvents }: Props) {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ email: number; telegram: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<'daily_briefing' | 'breaking_alert'>('daily_briefing');

  const handleSend = async () => {
    setSending(true);
    setResult(null);
    setError(null);
    try {
      const counts = await dispatchNotifications({ type, events: recentEvents });
      setResult(counts);
    } catch (err: any) {
      setError(err.message || 'Dispatch failed');
    } finally {
      setSending(false);
    }
  };

  const hasResend = !!import.meta.env.VITE_RESEND_API_KEY;
  const hasTelegram = !!import.meta.env.VITE_TELEGRAM_BOT_TOKEN;

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Send size={18} className="text-blue-400" />
        <h3 className="font-black uppercase tracking-widest text-[11px] text-white/60">
          Send Notifications
        </h3>
      </div>

      {/* Channel Status */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className={`flex items-center gap-3 p-4 rounded-xl border ${hasResend ? 'border-green-500/20 bg-green-500/5' : 'border-white/5 bg-white/5'}`}
        >
          <Mail size={16} className={hasResend ? 'text-green-400' : 'text-white/20'} />
          <div>
            <div className="text-xs font-black text-white/60">Email (Resend)</div>
            <div
              className={`text-[10px] font-mono ${hasResend ? 'text-green-400' : 'text-white/20'}`}
            >
              {hasResend ? '✓ Configured' : '✗ Add VITE_RESEND_API_KEY'}
            </div>
          </div>
        </div>
        <div
          className={`flex items-center gap-3 p-4 rounded-xl border ${hasTelegram ? 'border-blue-500/20 bg-blue-500/5' : 'border-white/5 bg-white/5'}`}
        >
          <MessageCircle size={16} className={hasTelegram ? 'text-blue-400' : 'text-white/20'} />
          <div>
            <div className="text-xs font-black text-white/60">Telegram Bot</div>
            <div
              className={`text-[10px] font-mono ${hasTelegram ? 'text-blue-400' : 'text-white/20'}`}
            >
              {hasTelegram ? '✓ Configured' : '✗ Add VITE_TELEGRAM_BOT_TOKEN'}
            </div>
          </div>
        </div>
      </div>

      {/* Type Selector */}
      <div>
        <label className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3 block">
          Broadcast Type
        </label>
        <div className="flex gap-2">
          {(['daily_briefing', 'breaking_alert'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${type === t ? 'bg-red-600 text-white' : 'bg-white/5 text-white/30 hover:text-white'}`}
            >
              {t === 'daily_briefing' ? '📋 Daily Briefing' : '🔴 Breaking Alert'}
            </button>
          ))}
        </div>
      </div>

      {/* Events preview */}
      <div>
        <label className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3 block">
          Content Preview ({Math.min(5, recentEvents.length)} top events)
        </label>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {recentEvents.slice(0, 5).map((e, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
              <span className="text-[10px] font-mono text-white/20 mt-0.5">{i + 1}.</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white/70 truncate">{e.title}</div>
                <div className="text-[10px] text-white/30">
                  {e.category} · {e.region}
                </div>
              </div>
            </div>
          ))}
          {recentEvents.length === 0 && (
            <div className="text-center py-4 text-white/20 text-xs font-mono">
              No events to broadcast.
            </div>
          )}
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-xs text-green-400 font-mono">
          <CheckCircle size={14} />
          Sent to {result.email} email(s) and {result.telegram} Telegram chat(s).
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-mono">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* Send Button */}
      <button
        onClick={handleSend}
        disabled={sending || recentEvents.length === 0 || (!hasResend && !hasTelegram)}
        className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-red-600 hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest text-xs rounded-xl transition-all shadow-[0_0_20px_rgba(239,68,68,0.2)]"
      >
        {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        {sending ? 'Broadcasting...' : 'Send to All Subscribers'}
      </button>

      {!hasResend && !hasTelegram && (
        <p className="text-[10px] text-white/20 font-mono text-center leading-relaxed">
          Add VITE_RESEND_API_KEY and/or VITE_TELEGRAM_BOT_TOKEN to .env to enable notifications.
        </p>
      )}
    </div>
  );
}
