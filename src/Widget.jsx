import React, { useState, useEffect } from "react";
import * as Sentry from "@sentry/react";
import { logger } from "./logger/sentryLogs";
import conversationService from "./conversationService";

// Context detection utilities
const detectPageContext = () => {
  const context = {
    url: window.location.href,
    title: document.title,
    pathname: window.location.pathname,
    searchParams: Object.fromEntries(
      new URLSearchParams(window.location.search)
    ),
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
  };

  // Detect common page types
  if (
    context.pathname.includes("/payment") ||
    context.pathname.includes("/checkout")
  ) {
    context.pageType = "payment";
  } else if (
    context.pathname.includes("/account") ||
    context.pathname.includes("/profile")
  ) {
    context.pageType = "account";
  } else if (
    context.pathname.includes("/support") ||
    context.pathname.includes("/help")
  ) {
    context.pageType = "support";
  } else {
    context.pageType = "general";
  }

  return context;
};

const detectErrors = () => {
  const errors = [];

  // Check for console errors
  const originalError = console.error;
  console.error = (...args) => {
    errors.push({
      type: "console_error",
      message: args.join(" "),
      timestamp: new Date().toISOString(),
    });
    originalError.apply(console, args);
  };

  // Check for network errors
  const originalFetch = window.fetch;
  window.fetch = (...args) => {
    return originalFetch.apply(window, args).catch((error) => {
      errors.push({
        type: "network_error",
        message: error.message,
        url: args[0],
        timestamp: new Date().toISOString(),
      });
      throw error;
    });
  };

  // Check for JavaScript errors
  window.addEventListener("error", (event) => {
    errors.push({
      type: "js_error",
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      timestamp: new Date().toISOString(),
    });
  });

  return errors;
};

const getContextualSuggestions = (context, errors) => {
  const suggestions = [];

  // Page-specific suggestions
  if (context.pageType === "payment") {
    suggestions.push(
      "Having trouble with your payment?",
      "Payment method not working?",
      "Need help with billing information?"
    );
  } else if (context.pageType === "account") {
    suggestions.push(
      "Account access issues?",
      "Profile update problems?",
      "Security concerns?"
    );
  } else if (context.pageType === "support") {
    suggestions.push(
      "Couldn't find what you're looking for?",
      "Need more specific help?",
      "Want to report a bug?"
    );
  }

  // Error-based suggestions
  if (errors.length > 0) {
    const recentErrors = errors.filter(
      (error) => new Date(error.timestamp) > new Date(Date.now() - 60000) // Last minute
    );

    if (recentErrors.length > 0) {
      suggestions.push(
        "Experiencing technical issues?",
        "Page not loading correctly?",
        "Something not working as expected?"
      );
    }
  }

  // Default suggestions
  if (suggestions.length === 0) {
    suggestions.push(
      "How can we improve this page?",
      "Found a bug or issue?",
      "Have a feature request?",
      "General feedback?"
    );
  }

  return suggestions;
};

