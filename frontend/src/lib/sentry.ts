import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || '';

let sentryInitialized = false;

export const initSentry = () => {
  if (typeof window !== 'undefined' && SENTRY_DSN && !sentryInitialized) {
    Sentry.init({
      dsn: SENTRY_DSN,
      tracesSampleRate: 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });
    sentryInitialized = true;
  }
};

export const captureException = (error: unknown, context?: Record<string, unknown>) => {
  if (SENTRY_DSN) {
    Sentry.captureException(error, { extra: context });
  } else {
    console.error(`[Sentry MOCK] Error Captured:`, error, context);
  }
};

export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  if (SENTRY_DSN) {
    Sentry.captureMessage(message, level);
  } else {
    console.log(`[Sentry MOCK] Message Captured [${level}]:`, message);
  }
};
