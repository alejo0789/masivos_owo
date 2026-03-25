# Guía de Usabilidad y Funcionamiento

## Introducción
Masivos OWO está diseñado para ser intuitivo y eficiente en el envío de comunicaciones masivas. A continuación se detallan los módulos principales y su uso.

## 1. Gestión de Contactos
*   **Sincronización OWO**: Permite importar los contactos vigentes desde el sistema central OWO.
*   **Grupos Manuales**: Los usuarios pueden subir archivos Excel con formatos personalizados para crear listas de envío rápidas.
*   **Filtros**: Permite segmentar contactos por departamento (Apostador u Operacional).

## 2. Creación de Plantillas
*   **Email**: Editor de texto enriquecido (HTML) para crear correos corporativos.
*   **WhatsApp**: Visualización de plantillas aprobadas en Meta. El sistema guía al usuario para completar las variables necesarias antes del envío.
*   **Asistente IA**: Integración con Inteligencia Artificial para generar contenido creativo basado en una instrucción simple (ej. "Crea una promoción para el día del padre").

## 3. Proceso de Envío (Campaña)
1.  **Selección de Destinatarios**: Escoge un grupo o selecciona contactos individuales.
2.  **Configuración del Mensaje**: Selecciona la plantilla o redacta el contenido. Adjunta archivos si es necesario (soporte para PDF, Imágenes).
3.  **Confirmación de Canal**: Elige si enviar por WhatsApp, Correo o ambos.
4.  **Monitoreo**: El sistema muestra una barra de progreso mientras se procesan los envíos.

## 4. Historial y Estadísticas
*   **Logs**: Listado detallado de cada mensaje enviado con su fecha, destinatario y estado de entrega.
*   **Dashboard**: Resumen visual de la tasa de éxito de los últimos 7 días, distribuidos por canal de comunicación.

## Mejores Prácticas
*   **Carga de Excel**: Asegurarse de que las columnas `Nombre` y `Telefono` (o `Email`) estén presentes.
*   **Variables**: Usar el formato `{{nombre}}` para personalización dinámica en Email.
