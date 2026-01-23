"""Contacts router for fetching contacts from OWO external API."""
import asyncio
import httpx
import time
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from config import get_settings
from schemas.contact import Contact, ContactsResponse

router = APIRouter(prefix="/contacts", tags=["contacts"])
settings = get_settings()

# Cache for the API token with expiration
_token_cache = {
    "token": None,
    "created_at": None,
    "expires_in_seconds": 3600  # Token expires after 1 hour (refresh before that)
}

# Maximum retries for API calls
MAX_RETRIES = 3


def is_token_expired() -> bool:
    """Check if the cached token has expired."""
    if not _token_cache["token"] or not _token_cache["created_at"]:
        return True
    
    elapsed = time.time() - _token_cache["created_at"]
    # Refresh token 5 minutes before expiration to be safe
    return elapsed >= (_token_cache["expires_in_seconds"] - 300)


def clear_token_cache():
    """Clear the token cache to force re-authentication."""
    global _token_cache
    _token_cache["token"] = None
    _token_cache["created_at"] = None
    print("[OWO API] Token cache cleared")


async def get_owo_token(force_refresh: bool = False) -> str:
    """
    Authenticate with the OWO API and get an access token.
    
    Args:
        force_refresh: If True, force a new token even if cached one exists.
    
    Returns:
        str: The access token for API requests.
    
    Raises:
        HTTPException: If authentication fails.
    """
    global _token_cache
    
    # Check if we have a valid cached token
    if not force_refresh and _token_cache["token"] and not is_token_expired():
        return _token_cache["token"]
    
    if not settings.owo_api_login_url or not settings.owo_api_email or not settings.owo_api_password:
        raise HTTPException(
            status_code=500,
            detail="OWO API credentials not configured. Please set OWO_API_LOGIN_URL, OWO_API_EMAIL, and OWO_API_PASSWORD in .env"
        )
    
    print("[OWO API] Requesting new authentication token...")
    
    for attempt in range(MAX_RETRIES):
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
                
                # Cache the token with timestamp
                _token_cache["token"] = token
                _token_cache["created_at"] = time.time()
                
                print(f"[OWO API] Token obtained successfully (attempt {attempt + 1})")
                return token
                
        except httpx.HTTPError as e:
            print(f"[OWO API] Authentication attempt {attempt + 1} failed: {str(e)}")
            if attempt == MAX_RETRIES - 1:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to authenticate with OWO API after {MAX_RETRIES} attempts: {str(e)}"
                )
            # Wait before retrying (exponential backoff)
            await asyncio.sleep(2 ** attempt)
        except Exception as e:
            print(f"[OWO API] Unexpected error during authentication: {str(e)}")
            if attempt == MAX_RETRIES - 1:
                raise HTTPException(
                    status_code=500,
                    detail=f"Unexpected error during OWO API authentication: {str(e)}"
                )
            await asyncio.sleep(2 ** attempt)


async def fetch_owo_contacts(token: str, retry_with_new_token: bool = True) -> List[dict]:
    """
    Fetch contacts from the OWO API using the provided token.
    
    Args:
        token: The authentication token.
        retry_with_new_token: If True, retry with a fresh token on 401 errors.
    
    Returns:
        List of contact dictionaries from the API.
    """
    if not settings.owo_api_contacts_url:
        raise HTTPException(
            status_code=500,
            detail="OWO API contacts URL not configured. Please set OWO_API_CONTACTS_URL in .env"
        )
    
    for attempt in range(MAX_RETRIES):
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
                    
        except httpx.HTTPStatusError as e:
            # Handle 401 Unauthorized - token expired
            if e.response.status_code == 401 and retry_with_new_token:
                print(f"[OWO API] Token expired (401), refreshing and retrying...")
                clear_token_cache()
                try:
                    new_token = await get_owo_token(force_refresh=True)
                    # Update the token for this function call too
                    token = new_token
                    # Retry with new token (but don't allow another refresh to prevent infinite loop)
                    return await fetch_owo_contacts(new_token, retry_with_new_token=False)
                except HTTPException:
                    raise HTTPException(
                        status_code=401,
                        detail="Token expired and re-authentication failed."
                    )
            
            print(f"[OWO API] HTTP error on attempt {attempt + 1}: {e.response.status_code}")
            if attempt == MAX_RETRIES - 1:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to fetch contacts from OWO API: {str(e)}"
                )
                
        except httpx.HTTPError as e:
            print(f"[OWO API] Request failed on attempt {attempt + 1}: {str(e)}")
            
            # If this is the first failure and we haven't retried with a new token yet,
            # assume it might be a token/connection issue and try to refresh
            if attempt == 0 and retry_with_new_token:
                print("[OWO API] First request failed, trying with fresh token as precaution...")
                clear_token_cache()
                try:
                    new_token = await get_owo_token(force_refresh=True)
                    token = new_token
                    # We continue the loop with the new token instead of recursing immediately
                    # to respect the retry count of the loop
                    continue 
                except Exception as ex:
                    print(f"[OWO API] Failed to refresh token during retry: {str(ex)}")

            if attempt == MAX_RETRIES - 1:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to fetch contacts from OWO API after {MAX_RETRIES} attempts: {str(e)}"
                )
            # Wait before retrying
            await asyncio.sleep(2 ** attempt)
            
        except Exception as e:
            print(f"[OWO API] Unexpected error on attempt {attempt + 1}: {str(e)}")
            if attempt == MAX_RETRIES - 1:
                raise HTTPException(
                    status_code=500,
                    detail=f"Unexpected error fetching contacts: {str(e)}"
                )
            await asyncio.sleep(2 ** attempt)


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
    clear_token_cache()
    
    try:
        token = await get_owo_token(force_refresh=True)
        return {"message": "Token refreshed successfully", "token_received": bool(token)}
    except HTTPException as e:
        raise e
