"""Test script to send WhatsApp template message directly."""
import httpx
import asyncio
import os
import sys
from pathlib import Path

# Add backend to path and load .env from there
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
load_dotenv(backend_dir / ".env")

async def test_send_template():
    """Test sending a template with the exact format from WhatsApp docs."""
    
    access_token = os.getenv("WHATSAPP_ACCESS_TOKEN")
    phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID")
    
    url = f"https://graph.facebook.com/v18.0/{phone_number_id}/messages"
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    # Test: Template WITH parameters including parameter_name
    payload = {
        "messaging_product": "whatsapp",
        "to": "573153404327",
        "type": "template",
        "template": {
            "name": "saludo_masivo",
            "language": {
                "code": "es_CO"
            },
            "components": [
                {
                    "type": "body",
                    "parameters": [
                        {
                            "type": "text",
                            "parameter_name": "nombre",
                            "text": "Alejandro Carvajal"
                        }
                    ]
                }
            ]
        }
    }
    
    print("=" * 80)
    print("TEST: Sending template WITH parameter_name")
    print("=" * 80)
    print(f"URL: {url}")
    print(f"Payload: {payload}")
    print()
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, headers=headers, json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        print()

if __name__ == "__main__":
    asyncio.run(test_send_template())
