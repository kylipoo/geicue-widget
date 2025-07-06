from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import json
from datetime import datetime
import uuid
from dotenv import load_dotenv
from ai_analysis import process_sentry_logs
import threading

# Load environment variables from .env file
load_dotenv()

# Import your LangGraph components
try:
    from langgraph.graph import StateGraph, END
    from langchain_openai import ChatOpenAI
    from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
    from langchain_core.prompts import PromptTemplate
    from pydantic import BaseModel as PydanticBaseModel
    from typing import TypedDict, Annotated
    # from langgraph.checkpoint.memory import MemorySaver  # Not needed without checkpointer
    from langgraph.graph.message import add_messages
except ImportError as e:
    print(f"Warning: LangGraph components not available: {e}")
    # Fallback for when LangGraph is not available
    pass

app = FastAPI(title="Widget Conversation API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for API requests/responses
class ChatRequest(BaseModel):
    message: str
    session_id: str
    context: Optional[Dict[str, Any]] = {}

class ConversationStartRequest(BaseModel):
    action: str
    session_id: str
    context: Optional[Dict[str, Any]] = {}

class ConversationEndRequest(BaseModel):
    action: str
    session_id: str
    timestamp: str

class ChatResponse(BaseModel):
    response: str
    session_id: str
    timestamp: str

# In-memory storage for conversations (use a proper database in production)
conversation_store = {}

# Initialize LangGraph components
def initialize_langgraph():
    """Initialize the LangGraph conversation system"""
    try:
        print("Starting LangGraph initialization...")
        
        # Get environment variables from .env file
        api_key = os.getenv("API_KEY")
        base_url = os.getenv("BASE_URL")
        model_name = os.getenv("MODEL_NAME")
        
        print(f"API Key: {api_key[:10]}..." if api_key else "API Key: None")
        print(f"Base URL: {base_url}")
        print(f"Model Name: {model_name}")
        
        if not api_key or not base_url or not model_name:
            print("Missing required environment variables: API_KEY, BASE_URL, or MODEL_NAME")
            return None, None
        
        # LangSmith setup (optional) - Disabled due to SSL issues
        print("Setting up LangSmith...")
        os.environ["LANGSMITH_TRACING_V2"] = "false"  # Disable LangSmith tracing
        # os.environ["LANGCHAIN_ENDPOINT"] = "https://langsmith.np1.az.cloud.geico.net/api/v1"
        # os.environ["LANGCHAIN_API_KEY"] = api_key
        # os.environ["LANGCHAIN_PROJECT"] = "Widget Conversation Agent"

        # Initialize LLM with SSL verification disabled for internal API
        print("Initializing ChatOpenAI...")
        from pydantic import SecretStr
        import httpx
        
        # Create custom HTTP client that skips SSL verification
        client = httpx.Client(verify=False)
        
        llm = ChatOpenAI(
            api_key=SecretStr(api_key),
            base_url=base_url,
            model=model_name,
            http_client=client,
        )
        print("ChatOpenAI initialized successfully")

        # Define conversation state
        print("Setting up conversation state...")
        class ConversationState(TypedDict):
            messages: Annotated[List, add_messages]

        # Create conversation graph
        print("Creating StateGraph...")
        workflow = StateGraph(ConversationState)
        
        def conversation_chain(state):
            """Main conversation handler"""
            messages = state["messages"]
            
            # Add system context based on page context
            system_message = SystemMessage(content="""
            You are a helpful AI assistant integrated into a feedback widget. 
            Your role is to help users with:
            - Technical issues and troubleshooting
            - Product questions and guidance  
            - Feedback and suggestions
            - General support
            
            Be helpful, concise, and professional. If the user mentions technical issues,
            acknowledge them and offer assistance. If they have feedback, encourage them
            to provide details.
            """)
            
            # Process with LLM
            response = llm.invoke([system_message] + messages)
            return {"messages": [response]}

        print("Adding conversation node...")
        workflow.add_node("conversation", conversation_chain)
        
        # Add proper START edge
        workflow.set_entry_point("conversation")
        workflow.add_edge("conversation", END)
        
        # Compile the graph
        print("Compiling graph...")
        graph = workflow.compile()  # Remove checkpointer to avoid complexity
        print("Graph compiled successfully")
        
        print("LangGraph initialization completed successfully!")
        return graph, llm
        
    except Exception as e:
        print(f"Error initializing LangGraph: {e}")
        import traceback
        traceback.print_exc()
        return None, None

# Initialize the system
graph, llm = initialize_langgraph()

def get_fallback_response(message: str, context: Dict[str, Any]) -> str:
    """Fallback response when LangGraph is not available"""
    lower_message = message.lower()
    
    if 'help' in lower_message or 'support' in lower_message:
        return "I'm here to help! I can assist you with technical issues, product questions, or general support. What would you like to know?"
    
    if 'payment' in lower_message or 'billing' in lower_message:
        return "I understand you're having payment issues. Let me help you troubleshoot. Can you tell me more about what's happening?"
    
    if 'error' in lower_message or 'problem' in lower_message:
        return "I see you're experiencing an issue. I've detected some technical problems on this page. Let me help you resolve them."
    
    if 'feature' in lower_message or 'request' in lower_message:
        return "Thank you for your feature request! I'll make sure this gets to our development team. Can you provide more details?"
    
    if 'bug' in lower_message or 'issue' in lower_message:
        return "I'm sorry to hear you're experiencing a bug. Let me help you report this issue. Can you describe what happened?"
    
    return "Thank you for your message. I'm here to help improve your experience. Is there anything specific you'd like to discuss?"

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Handle chat messages"""
    try:
        session_id = request.session_id
        message = request.message
        context = request.context or {}
        
        # Store the user message
        if session_id not in conversation_store:
            conversation_store[session_id] = []
        
        conversation_store[session_id].append({
            "role": "user",
            "content": message,
            "timestamp": datetime.now().isoformat(),
            "context": context
        })
        
        # Process with LangGraph if available
        if graph and llm:
            try:
                # Convert to LangChain messages
                messages = []
                for msg in conversation_store[session_id][-5:]:  # Last 5 messages for context
                    if msg["role"] == "user":
                        messages.append(HumanMessage(content=msg["content"]))
                    elif msg["role"] == "assistant":
                        messages.append(AIMessage(content=msg["content"]))
                
                # Add current message
                messages.append(HumanMessage(content=message))
                
                # Process with graph
                result = graph.invoke({"messages": messages})
                response = result["messages"][-1].content
                
            except Exception as e:
                print(f"LangGraph error: {e}")
                response = get_fallback_response(message, context)
        else:
            response = get_fallback_response(message, context)
        
        # Store the assistant response
        conversation_store[session_id].append({
            "role": "assistant", 
            "content": response,
            "timestamp": datetime.now().isoformat()
        })
        
        return ChatResponse(
            response=response,
            session_id=session_id,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/conversation/start")
async def start_conversation(request: ConversationStartRequest):
    """Start a new conversation"""
    try:
        session_id = request.session_id
        context = request.context or {}
        
        # Initialize conversation store
        conversation_store[session_id] = []
        
        # Generate welcome message based on context
        page_type = context.get('pageType', 'general')
        
        if page_type == 'payment':
            welcome_message = "Hello! I'm here to help with your payment experience. How can I assist you today?"
        elif page_type == 'account':
            welcome_message = "Hello! I'm here to help with your account. What can I help you with?"
        elif page_type == 'support':
            welcome_message = "Hello! I'm here to provide support. How can I help you?"
        else:
            welcome_message = "Hello! I'm your AI assistant. How can I help you today?"
        
        # Store welcome message
        conversation_store[session_id].append({
            "role": "assistant",
            "content": welcome_message,
            "timestamp": datetime.now().isoformat()
        })
        
        return {
            "welcome_message": welcome_message,
            "session_id": session_id,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"Error starting conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/conversation/end")
async def end_conversation(request: ConversationEndRequest):
    """End a conversation"""
    try:
        session_id = request.session_id
        
        # Clean up conversation data (in production, save to database)
        if session_id in conversation_store:
            # Save conversation summary or analytics here
            del conversation_store[session_id]
        
        return {"status": "success", "message": "Conversation ended"}
        
    except Exception as e:
        print(f"Error ending conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/conversation/clear")
async def clear_conversation(request: ConversationEndRequest):
    """Clear conversation history"""
    try:
        session_id = request.session_id
        
        if session_id in conversation_store:
            conversation_store[session_id] = []
        
        return {"status": "success", "message": "Conversation cleared"}
        
    except Exception as e:
        print(f"Error clearing conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/conversation/history/{session_id}")
async def get_conversation_history(session_id: str):
    """Get conversation history"""
    try:
        if session_id in conversation_store:
            return {"messages": conversation_store[session_id]}
        else:
            return {"messages": []}
            
    except Exception as e:
        print(f"Error getting conversation history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "langgraph_available": graph is not None,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/process-sentry-logs")
def process_sentry_logs_endpoint(background_tasks: BackgroundTasks):
    """Trigger Sentry log processing (AI analysis + Slack alerting)"""
    background_tasks.add_task(process_sentry_logs)
    return {"status": "processing started"}

# --- Background task to process Sentry logs every 5 minutes (placeholder) ---
def schedule_sentry_processing():
    process_sentry_logs()
    # Schedule next run in 5 minutes
    threading.Timer(300, schedule_sentry_processing).start()

# Start background processing when app starts
import sys
if "uvicorn" in sys.argv[0]:
    schedule_sentry_processing()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 