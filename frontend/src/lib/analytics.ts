import posthog from 'posthog-js';

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

export const trackEvent = (event: string, properties?: Record<string, unknown>) => {
  if (typeof window !== 'undefined') {
    if (POSTHOG_KEY) {
      posthog.capture(event, properties);
    } else {
      console.log(`[Analytics MOCK] Event: ${event}`, properties);
    }
  }
};

export const identifyUser = (userId: string, email?: string, properties?: Record<string, unknown>) => {
  if (typeof window !== 'undefined') {
    if (POSTHOG_KEY) {
      posthog.identify(userId, { email, ...properties });
    } else {
      console.log(`[Analytics MOCK] Identify User: ${userId}`, { email, ...properties });
    }
  }
};

export const resetAnalytics = () => {
  if (typeof window !== 'undefined') {
    if (POSTHOG_KEY) {
      posthog.reset();
    } else {
      console.log(`[Analytics MOCK] Reset`);
    }
  }
};
