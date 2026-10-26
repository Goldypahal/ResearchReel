import posthog from 'posthog-js';
import { API_BASE_URL } from '@/lib/api/client';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || '';
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

let posthogInitialized = false;

export const initAnalytics = () => {
  if (typeof window !== 'undefined' && POSTHOG_KEY && !posthogInitialized) {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      loaded: (ph) => {
        if (process.env.NODE_ENV === 'development') ph.opt_out_capturing();
      },
    });
    posthogInitialized = true;
  }
};

/**
 * Product events go to ResearchReel's own /analytics/track endpoint (stored in
 * analytics_events), and to PostHog as well when a key is configured.
 * Fire-and-forget: telemetry must never break the UI.
 */
export const trackEvent = (event: string, properties?: Record<string, unknown>) => {
  if (typeof window === 'undefined') return;
  if (POSTHOG_KEY) posthog.capture(event, properties);
  try {
    const body = JSON.stringify({ eventName: event, payload: properties || {} });
    fetch(`${API_BASE_URL}/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // ignore
  }
};

export const identifyUser = (userId: string, email?: string, properties?: Record<string, unknown>) => {
  if (typeof window !== 'undefined' && POSTHOG_KEY) posthog.identify(userId, { email, ...properties });
};

export const resetAnalytics = () => {
  if (typeof window !== 'undefined' && POSTHOG_KEY) posthog.reset();
};
