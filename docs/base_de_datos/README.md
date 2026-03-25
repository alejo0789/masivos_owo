# Documentación de la Base de Datos

## Motor de Base de Datos
El proyecto utiliza **SQLite** para la gestión de datos. Es un motor ligero, autocontenido y no requiere un servidor independiente, lo que facilita el despliegue en entornos Windows y CentOS.

## Modelo de Datos (Esquema)

### 1. Mensajes (MessageLog)
Almacena el historial completo de envíos.
*   `id`: Clave primaria.
*   `recipient_name`: Nombre del destinatario.
*   `recipient_phone`: Teléfono (WhatsApp/SMS).
*   `recipient_email`: Correo electrónico (Email).
*   `message_content`: Contenido enviado.
*   `channel`: Canal utilizado (whatsapp, email, sms).
*   `status`: Estado del envío (pending, sent, failed).
*   `sent_at`: Fecha y hora del envío.
*   `attachments`: Lista de archivos adjuntos (JSON).

### 2. Plantillas (Template)
Almacena las plantillas creadas por el usuario para Email.
*   `id`: Clave primaria.
*   `name`: Nombre de la plantilla.
*   `subject`: Asunto (solo para emails).
*   `content`: Cuerpo del mensaje (soporta HTML).
*   `channel`: Canal asociado.

### 3. Grupos y Contactos Locales
*   `Group`: Define una lista de contactos subida por excel.
*   `GroupContact`: Contactos pertenecientes a un grupo específico.

## Acceso y Gestión
*   **ORM**: SQLAlchemy se utiliza para interactuar con la base de datos desde el backend.
*   **Asincronismo**: Se utiliza `aiosqlite` para garantizar que las operaciones de DB no bloqueen el servidor FastAPI.
*   **Ubicación del archivo**: `backend/messaging.db`.

## Migraciones
El sistema utiliza una estrategia de actualización manual mediante scripts de Python (ej. `backend/add_attachment_column.py`) para añadir nuevas columnas o tablas sin perder datos existentes.
