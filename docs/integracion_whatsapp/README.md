# Integración con WhatsApp Business API

## Descripción
El sistema utiliza la **WhatsApp Business Cloud API** de Meta para el envío de mensajes transaccionales y de marketing. Esta integración es directa entre el Backend y Meta, garantizando alta disponibilidad y velocidad de entrega.

## Flujo de Funcionamiento
1.  **Gestión de Plantillas**: Las plantillas se crean y aprueban directamente en el Business Manager de Meta. El sistema sincroniza estas plantillas en tiempo real para que el usuario las seleccione.
2.  **Mapeo de Variables**: El backend permite inyectar datos dinámicos del contacto (nombre, cedula, etc.) en las variables `{{1}}`, `{{2}}` de la plantilla de WhatsApp.
3.  **Envío Masivo**: El `WhatsAppService` procesa la lista de destinatarios y realiza peticiones asíncronas a la API de Meta.

## Componentes Técnicos
*   **Servicio**: `backend/services/whatsapp_service.py`
*   **API Base**: `https://graph.facebook.com/v21.0` (o versión configurada)
*   **Seguridad**: Autenticación mediante *Bearer Token* (System User Access Token).

## Configuración Requerida (.env)
*   `WHATSAPP_ACCESS_TOKEN`: Token permanente de acceso a la API.
*   `WHATSAPP_PHONE_NUMBER_ID`: Identificador único del número de teléfono remitente.
*   `WHATSAPP_BUSINESS_ACCOUNT_ID`: ID de la cuenta de WhatsApp Business.

## Estados de Mensajes
El sistema registra el estado de cada envío:
*   **Sent**: Mensaje aceptado por la API de Meta.
*   **Failed**: Error en el envío (número inválido, token expirado, etc.).
*   **Log**: Se guarda un registro detallado en la base de datos local para auditoría.
