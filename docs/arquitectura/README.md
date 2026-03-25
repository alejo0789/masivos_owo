# Arquitectura del Sistema - Masivos OWO

## Descripción General
Masivos OWO es una plataforma de mensajería multicanal diseñada para la gestión y envío masivo de comunicaciones a través de WhatsApp, Correo Electrónico y SMS. El sistema sigue una arquitectura de micro-servicios desacoplados donde la lógica de envío se delega a proveedores especializados o herramientas de orquestación.

## Componentes de la Solución

### 1. Frontend (Capa de Presentación)
*   **Tecnología**: Next.js 15 (React).
*   **Responsabilidad**: Interfaz de usuario para la gestión de contactos, creación de plantillas, configuración de campañas y visualización de estadísticas en tiempo real.
*   **Comunicación**: Consume la API REST del backend.

### 2. Backend (Capa de Negocio)
*   **Tecnología**: FastAPI (Python).
*   **Responsabilidad**: 
    *   Orquestación de envíos.
    *   Gestión de la persistencia de datos local (Plantillas, Logs).
    *   Sincronización con APIs externas (OWO API para contactos).
    *   Procesamiento de archivos (Excel para carga de grupos).

### 3. Orquestador de Flujos (n8n)
*   **Tecnología**: n8n.io.
*   **Responsabilidad**: Maneja flujos complejos de envío, especialmente para Email e Inteligencia Artificial. Permite el desacoplamiento entre el backend y los proveedores de servicios (Outlook, OpenAI).

### 4. Capa de Datos
*   **Motor**: SQLite.
*   **ORM**: SQLAlchemy + Pydantic.
*   **Uso**: Almacenamiento local de historial de envíos (logs), plantillas de correo y metadatos de grupos de contactos.

## Diagrama de Flujo de Datos

```text
[ USUARIO ] <-> [ Frontend: Next.js ]
                        |
                        v
              [ Backend: FastAPI ] <-------> [ DB: SQLite ]
                        |
      +-----------------+-----------------+
      |                 |                 |
      v                 v                 v
[ API WhatsApp ]   [ n8n Flows ]    [ API LabsMobile ]
      |                 |                 |
      |          +------+------+          |
      |          |             |          |
      v          v             v          v
 (WhatsApp)  (Outlook)     (IA LLM)     (SMS)
```

## Seguridad y Autenticación
*   **SSO Integrado**: El frontend se integra con el ecosistema de Saman, validando la identidad del usuario a través de `localStorage` compartido desde el dominio principal.
*   **Variables de Entorno**: Todas las credenciales sensibles (Tokens, API Keys) se gestionan a través de archivos `.env`.
