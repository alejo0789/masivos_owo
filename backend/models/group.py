"""Group and GroupContact models for managing contact groups."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
import pytz


def get_colombia_time():
    """Get current time in Colombia timezone (America/Bogota)."""
    colombia_tz = pytz.timezone('America/Bogota')
    return datetime.now(colombia_tz)


class Group(Base):
    """Group model for organizing contacts."""
    
    __tablename__ = "groups"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=get_colombia_time)
    updated_at = Column(DateTime, default=get_colombia_time, onupdate=get_colombia_time)
    
    # Relationship to contacts
    contacts = relationship("GroupContact", back_populates="group", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Group(id={self.id}, name='{self.name}')>"


class GroupContact(Base):
    """Contact belonging to a group."""
    
    __tablename__ = "group_contacts"
    
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=get_colombia_time)
    
    # Relationship to group
    group = relationship("Group", back_populates="contacts")
    
    def __repr__(self):
        return f"<GroupContact(id={self.id}, name='{self.name}', group_id={self.group_id})>"
