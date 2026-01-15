"""Routers package."""
from routers.contacts import router as contacts_router
from routers.templates import router as templates_router
from routers.messages import router as messages_router
from routers.history import router as history_router
from routers.whatsapp import router as whatsapp_router

__all__ = ["contacts_router", "templates_router", "messages_router", "history_router", "whatsapp_router"]
