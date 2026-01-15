# start_backend_production.ps1
# Script para iniciar el backend en modo producción (sin reload)

# Activar entorno virtual
& "$PSScriptRoot\venv\Scripts\Activate.ps1"

# Iniciar uvicorn en todas las interfaces de red (producción)
uvicorn main:app --host 0.0.0.0 --port 8001