// Conversation state management
const useConversation = () => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationMode, setConversationMode] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  const sendMessage = async (content, context = {}, errors = []) => {
    if (!content.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: "user",
      content,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Use the conversation service to send message to LangGraph backend
      const messageContext = {
        pageType: context?.pageType || "general",
        errors: errors || [],
        url: window.location.href,
        userAgent: navigator.userAgent,
      };

      const response = await conversationService.sendMessage(content, messageContext);

      const aiMessage = {
        id: Date.now() + 1,
        type: "ai",
        content: response,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      Sentry.captureException(error);
      
      // Add error message to conversation
      const errorMessage = {
        id: Date.now() + 1,
        type: "ai",
        content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const startConversation = async (context = {}, errors = []) => {
    try {
      setIsLoading(true);
      const messageContext = {
        pageType: context?.pageType || "general",
        errors: errors || [],
        url: window.location.href,
        userAgent: navigator.userAgent,
      };

      const welcomeMessage = await conversationService.startConversation(messageContext);
      
      const aiMessage = {
        id: Date.now(),
        type: "ai",
        content: welcomeMessage,
        timestamp: new Date().toISOString(),
      };

      setMessages([aiMessage]);
      setConversationMode(true);
    } catch (error) {
      console.error("Error starting conversation:", error);
      Sentry.captureException(error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearConversation = async () => {
    try {
      await conversationService.clearConversation();
      setMessages([]);
    } catch (error) {
      console.error("Error clearing conversation:", error);
      // Still clear local messages even if backend call fails
      setMessages([]);
    }
  };

  const endConversation = async () => {
    try {
      await conversationService.endConversation();
    } catch (error) {
      console.error("Error ending conversation:", error);
    }
  };

  return {
    messages,
    isLoading,
    conversationMode,
    setConversationMode,
    sendMessage,
    clearConversation,
    startConversation,
    endConversation,
  };
};

const Widget = ({
  secondary_button_label,
  primary_button_label,
  onSuccess,
  onExit,
  enableContextDetection = true,
  enableConversation = true,
}) => {
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState(null);
  const [subject, setSubject] = useState("");
  const [context, setContext] = useState(null);
  const [errors, setErrors] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showContextInfo, setShowContextInfo] = useState(false);
  const [currentView, setCurrentView] = useState("feedback"); // 'feedback' or 'conversation'
  const [issueType, setIssueType] = useState("");
  const [details, setDetails] = useState("");
  const [effort, setEffort] = useState(null);
  const [helpType, setHelpType] = useState("");
  const [screenshot, setScreenshot] = useState(null); // Placeholder for screenshot logic

  const {
    messages,
    isLoading,
    conversationMode,
    setConversationMode,
    sendMessage,
    clearConversation,
    startConversation,
    endConversation,
  } = useConversation();

  useEffect(() => {
    if (enableContextDetection) {
      // Detect initial context
      const pageContext = detectPageContext();
      setContext(pageContext);

      // Detect errors
      const detectedErrors = detectErrors();
      setErrors(detectedErrors);

      // Generate contextual suggestions
      const contextualSuggestions = getContextualSuggestions(
        pageContext,
        detectedErrors
      );
      setSuggestions(contextualSuggestions);

      // Log context for debugging
      logger.info("Widget context detected", {
        level: "info",
        extra: { context: pageContext, errors: detectedErrors },
      });
    }
  }, [enableContextDetection]);

  // Auto-start conversation when switching to conversation view
  useEffect(() => {
    if (currentView === "conversation" && messages.length === 0 && !isLoading) {
      startConversation(context, errors);
    }
  }, [currentView, messages.length, isLoading, context, errors]);

  const handleSubmit = (e) => {
    e.preventDefault();
    try {
      const feedbackData = {
        issueType,   // what best describes the issue
        details,     // anything else you want to tell us
        effort,      // how much effort did this take
        helpType,    // what would help you right now
        context: enableContextDetection ? context : null,
        errors: enableContextDetection ? errors : [],
        timestamp: new Date().toISOString(),
        url: window.location.href,
      };

      console.log("Feedback Submitted:", feedbackData);
      logger.info("Customer's feedback", {
        level: "info",
        extra: feedbackData,
      });
      Sentry.captureMessage("Customer's feedback", {
        level: "info",
        extra: feedbackData,
      });
      onSuccess("Feedback submitted successfully!");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      Sentry.captureException(error);
    }
  };

  const handleExit = () => {
    try {
      console.log("User exited the widget");
      Sentry.captureMessage("User exited the widget", { level: "info" });
      onExit();
    } catch (error) {
      console.error("Error during exit:", error);
      Sentry.captureException(error);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setFeedback((prev) => prev + (prev ? "\n\n" : "") + suggestion);
  };

  const handleConversationInput = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const message = e.target.value.trim();
      if (message) {
        sendMessage(message, context, errors);
        e.target.value = "";
      }
    }
  };

  // Tab bar
  const tabBar = (
    <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: 16 }}>
      <button
        style={{
          flex: 1,
          padding: '12px 0',
          background: currentView === 'feedback' ? '#fff' : '#f1f5f9',
          border: 'none',
          borderBottom: currentView === 'feedback' ? '2px solid #2563eb' : '2px solid transparent',
          fontWeight: 600,
          color: currentView === 'feedback' ? '#2563eb' : '#64748b',
          cursor: 'pointer',
        }}
        onClick={() => setCurrentView('feedback')}
      >
        Feedback
      </button>
      <button
        style={{
          flex: 1,
          padding: '12px 0',
          background: currentView === 'conversation' ? '#fff' : '#f1f5f9',
          border: 'none',
          borderBottom: currentView === 'conversation' ? '2px solid #2563eb' : '2px solid transparent',
          fontWeight: 600,
          color: currentView === 'conversation' ? '#2563eb' : '#64748b',
          cursor: 'pointer',
        }}
        onClick={() => setCurrentView('conversation')}
      >
        AI Assistant
      </button>
    </div>
  );

  // Feedback form redesign
  const renderFeedbackView = () => (
    <form onSubmit={handleSubmit} style={{ padding: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#174ea6', margin: 0 }}>
          Need a Hand? <span role="img" aria-label="thinking">🤔</span>
        </h2>
        <button type="button" onClick={handleExit} style={{ background: 'none', border: 'none', fontSize: 24, color: '#174ea6', cursor: 'pointer' }}>&times;</button>
      </div>
      <div style={{ marginBottom: 16, color: '#374151', fontSize: 15 }}>
        Looks like this step might be tricky. Want to tell us what's going on?
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontWeight: 500, color: '#374151', marginBottom: 4, display: 'block' }}>What best describes the issue?</label>
        <select
          value={issueType}
          onChange={e => setIssueType(e.target.value)}
          required
          style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 15 }}
        >
          <option value="">Select an option...</option>
          <option value="technical">Technical Issue</option>
          <option value="billing">Billing/Payment</option>
          <option value="feature">Feature Request</option>
          <option value="bug">Bug Report</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontWeight: 500, color: '#374151', marginBottom: 4, display: 'block' }}>Anything else you want to tell us? (optional)</label>
        <textarea
          value={details}
          onChange={e => setDetails(e.target.value)}
          placeholder="Feel free to share more details..."
          style={{ width: '100%', minHeight: 60, padding: 10, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 15 }}
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontWeight: 500, color: '#374151', marginBottom: 4, display: 'block' }}>How much effort did this take? (optional)</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {['😅', '🙂', '😩', '😡'].map((emoji, idx) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setEffort(idx)}
              style={{
                fontSize: 24,
                background: effort === idx ? '#2563eb' : '#f1f5f9',
                color: effort === idx ? '#fff' : '#374151',
                border: 'none',
                borderRadius: 8,
                padding: '8px 12px',
                cursor: 'pointer',
                outline: effort === idx ? '2px solid #2563eb' : 'none',
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontWeight: 500, color: '#374151', marginBottom: 4, display: 'block' }}>Screenshot (optional)</label>
        <button type="button" style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 600, cursor: 'pointer' }} disabled>
          <span role="img" aria-label="camera">📸</span> Take Screenshot
        </button>
      </div>
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontWeight: 500, color: '#374151', marginBottom: 4, display: 'block' }}>What would help you right now? (optional)</label>
        <select
          value={helpType}
          onChange={e => setHelpType(e.target.value)}
          style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 15 }}
        >
          <option value="">Select an option...</option>
          <option value="call">A call from support</option>
          <option value="chat">Live chat</option>
          <option value="faq">FAQ/Help Article</option>
          <option value="other">Other</option>
        </select>
      </div>
      <button
        type="submit"
        style={{ width: '100%', background: '#174ea6', color: '#fff', fontWeight: 700, fontSize: 17, border: 'none', borderRadius: 8, padding: '14px 0', cursor: 'pointer', marginTop: 8 }}
        disabled={!issueType}
      >
        Send
      </button>
    </form>
  );

  const renderConversationView = () => (
    <>
      <div style={styles.header}>
        <div style={styles.conversationHeader}>
          <button
            type="button"
            onClick={async () => {
              await endConversation();
              setCurrentView("feedback");
            }}
            style={styles.backButton}
          >
            ← Back to Feedback
          </button>
          <h2 style={styles.title}>AI Assistant</h2>
          <button
            type="button"
            onClick={clearConversation}
            style={styles.clearButton}
          >
            Clear Chat
          </button>
        </div>
        <p style={styles.subtitle}>
          I'm here to help! Ask me anything about your experience.
        </p>
      </div>

      <div style={styles.conversationContainer}>
        <div style={styles.messagesContainer}>
          {messages.length === 0 && !isLoading ? (
            <div style={styles.welcomeMessage}>
              <p>👋 Hello! I'm your AI assistant. I can help you with:</p>
              <ul>
                <li>Technical issues and troubleshooting</li>
                <li>Product questions and guidance</li>
                <li>Feedback and suggestions</li>
                <li>General support</li>
              </ul>
              <p>What would you like to discuss?</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                style={{
                  ...styles.message,
                  ...(message.type === "user"
                    ? styles.userMessage
                    : styles.aiMessage),
                }}
              >
                <div style={styles.messageContent}>{message.content}</div>
                <div style={styles.messageTimestamp}>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div style={{ ...styles.message, ...styles.aiMessage }}>
              <div style={styles.typingIndicator}>
                <span style={{ ...styles.typingDot, animationDelay: "-0.32s" }}></span>
                <span style={{ ...styles.typingDot, animationDelay: "-0.16s" }}></span>
                <span style={styles.typingDot}></span>
              </div>
            </div>
          )}
        </div>

        <div style={styles.inputContainer}>
          <textarea
            placeholder="Type your message here..."
            onKeyDown={handleConversationInput}
            style={styles.conversationInput}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => {
              const input = document.querySelector(
                'textarea[placeholder="Type your message here..."]'
              );
              if (input) {
                const message = input.value.trim();
                if (message) {
                  sendMessage(message, context, errors);
                  input.value = "";
                }
              }
            }}
            style={styles.sendButton}
            disabled={isLoading}
          >
            Send
          </button>
        </div>
      </div>

      <div style={styles.buttonContainer}>
        <button type="button" style={styles.cancelButton} onClick={handleExit}>
          {secondary_button_label || "Close"}
        </button>
      </div>
    </>
  );

  return (
    <div style={styles.container}>
      {tabBar}
      {currentView === "feedback" ? renderFeedbackView() : renderConversationView()}
    </div>
  );
};

