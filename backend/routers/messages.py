"""Messages router for sending messages."""
import re
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
from database import get_db
from models.message_log import MessageLog
from schemas.message import BulkMessageCreate, MessageResponse, BulkSendResponse
from services.webhook_service import webhook_service
from services.file_service import file_service

router = APIRouter(prefix="/messages", tags=["messages"])


def replace_variables(message: str, recipient: Dict[str, Any]) -> str:
    """
    Replace template variables in message with recipient data.
    
    Supported variables:
    - {nombre} or {name} - Recipient's name
    - {email} - Recipient's email
    - {telefono} or {phone} - Recipient's phone
    - {primer_nombre} or {first_name} - First name only
    """
    if not message:
        return message
    
    replacements = {
        # Spanish variables
        '{nombre}': recipient.get('name', ''),
        '{email}': recipient.get('email', ''),
        '{telefono}': recipient.get('phone', ''),
        '{primer_nombre}': recipient.get('name', '').split()[0] if recipient.get('name') else '',
        # English variables (for compatibility)
        '{name}': recipient.get('name', ''),
        '{phone}': recipient.get('phone', ''),
        '{first_name}': recipient.get('name', '').split()[0] if recipient.get('name') else '',
    }
    
    result = message
    for var, value in replacements.items():
        result = result.replace(var, value or '')
    
    return result


@router.post("/upload-files", response_model=List[str])
async def upload_files(files: List[UploadFile] = File(...)):
    """Upload files for message attachments."""
    if not files:
        raise HTTPException(status_code=400, detail="No se proporcionaron archivos")
    
    filenames = await file_service.save_files(files)
    return filenames


@router.delete("/files/{filename}")
async def delete_file(filename: str):
    """Delete an uploaded file."""
    if file_service.delete_file(filename):
        return {"message": "Archivo eliminado correctamente"}
    raise HTTPException(status_code=404, detail="Archivo no encontrado")


