# Integración con Microsoft Azure (Email & Outlook)

## Descripción
La integración con el ecosistema de **Microsoft Azure** se realiza a través de **n8n**, utilizando el conector de **Microsoft Outlook**. Esto permite al sistema de Masivos OWO enviar correos electrónicos de forma segura utilizando la infraestructura de Microsoft 365.

## Propósito de la Integración
El flujo de Email masivo se delega a n8n para:
1.  Utilizar cuentas corporativas de Microsoft.
2.  Manejar adjuntos de gran tamaño de forma eficiente.
3.  Evitar que el servidor de backend sea bloqueado por enviar correos sospechosos.

## Flujo de Trabajo (Workflow n8n)
La integración consta de los siguientes nodos en n8n:
*   **Webhook Recepción**: Recibe el payload del backend con el contenido y destinatarios.
*   **Microsoft Outlook Node**: Realiza el envío efectivo a través de la API de Microsoft Graph.
*   **Callback Loop**: Notifica al backend de Masivos OWO si cada correo fue enviado con éxito o falló.

## Requisitos en Azure Portal
Para que esta integración funcione, se requiere una aplicación registrada en **Azure Active Directory** con los siguientes permisos:
*   `Mail.Send`
*   `Mail.ReadWrite`
*   `Offline_access` (para refrescar el token de forma automática).

## Configuración en el Sistema
En el archivo `.env` del backend se debe configurar la URL del webhook de n8n que procesa el envío vía Outlook:
`WEBHOOK_EMAIL=https://instancia-n8n.com/webhook/identificador-azure-flow`
