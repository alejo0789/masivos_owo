"""Messages router for sending messages."""
import re
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
from database import get_db, async_session
from models.message_log import MessageLog
from schemas.message import BulkMessageCreate, MessageResponse, BulkSendResponse, WebhookCallback
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


async def send_bulk_background(
    batch_id: str,
    channel: str,
    recipients_whatsapp: List[Dict[str, Any]],
    recipients_email: List[Dict[str, Any]],
    subject: str,
    content: str,
    attachment_data: List[Dict[str, Any]]
):
    """Background task to send bulk messages to n8n."""
    # Send to WhatsApp webhook
    if recipients_whatsapp:
        await webhook_service.send_bulk_whatsapp(
            recipients=recipients_whatsapp,
            message=content,
            attachments=attachment_data,
            batch_id=batch_id
        )
    
    # Send to Email webhook
    if recipients_email:
        await webhook_service.send_bulk_email(
            recipients=recipients_email,
            subject=subject,
            message=content,
            attachments=attachment_data,
            batch_id=batch_id
        )


@router.post("/callback")
async def webhook_callback(callback: WebhookCallback):
    """
    Callback from n8n to update message status.
    """
    print(f"[CALLBACK] Recibido batch_id: {callback.batch_id}")
    updated_count = 0
    
    async with async_session() as db:
        for result in callback.results:
            print(f"[CALLBACK] Procesando resultado: {result.email or result.phone} - Success: {result.success}")
            if result.email:
                stmt = (
                    update(MessageLog)
                    .where(MessageLog.batch_id == callback.batch_id)
                    .where(MessageLog.recipient_email == result.email)
                    .values(
                        status="sent" if result.success else "failed",
                        error_message=result.error
                    )
                )
                res = await db.execute(stmt)
                updated_count += res.rowcount
            elif result.phone:
                stmt = (
                    update(MessageLog)
                    .where(MessageLog.batch_id == callback.batch_id)
                    .where(MessageLog.recipient_phone == result.phone)
                    .values(
                        status="sent" if result.success else "failed",
                        error_message=result.error
                    )
                )
                res = await db.execute(stmt)
                updated_count += res.rowcount
        
        await db.commit()
    
    print(f"[CALLBACK] Actualizados {updated_count} registros en la base de datos")
    return {"status": "ok", "total_received": len(callback.results), "actual_updates": updated_count}


@router.post("/send-bulk", response_model=BulkSendResponse)
async def send_bulk_messages(
    bulk_message: BulkMessageCreate, 
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Send the same message to multiple recipients.
    Creates records as 'pending' and triggers n8n in background.
    """
    if not bulk_message.recipients:
        raise HTTPException(status_code=400, detail="Se requiere al menos un destinatario")
    
    # Generate unique ID for this batch
    batch_id = str(uuid.uuid4())
    
    # Prepare attachments once
    attachment_data = await webhook_service.prepare_attachments(bulk_message.attachments)
    
    # Separate recipients by channel capability
    whatsapp_recipients = []
    email_recipients = []
    log_entries: List[MessageLog] = []
    
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
                "message": personalized_message
            })
        
        if bulk_message.channel in ("email", "both") and recipient.email:
            email_recipients.append({
                "name": recipient.name,
                "email": recipient.email,
                "phone": recipient.phone,
                "message": personalized_message
            })
            
        # Create log entry
        log_entry = MessageLog(
            recipient_name=recipient.name,
            recipient_phone=recipient.phone,
            recipient_email=recipient.email,
            subject=bulk_message.subject,
            message_content=bulk_message.content,
            channel=bulk_message.channel,
            status="pending",
            attachments=bulk_message.attachments,
            batch_id=batch_id
        )
        db.add(log_entry)
        log_entries.append(log_entry)
    
    await db.flush()
    
    # Queue the actual sending to n8n
    background_tasks.add_task(
        send_bulk_background,
        batch_id=batch_id,
        channel=bulk_message.channel,
        recipients_whatsapp=whatsapp_recipients,
        recipients_email=email_recipients,
        subject=bulk_message.subject or "Mensaje",
        content=bulk_message.content,
        attachment_data=attachment_data
    )
    
    return BulkSendResponse(
        total=len(bulk_message.recipients),
        sent=0,
        failed=0,
        batch_id=batch_id,
        messages=[MessageResponse.model_validate(log) for log in log_entries]
    )
