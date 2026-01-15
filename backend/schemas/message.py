"""Pydantic schemas for messages."""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class RecipientInfo(BaseModel):
    """Recipient information."""
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None


class MessageCreate(BaseModel):
    """Schema for creating a single message."""
    recipient: RecipientInfo
    subject: Optional[str] = Field(None, max_length=500)
    content: str = Field(..., min_length=1)
    channel: str = Field(..., pattern="^(whatsapp|email|both)$")
    attachments: List[str] = Field(default_factory=list)


class BulkMessageCreate(BaseModel):
    """Schema for creating bulk messages."""
    recipients: List[RecipientInfo]
    subject: Optional[str] = Field(None, max_length=500)
    content: str = Field(..., min_length=1)
    channel: str = Field(..., pattern="^(whatsapp|email|both)$")
    attachments: List[str] = Field(default_factory=list)


class MessageResponse(BaseModel):
    """Schema for message response."""
    id: int
    recipient_name: str
    recipient_phone: Optional[str]
    recipient_email: Optional[str]
    subject: Optional[str]
    message_content: str
    channel: str
    status: str
    error_message: Optional[str]
    sent_at: datetime
    attachments: List[str]
    
    class Config:
        from_attributes = True


class BulkSendResponse(BaseModel):
    """Response for bulk send operation."""
    total: int
    sent: int
    failed: int
    messages: List[MessageResponse]
