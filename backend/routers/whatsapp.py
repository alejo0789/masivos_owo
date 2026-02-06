"""WhatsApp direct messaging router."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from services.whatsapp_service import get_whatsapp_service

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])


class Recipient(BaseModel):
    """Recipient for WhatsApp message."""
    name: str
    phone: str
    email: Optional[str] = None
    # Additional fields that can be used as variables
    department: Optional[str] = None
    position: Optional[str] = None
    company: Optional[str] = None


class SendTemplateRequest(BaseModel):
    """Request to send a template message."""
    template_name: str = Field(..., description="Name of the approved WhatsApp template")
    language_code: str = Field(default="es_CO", description="Template language code")
    recipients: List[Recipient] = Field(..., min_length=1, description="List of recipients")
    variable_mapping: Optional[Dict[str, str]] = Field(
        default=None,
        description="Map template variables to recipient fields. E.g., {'nombre': 'name'}"
    )
    header_media_url: Optional[str] = Field(
        default=None,
        description="URL of the media file (image, video, or document) for templates with media headers"
    )


class SendSingleTemplateRequest(BaseModel):
    """Request to send a single template message."""
    template_name: str
    language_code: str = "es_CO"
    phone: str
    variables: Optional[Dict[str, str]] = None


class MessageResult(BaseModel):
    """Result of a single message send."""
    recipient: str
    phone: Optional[str]
    success: bool
    message_id: Optional[str] = None
    error: Optional[str] = None


class BulkSendResponse(BaseModel):
    """Response from bulk send operation."""
    total: int
    sent: int
    failed: int
    messages: List[MessageResult]


@router.post("/send-template", response_model=BulkSendResponse)
async def send_template_bulk(request: SendTemplateRequest):
    """
    Send a WhatsApp template message to multiple recipients.
    
    The variable_mapping parameter allows you to map template variables to recipient fields.
    For example, if your template has {{nombre}}, you can map it to the recipient's 'name' field:
    `{"nombre": "name"}`
    
    Common mappings:
    - nombre -> name
    - empresa -> company
    - cargo -> position
    - departamento -> department
    """
    from database import get_db
    from models.message_log import MessageLog
    from sqlalchemy.ext.asyncio import AsyncSession
    
    whatsapp_service = get_whatsapp_service()
    
    # Default variable mapping if not provided
    default_mapping = {
        "nombre": "name",
        "name": "name",
        "empresa": "company",
        "company": "company",
        "cargo": "position",
        "position": "position",
        "departamento": "department",
        "department": "department"
    }
    
    variable_mapping = request.variable_mapping or default_mapping
    
    # Convert recipients to dict format
    recipients_data = [
        {
            "name": r.name,
            "phone": r.phone,
            "email": r.email,
            "department": r.department,
            "position": r.position,
            "company": r.company
        }
        for r in request.recipients
    ]
    
    result = await whatsapp_service.send_bulk_template_messages(
        recipients=recipients_data,
        template_name=request.template_name,
        language_code=request.language_code,
        variable_mapping=variable_mapping,
        header_media_url=request.header_media_url
    )
    
    # Save to database
    async for db in get_db():
        try:
            for msg_result in result["messages"]:
                # Get template content for logging (simplified)
                message_content = f"Template: {request.template_name}"
                
                log_entry = MessageLog(
                    recipient_name=msg_result["recipient"],
                    recipient_phone=msg_result.get("phone"),
                    recipient_email=None,
                    subject=None,
                    message_content=message_content,
                    channel="whatsapp",
                    status="sent" if msg_result["success"] else "failed",
                    error_message=msg_result.get("error"),
                    attachments=[]
                )
                db.add(log_entry)
            
            await db.commit()
        except Exception as e:
            print(f"Error saving to history: {e}")
            await db.rollback()
        finally:
            break
    
    return BulkSendResponse(
        total=result["total"],
        sent=result["sent"],
        failed=result["failed"],
        messages=[MessageResult(**msg) for msg in result["messages"]]
    )


@router.post("/send-single")
async def send_single_template(request: SendSingleTemplateRequest):
    """
    Send a WhatsApp template message to a single recipient.
    
    Variables should be provided as a dict mapping variable names to values.
    E.g., {"nombre": "Juan", "empresa": "Acme Corp"}
    """
    whatsapp_service = get_whatsapp_service()
    
    # Build components from variables
    components = None
    if request.variables:
        body_params = []
        for var_name, value in request.variables.items():
            if value:  # Only add non-empty values
                body_params.append({
                    "type": "text",
                    "parameter_name": var_name,  # Include parameter name
                    "text": str(value)
                })
        
        if body_params:
            components = [{
                "type": "body",
                "parameters": body_params
            }]
    
    result = await whatsapp_service.send_template_message(
        to_phone=request.phone,
        template_name=request.template_name,
        language_code=request.language_code,
        components=components
    )
    
    # Save to database
    from database import get_db
    from models.message_log import MessageLog
    
    async for db in get_db():
        try:
            message_content = f"Template: {request.template_name}"
            
            log_entry = MessageLog(
                recipient_name=request.recipient_name or "Unknown",
                recipient_phone=request.phone,
                recipient_email=None,
                subject=None,
                message_content=message_content,
                channel="whatsapp",
                status="sent" if result["success"] else "failed",
                error_message=result.get("error"),
                attachments=[]
            )
            db.add(log_entry)
            await db.commit()
        except Exception as e:
            print(f"Error saving to history: {e}")
            await db.rollback()
        finally:
            break
    
    if result["success"]:
        return {
            "success": True,
            "message_id": result.get("message_id"),
            "phone": result.get("phone"),
            "status": "sent"
        }
    else:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Failed to send message",
                "error": result.get("error"),
                "error_code": result.get("error_code")
            }
        )


@router.get("/config-status")
async def check_whatsapp_config():
    """
    Check if WhatsApp API is properly configured.
    """
    whatsapp_service = get_whatsapp_service()
    
    has_token = bool(whatsapp_service.access_token)
    has_business_id = bool(whatsapp_service.business_account_id)
    has_phone_id = bool(whatsapp_service.phone_number_id)
    
    return {
        "configured": has_token and has_business_id and has_phone_id,
        "details": {
            "access_token": has_token,
            "business_account_id": has_business_id,
            "phone_number_id": has_phone_id
        },
        "can_fetch_templates": has_token and has_business_id,
        "can_send_messages": has_token and has_phone_id
    }
