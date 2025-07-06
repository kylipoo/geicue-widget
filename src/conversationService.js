// Conversation Service for LangGraph Integration
import { logger } from "./logger/sentryLogs";

class ConversationService {
  constructor() {
    this.baseUrl =
      process.env.REACT_APP_LANGGRAPH_API_URL || "http://localhost:8000";
    this.sessionId = this.generateSessionId();
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async sendMessage(message, context = {}) {
    try {
      const payload = {
        message: message,
        session_id: this.sessionId,
        context: {
          ...context,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
          url: window.location.href,
        },
      };

      logger.info("Sending message to LangGraph", {
        level: "info",
        extra: { message, sessionId: this.sessionId, context },
      });

      const response = await fetch(`${this.baseUrl}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      logger.info("Received response from LangGraph", {
        level: "info",
        extra: { response: data, sessionId: this.sessionId },
      });

      return (
        data.response ||
        data.message ||
        "I'm sorry, I couldn't process your request."
      );
    } catch (error) {
      console.error("Error sending message to LangGraph:", error);
      logger.error(error, "Failed to send message to LangGraph", {
        extra: { message, sessionId: this.sessionId },
      });

      // Fallback response
      return this.getFallbackResponse(message);
    }
  }

  getFallbackResponse(message) {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes("help") || lowerMessage.includes("support")) {
      return "I'm here to help! I can assist you with technical issues, product questions, or general support. What would you like to know?";
    }

    if (lowerMessage.includes("payment") || lowerMessage.includes("billing")) {
      return "I understand you're having payment issues. Let me help you troubleshoot. Can you tell me more about what's happening?";
    }

    if (lowerMessage.includes("error") || lowerMessage.includes("problem")) {
      return "I see you're experiencing an issue. I've detected some technical problems on this page. Let me help you resolve them.";
    }

    if (lowerMessage.includes("feature") || lowerMessage.includes("request")) {
      return "Thank you for your feature request! I'll make sure this gets to our development team. Can you provide more details?";
    }

    if (lowerMessage.includes("bug") || lowerMessage.includes("issue")) {
      return "I'm sorry to hear you're experiencing a bug. Let me help you report this issue. Can you describe what happened?";
    }

    return "Thank you for your message. I'm here to help improve your experience. Is there anything specific you'd like to discuss?";
  }

  async startConversation(context = {}) {
    try {
      const payload = {
        action: "start_conversation",
        session_id: this.sessionId,
        context: {
          ...context,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
          url: window.location.href,
        },
      };

      const response = await fetch(`${this.baseUrl}/conversation/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return (
        data.welcome_message ||
        "Hello! I'm your AI assistant. How can I help you today?"
      );
    } catch (error) {
      console.error("Error starting conversation:", error);
      return "Hello! I'm your AI assistant. How can I help you today?";
    }
  }

  async endConversation() {
    try {
      const payload = {
        action: "end_conversation",
        session_id: this.sessionId,
        timestamp: new Date().toISOString(),
      };

      await fetch(`${this.baseUrl}/conversation/end`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error("Error ending conversation:", error);
    }
  }

  // Method to get conversation history
  async getConversationHistory() {
    try {
      const response = await fetch(
        `${this.baseUrl}/conversation/history/${this.sessionId}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      console.error("Error getting conversation history:", error);
      return [];
    }
  }

  // Method to clear conversation
  async clearConversation() {
    try {
      const payload = {
        action: "clear_conversation",
        session_id: this.sessionId,
        timestamp: new Date().toISOString(),
      };

      await fetch(`${this.baseUrl}/conversation/clear`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error("Error clearing conversation:", error);
    }
  }
}

// Create a singleton instance
const conversationService = new ConversationService();

export default conversationService;
