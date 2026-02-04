"""Pydantic schemas for groups and group contacts."""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr


class GroupContactBase(BaseModel):
    """Base schema for group contacts."""
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None


class GroupContactCreate(GroupContactBase):
    """Schema for creating a contact in a group."""
    pass


class GroupContactUpdate(BaseModel):
    """Schema for updating a contact."""
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class GroupContactResponse(GroupContactBase):
    """Response schema for a group contact."""
    id: int
    group_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class GroupBase(BaseModel):
    """Base schema for groups."""
    name: str
    description: Optional[str] = None


class GroupCreate(GroupBase):
    """Schema for creating a group."""
    pass


class GroupUpdate(BaseModel):
    """Schema for updating a group."""
    name: Optional[str] = None
    description: Optional[str] = None


class GroupResponse(GroupBase):
    """Response schema for a group."""
    id: int
    created_at: datetime
    updated_at: datetime
    contact_count: int = 0

    class Config:
        from_attributes = True


class GroupDetailResponse(GroupBase):
    """Response schema for a group with all contacts."""
    id: int
    created_at: datetime
    updated_at: datetime
    contacts: List[GroupContactResponse] = []

    class Config:
        from_attributes = True


class ExcelUploadResponse(BaseModel):
    """Response after uploading an Excel file to create a group."""
    group_id: int
    group_name: str
    contacts_created: int
    errors: List[str] = []
