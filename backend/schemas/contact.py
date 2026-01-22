"""Pydantic schemas for contacts."""
from typing import Optional, List
from pydantic import BaseModel


class Contact(BaseModel):
    """Contact schema."""
    id: str
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None  # "Apostador" o "Operacional"
    position: Optional[str] = None
    is_customer: Optional[bool] = None  # True = Apostador, False = Operacional
    customer_name: Optional[str] = None
    state: Optional[str] = None


class ContactsResponse(BaseModel):
    """Response for contacts list."""
    total: int
    contacts: List[Contact]
