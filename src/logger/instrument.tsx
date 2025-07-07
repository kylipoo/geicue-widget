import * as Sentry from "@sentry/react";

// Only initialize Sentry in browser environment
if (typeof window !== "undefined") {
  Sentry.init({
    dsn: "https://9c94623b88006b0d1503e0e81ad3e0a2@o4509624254660608.ingest.us.sentry.io/4509624336384001",
    environment: "development",
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    // Tracing
    tracesSampleRate: 1.0, //  Capture 100% of the transactions
    // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
    tracePropagationTargets: ["localhost", /^https:\/\/yourserver\.io\/api/],
    // Session Replay
    replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
    replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
  });
}
