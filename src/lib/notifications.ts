import { supabase } from './supabase';

/**
 * Notification Service
 * Handles email (via Resend) and Telegram push alerts for PulseMap users.
 *
 * Setup:
 *   Email: Add RESEND_API_KEY to .env
 *   Telegram: Add TELEGRAM_BOT_TOKEN to .env + user must /start the bot and save their chat_id
 */

export interface NotificationPayload {
  type: 'daily_briefing' | 'breaking_alert';
  events: Array<{
    title: string;
    category: string;
    region: string;
    sourceUrl?: string;
    timestamp: string;
  }>;
}

// ─── Email Notification (via Resend.com) ──────────────────────────────────────
export async function sendEmailBriefing(
  to: string,
  payload: NotificationPayload
): Promise<boolean> {
  const apiKey = import.meta.env.VITE_RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[PulseMap] Email disabled: VITE_RESEND_API_KEY not set in .env');
    return false;
  }

  const topEvents = payload.events.slice(0, 5);
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { background:#030712; color:#f8fafc; font-family:monospace; margin:0; padding:20px; }
    .header { border-bottom:2px solid #ef4444; padding-bottom:16px; margin-bottom:24px; }
    .logo { color:#ef4444; font-size:22px; font-weight:900; letter-spacing:4px; }
    .tag { color:#64748b; font-size:11px; letter-spacing:2px; margin-top:4px; }
    .event { background:#0f172a; border-left:3px solid #ef4444; padding:12px 16px; margin-bottom:12px; border-radius:4px; }
    .event-title { font-weight:700; font-size:14px; margin-bottom:4px; }
    .event-meta { color:#64748b; font-size:11px; }
    .link { color:#ef4444; text-decoration:none; }
    .footer { margin-top:32px; color:#334155; font-size:10px; border-top:1px solid #1e293b; padding-top:12px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">⚡ PULSEMAP</div>
    <div class="tag">TACTICAL INTELLIGENCE BRIEFING — ${new Date().toUTCString()}</div>
  </div>
  <p style="color:#94a3b8;font-size:13px;margin-bottom:20px;">
    ${payload.type === 'daily_briefing' ? 'Your daily situational awareness report.' : '🔴 BREAKING: High-priority event detected.'}
  </p>
  ${topEvents
    .map(
      (e) => `
    <div class="event">
      <div class="event-title">${e.title}</div>
      <div class="event-meta">${e.category.toUpperCase()} · ${e.region} · ${new Date(e.timestamp).toLocaleString()}</div>
      ${e.sourceUrl ? `<a class="link" href="${e.sourceUrl}" target="_blank" style="font-size:11px;margin-top:6px;display:inline-block;">→ View Source</a>` : ''}
    </div>
  `
    )
    .join('')}
  <div class="footer">
    You are receiving this because you enabled email briefings in your PulseMap profile.<br/>
    To unsubscribe, visit your profile settings at pulsemap.app/map and disable Email Briefing.
  </div>
</body>
</html>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'PulseMap Intel <briefing@pulsemap.app>',
        to: [to],
        subject:
          payload.type === 'daily_briefing'
            ? `[PulseMap] Daily Briefing — ${new Date().toLocaleDateString()}`
            : `[PulseMap] 🔴 Breaking Alert`,
        html: htmlContent,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[PulseMap] Resend API error:', err);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[PulseMap] Email send failed:', err);
    return false;
  }
}

// ─── Telegram Notification ────────────────────────────────────────────────────
export async function sendTelegramAlert(
  chatId: string,
  payload: NotificationPayload
): Promise<boolean> {
  const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.warn('[PulseMap] Telegram disabled: VITE_TELEGRAM_BOT_TOKEN not set in .env');
    return false;
  }

  const topEvents = payload.events.slice(0, 3);
  const lines = [
    payload.type === 'breaking_alert'
      ? '🔴 *PULSEMAP BREAKING ALERT*'
      : '⚡ *PULSEMAP DAILY BRIEFING*',
    `_${new Date().toUTCString()}_`,
    '',
    ...topEvents.map((e, i) =>
      [
        `*${i + 1}. ${e.title}*`,
        `📍 ${e.region} · ${e.category.toUpperCase()}`,
        e.sourceUrl ? `[View Source](${e.sourceUrl})` : '',
      ]
        .filter(Boolean)
        .join('\n')
    ),
    '',
    '_Manage alerts at pulsemap.app_',
  ];

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: lines.join('\n'),
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[PulseMap] Telegram API error:', err);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[PulseMap] Telegram send failed:', err);
    return false;
  }
}

// ─── Dispatch to all subscribed users ─────────────────────────────────────────
export async function dispatchNotifications(
  payload: NotificationPayload
): Promise<{ email: number; telegram: number }> {
  let emailCount = 0;
  let telegramCount = 0;

  try {
    // Fetch all users with notifications enabled
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, full_name, preferences');

    if (error || !profiles) return { email: 0, telegram: 0 };

    for (const profile of profiles) {
      const prefs = profile.preferences || {};

      // Email
      if (prefs.notifications?.email) {
        const { data: authUser } = await supabase.auth.admin
          .getUserById(profile.id)
          .catch(() => ({ data: null }));
        const email = (authUser as any)?.user?.email;
        if (email) {
          const ok = await sendEmailBriefing(email, payload);
          if (ok) emailCount++;
        }
      }

      // Telegram
      if (prefs.notifications?.telegram && prefs.telegram_chat_id) {
        const ok = await sendTelegramAlert(prefs.telegram_chat_id, payload);
        if (ok) telegramCount++;
      }
    }
  } catch (err) {
    console.error('[PulseMap] Dispatch error:', err);
  }

  return { email: emailCount, telegram: telegramCount };
}
