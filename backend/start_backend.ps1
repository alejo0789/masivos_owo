# start_backend.ps1
# Script para iniciar el backend de Masivos OWO

# Activar entorno virtual
& "$PSScriptRoot\venv\Scripts\Activate.ps1"

# Iniciar uvicorn en todas las interfaces de red
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
