"""Webhook service for sending messages to n8n."""
import httpx
import base64
import os
from typing import Optional, List, Dict, Any
from config import get_settings

settings = get_settings()


class WebhookService:
    """Service for sending messages via webhooks."""
    
    def __init__(self):
        self.whatsapp_url = settings.webhook_whatsapp
        self.email_url = settings.webhook_email
        self.timeout = 600.0  # 10 minutes timeout for bulk operations
    
    async def send_bulk_whatsapp(
        self,
        recipients: List[Dict[str, Any]],
        message: str,
        attachments: Optional[List[Dict[str, Any]]] = None,
        batch_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send WhatsApp messages to multiple recipients in a single webhook call.
        """
        if not self.whatsapp_url:
            return {
                "success": False, 
                "error": "WhatsApp webhook URL not configured",
                "sent": 0,
                "failed": len(recipients),
                "results": []
            }
        
        payload = {
            "batch_id": batch_id,
            "channel": "whatsapp",
            "recipients": recipients,
            "message": message,
            "attachments": attachments or [],
            "total_recipients": len(recipients)
        }
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(self.whatsapp_url, json=payload)
                response.raise_for_status()
                
                # Parse response from n8n
                data = response.json() if response.text else {}
                
                return {
                    "success": data.get("success", True),
                    "sent": data.get("sent", len(recipients)),
                    "failed": data.get("failed", 0),
                    "results": data.get("results", []),
                    "error": data.get("error")
                }
        except httpx.TimeoutException:
            return {
                "success": False, 
                "error": "Webhook request timed out",
                "sent": 0,
                "failed": len(recipients),
                "results": []
            }
        except httpx.HTTPStatusError as e:
            return {
                "success": False, 
                "error": f"HTTP error: {e.response.status_code}",
                "sent": 0,
                "failed": len(recipients),
                "results": []
            }
        except Exception as e:
            return {
                "success": False, 
                "error": str(e),
                "sent": 0,
                "failed": len(recipients),
                "results": []
            }
    
    async def send_bulk_email(
        self,
        recipients: List[Dict[str, Any]],
        subject: str,
        message: str,
        attachments: Optional[List[Dict[str, Any]]] = None,
        batch_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send email messages to multiple recipients in a single webhook call.
        """
        if not self.email_url:
            return {
                "success": False, 
                "error": "Email webhook URL not configured",
                "sent": 0,
                "failed": len(recipients),
                "results": []
            }
        
        payload = {
            "batch_id": batch_id,
            "channel": "email",
            "recipients": recipients,
            "subject": subject or "Mensaje sin asunto",
            "message": message,
            "attachments": attachments or [],
            "total_recipients": len(recipients)
        }
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(self.email_url, json=payload)
                response.raise_for_status()
                
                # Parse response from n8n
                data = response.json() if response.text else {}
                
                return {
                    "success": data.get("success", True),
                    "sent": data.get("sent", len(recipients)),
                    "failed": data.get("failed", 0),
                    "results": data.get("results", []),
                    "error": data.get("error")
                }
        except httpx.TimeoutException:
            return {
                "success": False, 
                "error": "Webhook request timed out",
                "sent": 0,
                "failed": len(recipients),
                "results": []
            }
        except httpx.HTTPStatusError as e:
            return {
                "success": False, 
                "error": f"HTTP error: {e.response.status_code}",
                "sent": 0,
                "failed": len(recipients),
                "results": []
            }
        except Exception as e:
            return {
                "success": False, 
                "error": str(e),
                "sent": 0,
                "failed": len(recipients),
                "results": []
            }
    
    async def prepare_attachments(self, filenames: List[str]) -> List[Dict[str, Any]]:
        """Prepare attachments for webhook payload."""
        attachments = []
        upload_dir = settings.upload_dir
        
        for filename in filenames:
            filepath = os.path.join(upload_dir, filename)
            if os.path.exists(filepath):
                with open(filepath, "rb") as f:
                    data = base64.b64encode(f.read()).decode("utf-8")
                attachments.append({
                    "filename": filename,
                    "data": data
                })
        
        return attachments


# Singleton instance
webhook_service = WebhookService()
