"""Contacts router for fetching contacts from external API."""
import httpx
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from config import get_settings
from schemas.contact import Contact, ContactsResponse

router = APIRouter(prefix="/contacts", tags=["contacts"])
settings = get_settings()

# Mock contacts for testing when API is not configured
MOCK_CONTACTS = [
    Contact(id="1", name="Alejandro Carvajal", phone="+573153404327", email="alejo0789@gmail.com", department="Ventas", position="Gerente"),
    Contact(id="2", name="Laila Narvaez", phone="+573185033541", email="coordinadordeaplicaciones@acertemos.com", department="Ventas", position="Coordinadora"),
    Contact(id="3", name="Briggete Largache", phone="+573105179373", email="asistentesoportetic@acertemos.com", department="Ventas", position="Desarrollador"),
    Contact(id="4", name="Alejandro 2", phone="+573173698846", email="ingenieroia@acertemos.com", department="TI", position="Analista"),
    Contact(id="5", name="Pedro Rodríguez", phone="+573002223344", email="pedro.rodriguez@ejemplo.com", department="Finanzas", position="Contador"),
    Contact(id="6", name="Laura Sánchez", phone="+573004445566", email="laura.sanchez@ejemplo.com", department="Operaciones", position="Supervisora"),
    Contact(id="7", name="Diego Ramírez", phone="+573006667788", email="diego.ramirez@ejemplo.com", department="Ventas", position="Ejecutivo"),
    Contact(id="8", name="Camila Torres", phone="+573008889900", email="camila.torres@ejemplo.com", department="Marketing", position="Diseñadora"),
    Contact(id="9", name="Andrés Morales", phone="+573001112233", email="andres.morales@ejemplo.com", department="TI", position="Administrador"),
    Contact(id="10", name="Sofía Herrera", phone="+573003334455", email="sofia.herrera@ejemplo.com", department="Servicio al Cliente", position="Representante"),
]


@router.get("", response_model=ContactsResponse)
async def get_contacts(
    search: Optional[str] = Query(None, description="Search term for filtering contacts"),
    department: Optional[str] = Query(None, description="Filter by department"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of contacts to return"),
    offset: int = Query(0, ge=0, description="Number of contacts to skip")
):
    """
    Get contacts from external API or mock data.
    
    Supports searching by name, email, or phone, and filtering by department.
    """
    contacts: List[Contact] = []
    
    # Try to fetch from external API if configured
    if settings.contacts_api_url:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                params = {}
                if search:
                    params["search"] = search
                if department:
                    params["department"] = department
                params["limit"] = limit
                params["offset"] = offset
                
                response = await client.get(settings.contacts_api_url, params=params)
                response.raise_for_status()
                data = response.json()
                
                # Adapt response to our schema
                if isinstance(data, list):
                    contacts = [Contact(**c) for c in data]
                elif isinstance(data, dict) and "contacts" in data:
                    contacts = [Contact(**c) for c in data["contacts"]]
                else:
                    contacts = [Contact(**data)]
                    
        except httpx.HTTPError as e:
            # Fall back to mock data on error
            print(f"Error fetching contacts from API: {e}")
            contacts = MOCK_CONTACTS.copy()
        except Exception as e:
            print(f"Unexpected error: {e}")
            contacts = MOCK_CONTACTS.copy()
    else:
        # Use mock contacts
        contacts = MOCK_CONTACTS.copy()
    
    # Apply local filtering if using mock data or if API doesn't support filtering
    if not settings.contacts_api_url or True:  # Always filter locally for consistency
        if search:
            search_lower = search.lower()
            contacts = [
                c for c in contacts
                if search_lower in c.name.lower()
                or (c.email and search_lower in c.email.lower())
                or (c.phone and search_lower in c.phone)
            ]
        
        if department:
            contacts = [c for c in contacts if c.department and c.department.lower() == department.lower()]
    
    # Apply pagination
    total = len(contacts)
    contacts = contacts[offset:offset + limit]
    
    return ContactsResponse(total=total, contacts=contacts)


@router.get("/departments", response_model=List[str])
async def get_departments():
    """Get list of unique departments."""
    # Get departments from mock contacts (or could query API)
    departments = set()
    for contact in MOCK_CONTACTS:
        if contact.department:
            departments.add(contact.department)
    return sorted(list(departments))

