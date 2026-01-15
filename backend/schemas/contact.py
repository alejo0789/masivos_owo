"""Pydantic schemas for contacts."""
from typing import Optional, List
from pydantic import BaseModel


class Contact(BaseModel):
    """Contact schema."""
    id: str
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None


class ContactsResponse(BaseModel):
    """Response for contacts list."""
    total: int
    contacts: List[Contact]
