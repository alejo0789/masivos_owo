"""Pydantic schemas for templates."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class TemplateBase(BaseModel):
    """Base template schema."""
    name: str = Field(..., min_length=1, max_length=255)
    subject: Optional[str] = Field(None, max_length=500)
    content: str = Field(..., min_length=1)
    channel: str = Field(default="both", pattern="^(whatsapp|email|both)$")


class TemplateCreate(TemplateBase):
    """Schema for creating a template."""
    pass


class TemplateUpdate(BaseModel):
    """Schema for updating a template."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    subject: Optional[str] = Field(None, max_length=500)
    content: Optional[str] = Field(None, min_length=1)
    channel: Optional[str] = Field(None, pattern="^(whatsapp|email|both)$")


class TemplateResponse(TemplateBase):
    """Schema for template response."""
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
