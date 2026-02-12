"""Template model for message templates."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime
from database import Base


class Template(Base):
    """Message template model."""
    
    __tablename__ = "templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    subject = Column(String(500), nullable=True)  # For email subject
    content = Column(Text, nullable=False)
    attachment_path = Column(String(500), nullable=True)  # Path or URL to attachment
    channel = Column(String(50), default="email")  # whatsapp, email, both
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<Template(id={self.id}, name='{self.name}')>"
