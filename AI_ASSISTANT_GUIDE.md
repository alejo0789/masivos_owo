# 🤖 Asistente de IA para Redacción de Emails

## Descripción General

Se ha integrado un **Asistente de IA** en el sistema de mensajería masiva que ayuda a los usuarios a redactar emails profesionales y crear plantillas de manera inteligente. El asistente se conecta a n8n mediante un webhook dedicado y proporciona una interfaz conversacional moderna.

## 🎯 Características Principales

### 1. **Interfaz Conversacional**
- Chat en tiempo real con el asistente de IA
- Mensajes con diseño tipo WhatsApp
- Indicadores de carga animados
- Scroll automático a nuevos mensajes

### 2. **Vista Previa en Tiempo Real**
- Panel dividido que muestra el chat y la vista previa HTML
- Renderizado en vivo del contenido generado
- Botón "Aplicar" para insertar el contenido en el editor

### 3. **Diseño Premium**
- Gradientes modernos (púrpura a rosa)
- Icono de estrella/sparkle para indicar IA
- Badge "Powered by AI" y "Beta"
- Efectos de glassmorphism y sombras
- Animaciones suaves

### 4. **Integración Dual**
- **Plantillas de Email**: Botón en `TemplateModal`
- **Mensajes Masivos**: Botón en `MessageComposer`

## 📁 Archivos Modificados/Creados

### Backend

#### 1. **`.env`**
```bash
WEBHOOK_ASSISTANT=https://saman.lafortuna.com.co/n8n/webhook/webhook_assistant
```

#### 2. **`backend/config.py`**
- Agregado campo `webhook_assistant: str`

#### 3. **`backend/routers/assistant.py`** (NUEVO)
Endpoints:
- `POST /assistant/chat` - Chat con el asistente
- `POST /assistant/generate-template` - Generar plantilla completa

Modelos:
- `Message` - Mensaje del chat (role, content)
- `AssistantRequest` - Solicitud al asistente
- `AssistantResponse` - Respuesta del asistente (message, html_preview, is_final)

#### 4. **`backend/routers/__init__.py`**
- Exportado `assistant_router`

#### 5. **`backend/main.py`**
- Registrado `assistant_router`
- Agregado verificación de configuración en startup
- Agregado webhook assistant al health check

### Frontend

#### 1. **`frontend/src/lib/api.ts`**
Nuevos tipos e interfaces:
```typescript
interface AssistantMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface AssistantRequest {
    messages: AssistantMessage[];
    context?: 'template' | 'bulk_message';
}

interface AssistantResponse {
    message: string;
    html_preview?: string;
    is_final: boolean;
}
```

Nuevas funciones:
- `chatWithAssistant()` - Enviar mensaje al asistente
- `generateTemplate()` - Generar plantilla completa

#### 2. **`frontend/src/components/AIAssistantModal.tsx`** (NUEVO)
Componente modal del asistente con:
- Chat conversacional
- Vista previa HTML en tiempo real
- Manejo de contexto (template/bulk_message)
- Aplicación de contenido generado
- Diseño responsive con panel dividido

#### 3. **`frontend/src/components/TemplateModal.tsx`**
- Importado `AIAssistantModal`
- Agregado estado `showAIAssistant`
- Agregado botón "Asistente IA" con icono de estrella
- Implementado `handleApplyAIContent()` para extraer y aplicar HTML

#### 4. **`frontend/src/components/MessageComposer.tsx`**
- Importado `AIAssistantModal`
- Agregado estado `showAIAssistant`
- Agregado botón "Asistente IA" en el header
- Implementado `handleApplyAIContent()` para extraer texto del HTML

## 🔌 Integración con n8n

### Webhook: `webhook_assistant`

#### Request Esperado
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Necesito un email de bienvenida para nuevos clientes"
    },
    {
      "role": "assistant",
      "content": "Claro, ¿qué tono prefieres?"
    },
    {
      "role": "user",
      "content": "Profesional pero amigable"
    }
  ],
  "context": "template"
}
```

#### Response Esperada
```json
{
  "message": "He creado una plantilla de bienvenida para ti. ¿Te gustaría ver la vista previa?",
  "html_preview": "<h1>¡Bienvenido!</h1><p>Nos alegra tenerte con nosotros...</p>",
  "is_final": false
}
```

### Campos de Response

- **`message`** (string, requerido): Mensaje de texto del asistente
- **`html_preview`** (string, opcional): HTML renderizable para vista previa
- **`is_final`** (boolean, requerido): Indica si es la respuesta final

## 🎨 Diseño Visual

### Iconos de IA
- **Icono principal**: Estrella/Sparkle (path SVG personalizado)
- **Color**: Gradiente púrpura a rosa
- **Efecto**: Glow/blur en el fondo del icono
- **Badge**: "Powered by AI" o "Beta"

### Paleta de Colores
```css
/* Gradientes principales */
from-purple-600 to-pink-600  /* Botones */
from-purple-500 to-pink-500  /* Iconos */
from-slate-900 to-slate-800  /* Fondo modal */

