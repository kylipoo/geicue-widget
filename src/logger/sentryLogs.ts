import * as Sentry from "@sentry/react";

type ExtraData = Record<string, unknown>;

const logToSentry = (
  level: "info" | "warning" | "fatal" | "log" | "debug",
  message: string,
  extraData: ExtraData = {}
): void => {
  Sentry.withScope((scope) => {
    try {
      Object.entries(extraData).forEach(([key, value]) => {
        scope.setExtra(key, value);
        if (key === "responseBody") {
          scope.setTag("responseBody", JSON.stringify(value));
        }
        if (key === "responseStatus") {
          scope.setTag("responseStatus", String(value));
        }
      });
    } catch (error) {
      console.error("Failed to parse extraData in logger level:", error);
    }

    Sentry.captureMessage(message, level);
  });
};

export const logger = {
  info: (message: string, extraData: ExtraData = {}) =>
    logToSentry("info", message, extraData),
  warn: (message: string, extraData: ExtraData = {}) =>
    logToSentry("warning", message, extraData),
  fatal: (message: string, extraData: ExtraData = {}) =>
    logToSentry("fatal", message, extraData),
  log: (message: string, extraData: ExtraData = {}) =>
    logToSentry("log", message, extraData),
  debug: (message: string, extraData: ExtraData = {}) =>
    logToSentry("debug", message, extraData),
  error: (error: unknown, message: string, extraData: ExtraData = {}) => {
    Sentry.withScope((scope) => {
      try {
        Object.entries(extraData).forEach(([key, value]) => {
          scope.setExtra(key, value);
          if (key === "responseBody") {
            scope.setTag("responseBody", JSON.stringify(value));
          }
          if (key === "responseStatus") {
            scope.setTag("responseStatus", String(value));
          }
        });
        if (message) {
          scope.setTag("message", message);
        }
        Sentry.captureException(error);
      } catch (error) {
        console.error("Failed to parse extraData in logger:", error);
        Sentry.captureException(error);
      }
    });
  },
};
