"""Templates router for CRUD operations."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from database import get_db
from models.template import Template
from schemas.template import TemplateCreate, TemplateUpdate, TemplateResponse
from services.whatsapp_service import get_whatsapp_service

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("", response_model=List[TemplateResponse])
async def get_templates(
    search: Optional[str] = Query(None, description="Search by name"),
    channel: Optional[str] = Query(None, pattern="^(whatsapp|email|both)$"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """Get all templates with optional filtering."""
    query = select(Template)
    
    if search:
        query = query.where(Template.name.ilike(f"%{search}%"))
    
    if channel:
        query = query.where(Template.channel == channel)
    
    query = query.order_by(Template.updated_at.desc())
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    templates = result.scalars().all()
    
    return templates


@router.get("/count")
async def get_templates_count(db: AsyncSession = Depends(get_db)):
    """Get total count of templates."""
    result = await db.execute(select(func.count(Template.id)))
    count = result.scalar()
    return {"count": count}


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(template_id: int, db: AsyncSession = Depends(get_db)):
    """Get a specific template by ID."""
    result = await db.execute(select(Template).where(Template.id == template_id))
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    
    return template


@router.post("", response_model=TemplateResponse, status_code=201)
async def create_template(template_data: TemplateCreate, db: AsyncSession = Depends(get_db)):
    """Create a new template."""
    # Check if name already exists
    result = await db.execute(select(Template).where(Template.name == template_data.name))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ya existe una plantilla con ese nombre")
    
    template = Template(**template_data.model_dump())
    db.add(template)
    await db.flush()
    await db.refresh(template)
    
    return template


@router.put("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: int,
    template_data: TemplateUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update an existing template."""
    result = await db.execute(select(Template).where(Template.id == template_id))
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    
    # Check if new name conflicts with existing template
    if template_data.name and template_data.name != template.name:
        result = await db.execute(select(Template).where(Template.name == template_data.name))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Ya existe una plantilla con ese nombre")
    
    # Update only provided fields
    update_data = template_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(template, field, value)
    
    await db.flush()
    await db.refresh(template)
    
    return template


@router.delete("/{template_id}", status_code=204)
async def delete_template(template_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a template."""
    result = await db.execute(select(Template).where(Template.id == template_id))
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    
    await db.delete(template)
    return None


# ============================================
# WhatsApp Business API Templates Endpoints
# ============================================

@router.get("/whatsapp/list")
async def get_whatsapp_templates(
    status: Optional[str] = Query(
        None, 
        description="Filter by status: APPROVED, PENDING, REJECTED",
        pattern="^(APPROVED|PENDING|REJECTED)$"
    ),
    limit: int = Query(100, ge=1, le=500),
    parsed: bool = Query(True, description="Return parsed template structure")
):
    """
    Get message templates directly from WhatsApp Business API.
    
    This endpoint fetches templates from the WhatsApp Cloud API using
    the configured access token and business account ID.
    """
    whatsapp_service = get_whatsapp_service()
    result = await whatsapp_service.get_templates(status=status, limit=limit)
    
    if not result["success"]:
        raise HTTPException(
            status_code=502,
            detail={
                "message": "Error al obtener plantillas de WhatsApp",
                "error": result.get("error", "Unknown error")
            }
        )
    
    templates = result["data"]
    
    # Parse templates if requested
    if parsed and templates:
        templates = [whatsapp_service.parse_template_components(t) for t in templates]
    
    return {
        "success": True,
        "count": len(templates),
        "templates": templates,
        "paging": result.get("paging", {})
    }


@router.get("/whatsapp/by-name/{template_name}")
async def get_whatsapp_template_by_name(
    template_name: str,
    parsed: bool = Query(True, description="Return parsed template structure")
):
    """
    Get a specific WhatsApp template by its name.
    """
    whatsapp_service = get_whatsapp_service()
    template = await whatsapp_service.get_template_by_name(template_name)
    
    if not template:
        raise HTTPException(
            status_code=404,
            detail=f"Plantilla '{template_name}' no encontrada en WhatsApp Business"
        )
    
    if parsed:
        template = whatsapp_service.parse_template_components(template)
    
    return {
        "success": True,
        "template": template
    }


@router.get("/whatsapp/approved")
async def get_approved_whatsapp_templates(
    parsed: bool = Query(True, description="Return parsed template structure")
):
    """
    Get only APPROVED WhatsApp templates (ready to use).
    
    This is a convenience endpoint that filters for approved templates only.
    """
    whatsapp_service = get_whatsapp_service()
    result = await whatsapp_service.get_templates(status="APPROVED")
    
    if not result["success"]:
        raise HTTPException(
            status_code=502,
            detail={
                "message": "Error al obtener plantillas aprobadas de WhatsApp",
                "error": result.get("error", "Unknown error")
            }
        )
    
    templates = result["data"]
    
    if parsed and templates:
        templates = [whatsapp_service.parse_template_components(t) for t in templates]
    
    return {
        "success": True,
        "count": len(templates),
        "templates": templates
    }