/* Bordes */
border-purple-500/20  /* Bordes sutiles */
border-purple-500/30  /* Bordes de inputs */
```

### Botón del Asistente
```tsx
<button className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 
                   hover:from-purple-700 hover:to-pink-700 text-white rounded-xl 
                   font-medium transition-all duration-200 flex items-center gap-2 
                   shadow-lg hover:shadow-xl">
    <svg>...</svg>
    Asistente IA
    <span className="text-xs px-2 py-0.5 bg-white/20 rounded-full">Beta</span>
</button>
```

## 🚀 Uso

### En Plantillas de Email
1. Abrir el modal de crear/editar plantilla
2. Hacer clic en el botón "Asistente IA" (abajo a la izquierda)
3. Conversar con el asistente sobre el tipo de plantilla
4. Ver la vista previa en tiempo real
5. Hacer clic en "Aplicar" para insertar el contenido
6. Continuar editando o guardar la plantilla

### En Mensajes Masivos
1. Abrir la página de mensajes masivos
2. En la sección "Componer Mensaje", hacer clic en "Asistente IA"
3. Describir el mensaje que se necesita
4. El asistente generará el contenido
5. Hacer clic en "Aplicar" para insertar el texto
6. Seleccionar destinatarios y enviar

## 📝 Notas Técnicas

### Extracción de Contenido

**Para Plantillas** (`TemplateModal`):
```typescript
// Extrae el contenido del body del HTML generado
const contentMatch = html.match(/<td[^>]*style="[^"]*padding[^"]*"[^>]*>([\s\S]*?)<\/td>[\s\S]*?<!-- Footer -->/i);
```

**Para Mensajes** (`MessageComposer`):
```typescript
// Extrae solo el texto del HTML
const tempDiv = document.createElement('div');
tempDiv.innerHTML = html;
const textContent = tempDiv.textContent || tempDiv.innerText || '';
```

### Timeout
- El cliente HTTP en el backend tiene un timeout de **60 segundos**
- Esto permite conversaciones más largas con el agente de IA

### Manejo de Errores
- Errores de red se muestran como mensajes del asistente
- Mensaje de error: "❌ Lo siento, hubo un error al procesar tu solicitud..."

## 🔧 Configuración Requerida

### Variables de Entorno
```bash
# Backend .env
WEBHOOK_ASSISTANT=https://saman.lafortuna.com.co/n8n/webhook/webhook_assistant
```

### n8n Workflow
El workflow en n8n debe:
1. Recibir el array de mensajes y el contexto
2. Procesar con un agente de IA (OpenAI, Claude, etc.)
3. Generar HTML cuando sea apropiado
4. Devolver la respuesta en el formato especificado

## ✅ Checklist de Implementación

- [x] Backend: Configuración del webhook
- [x] Backend: Router del asistente
- [x] Backend: Modelos Pydantic
- [x] Backend: Registro en main.py
- [x] Frontend: Funciones de API
- [x] Frontend: Componente AIAssistantModal
- [x] Frontend: Integración en TemplateModal
- [x] Frontend: Integración en MessageComposer
- [x] Frontend: Iconos y diseño premium
- [ ] n8n: Configurar workflow del asistente
- [ ] Testing: Probar conversaciones
- [ ] Testing: Probar aplicación de contenido

## 🎯 Próximos Pasos

1. **Configurar el workflow en n8n** con un agente de IA
2. **Probar la integración** end-to-end
3. **Ajustar prompts** del agente según feedback
4. **Agregar ejemplos** de plantillas predefinidas
5. **Implementar historial** de conversaciones (opcional)
6. **Agregar sugerencias** automáticas (opcional)

---

**Fecha de Implementación**: 2026-01-17
**Versión**: 1.0.0
**Estado**: ✅ Implementado - Pendiente configuración n8n
