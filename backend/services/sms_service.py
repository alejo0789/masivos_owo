"""LabsMobile SMS Service for sending text messages."""
import base64
import httpx
import logging
from typing import List, Optional
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class SMSService:
    """Service for sending SMS via LabsMobile API."""
    
    def __init__(self):
        self.api_url = settings.labsmobile_api_url
        self.username = settings.labsmobile_username
        self.token = settings.labsmobile_token
        self.sender = settings.labsmobile_sender
        self.ssl_verify = settings.ssl_verify
    
    def _get_auth_header(self) -> str:
        """Generate Base64 encoded Basic Auth header."""
        credentials = f"{self.username}:{self.token}"
        encoded = base64.b64encode(credentials.encode()).decode()
        return f"Basic {encoded}"
    
    def _format_phone(self, phone: str) -> str:
        """
        Format phone number to international format without '+'.
        LabsMobile expects numbers like: 573001234567
        """
        # Remove any non-digit characters
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        # If starts with 57 (Colombia), it's already formatted
        if clean_phone.startswith('57') and len(clean_phone) >= 12:
            return clean_phone
        
        # If it's a 10-digit Colombian number, add 57
        if len(clean_phone) == 10 and clean_phone.startswith('3'):
            return f"57{clean_phone}"
        
        # Return as-is if already has country code
        return clean_phone
    
    def is_configured(self) -> bool:
        """Check if LabsMobile is properly configured."""
        return bool(self.username and self.token and self.sender)
    
    async def send_single(
        self,
        phone: str,
        message: str,
        test_mode: bool = False
    ) -> dict:
        """
        Send a single SMS message.
        
        Args:
            phone: Recipient phone number
            message: Message text (max 160 chars for 1 SMS)
            test_mode: If True, simulates sending without actually sending
        
        Returns:
            dict with success status and details
        """
        if not self.is_configured():
            return {
                "success": False,
                "error": "LabsMobile no está configurado. Verifique LABSMOBILE_USERNAME, LABSMOBILE_TOKEN y LABSMOBILE_SENDER en .env"
            }
        
        formatted_phone = self._format_phone(phone)
        
        payload = {
            "message": message,
            "tpoa": self.sender,
            "recipient": [
                {"msisdn": formatted_phone}
            ]
        }
        
        if test_mode:
            payload["test"] = "1"
        
        headers = {
            "Authorization": self._get_auth_header(),
            "Content-Type": "application/json"
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0, verify=self.ssl_verify) as client:
                logger.info(f"Sending SMS to {formatted_phone}")
                logger.debug(f"Payload: {payload}")
                
                response = await client.post(
                    self.api_url,
                    json=payload,
                    headers=headers
                )
                
                logger.info(f"LabsMobile response status: {response.status_code}")
                logger.debug(f"LabsMobile response: {response.text}")
                
                data = response.json()
                
                # LabsMobile returns code "0" for success
                if data.get("code") == "0" or data.get("code") == 0:
                    return {
                        "success": True,
                        "phone": formatted_phone,
                        "message_id": data.get("subid"),
                        "credits_used": data.get("credits"),
                        "response": data
                    }
                else:
                    return {
                        "success": False,
                        "phone": formatted_phone,
                        "error": data.get("message", "Error desconocido"),
                        "code": data.get("code"),
                        "response": data
                    }
                    
        except httpx.HTTPError as e:
            logger.error(f"HTTP error sending SMS: {e}")
            return {
                "success": False,
                "phone": formatted_phone,
                "error": f"Error de conexión: {str(e)}"
            }
        except Exception as e:
            logger.error(f"Unexpected error sending SMS: {e}")
            return {
                "success": False,
                "phone": formatted_phone,
                "error": f"Error inesperado: {str(e)}"
            }
    
    async def send_bulk(
        self,
        recipients: List[dict],
        message: str,
        test_mode: bool = False
    ) -> dict:
        """
        Send SMS to multiple recipients.
        
        Args:
            recipients: List of dicts with 'phone', optionally 'name' and 'message' (personalized)
            message: Default message text (used if recipient doesn't have custom message)
            test_mode: If True, simulates sending
        
        Returns:
            dict with total, sent, failed counts and details
        """
        if not self.is_configured():
            return {
                "success": False,
                "total": len(recipients),
                "sent": 0,
                "failed": len(recipients),
                "error": "LabsMobile no está configurado"
            }
        
        # Check if recipients have individual messages (personalized)
        has_personalized = any(r.get("message") for r in recipients)
        
        if has_personalized:
            # Send individual SMS to each recipient with their personalized message
            total = len(recipients)
            sent = 0
            failed = 0
            total_credits = 0
            
            for recipient in recipients:
                phone = recipient.get("phone", "")
                if not phone:
                    failed += 1
                    continue
                
                # Use personalized message or default
                msg = recipient.get("message", message)
                
                result = await self.send_single(phone, msg, test_mode)
                if result.get("success"):
                    sent += 1
                    # Ensure credits_used is a number, default to 0 if None
                    credits = result.get("credits_used") or 0
                    total_credits += credits
                else:
                    failed += 1
            
            return {
                "success": sent > 0,
                "total": total,
                "sent": sent,
                "failed": failed,
                "credits_used": total_credits
            }
        
        # Original bulk send logic (same message to all)
        # Format all phone numbers
        formatted_recipients = []
        for r in recipients:
            phone = r.get("phone", "")
            if phone:
                formatted_recipients.append({
                    "msisdn": self._format_phone(phone)
                })
        
        if not formatted_recipients:
            return {
                "success": False,
                "total": len(recipients),
                "sent": 0,
                "failed": len(recipients),
                "error": "No hay números de teléfono válidos"
            }
        
        payload = {
            "message": message,
            "tpoa": self.sender,
            "recipient": formatted_recipients
        }
        
        if test_mode:
            payload["test"] = "1"
        
        headers = {
            "Authorization": self._get_auth_header(),
            "Content-Type": "application/json"
        }
        
        try:
            async with httpx.AsyncClient(timeout=60.0, verify=self.ssl_verify) as client:
                logger.info(f"Sending bulk SMS to {len(formatted_recipients)} recipients")
                
                response = await client.post(
                    self.api_url,
                    json=payload,
                    headers=headers
                )
                
                logger.info(f"LabsMobile bulk response status: {response.status_code}")
                data = response.json()
                
                if data.get("code") == "0" or data.get("code") == 0:
                    return {
                        "success": True,
                        "total": len(formatted_recipients),
                        "sent": len(formatted_recipients),
                        "failed": 0,
                        "message_id": data.get("subid"),
                        "credits_used": data.get("credits"),
                        "response": data
                    }
                else:
                    return {
                        "success": False,
                        "total": len(formatted_recipients),
                        "sent": 0,
                        "failed": len(formatted_recipients),
                        "error": data.get("message", "Error desconocido"),
                        "code": data.get("code"),
                        "response": data
                    }
                    
        except Exception as e:
            logger.error(f"Error in bulk SMS: {e}")
            return {
                "success": False,
                "total": len(recipients),
                "sent": 0,
                "failed": len(recipients),
                "error": str(e)
            }
    
    async def get_credits(self) -> dict:
        """
        Get account credit balance.
        
        Returns:
            dict with credits info
        """
        if not self.is_configured():
            return {
                "success": False,
                "error": "LabsMobile no está configurado"
            }
        
        headers = {
            "Authorization": self._get_auth_header(),
            "Content-Type": "application/json"
        }
        
        try:
            # LabsMobile credit check endpoint
            async with httpx.AsyncClient(timeout=30.0, verify=self.ssl_verify) as client:
                response = await client.get(
                    "https://api.labsmobile.com/json/balance",
                    headers=headers
                )
                
                data = response.json()
                return {
                    "success": True,
                    "credits": data.get("credits"),
                    "response": data
                }
                
        except Exception as e:
            logger.error(f"Error getting credits: {e}")
            return {
                "success": False,
                "error": str(e)
            }


# Singleton instance
sms_service = SMSService()
