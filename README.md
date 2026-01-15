# Masivos OWO 📨

Sistema de mensajería masiva con soporte para WhatsApp y Email, desarrollado con FastAPI (backend) y Next.js (frontend).

## 🚀 Características

- ✉️ Envío masivo de mensajes por WhatsApp y Email
- 📋 Gestión de contactos y plantillas
- 📊 Historial de mensajes enviados
- 🔄 Integración con n8n para automatización
- 📁 Carga de archivos adjuntos
- 🎨 Interfaz moderna y responsiva

## 📁 Estructura del Proyecto

```
masivos_owo/
├── backend/          # API FastAPI
│   ├── models/       # Modelos de base de datos
│   ├── routers/      # Endpoints de la API
│   ├── schemas/      # Esquemas Pydantic
│   └── services/     # Lógica de negocio
├── frontend/         # Aplicación Next.js
│   └── src/
│       ├── app/      # Páginas y rutas
│       ├── components/ # Componentes React
│       └── lib/      # Utilidades y API client
└── imgs/            # Recursos de imágenes
```

## 🛠️ Tecnologías

### Backend
- **FastAPI** - Framework web moderno y rápido
- **SQLAlchemy** - ORM para base de datos
- **SQLite** - Base de datos
- **Pydantic** - Validación de datos

### Frontend
- **Next.js 15** - Framework React
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos
- **Lucide React** - Iconos

## 📋 Requisitos Previos

- Python 3.8+
- Node.js 18+
- npm o yarn

## ⚙️ Instalación

### Backend

1. Navega a la carpeta del backend:
```bash
cd backend
```

2. Crea un entorno virtual:
```bash
python -m venv venv
```

3. Activa el entorno virtual:
```bash
# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

4. Instala las dependencias:
```bash
pip install -r requirements.txt
```

5. Copia el archivo de ejemplo de variables de entorno:
```bash
cp .env.example .env
```

6. Configura las variables de entorno en `.env`:
```env
# API Configuration
API_BASE_URL=https://api.example.com
API_TOKEN=your_api_token_here

# WhatsApp Configuration
WHATSAPP_API_URL=https://graph.facebook.com/v17.0
WHATSAPP_ACCESS_TOKEN=your_whatsapp_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id

# n8n Webhooks
N8N_WEBHOOK_URL_WHATSAPP=https://your-n8n-instance.com/webhook/whatsapp
N8N_WEBHOOK_URL_EMAIL=https://your-n8n-instance.com/webhook/email
```

7. Inicia el servidor:
```bash
uvicorn main:app --reload --port 8001
```

El backend estará disponible en `http://localhost:8001`

### Frontend

1. Navega a la carpeta del frontend:
```bash
cd frontend
```

2. Instala las dependencias:
```bash
npm install
```

3. Copia el archivo de ejemplo de variables de entorno:
```bash
cp env.example .env.local
```

4. Configura las variables de entorno en `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8001
```

5. Inicia el servidor de desarrollo:
```bash
npm run dev
```

El frontend estará disponible en `http://localhost:3000`

## 🚀 Deployment en Servidor

Para desplegar la aplicación en un servidor CentOS con Apache, consulta la **[Guía de Deployment](DEPLOYMENT.md)** completa.

### Deployment Rápido

1. **Primera vez (deployment completo)**:
```bash
chmod +x deploy.sh
sudo ./deploy.sh fresh
```

2. **Actualizar aplicación existente**:
```bash
chmod +x quick-update.sh
sudo ./quick-update.sh
```

3. **Ver logs**:
```bash
sudo ./deploy.sh logs
```

4. **Verificar estado**:
```bash
sudo ./deploy.sh status
```

Para más detalles sobre configuración de Apache, servicios systemd, y troubleshooting, revisa [DEPLOYMENT.md](DEPLOYMENT.md).

## 📖 Uso

1. **Gestión de Contactos**: Importa contactos desde una API externa o agrégalos manualmente
2. **Plantillas**: Crea y gestiona plantillas de mensajes reutilizables
3. **Envío Masivo**: Selecciona contactos, elige una plantilla y envía mensajes por WhatsApp o Email
4. **Historial**: Revisa el historial de mensajes enviados con su estado

## 🔧 Desarrollo

### Comandos útiles

**Backend:**
```bash
# Ejecutar tests
pytest

# Formatear código
black .

# Linter
flake8
```

**Frontend:**
```bash
# Build de producción
npm run build

# Ejecutar build
npm start

# Linter
npm run lint
```

## 📝 Variables de Entorno

### Backend (.env)
- `API_BASE_URL`: URL base de la API externa de contactos
- `API_TOKEN`: Token de autenticación para la API externa
- `WHATSAPP_API_URL`: URL de la API de WhatsApp Business
- `WHATSAPP_ACCESS_TOKEN`: Token de acceso de WhatsApp
- `WHATSAPP_PHONE_NUMBER_ID`: ID del número de teléfono de WhatsApp
- `N8N_WEBHOOK_URL_WHATSAPP`: URL del webhook de n8n para WhatsApp
- `N8N_WEBHOOK_URL_EMAIL`: URL del webhook de n8n para Email

### Frontend (.env.local)
- `NEXT_PUBLIC_API_URL`: URL del backend API

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es privado y confidencial.

## 👥 Autor

Alejandro Carvajal González

---

**Nota**: Asegúrate de no compartir tus archivos `.env` o credenciales sensibles en el repositorio.
