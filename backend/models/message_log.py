"""MessageLog model for tracking sent messages."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from database import Base


class MessageLog(Base):
    """Message log model for tracking sent messages."""
    
    __tablename__ = "message_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    recipient_name = Column(String(255), nullable=False)
    recipient_phone = Column(String(50), nullable=True)
    recipient_email = Column(String(255), nullable=True)
    subject = Column(String(500), nullable=True)
    message_content = Column(Text, nullable=False)
    channel = Column(String(50), nullable=False)  # whatsapp, email, both
    status = Column(String(50), default="pending")  # pending, sent, failed
    error_message = Column(Text, nullable=True)
    sent_at = Column(DateTime, default=datetime.utcnow)
    attachments = Column(JSON, default=list)  # List of attachment filenames
    
    def __repr__(self):
        return f"<MessageLog(id={self.id}, recipient='{self.recipient_name}', status='{self.status}')>"
