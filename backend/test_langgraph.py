#!/usr/bin/env python3
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_imports():
    """Test if all required modules can be imported"""
    print("Testing imports...")
    
    try:
        from langgraph.graph import StateGraph, END
        print("✓ StateGraph and END imported successfully")
    except ImportError as e:
        print(f"✗ StateGraph import failed: {e}")
        return False
    
    try:
        from langchain_openai import ChatOpenAI
        print("✓ ChatOpenAI imported successfully")
    except ImportError as e:
        print(f"✗ ChatOpenAI import failed: {e}")
        return False
    
    try:
        from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
        print("✓ LangChain messages imported successfully")
    except ImportError as e:
        print(f"✗ LangChain messages import failed: {e}")
        return False
    
    try:
        from langgraph.checkpoint.memory import MemorySaver
        print("✓ MemorySaver imported successfully")
    except ImportError as e:
        print(f"✗ MemorySaver import failed: {e}")
        return False
    
    return True

def test_api_connection():
    """Test direct API connection"""
    print("\nTesting API connection...")
    
    api_key = os.getenv("API_KEY")
    base_url = os.getenv("BASE_URL")
    model_name = os.getenv("MODEL_NAME")
    
    print(f"API Key: {api_key[:10]}..." if api_key else "API Key: None")
    print(f"Base URL: {base_url}")
    print(f"Model Name: {model_name}")
    
    if not all([api_key, base_url, model_name]):
        print("✗ Missing environment variables")
        return False
    
    try:
        from langchain_openai import ChatOpenAI
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
        print("✓ ChatOpenAI initialized successfully")
        
        # Test a simple message
        from langchain_core.messages import HumanMessage
        response = llm.invoke([HumanMessage(content="Hello")])
        print(f"✓ API test successful: {response.content}")
        return True
        
    except Exception as e:
        print(f"✗ API test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_langgraph_setup():
    """Test LangGraph setup"""
    print("\nTesting LangGraph setup...")
    
    try:
        from langgraph.graph import StateGraph, END
        from langchain_openai import ChatOpenAI
        from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
        from langgraph.checkpoint.memory import MemorySaver
        from typing import TypedDict, Annotated, List
        from langgraph.graph.message import add_messages
        from pydantic import SecretStr
        import httpx
        
        # Get environment variables
        api_key = os.getenv("API_KEY")
        base_url = os.getenv("BASE_URL")
        model_name = os.getenv("MODEL_NAME")
        
        # Initialize LLM with SSL bypass
        client = httpx.Client(verify=False)
        
        llm = ChatOpenAI(
            api_key=SecretStr(api_key),
            base_url=base_url,
            model=model_name,
            http_client=client,
        )
        
        # Define conversation state
        class ConversationState(TypedDict):
            messages: Annotated[List, add_messages]
        
        # Create conversation graph
        workflow = StateGraph(ConversationState)
        
        def conversation_chain(state):
            messages = state["messages"]
            system_message = SystemMessage(content="You are a helpful assistant.")
            response = llm.invoke([system_message] + messages)
            return {"messages": [response]}
        
        workflow.add_node("conversation", conversation_chain)
        
        # Add proper START edge
        workflow.set_entry_point("conversation")
        workflow.add_edge("conversation", END)
        
        # Compile the graph
        memory = MemorySaver()
        graph = workflow.compile(checkpointer=memory)
        
        print("✓ LangGraph setup successful")
        return True
        
    except Exception as e:
        print(f"✗ LangGraph setup failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=== LangGraph Debug Test ===\n")
    
    # Test 1: Imports
    imports_ok = test_imports()
    
    # Test 2: API Connection
    api_ok = test_api_connection()
    
    # Test 3: LangGraph Setup
    langgraph_ok = test_langgraph_setup()
    
    print(f"\n=== Results ===")
    print(f"Imports: {'✓' if imports_ok else '✗'}")
    print(f"API Connection: {'✓' if api_ok else '✗'}")
    print(f"LangGraph Setup: {'✓' if langgraph_ok else '✗'}")
    
    if all([imports_ok, api_ok, langgraph_ok]):
        print("\n🎉 All tests passed! LangGraph should work.")
    else:
        print("\n❌ Some tests failed. Check the output above.") 