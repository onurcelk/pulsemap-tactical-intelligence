import { supabase } from './supabase';

export type ActionType = 'click' | 'view_intel' | 'region_select' | 'search';

interface TrackEventProps {
  userId?: string | null;
  eventId?: string;
  actionType: ActionType;
  region?: string;
  metadata?: Record<string, any>;
}

export const trackEvent = async ({
  userId,
  eventId,
  actionType,
  region,
  metadata = {},
}: TrackEventProps) => {
  try {
    const { error } = await supabase.from('event_analytics').insert({
      user_id: userId,
      event_id: eventId,
      action_type: actionType,
      region: region,
      metadata: {
        ...metadata,
        url: window.location.pathname,
        screen_size: `${window.innerWidth}x${window.innerHeight}`,
        user_agent: navigator.userAgent,
      },
    });

    if (error) {
      // Quiet fail to not interrupt user experience
      console.warn('Analytics sync failed:', error.message);
    }
  } catch (err) {
    // Analytics should never break the app
    console.debug('Analytics error:', err);
  }
};
