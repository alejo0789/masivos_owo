# Gestión de Plantillas

Este sistema maneja dos tipos de plantillas de manera separada:

## 1. Plantillas de WhatsApp (`/templates`)

**Ubicación Frontend:** `/templates`  
**Ubicación Backend:** `/templates/whatsapp/*`

### Características:
- **Fuente:** WhatsApp Business API (Meta)
- **Gestión:** Las plantillas se crean y editan desde el [Panel de WhatsApp Business](https://business.facebook.com/latest/whatsapp_manager/message_templates)
- **Aprobación:** Requieren aprobación de Meta antes de poder usarse
- **Funcionalidad:** Solo lectura desde la aplicación (fetch, visualización)
- **Endpoints:**
  - `GET /templates/whatsapp/list` - Listar todas las plantillas
  - `GET /templates/whatsapp/approved` - Listar solo plantillas aprobadas
  - `GET /templates/whatsapp/by-name/{name}` - Obtener plantilla por nombre

### Flujo de trabajo:
1. Crear plantilla en Meta Business Manager
2. Esperar aprobación de Meta
3. La plantilla aparece automáticamente en la aplicación
4. Usar la plantilla para envíos masivos de WhatsApp

---

## 2. Plantillas de Email (`/email-templates`)

**Ubicación Frontend:** `/email-templates`  
**Ubicación Backend:** `/templates` (CRUD endpoints)

### Características:
- **Fuente:** Base de datos local (SQLite)
- **Gestión:** CRUD completo desde la aplicación
- **Aprobación:** No requiere aprobación externa
- **Funcionalidad:** Crear, leer, actualizar y eliminar
- **Endpoints:**
  - `GET /templates` - Listar plantillas (filtrar por `channel=email`)
  - `GET /templates/{id}` - Obtener plantilla específica
  - `POST /templates` - Crear nueva plantilla
  - `PUT /templates/{id}` - Actualizar plantilla
  - `DELETE /templates/{id}` - Eliminar plantilla

### Flujo de trabajo:
1. Crear plantilla desde la interfaz web
2. Configurar asunto y contenido
3. Definir variables personalizadas (ej: `{nombre}`, `{email}`)
4. Guardar y usar inmediatamente para envíos

---

## Variables en Plantillas

### WhatsApp (Meta Business)
- Formato: `{{1}}`, `{{2}}`, etc. (posicionales)
- Las variables se mapean automáticamente a campos del contacto

### Email (Locales)
- Formato: `{nombre_variable}` (ej: `{nombre}`, `{email}`, `{telefono}`)
- Variables comunes disponibles:
  - `{nombre}` - Nombre completo del contacto
  - `{primer_nombre}` - Primer nombre
  - `{email}` - Correo electrónico
  - `{telefono}` - Número de teléfono
  - `{department}` - Departamento
  - `{position}` - Cargo

---

## Modelo de Datos

### Template (Base de datos)
```python
class Template(Base):
    id: int
    name: str                    # Nombre único de la plantilla
    subject: str | None          # Asunto (solo para email)
    content: str                 # Contenido del mensaje
    channel: str                 # 'email', 'whatsapp', 'both'
    created_at: datetime
    updated_at: datetime
```

**Nota:** El campo `channel` por defecto es `'email'` ya que las plantillas de WhatsApp se gestionan externamente.

---

## Navegación

El sidebar ahora incluye dos opciones separadas:

1. **Plantillas WhatsApp** 📱 - Gestión de plantillas de Meta Business
2. **Plantillas Email** 📧 - CRUD de plantillas de correo electrónico

---

## Configuración Requerida

### Para WhatsApp:
Variables de entorno necesarias en `.env`:
```env
WHATSAPP_ACCESS_TOKEN=your_token
WHATSAPP_BUSINESS_ACCOUNT_ID=your_account_id
WHATSAPP_PHONE_NUMBER_ID=your_phone_id
```

### Para Email:
No requiere configuración adicional. Las plantillas se almacenan en la base de datos local.
