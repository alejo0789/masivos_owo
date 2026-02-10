"""SMS router for LabsMobile integration."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models.message_log import MessageLog
from services.sms_service import sms_service

router = APIRouter(prefix="/sms", tags=["sms"])

class SMSRequest(BaseModel):
    phone: str
    message: str
    test: bool = False

class BulkSMSRequest(BaseModel):
    recipients: List[dict]  # List of {"phone": "...", "name": "..."}
    message: str
    test: bool = False

@router.post("/send")
async def send_sms(request: SMSRequest, db: AsyncSession = Depends(get_db)):
    """Send a single SMS."""
    result = await sms_service.send_single(
        phone=request.phone,
        message=request.message,
        test_mode=request.test
    )
    
    # Save to history
    log_entry = MessageLog(
        recipient_name="Unknown", # Single send might not have name context
        recipient_phone=request.phone,
        message_content=request.message,
        channel="sms",
        status="sent" if result["success"] else "failed",
        error_message=result.get("error"),
        subject="SMS Individual"
    )
    db.add(log_entry)
    await db.commit()
    await db.refresh(log_entry)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "Error sending SMS"))
    
    return result

@router.post("/send-bulk")
async def send_bulk_sms(request: BulkSMSRequest, db: AsyncSession = Depends(get_db)):
    """Send bulk SMS."""
    try:
        result = await sms_service.send_bulk(
            recipients=request.recipients,
            message=request.message,
            test_mode=request.test
        )
        
        # Save logs for each recipient
        general_success = result["success"]
        general_error = result.get("error")
        
        # Ensure error is a string
        if general_error and not isinstance(general_error, str):
            general_error = str(general_error)
        
        for recipient in request.recipients:
            name = recipient.get("name", "Unknown")
            phone = recipient.get("phone", "")
            # Use personalized message if available, otherwise use default
            message_content = recipient.get("message", request.message)
            
            status = "sent" if general_success else "failed"
            error = general_error
            
            # Additional check: invalid phone numbers might be filtered by service
            if not phone:
                status = "failed"
                error = "Sin número de teléfono"
                
            log_entry = MessageLog(
                recipient_name=name,
                recipient_phone=phone,
                message_content=message_content,  # Save personalized message
                channel="sms",
                status=status,
                error_message=error,
                subject="SMS Masivo"
            )
            db.add(log_entry)
            
        await db.commit()
        
        if not general_success:
            raise HTTPException(status_code=400, detail=general_error or "Error sending bulk SMS")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error in send_bulk_sms: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@router.get("/credits")
async def get_credits():
    """Get SMS credits balance."""
    result = await sms_service.get_credits()
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "Error getting credits"))
    return result