@router.post("/send-bulk", response_model=BulkSendResponse)
async def send_bulk_messages(bulk_message: BulkMessageCreate, db: AsyncSession = Depends(get_db)):
    """
    Send the same message to multiple recipients.
    Sends ONE request to the webhook with ALL recipients.
    Waits for n8n response with actual sent/failed counts.
    """
    if not bulk_message.recipients:
        raise HTTPException(status_code=400, detail="Se requiere al menos un destinatario")
    
    # Prepare attachments once
    attachment_data = await webhook_service.prepare_attachments(bulk_message.attachments)
    
    # Separate recipients by channel capability and personalize messages
    whatsapp_recipients = []
    email_recipients = []
    
    for recipient in bulk_message.recipients:
        recipient_data = {
            "name": recipient.name,
            "phone": recipient.phone,
            "email": recipient.email
        }
        
        # Personalize message for this recipient
        personalized_message = replace_variables(bulk_message.content, recipient_data)
        
        if bulk_message.channel in ("whatsapp", "both") and recipient.phone:
            whatsapp_recipients.append({
                "name": recipient.name,
                "phone": recipient.phone,
                "email": recipient.email,
                "message": personalized_message  # Include personalized message
            })
        if bulk_message.channel in ("email", "both") and recipient.email:
            email_recipients.append({
                "name": recipient.name,
                "email": recipient.email,
                "phone": recipient.phone,
                "message": personalized_message  # Include personalized message
            })
    
    # Results from webhooks
    whatsapp_result = None
    email_result = None
    
    # Send to WhatsApp webhook
    if whatsapp_recipients:
        whatsapp_result = await webhook_service.send_bulk_whatsapp(
            recipients=whatsapp_recipients,
            message=bulk_message.content,
            attachments=attachment_data
        )
    
    # Send to Email webhook
    if email_recipients:
        email_result = await webhook_service.send_bulk_email(
            recipients=email_recipients,
            subject=bulk_message.subject or "Mensaje",
            message=bulk_message.content,
            attachments=attachment_data
        )
    
    # Build results map from webhook responses
    whatsapp_results_map = {}
    whatsapp_results_list = []
    if whatsapp_result and whatsapp_result.get("results"):
        whatsapp_results_list = whatsapp_result["results"]
        for r in whatsapp_results_list:
            if r.get("phone"):
                whatsapp_results_map[r["phone"]] = r
    
    email_results_map = {}
    email_results_list = []
    if email_result and email_result.get("results"):
        email_results_list = email_result["results"]
        for r in email_results_list:
            if r.get("email"):
                email_results_map[r["email"]] = r
    
    # Create log entries for each recipient
    log_entries: List[MessageLog] = []
    total_sent = 0
    total_failed = 0
    
    # Track indices for fallback matching when n8n doesn't return identifiers
    whatsapp_idx = 0
    email_idx = 0
    
    for recipient in bulk_message.recipients:
        recipient_status = "sent"
        recipient_error = None
        
        if bulk_message.channel == "whatsapp":
            if not recipient.phone:
                recipient_status = "failed"
                recipient_error = "Sin numero de telefono"
            elif whatsapp_result:
                # Try to get result by phone, fallback to index
                individual = whatsapp_results_map.get(recipient.phone)
                if individual is None and whatsapp_idx < len(whatsapp_results_list):
                    individual = whatsapp_results_list[whatsapp_idx]
                    whatsapp_idx += 1
                
                if individual:
                    if not individual.get("success", True):
                        recipient_status = "failed"
                        recipient_error = individual.get("error") or "Error en envio"
                elif not whatsapp_result.get("success", True):
                    recipient_status = "failed"
                    recipient_error = whatsapp_result.get("error", "Error en envio")
                    
        elif bulk_message.channel == "email":
            if not recipient.email:
                recipient_status = "failed"
                recipient_error = "Sin email"
            elif email_result:
                # Try to get result by email, fallback to index
                individual = email_results_map.get(recipient.email)
                if individual is None and email_idx < len(email_results_list):
                    individual = email_results_list[email_idx]
                    email_idx += 1
                
                if individual:
                    if not individual.get("success", True):
                        recipient_status = "failed"
                        recipient_error = individual.get("error") or "Error en envio"
                elif not email_result.get("success", True):
                    recipient_status = "failed"
                    recipient_error = email_result.get("error", "Error en envio")
                    
        else:  # both
            has_phone = bool(recipient.phone)
            has_email = bool(recipient.email)
            errors = []
            
            if not has_phone and not has_email:
                recipient_status = "failed"
                recipient_error = "Sin informacion de contacto"
            else:
                if has_phone and whatsapp_result:
                    individual = whatsapp_results_map.get(recipient.phone)
                    if individual is None and whatsapp_idx < len(whatsapp_results_list):
                        individual = whatsapp_results_list[whatsapp_idx]
                        whatsapp_idx += 1
                    
                    if individual and not individual.get("success", True):
                        errors.append(f"WhatsApp: {individual.get('error') or 'Error'}")
                    elif not individual and not whatsapp_result.get("success", True):
                        errors.append(f"WhatsApp: {whatsapp_result.get('error', 'Error')}")
                
                if has_email and email_result:
                    individual = email_results_map.get(recipient.email)
                    if individual is None and email_idx < len(email_results_list):
                        individual = email_results_list[email_idx]
                        email_idx += 1
                    
                    if individual and not individual.get("success", True):
                        errors.append(f"Email: {individual.get('error') or 'Error'}")
                    elif not individual and not email_result.get("success", True):
                        errors.append(f"Email: {email_result.get('error', 'Error')}")
                
                if errors:
                    recipient_status = "failed"
                    recipient_error = "; ".join(errors)
        
        if recipient_status == "sent":
            total_sent += 1
        else:
            total_failed += 1
        
        log_entry = MessageLog(
            recipient_name=recipient.name,
            recipient_phone=recipient.phone,
            recipient_email=recipient.email,
            subject=bulk_message.subject,
            message_content=bulk_message.content,
            channel=bulk_message.channel,
            status=recipient_status,
            error_message=recipient_error,
            attachments=bulk_message.attachments
        )
        db.add(log_entry)
        log_entries.append(log_entry)
    
    await db.flush()
    for entry in log_entries:
        await db.refresh(entry)
    
    return BulkSendResponse(
        total=len(bulk_message.recipients),
        sent=total_sent,
        failed=total_failed,
        messages=[MessageResponse.model_validate(log) for log in log_entries]
    )
