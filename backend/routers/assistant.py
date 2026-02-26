"""Assistant router for AI-powered email drafting."""
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from config import get_settings

router = APIRouter(prefix="/assistant", tags=["assistant"])
settings = get_settings()


class Message(BaseModel):
    """Chat message model."""
    role: str  # 'user' or 'assistant'
    content: str


class AssistantRequest(BaseModel):
    """Request to the AI assistant."""
    messages: List[Message]
    context: Optional[str] = None  # 'template' or 'bulk_message'
    sessionId: Optional[str] = None  # Unique session identifier for n8n memory


class AssistantResponse(BaseModel):
    """Response from the AI assistant."""
    message: str
    html_preview: Optional[str] = None
    is_final: bool = False


@router.post("/chat", response_model=AssistantResponse)
async def chat_with_assistant(request: AssistantRequest):
    """
    Send a message to the AI assistant and get a response.
    The assistant helps draft emails and templates.
    """
    if not settings.webhook_assistant:
        raise HTTPException(
            status_code=500,
            detail="Assistant webhook not configured"
        )
    
    try:
        # Get only the last user message (current message)
        user_messages = [msg for msg in request.messages if msg.role == 'user']
        current_message = user_messages[-1].content if user_messages else ""
        
        # Prepare payload for n8n - only send current message and sessionId
        payload = {
            "message": current_message,
            "sessionId": request.sessionId,
            "context": request.context
        }
        
        # Send request to n8n webhook
        async with httpx.AsyncClient(timeout=60.0, verify=settings.ssl_verify) as client:
            response = await client.post(
                settings.webhook_assistant,
                json=payload
            )
            response.raise_for_status()
            
            # Parse n8n response
            data = response.json()
            
            # Handle both array and object responses from n8n
            if isinstance(data, list) and len(data) > 0:
                data = data[0]
            
            # n8n may return 'output' instead of 'message'
            output = data.get("output", "")
            message = data.get("message", output)
            
            # If the output contains HTML, use it as preview
            html_preview = data.get("html_preview")
            if not html_preview and output and ("<" in output and ">" in output):
                html_preview = output
                # Clean message for display (remove HTML for chat bubble)
                message = "✅ He generado una plantilla de correo. Puedes ver la vista previa a la derecha y aplicarla si te gusta."
            
            return AssistantResponse(
                message=message,
                html_preview=html_preview,
                is_final=data.get("is_final", bool(html_preview))
            )
            
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error communicating with assistant: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}"
        )


@router.post("/generate-template", response_model=Dict[str, Any])
async def generate_template(request: AssistantRequest):
    """
    Generate a complete email template using the AI assistant.
    Returns the final HTML and metadata.
    """
    if not settings.webhook_assistant:
        raise HTTPException(
            status_code=500,
            detail="Assistant webhook not configured"
        )
    
    try:
        # Add context for template generation
        payload = {
            "messages": [msg.dict() for msg in request.messages],
            "context": "template",
            "action": "generate_final"
        }
        
        async with httpx.AsyncClient(timeout=60.0, verify=settings.ssl_verify) as client:
            response = await client.post(
                settings.webhook_assistant,
                json=payload
            )
            response.raise_for_status()
            
            return response.json()
            
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating template: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}"
        )
