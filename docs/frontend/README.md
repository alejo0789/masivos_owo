# Documentación Frontend - Masivos OWO

## Tecnologías Principales
*   **Next.js 15**: Framework de React con App Router.
*   **TypeScript**: Garantiza la seguridad de tipos en todo el proyecto.
*   **Tailwind CSS**: Framework de estilos para una interfaz moderna y rápida.
*   **Lucide React**: Biblioteca de iconos consistente.
*   **Shadcn/UI**: Componentes de interfaz de usuario reutilizables y accesibles.

## Estructura de Carpetas
```text
frontend/
├── src/
│   ├── app/           # Rutas y páginas (Dashboard, History, Contacts)
│   ├── components/    # Componentes de UI y lógica compartida
│   │   ├── assistant/ # Lógica del Asistente IA
│   │   ├── contacts/  # Gestión de listas y filtros
│   │   └── ui/        # Componentes base (Botones, Modales)
│   ├── lib/           # Utilidades, Hooks y Cliente API
│   └── types/         # Definiciones de interfaces TypeScript
```

## Características Técnicas
*   **Gestión de Estado**: Uso de Hooks nativos (`useState`, `useEffect`) y Context API para el manejo global de la autenticación.
*   **Llamadas a la API**: Centralizadas en `src/lib/api.ts` con tipado fuerte para las respuestas del backend.
*   **Diseño Responsivo**: La interfaz se adapta automáticamente a diferentes tamaños de pantalla (Desktop, Tablet, Mobile).
*   **Interacciones en Tiempo Real**: Feedback visual inmediato durante el proceso de envío masivo.

## Variables de Entorno (.env.local)
*   `NEXT_PUBLIC_API_URL`: URL del backend de FastAPI.

## Comandos de Desarrollo
```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Generar build de producción
npm run build
```
