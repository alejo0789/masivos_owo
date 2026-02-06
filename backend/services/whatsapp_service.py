"""WhatsApp Business API service for templates and direct messaging."""
import httpx
import re
import logging
from typing import List, Optional, Dict, Any
from config import get_settings

logger = logging.getLogger(__name__)


class WhatsAppService:
    """Service to interact with WhatsApp Business API."""
    
    BASE_URL = "https://graph.facebook.com/v18.0"
    
    def __init__(self):
        self.settings = get_settings()
        self.access_token = self.settings.whatsapp_access_token
        self.business_account_id = self.settings.whatsapp_business_account_id
        self.phone_number_id = self.settings.whatsapp_phone_number_id
    
    def _get_headers(self) -> Dict[str, str]:
        """Get authorization headers for API requests."""
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
    
    def _format_phone_number(self, phone: str) -> str:
        """
        Format phone number for WhatsApp API.
        Removes spaces, dashes, and ensures proper format.
        """
        # Remove all non-numeric characters except +
        cleaned = re.sub(r'[^\d+]', '', phone)
        
        # If starts with +, remove it (API expects number without +)
        if cleaned.startswith('+'):
            cleaned = cleaned[1:]
        
        # If it's a Colombian number without country code, add 57
        if len(cleaned) == 10 and cleaned.startswith('3'):
            cleaned = '57' + cleaned
        
        return cleaned
    
    async def get_templates(
        self,
        status: Optional[str] = None,
        limit: int = 100
    ) -> Dict[str, Any]:
        """
        Fetch message templates from WhatsApp Business API.
        
        Args:
            status: Filter by template status (APPROVED, PENDING, REJECTED)
            limit: Maximum number of templates to fetch
            
        Returns:
            Dictionary containing templates data and paging info
        """
        if not self.access_token or not self.business_account_id:
            return {
                "success": False,
                "error": "WhatsApp API credentials not configured",
                "data": []
            }
        
        url = f"{self.BASE_URL}/{self.business_account_id}/message_templates"
        params = {
            "limit": limit,
            "fields": "name,status,category,language,components,id"
        }
        
        if status:
            params["status"] = status
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    url,
                    headers=self._get_headers(),
                    params=params
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "success": True,
                        "data": data.get("data", []),
                        "paging": data.get("paging", {})
                    }
                else:
                    error_data = response.json()
                    return {
                        "success": False,
                        "error": error_data.get("error", {}).get("message", "Unknown error"),
                        "error_code": error_data.get("error", {}).get("code"),
                        "data": []
                    }
                    
        except httpx.TimeoutException:
            return {
                "success": False,
                "error": "Connection timeout to WhatsApp API",
                "data": []
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "data": []
            }
    
    async def get_template_by_name(self, template_name: str) -> Optional[Dict[str, Any]]:
        """
        Get a specific template by name.
        
        Args:
            template_name: Name of the template to fetch
            
        Returns:
            Template data if found, None otherwise
        """
        result = await self.get_templates()
        
        if result["success"]:
            for template in result["data"]:
                if template.get("name") == template_name:
                    return template
        
        return None
    
    async def send_template_message(
        self,
        to_phone: str,
        template_name: str,
        language_code: str = "es_CO",
        components: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Send a template message to a WhatsApp number.
        
        Args:
            to_phone: Recipient phone number
            template_name: Name of the approved template to send
            language_code: Language code of the template (e.g., 'es_CO', 'en_US')
            components: Optional list of components with variable values
            
        Returns:
            Dictionary with success status and message details
        """
        logger.info(f"Attempting to send template '{template_name}' to {to_phone}")
        
        if not self.phone_number_id:
            logger.error("WhatsApp Phone Number ID not configured")
            return {
                "success": False,
                "error": "WhatsApp Phone Number ID not configured"
            }
        
        url = f"{self.BASE_URL}/{self.phone_number_id}/messages"
        
        formatted_phone = self._format_phone_number(to_phone)
        logger.info(f"Formatted phone: {formatted_phone}")
        
        payload = {
            "messaging_product": "whatsapp",
            "to": formatted_phone,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {
                    "code": language_code
                }
            }
        }
        
        # Add components if provided (for variables)
        if components:
            payload["template"]["components"] = components
            logger.info(f"Template components: {components}")
        
        logger.info(f"Sending request to: {url}")
        logger.debug(f"Payload: {payload}")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    url,
                    headers=self._get_headers(),
                    json=payload
                )
                
                response_data = response.json()
                
                if response.status_code in [200, 201]:
                    logger.info(f"✅ Message sent successfully to {formatted_phone}. Message ID: {response_data.get('messages', [{}])[0].get('id')}")
                    return {
                        "success": True,
                        "message_id": response_data.get("messages", [{}])[0].get("id"),
                        "phone": formatted_phone,
                        "status": "sent"
                    }
                else:
                    error_msg = response_data.get("error", {}).get("message", "Unknown error")
                    error_code = response_data.get("error", {}).get("code")
                    logger.error(f"❌ Failed to send to {formatted_phone}. Status: {response.status_code}, Error: {error_msg}, Code: {error_code}")
                    logger.error(f"Full response: {response_data}")
                    return {
                        "success": False,
                        "error": error_msg,
                        "error_code": error_code,
                        "phone": formatted_phone
                    }
                    
        except httpx.TimeoutException:
            logger.error(f"⏱️ Timeout sending to {formatted_phone}")
            return {
                "success": False,
                "error": "Connection timeout",
                "phone": formatted_phone
            }
        except Exception as e:
            logger.error(f"💥 Exception sending to {formatted_phone}: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "phone": formatted_phone
            }
    
    async def send_bulk_template_messages(
        self,
        recipients: List[Dict[str, Any]],
        template_name: str,
        language_code: str = "es_CO",
        variable_mapping: Optional[Dict[str, str]] = None,
        header_media_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send template messages to multiple recipients.
        
        Args:
            recipients: List of recipients with 'phone' and other fields for variables
            template_name: Name of the approved template
            language_code: Language code of the template
            variable_mapping: Dict mapping template variables to recipient fields
                              e.g., {'nombre': 'name', 'empresa': 'company'}
            header_media_url: URL of the media file for templates with media headers
            
        Returns:
            Summary of sent and failed messages
        """
        logger.info(f"📤 Starting bulk send: {len(recipients)} recipients, template: '{template_name}'")
        logger.info(f"Variable mapping: {variable_mapping}")
        if header_media_url:
            logger.info(f"Header media URL: {header_media_url}")
        
        results = {
            "total": len(recipients),
            "sent": 0,
            "failed": 0,
            "messages": []
        }
        
        # Cache template data ONCE before the loop (optimization)
        cached_template_data = None
        cached_template_vars = []
        cached_header_type = None  # Track header type for media
        
        # Always fetch template data to check for header type
        cached_template_data = await self.get_template_by_name(template_name)
        if cached_template_data:
            # Extract variables in order from template body
            body_text = ""
            for comp in cached_template_data.get("components", []):
                if comp.get("type") == "BODY":
                    body_text = comp.get("text", "")
                elif comp.get("type") == "HEADER":
                    # Check header format for media types
                    header_format = comp.get("format", "TEXT")
                    if header_format in ["IMAGE", "VIDEO", "DOCUMENT"]:
                        cached_header_type = header_format.lower()
                        logger.info(f"Template has {header_format} header, media URL required")
            cached_template_vars = self._extract_variable_names(body_text)
            logger.info(f"Template variables cached (order): {cached_template_vars}")
            if cached_header_type:
                logger.info(f"Template header type: {cached_header_type}")
        else:
            logger.error(f"Could not fetch template '{template_name}' to determine variable order")
        
        for recipient in recipients:
            phone = recipient.get("phone")
            logger.info(f"Processing recipient: {recipient}")
            
            if not phone:
                results["failed"] += 1
                results["messages"].append({
                    "recipient": recipient.get("name", "Unknown"),
                    "phone": None,
                    "success": False,
                    "error": "No phone number provided"
                })
                continue
            
            # Build components for variables and header media
            components = []
            
            # Add header component if media URL is provided and template has media header
            if header_media_url and cached_header_type:
                header_component = {
                    "type": "header",
                    "parameters": [
                        {
                            "type": cached_header_type,
                            cached_header_type: {
                                "link": header_media_url
                            }
                        }
                    ]
                }
                components.append(header_component)
                logger.info(f"Added header component with {cached_header_type}: {header_media_url}")
            
            # Build body parameters if we have variable mapping
            if variable_mapping and cached_template_data and cached_template_vars:
                # Build parameters in the correct order
                body_params = []
                for var_name in cached_template_vars:
                    var_lower = var_name.lower()
                    # Find the field name for this variable
                    field_name = variable_mapping.get(var_lower)
                    if field_name:
                        value = recipient.get(field_name, "")
                        if value and str(value).strip():  # Ensure value is not empty or whitespace
                            body_params.append({
                                "type": "text",
                                "parameter_name": var_name,  # Include the parameter name!
                                "text": str(value).strip()
                            })
                            logger.debug(f"Added parameter for {{{{{var_name}}}}}: '{str(value).strip()}'")
                        else:
                            logger.warning(f"Variable {{{{{var_name}}}}} maps to field '{field_name}' but value is empty for {recipient.get('name')}")
                    else:
                        logger.warning(f"No mapping found for variable {{{{{var_name}}}}}")
                
                if body_params:
                    components.append({
                        "type": "body",
                        "parameters": body_params
                    })
                    logger.info(f"Added body component for {recipient.get('name')}")
            elif not cached_template_vars:
                logger.info(f"Template has no variables, sending without body components")
            
            # Send the message with components if we have any
            final_components = components if components else None
            logger.info(f"Final components for {recipient.get('name')}: {final_components}")
            
            result = await self.send_template_message(
                to_phone=phone,
                template_name=template_name,
                language_code=language_code,
                components=final_components
            )
            
            if result["success"]:
                results["sent"] += 1
            else:
                results["failed"] += 1
            
            results["messages"].append({
                "recipient": recipient.get("name", "Unknown"),
                "phone": phone,
                "success": result["success"],
                "message_id": result.get("message_id"),
                "error": result.get("error")
            })
        
        logger.info(f"📊 Bulk send complete: {results['sent']} sent, {results['failed']} failed out of {results['total']} total")
        return results
    
    def parse_template_components(self, template: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse template components to extract useful information.
        
        Args:
            template: Raw template data from API
            
        Returns:
            Parsed template with structured content
        """
        components = template.get("components", [])
        parsed = {
            "id": template.get("id"),
            "name": template.get("name"),
            "status": template.get("status"),
            "category": template.get("category"),
            "language": template.get("language"),
            "header": None,
            "body": None,
            "footer": None,
            "buttons": [],
            "variables": [],
            "variable_names": []  # New: extract actual variable names
        }
        
        for component in components:
            comp_type = component.get("type", "").upper()
            
            if comp_type == "HEADER":
                parsed["header"] = {
                    "type": component.get("format", "TEXT"),
                    "text": component.get("text", ""),
                    "example": component.get("example", {})
                }
                # Extract header variables
                header_vars = self._extract_variable_names(component.get("text", ""))
                if header_vars:
                    parsed["variables"].append({
                        "component": "header",
                        "count": len(header_vars)
                    })
                    parsed["variable_names"].extend(header_vars)
                    
            elif comp_type == "BODY":
                parsed["body"] = {
                    "text": component.get("text", ""),
                    "example": component.get("example", {})
                }
                # Extract body variables
                body_vars = self._extract_variable_names(component.get("text", ""))
                if body_vars:
                    parsed["variables"].append({
                        "component": "body",
                        "count": len(body_vars)
                    })
                    parsed["variable_names"].extend(body_vars)
                    
            elif comp_type == "FOOTER":
                parsed["footer"] = {
                    "text": component.get("text", "")
                }
                
            elif comp_type == "BUTTONS":
                buttons = component.get("buttons", [])
                for btn in buttons:
                    parsed["buttons"].append({
                        "type": btn.get("type"),
                        "text": btn.get("text"),
                        "url": btn.get("url"),
                        "phone_number": btn.get("phone_number")
                    })
        
        return parsed
    
    def _extract_variable_names(self, text: str) -> List[str]:
        """Extract variable names from template text."""
        pattern = r'\{\{(\w+)\}\}'
        return re.findall(pattern, text)


# Singleton instance
_whatsapp_service: Optional[WhatsAppService] = None


def get_whatsapp_service() -> WhatsAppService:
    """Get or create WhatsApp service singleton."""
    global _whatsapp_service
    if _whatsapp_service is None:
        _whatsapp_service = WhatsAppService()
    return _whatsapp_service
