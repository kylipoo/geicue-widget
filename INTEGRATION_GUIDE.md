# 🤖 Widget + LangGraph Integration Guide

This guide explains how to integrate your LangGraph conversation system with the feedback widget to enable intelligent conversations with users.

## 📋 Overview

The integration consists of:

1. **Enhanced Widget** - React component with conversation capabilities
2. **Conversation Service** - JavaScript service for API communication
3. **Python Backend** - FastAPI server with LangGraph integration
4. **LangGraph System** - Your existing prompt generation system

## 🚀 Quick Start

### 1. Start the Backend Server

```bash
cd backend
pip install -r requirements.txt
python app.py
```

The server will run on `http://localhost:8000`

### 2. Update Widget Configuration

In your host page, enable conversation mode:

```javascript
window.renderMyWidget("vault-widget-container", {
  enableContextDetection: true,
  enableConversation: true, // Enable AI conversations
  secondary_button_label: "Cancel",
  primary_button_label: "Submit",
  onSuccess: function (message) {
    console.log("Success:", message);
  },
  onExit: function () {
    // Handle exit
  },
});
```

### 3. Set Environment Variables

Create a `.env` file in your widget project:

```env
REACT_APP_LANGGRAPH_API_URL=http://localhost:8000
```

## 🔧 Architecture

### Frontend (Widget)

- **Context Detection**: Automatically detects page type, errors, and user context
- **Conversation UI**: Chat interface with message history
- **Service Integration**: Communicates with backend via REST API

### Backend (FastAPI + LangGraph)

- **LangGraph Integration**: Uses your existing prompt generation system
- **Session Management**: Maintains conversation state
- **Context Awareness**: Processes page context and user information
- **Fallback Responses**: Handles errors gracefully

### LangGraph System

- **State Management**: Tracks conversation flow
- **Context Processing**: Handles user requirements and feedback
- **Response Generation**: Creates intelligent responses

## 🎯 Features

### Context-Aware Conversations

The widget automatically detects:

- **Page Type**: Payment, account, support, or general pages
- **Technical Errors**: Console errors, network failures, JavaScript exceptions
- **User Context**: URL, user agent, timestamp, search parameters

### Intelligent Responses

The AI assistant can help with:

- **Technical Issues**: Troubleshooting and error resolution
- **Product Questions**: Guidance and feature explanations
- **Feedback Collection**: Structured feedback gathering
- **General Support**: Customer service assistance

### Conversation Flow

1. **User clicks "Start Conversation"**
2. **Context is sent to backend** (page type, errors, etc.)
3. **LangGraph processes the context**
4. **AI generates contextual welcome message**
5. **User and AI exchange messages**
6. **Conversation history is maintained**

## 🔌 API Endpoints

### Chat Endpoint

```http
POST /chat
{
  "message": "I'm having trouble with my payment",
  "session_id": "session_123456",
  "context": {
    "pageType": "payment",
    "errors": [],
    "url": "https://example.com/payment"
  }
}
```

### Conversation Management

- `POST /conversation/start` - Start new conversation
- `POST /conversation/end` - End conversation
- `POST /conversation/clear` - Clear history
- `GET /conversation/history/{session_id}` - Get history

## 🛠️ Customization

### Backend Customization

Edit `backend/app.py` to customize:

1. **System Prompt**: Modify the conversation_chain function
2. **Context Processing**: Add custom context handling
3. **Response Logic**: Implement custom response generation
4. **Error Handling**: Add custom error responses

### Frontend Customization

Edit `src/Widget.jsx` to customize:

1. **UI Design**: Modify conversation interface styling
2. **Context Detection**: Add custom page type detection
3. **Error Handling**: Custom error display
4. **Suggestions**: Custom contextual suggestions

### LangGraph Integration

Your existing notebook system can be enhanced:

1. **Add Conversation States**: Extend your graph with conversation nodes
2. **Context Processing**: Use page context in prompt generation
3. **Response Templates**: Create templates for different scenarios
4. **Analytics**: Track conversation effectiveness

## 📊 Monitoring

### LangSmith Integration

The backend automatically sends traces to LangSmith:

- **Project**: "Widget Conversation Agent"
- **Endpoint**: `https://langsmith.np1.az.cloud.geico.net/`
- **Traces**: All conversations and responses

### Sentry Integration

Error tracking is enabled:

- **Frontend**: Widget errors and API failures
- **Backend**: Server errors and LangGraph issues
- **Context**: Page context and user information

## 🔒 Security Considerations

### Production Deployment

1. **CORS Configuration**: Restrict origins in production
2. **API Keys**: Use environment variables for sensitive data
3. **Rate Limiting**: Implement request throttling
4. **Input Validation**: Validate all user inputs
5. **Session Management**: Use secure session handling

### Data Privacy

1. **PII Handling**: Avoid logging sensitive user data
2. **Data Retention**: Implement conversation cleanup
3. **Consent**: Ensure user consent for AI interactions
4. **GDPR Compliance**: Handle data deletion requests

## 🧪 Testing

### Backend Testing

```bash
cd backend
python -m pytest tests/
```

### Frontend Testing

```bash
npm test
```

### Integration Testing

1. Start backend server
2. Load widget in browser
3. Test conversation flow
4. Verify context detection
5. Check error handling

## 🚀 Deployment

### Backend Deployment

```bash
# Using Docker
docker build -t widget-backend .
docker run -p 8000:8000 widget-backend

# Using uvicorn directly
uvicorn app:app --host 0.0.0.0 --port 8000
```

### Frontend Deployment

```bash
npm run build
# Deploy dist/ folder to your web server
```

## 🔍 Troubleshooting

### Common Issues

1. **Backend Connection Failed**

   - Check if server is running on port 8000
   - Verify CORS configuration
   - Check network connectivity

2. **LangGraph Not Available**

   - Verify API keys are set
   - Check LangSmith connectivity
   - Review LangGraph initialization logs

3. **Context Detection Issues**

   - Check browser console for errors
   - Verify page URL patterns
   - Review context detection logic

4. **Conversation Not Working**
   - Check API endpoints
   - Verify session management
   - Review conversation flow

### Debug Mode

Enable debug logging:

```javascript
// In widget configuration
debug: true;
```

## 📈 Analytics

### Conversation Metrics

- **Session Duration**: How long users chat
- **Message Count**: Number of exchanges
- **Resolution Rate**: Problems solved
- **User Satisfaction**: Ratings and feedback

### Context Analytics

- **Page Types**: Most common conversation contexts
- **Error Patterns**: Common technical issues
- **User Journeys**: Conversation flow patterns

## 🔄 Updates and Maintenance

### Regular Updates

1. **LangGraph Updates**: Keep LangGraph and LangChain updated
2. **Security Patches**: Regular dependency updates
3. **Feature Enhancements**: Add new conversation capabilities
4. **Performance Optimization**: Monitor and improve response times

### Monitoring

1. **Health Checks**: Regular API health monitoring
2. **Error Tracking**: Monitor Sentry for issues
3. **Performance Metrics**: Track response times
4. **User Feedback**: Collect and analyze user feedback

## 📚 Additional Resources

- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://reactjs.org/docs/)
- [LangSmith Documentation](https://docs.smith.langchain.com/)

## 🤝 Support

For issues or questions:

1. Check the troubleshooting section
2. Review logs and error messages
3. Test with minimal configuration
4. Contact the development team

---

This integration enables your widget to have intelligent, context-aware conversations with users while maintaining the professional feedback collection capabilities. The system is designed to be scalable, secure, and easily customizable for your specific needs.
