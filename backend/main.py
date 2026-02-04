"""
Mass Messaging System - Backend API
Sistema para enviar mensajes masivos a traves de WhatsApp y Email.
"""
import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import get_settings
from database import init_db
from routers import contacts_router, templates_router, messages_router, history_router, whatsapp_router, assistant_router, sms_router, groups_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Set specific loggers to DEBUG for detailed output
logging.getLogger('services.whatsapp_service').setLevel(logging.DEBUG)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    print("[START] Iniciando Sistema de Mensajeria Masiva...")
    
    # Initialize database
    await init_db()
    print("[OK] Base de datos inicializada")
    
    # Ensure upload directory exists
    os.makedirs(settings.upload_dir, exist_ok=True)
    print(f"[DIR] Directorio de uploads: {settings.upload_dir}")
    
    # Log configuration status
    if settings.webhook_whatsapp:
        print("[OK] Webhook WhatsApp configurado")
    else:
        print("[WARN] Webhook WhatsApp NO configurado")
    
    if settings.webhook_email:
        print("[OK] Webhook Email configurado")
    else:
        print("[WARN] Webhook Email NO configurado")
    
    if settings.webhook_assistant:
        print("[OK] Webhook Asistente IA configurado")
    else:
        print("[WARN] Webhook Asistente IA NO configurado")
    
    if settings.owo_api_login_url and settings.owo_api_contacts_url:
        print("[OK] API OWO de Contactos configurada")
    else:
        print("[WARN] API OWO de Contactos NO configurada")
    
    # WhatsApp Direct API
    if settings.whatsapp_access_token and settings.whatsapp_phone_number_id:
        print("[OK] WhatsApp Direct API configurada")
    elif settings.whatsapp_access_token:
        print("[WARN] WhatsApp API: falta PHONE_NUMBER_ID")
    else:
        print("[WARN] WhatsApp Direct API NO configurada")
    
    yield
    
    # Shutdown
    print("[STOP] Cerrando aplicacion...")


app = FastAPI(
    title="Mass Messaging System",
    description="API para envio masivo de mensajes por WhatsApp y Email",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for uploads
if os.path.exists(settings.upload_dir):
    app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

# Include routers
app.include_router(contacts_router)
app.include_router(templates_router)
app.include_router(messages_router)
app.include_router(history_router)
app.include_router(whatsapp_router)
app.include_router(assistant_router)
app.include_router(sms_router)
app.include_router(groups_router)


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": "Mass Messaging System",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "endpoints": {
            "contacts": "/contacts",
            "templates": "/templates",
            "messages": "/messages",
            "history": "/history"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "webhooks": {
            "whatsapp": bool(settings.webhook_whatsapp),
            "email": bool(settings.webhook_email),
            "assistant": bool(settings.webhook_assistant)
        },
        "contacts_api": bool(settings.owo_api_login_url and settings.owo_api_contacts_url)
    }


@app.get("/config")
async def get_config():
    """
    Get current configuration status (without exposing sensitive values).
    Useful for debugging environment variable issues.
    """
    return {
        "server": {
            "host": settings.host,
            "port": settings.port
        },
        "webhooks": {
            "whatsapp": {
                "configured": bool(settings.webhook_whatsapp),
                "url_preview": settings.webhook_whatsapp[:50] + "..." if settings.webhook_whatsapp else None
            },
            "email": {
                "configured": bool(settings.webhook_email),
                "url_preview": settings.webhook_email[:50] + "..." if settings.webhook_email else None
            }
        },
        "owo_api": {
            "configured": bool(settings.owo_api_login_url and settings.owo_api_contacts_url),
            "login_url": settings.owo_api_login_url if settings.owo_api_login_url else None,
            "contacts_url": settings.owo_api_contacts_url if settings.owo_api_contacts_url else None,
            "auth_email": settings.owo_api_email if settings.owo_api_email else None
        },
        "whatsapp_business_api": {
            "access_token_configured": bool(settings.whatsapp_access_token),
            "access_token_preview": settings.whatsapp_access_token[:20] + "..." if settings.whatsapp_access_token and len(settings.whatsapp_access_token) > 20 else ("****" if settings.whatsapp_access_token else None),
            "business_account_id_configured": bool(settings.whatsapp_business_account_id),
            "business_account_id": settings.whatsapp_business_account_id if settings.whatsapp_business_account_id else None,
            "phone_number_id_configured": bool(settings.whatsapp_phone_number_id),
            "phone_number_id": settings.whatsapp_phone_number_id if settings.whatsapp_phone_number_id else None,
            "fully_configured": bool(
                settings.whatsapp_access_token and 
                settings.whatsapp_business_account_id and 
                settings.whatsapp_phone_number_id
            ),
            "templates_available": bool(
                settings.whatsapp_access_token and 
                settings.whatsapp_business_account_id and 
                settings.whatsapp_phone_number_id
            )
        },
        "frontend": {
            "cors_url": settings.frontend_url
        },
        "database": {
            "url": settings.database_url
        },
        "uploads": {
            "directory": settings.upload_dir,
            "max_size_mb": settings.max_file_size_mb
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=True
    )
