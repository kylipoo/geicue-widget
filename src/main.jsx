import React from "react";
import ReactDOM from "react-dom/client";
import Widget from "./Widget";
import "./logger/instrument";
import { logger } from "./logger/sentryLogs";

function showWidgetOnError() {
  const containerId = "vault-widget-container";
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement("div");
    container.id = containerId;
    // Optionally, style or position the widget container
    container.style.position = "fixed";
    container.style.bottom = "20px";
    container.style.right = "20px";
    container.style.zIndex = "9999";
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);
    root.render(<Widget errorTriggered={true} />);
  }
  container.style.display = "block";
  // Hide the feedback button if present
  const feedbackButton = document.getElementById("feedback-button");
  if (feedbackButton) feedbackButton.style.display = "none";
}

// Global error handler for uncaught errors
window.onerror = function (message, source, lineno, colno, error) {
  logger.error(error || message, "Uncaught JS error on host page", {
    message,
    source,
    lineno,
    colno,
    stack: error && error.stack,
    timestamp: new Date().toISOString(),
  });
  showWidgetOnError();
};

// Global handler for unhandled promise rejections
window.addEventListener("unhandledrejection", function (event) {
  logger.error(event.reason, "Unhandled promise rejection on host page", {
    reason: event.reason,
    timestamp: new Date().toISOString(),
  });
  showWidgetOnError();
});

window.renderMyWidget = function (containerId, props) {
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`Container with id ${containerId} not found`);
  }
  const root = ReactDOM.createRoot(container);
  root.render(<Widget {...props} />);
};
