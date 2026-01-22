"""Contacts router for fetching contacts from OWO external API."""
import httpx
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from config import get_settings
from schemas.contact import Contact, ContactsResponse

router = APIRouter(prefix="/contacts", tags=["contacts"])
settings = get_settings()

# Cache for the API token (simple in-memory cache)
_token_cache = {
    "token": None,
    "expires_at": None
}


async def get_owo_token() -> str:
    """
    Authenticate with the OWO API and get an access token.
    
    Returns:
        str: The access token for API requests.
    
    Raises:
        HTTPException: If authentication fails.
    """
    global _token_cache
    
    # Check if we have a cached token (simple cache, no expiration check for now)
    if _token_cache["token"]:
        return _token_cache["token"]
    
    if not settings.owo_api_login_url or not settings.owo_api_email or not settings.owo_api_password:
        raise HTTPException(
            status_code=500,
            detail="OWO API credentials not configured. Please set OWO_API_LOGIN_URL, OWO_API_EMAIL, and OWO_API_PASSWORD in .env"
        )
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                settings.owo_api_login_url,
                json={
                    "email": settings.owo_api_email,
                    "password": settings.owo_api_password
                }
            )
            response.raise_for_status()
            data = response.json()
            
            # Extract token from response
            token = data.get("token")
            if not token:
                raise HTTPException(
                    status_code=500,
                    detail="No token received from OWO API login"
                )
            
            # Cache the token
            _token_cache["token"] = token
            
            return token
            
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to authenticate with OWO API: {str(e)}"
        )


async def fetch_owo_contacts(token: str) -> List[dict]:
    """
    Fetch contacts from the OWO API using the provided token.
    
    Args:
        token: The authentication token.
    
    Returns:
        List of contact dictionaries from the API.
    """
    if not settings.owo_api_contacts_url:
        raise HTTPException(
            status_code=500,
            detail="OWO API contacts URL not configured. Please set OWO_API_CONTACTS_URL in .env"
        )
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                settings.owo_api_contacts_url,
                headers={
                    "Authorization": f"Bearer {token}"
                }
            )
            response.raise_for_status()
            data = response.json()
            
            # Extract contacts from payload
            if isinstance(data, dict) and "payload" in data:
                payload = data["payload"]
                if isinstance(payload, dict) and "data" in payload:
                    return payload["data"]
                return payload if isinstance(payload, list) else []
            elif isinstance(data, list):
                return data
            else:
                return []
                
    except httpx.HTTPError as e:
        # If we get a 401, clear the token cache and retry once
        if hasattr(e, 'response') and e.response.status_code == 401:
            global _token_cache
            _token_cache["token"] = None
            raise HTTPException(
                status_code=401,
                detail="Token expired. Please retry the request."
            )
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch contacts from OWO API: {str(e)}"
        )


def transform_owo_contact(raw_contact: dict, index: int) -> Contact:
    """
    Transform a raw OWO API contact to our Contact schema.
    
    Args:
        raw_contact: Raw contact data from OWO API.
        index: Index for generating a unique ID.
    
    Returns:
        Contact object.
    """
    is_customer = raw_contact.get("isCustomer", False)
    
    # Determine department based on isCustomer
    # True = Apostador, False = Operacional
    department = "Apostador" if is_customer else "Operacional"
    
    # Build the full name
    name = raw_contact.get("name", "") or ""
    last_name = raw_contact.get("lastName", "") or ""
    full_name = raw_contact.get("fullName", "") or ""
    
    # Use fullName if available, otherwise combine name and lastName
    display_name = full_name.strip() if full_name.strip() else f"{name} {last_name}".strip()
    if not display_name:
        display_name = "Sin nombre"
    
    # Format phone number
    phone = raw_contact.get("phoneNumber", "") or ""
    if phone and not phone.startswith("+"):
        # Assume Colombian number if no prefix
        phone = f"+57{phone}"
    
    return Contact(
        id=str(index + 1),
        name=display_name,
        phone=phone if phone else None,
        email=raw_contact.get("email") if raw_contact.get("email") else None,
        department=department,
        position=None,
        is_customer=is_customer,
        customer_name=raw_contact.get("customerName"),
        state=raw_contact.get("state")
    )


@router.get("", response_model=ContactsResponse)
async def get_contacts(
    search: Optional[str] = Query(None, description="Search term for filtering contacts"),
    department: Optional[str] = Query(None, description="Filter by department (Apostador/Operacional)"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of contacts to return"),
    offset: int = Query(0, ge=0, description="Number of contacts to skip")
):
    """
    Get contacts from OWO external API.
    
    The contacts are classified by the 'isCustomer' field:
    - isCustomer=true -> Department: "Apostador"
    - isCustomer=false -> Department: "Operacional"
    
    Supports searching by name, email, or phone, and filtering by department.
    """
    contacts: List[Contact] = []
    
    try:
        # Step 1: Get authentication token
        token = await get_owo_token()
        
        # Step 2: Fetch contacts using the token
        raw_contacts = await fetch_owo_contacts(token)
        
        # Step 3: Transform OWO contacts to our schema
        contacts = [
            transform_owo_contact(raw, idx) 
            for idx, raw in enumerate(raw_contacts)
            if raw.get("state") == "Y"  # Only active contacts
        ]
        
    except HTTPException as e:
        # Re-raise HTTP exceptions
        raise e
    except Exception as e:
        print(f"Error fetching contacts: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching contacts: {str(e)}"
        )
    
    # Apply local filtering
    if search:
        search_lower = search.lower()
        contacts = [
            c for c in contacts
            if search_lower in c.name.lower()
            or (c.email and search_lower in c.email.lower())
            or (c.phone and search_lower in c.phone)
        ]
    
    if department:
        contacts = [
            c for c in contacts 
            if c.department and c.department.lower() == department.lower()
        ]
    
    # Apply pagination
    total = len(contacts)
    contacts = contacts[offset:offset + limit]
    
    return ContactsResponse(total=total, contacts=contacts)


@router.get("/departments", response_model=List[str])
async def get_departments():
    """
    Get list of unique departments.
    
    Returns the two classification departments:
    - Apostador (isCustomer=true)
    - Operacional (isCustomer=false)
    """
    return ["Apostador", "Operacional"]


@router.post("/refresh-token")
async def refresh_token():
    """
    Force refresh of the OWO API token.
    
    Use this if you're experiencing authentication issues.
    """
    global _token_cache
    _token_cache["token"] = None
    
    try:
        token = await get_owo_token()
        return {"message": "Token refreshed successfully", "token_received": bool(token)}
    except HTTPException as e:
        raise e
