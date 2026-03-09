/**
 * PulseMap — Real-Time Alert Service
 *
 * Detects new high-priority events by comparing the latest event list
 * against a previously seen snapshot. Triggers:
 *   • In-app Breaking Alert Banner
 *   • Browser Push Notification (if permission granted)
 */

export interface AlertEvent {
  id: string;
  title: string;
  category: string;
  region?: string;
  sourceUrl?: string;
  timestamp: string;
  hotScore: number;
}

/** Events that qualify as "breaking" */
export function isBreakingEvent(event: AlertEvent): boolean {
  const hotCats = ['explosion', 'military'];
  return (event.hotScore ?? 1) >= 3 || hotCats.includes(event.category);
}

/** Compare two event lists and return genuinely new breaking events */
export function detectNewAlerts(
  events: AlertEvent[],
  knownEventIds: Set<string>,
  preferredRegions: string[] = []
): AlertEvent[] {
  return events.filter(e => {
    // Determine the threshold for breaking news
    // Require a minimum hotScore of 8 for alerts, or 'military'/'nuclear' categories
    const isHighPriority = e.hotScore >= 8 || e.category === 'nuclear';
    const isMilitaryHot = e.category === 'military' && e.hotScore >= 6;

    const isBreaking = isHighPriority || isMilitaryHot;

    if (!isBreaking) return false;
    if (knownEventIds.has(e.id)) return false;

    // User filter (if preferences present)
    if (preferredRegions.length > 0) {
      if (!e.region || (!preferredRegions.includes(e.region) && e.region !== 'global')) {
        return false;
      }
    }

    return true;
  });
}

// ─── Browser Push Notification ─────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function sendBrowserNotification(event: AlertEvent): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const categoryEmoji: Record<string, string> = {
    explosion: '💥',
    military: '🎯',
    politics: '🏛️',
    humanitarian: '🆘',
    protest: '✊',
    other: '📡',
  };

  const emoji = categoryEmoji[event.category] || '📡';

  new Notification(`${emoji} PulseMap Breaking`, {
    body: event.title,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: event.id, // Prevents duplicate notifications for the same event
    requireInteraction: event.hotScore >= 6, // Stays until dismissed for very hot events
  });
}

// ─── Alert History (session-scoped) ───────────────────────────────────────

const ALERT_HISTORY_KEY = 'pulsemap_alert_history';
const MAX_HISTORY = 50;

export interface HistoricalAlert {
  id: string;
  title: string;
  category: string;
  region?: string;
  sourceUrl?: string;
  hotScore: number;
  seenAt: string; // ISO timestamp
}

export function saveAlertToHistory(event: AlertEvent): void {
  try {
    const raw = sessionStorage.getItem(ALERT_HISTORY_KEY);
    const history: HistoricalAlert[] = raw ? JSON.parse(raw) : [];
    const entry: HistoricalAlert = {
      id: event.id,
      title: event.title,
      category: event.category,
      region: event.region,
      sourceUrl: event.sourceUrl,
      hotScore: event.hotScore,
      seenAt: new Date().toISOString(),
    };
    history.unshift(entry);
    sessionStorage.setItem(ALERT_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch {
    // Storage may be unavailable
  }
}

export function getAlertHistory(): HistoricalAlert[] {
  try {
    const raw = sessionStorage.getItem(ALERT_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearAlertHistory(): void {
  sessionStorage.removeItem(ALERT_HISTORY_KEY);
}
