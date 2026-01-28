# Documentación del Sistema - Masivos OWO

Este documento describe la arquitectura técnica y los flujos de datos del sistema de mensajería masiva.

## Arquitectura del Sistema

El siguiente diagrama ilustra cómo interactúan los diferentes componentes del sistema:

```text
     [ USUARIO ]
          |
          v
+-----------------------+
|  Frontend (Next.js)   |
+-----------------------+
          |
          v
+-----------------------+         +------------------+
|   Backend (FastAPI)   | <-----> | SQLite Database  |
+-----------------------+         +------------------+
          |
          |
          +------>  (☁️ OWO API / Contactos)
          |
          +------>  (💬 WhatsApp Business API)
          |
          +------>  (🤖 n8n Webhook / Email & IA)
```

### Componentes Principales

1.  **Frontend (Next.js)**:
    -   Interfaz de usuario moderna construida con React y Tailwind CSS.
    -   Maneja la carga de contactos, gestión de plantillas y el tablero de control.
    -   Incluye un **Asistente IA** integrado para redactar correos.

2.  **Backend (FastAPI)**:
    -   Núcleo del sistema con routers dedicados para Email, SMS y WhatsApp.
    -   Gestiona la lógica de negocio, autenticación y orquestación de mensajes.

3.  **Base de Datos (SQLite)**:
    -   Persistencia de logs de mensajes, historial de envíos y plantillas locales (Email).

### Canales de Comunicación

#### 📧 Email (Vía n8n)
El envío de correos masivos se delega a n8n para manejar la complejidad de los proveedores de correo y evitar bloqueos directos.
-   **Responsable**: `WebhookService` (`services/webhook_service.py`).
-   **Flujo**: El backend envía un payload con destinatarios y contenido a un Webhook de n8n.
-   **Configuración**: Requiere `N8N_WEBHOOK_URL_EMAIL`.

#### 📱 SMS (LabsMobile)
Integración directa con el proveedor **LabsMobile** para envío de mensajes de texto.
-   **Responsable**: `SMSService` (`services/sms_service.py`).
-   **Autenticación**: Basic Auth (Usuario + Token).
-   **Capacidades**: Envío individual, masivo y consulta de saldo (`/sms/credits`).
-   **Normalización**: Formatea automáticamente números colombianos (agrega 57 si es necesario).

#### 💬 WhatsApp Business (API Directa)
Conexión directa con la API Cloud de Meta para máxima eficiencia.
-   **Responsable**: `WhatsAppService` (`services/whatsapp_service.py`).
-   **Plantillas**: Las plantillas *deben* crearse y aprobarse en el Administrador de WhatsApp de Meta. El sistema las descarga y sincroniza (`/templates/whatsapp/list`).
-   **Variables**: Soporta mapeo dinámico de variables (ej. `{{nombre}}` -> `contact.name`).

### Gestión de Plantillas

El sistema maneja dos tipos de plantillas de manera diferente:

1.  **Plantillas de Email**:
    -   Se guardan localmente en la base de datos (SQLite).
    -   CRUD completo (Crear, Leer, Actualizar, Borrar) desde el frontend.
    -   Soportan HTML completo para diseños ricos.

2.  **Plantillas de WhatsApp**:
    -   Son de **solo lectura** en el sistema local.
    -   La "fuente de verdad" es Meta. El backend consulta las plantillas aprobadas en tiempo real.
    -   Se clasifican por estado: `APPROVED`, `PENDING`, `REJECTED`.

> 📘 **Para más detalles:** Consulta la [Guía de Plantillas](TEMPLATES_GUIDE.md) para ver la estructura completa y ejemplos de uso.

### 🤖 Asistente IA (n8n + LLM)
El sistema incluye un asistente conversacional para ayudar a redactar el contenido de los mensajes.
-   **Endpoint**: `/assistant/chat`.

> 🤖 **Guía Completa:** Revisa la [Guía del Asistente IA](AI_ASSISTANT_GUIDE.md) para detalles sobre la configuración de n8n y prompts.
-   **Funcionamiento**:
    1.  El usuario escribe una instrucción (ej. "Redacta un correo de bienvenida").
    2.  El backend envía el mensaje + `sessionId` a un flujo de IA en n8n.
    3.  n8n procesa la solicitud (usando OpenAI/Anthropic) y devuelve el texto o HTML generado.
    4.  El frontend muestra una vista previa del HTML generado.

## Flujos de Datos

### 1. Sincronización de Contactos
`Frontend -> Backend -> OWO API`
-   Autenticación vía Token contra API externa.
-   Clasificación automática en departamentos: **Apostador** (`isCustomer=true`) vs **Operacional**.

### 2. Envío Masivo
Dependiendo del canal seleccionado, el flujo varía:
-   **WhatsApp**: `Backend -> Meta Cloud API` (Directo). Log de envío se guarda en SQLite.
-   **Email**: `Backend -> Webhook n8n -> Proveedor Email`. n8n retorna estadísticas de éxito/error.
-   **SMS**: `Backend -> LabsMobile API`. Respuesta inmediata de aceptación/rechazo.

### 3. Generación de Contenido con IA
`Frontend -> Backend -> Webhook IA n8n -> LLM`
Permite iterar sobre el contenido del mensaje antes de enviarlo. El `sessionId` permite mantener el contexto de la conversación.

## Referencia de Configuración (.env)

Para activar todas las funcionalidades descritas, asegúrate de tener las siguientes variables en tu `.env` del backend:

```env
# 📧 Email (n8n)
N8N_WEBHOOK_URL_EMAIL=https://tu-instancia-n8n.com/webhook/email

# 📱 SMS (LabsMobile)
LABSMOBILE_USERNAME=tu_usuario
LABSMOBILE_TOKEN=tu_token_secreto
LABSMOBILE_SENDER=NombreSender

# 💬 WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=EAGx...
WHATSAPP_PHONE_NUMBER_ID=123456789

# 🤖 Asistente IA
WEBHOOK_ASSISTANT=https://tu-instancia-n8n.com/webhook/assistant
```

## 📚 Índice de Documentación Detalles

### Guías de Usuario
- **[Guía de Plantillas](TEMPLATES_GUIDE.md)**: Cómo crear and gestionar plantillas de WhatsApp y Email.
- **[Guía del Asistente IA](AI_ASSISTANT_GUIDE.md)**: Manual de uso y configuración del asistente conversacional.
- **[Prompt del Asistente](PROMPT_ASISTENTE_CORREOS_OWO.md)**: Prompt maestro utilizado para la configuración del agente en n8n.

### Guías de Despliegue e Instalación
- **[Quickstart Windows](QUICKSTART_WINDOWS.md)**: Guía rápida para ejecutar el proyecto en entorno local Windows.
- **[Despliegue General](DEPLOYMENT.md)**: Guía completa de despliegue en servidor (CentOS/Apache).
- **[Despliegue en Windows Server](DEPLOYMENT_WINDOWS.md)**: Guía específica para servidores Windows con IIS/NSSM.
- **[Configuración Proxy Reverso](REVERSE_PROXY_SETUP.md)**: Detalles sobre la configuración de Apache para servir Frontend y Backend.