const messageBase = {
  marginBottom: "12px",
  maxWidth: "80%",
};

// Add CSS keyframes for typing animation
const typingKeyframes = `
  @keyframes typing {
    0%, 80%, 100% {
      transform: scale(0.8);
      opacity: 0.5;
    }
    40% {
      transform: scale(1);
      opacity: 1;
    }
  }
`;

// Inject the keyframes into the document
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = typingKeyframes;
  document.head.appendChild(style);
}

const styles = {
  container: {
    background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "32px",
    maxWidth: "480px",
    margin: "20px auto",
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    boxShadow:
      "0 10px 25px rgba(0, 0, 0, 0.08), 0 4px 10px rgba(0, 0, 0, 0.04)",
    backdropFilter: "blur(10px)",
  },
  header: {
    textAlign: "center",
    marginBottom: "24px",
  },
  title: {
    fontSize: "24px",
    fontWeight: "600",
    color: "#1a202c",
    margin: "0 0 8px 0",
    letterSpacing: "-0.025em",
  },
  subtitle: {
    fontSize: "14px",
    color: "#64748b",
    margin: "0 0 16px 0",
    fontWeight: "400",
  },
  conversationHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  backButton: {
    background: "none",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    padding: "6px 12px",
    fontSize: "12px",
    color: "#6b7280",
    cursor: "pointer",
    transition: "all 0.2s ease",
    "&:hover": {
      backgroundColor: "#f9fafb",
      borderColor: "#9ca3af",
    },
  },
  clearButton: {
    background: "none",
    border: "1px solid #fecaca",
    borderRadius: "6px",
    padding: "6px 12px",
    fontSize: "12px",
    color: "#ef4444",
    cursor: "pointer",
    transition: "all 0.2s ease",
    "&:hover": {
      backgroundColor: "#fef2f2",
      borderColor: "#f87171",
    },
  },
  conversationToggle: {
    background: "none",
    border: "1px solid #3b82f6",
    borderRadius: "6px",
    padding: "6px 12px",
    fontSize: "12px",
    color: "#3b82f6",
    cursor: "pointer",
    transition: "all 0.2s ease",
    marginTop: "8px",
    "&:hover": {
      backgroundColor: "#eff6ff",
      borderColor: "#2563eb",
    },
  },
  contextToggle: {
    background: "none",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    padding: "6px 12px",
    fontSize: "12px",
    color: "#6b7280",
    cursor: "pointer",
    transition: "all 0.2s ease",
    "&:hover": {
      backgroundColor: "#f9fafb",
      borderColor: "#9ca3af",
    },
  },
  contextInfo: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "16px",
    marginBottom: "24px",
  },
  contextTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#374151",
    margin: "0 0 8px 0",
  },
  contextDetails: {
    fontSize: "12px",
    color: "#6b7280",
    lineHeight: "1.4",
  },
  suggestionsContainer: {
    marginBottom: "24px",
  },
  suggestionsLabel: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#374151",
    margin: "0 0 12px 0",
  },
  suggestionsList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  suggestionButton: {
    background: "none",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    padding: "8px 12px",
    fontSize: "12px",
    color: "#6b7280",
    cursor: "pointer",
    textAlign: "left",
    transition: "all 0.2s ease",
    "&:hover": {
      backgroundColor: "#f3f4f6",
      borderColor: "#d1d5db",
    },
  },
  conversationContainer: {
    display: "flex",
    flexDirection: "column",
    height: "400px",
    marginBottom: "24px",
  },
  messagesContainer: {
    flex: "1",
    overflowY: "auto",
    padding: "16px",
    background: "#f8fafc",
    borderRadius: "8px",
    marginBottom: "16px",
    maxHeight: "300px",
  },
  message: {
    ...messageBase,
  },
  messageContent: {
    padding: "12px 16px",
    borderRadius: "12px",
    fontSize: "14px",
    lineHeight: "1.4",
  },
  userMessage: {
    ...messageBase,
    alignSelf: "flex-end",
    marginLeft: "auto",
    "& .messageContent": {
      backgroundColor: "#3b82f6",
      color: "#ffffff",
    },
  },
  aiMessage: {
    ...messageBase,
    alignSelf: "flex-start",
    marginRight: "auto",
    "& .messageContent": {
      backgroundColor: "#ffffff",
      color: "#1f2937",
      border: "1px solid #e5e7eb",
    },
  },
  messageTimestamp: {
    fontSize: "10px",
    color: "#9ca3af",
    marginTop: "4px",
    textAlign: "right",
  },
  typingIndicator: {
    display: "flex",
    gap: "4px",
    padding: "12px 16px",
  },
  typingDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#9ca3af",
    animation: "typing 1.4s infinite ease-in-out",
  },
  welcomeMessage: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: "14px",
    "& ul": {
      textAlign: "left",
      margin: "12px 0",
      paddingLeft: "20px",
    },
    "& li": {
      marginBottom: "4px",
    },
  },
  inputContainer: {
    display: "flex",
    gap: "8px",
    alignItems: "flex-end",
  },
  conversationInput: {
    flex: "1",
    padding: "12px 16px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "14px",
    fontFamily: "inherit",
    resize: "none",
    minHeight: "44px",
    maxHeight: "120px",
    outline: "none",
    transition: "all 0.2s ease",
    "&:focus": {
      borderColor: "#3b82f6",
      boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
    },
  },
  sendButton: {
    padding: "12px 20px",
    border: "none",
    borderRadius: "8px",
    backgroundColor: "#3b82f6",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "all 0.2s ease",
    "&:hover:not(:disabled)": {
      backgroundColor: "#2563eb",
    },
    "&:disabled": {
      backgroundColor: "#9ca3af",
      cursor: "not-allowed",
    },
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
  },
  label: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#374151",
    marginBottom: "8px",
    letterSpacing: "0.025em",
  },
  textarea: {
    padding: "12px 16px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    width: "100%",
    height: "120px",
    fontSize: "14px",
    fontFamily: "inherit",
    resize: "vertical",
    transition: "all 0.2s ease",
    backgroundColor: "#ffffff",
    color: "#1f2937",
    boxSizing: "border-box",
    outline: "none",
    "&:focus": {
      borderColor: "#3b82f6",
      boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
    },
  },
  select: {
    padding: "12px 16px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    width: "100%",
    backgroundColor: "#ffffff",
    height: "48px",
    fontSize: "14px",
    fontFamily: "inherit",
    appearance: "none",
    backgroundImage:
      "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e\")",
    backgroundPosition: "right 12px center",
    backgroundRepeat: "no-repeat",
    backgroundSize: "16px",
    color: "#1f2937",
    transition: "all 0.2s ease",
    outline: "none",
    "&:focus": {
      borderColor: "#3b82f6",
      boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
    },
  },
  ratingSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  ratingLabel: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#374151",
    marginBottom: "16px",
    textAlign: "center",
  },
  ratingContainer: {
    display: "flex",
    gap: "16px",
    justifyContent: "center",
  },
  ratingButton: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "16px 24px",
    border: "2px solid #e5e7eb",
    borderRadius: "12px",
    cursor: "pointer",
    fontSize: "16px",
    backgroundColor: "#ffffff",
    transition: "all 0.2s ease",
    minWidth: "80px",
    outline: "none",
    "&:hover": {
      borderColor: "#3b82f6",
      backgroundColor: "#f8fafc",
      transform: "translateY(-1px)",
    },
  },
  activeRating: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
    color: "#ffffff",
    boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
  },
  ratingEmoji: {
    fontSize: "24px",
    marginBottom: "4px",
  },
  ratingText: {
    fontSize: "12px",
    fontWeight: "500",
  },
  buttonContainer: {
    display: "flex",
    gap: "12px",
    marginTop: "8px",
  },
  cancelButton: {
    flex: "1",
    padding: "12px 20px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    backgroundColor: "#ffffff",
    color: "#374151",
    transition: "all 0.2s ease",
    outline: "none",
    "&:hover": {
      backgroundColor: "#f9fafb",
      borderColor: "#9ca3af",
    },
  },
  submitButton: {
    flex: "2",
    padding: "12px 20px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    backgroundColor: "#3b82f6",
    color: "#ffffff",
    transition: "all 0.2s ease",
    outline: "none",
    "&:hover:not(:disabled)": {
      backgroundColor: "#2563eb",
      transform: "translateY(-1px)",
      boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
    },
    "&:disabled": {
      backgroundColor: "#9ca3af",
      cursor: "not-allowed",
      transform: "none",
      boxShadow: "none",
    },
  },
};

export default Widget;
