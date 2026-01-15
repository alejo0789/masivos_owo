# 🚀 Inicio Rápido - Windows Server

## Para ejecutar el backend accesible desde la red:

### Opción 1: Ejecutar manualmente (desarrollo/pruebas)

```powershell
# Navega a la carpeta del backend
cd C:\Users\alejandro.carvajal\Documents\masivos_owo\backend

# Ejecuta el script de inicio
.\start_backend.ps1
```

El backend estará disponible en:
- `http://localhost:8001/docs`
- `http://127.0.0.1:8001/docs`
- `http://IP-DEL-SERVIDOR:8001/docs`

### Opción 2: Configurar el Firewall (necesario para acceso remoto)

```powershell
# Ejecuta como Administrador
cd C:\Users\alejandro.carvajal\Documents\masivos_owo
.\configure_firewall.ps1
```

### Opción 3: Crear servicio de Windows (producción)

```powershell
# 1. Instalar NSSM (si no lo tienes)
choco install nssm -y
# O descarga desde: https://nssm.cc/download

# 2. Crear el servicio
nssm install MasivosBackend "C:\Users\alejandro.carvajal\Documents\masivos_owo\backend\venv\Scripts\python.exe" "-m uvicorn main:app --host 0.0.0.0 --port 8001"

# 3. Configurar el directorio de trabajo
nssm set MasivosBackend AppDirectory "C:\Users\alejandro.carvajal\Documents\masivos_owo\backend"

# 4. Configurar inicio automático
nssm set MasivosBackend Start SERVICE_AUTO_START

# 5. Iniciar el servicio
nssm start MasivosBackend

# 6. Verificar estado
nssm status MasivosBackend
```

## Para el Frontend:

```powershell
# Navega a la carpeta del frontend
cd C:\Users\alejandro.carvajal\Documents\masivos_owo\frontend

# Inicia el servidor
npm start
```

El frontend estará disponible en:
- `http://localhost:3000`
- `http://IP-DEL-SERVIDOR:3000`

## Verificar que todo funciona:

1. **Obtén la IP del servidor**:
```powershell
ipconfig
# Busca la dirección IPv4
```

2. **Prueba el backend desde otra máquina**:
```
http://IP-DEL-SERVIDOR:8001/docs
```

3. **Prueba el frontend desde otra máquina**:
```
http://IP-DEL-SERVIDOR:3000
```

## Troubleshooting:

### No puedo acceder desde otra máquina

1. **Verifica que el backend esté escuchando en 0.0.0.0**:
```powershell
netstat -ano | findstr ":8001"
# Debe mostrar 0.0.0.0:8001
```

2. **Verifica el firewall**:
```powershell
# Ejecuta el script de configuración del firewall
.\configure_firewall.ps1
```

3. **Verifica que el servicio esté corriendo**:
```powershell
Get-Service MasivosBackend
```

### El backend dice "Address already in use"

```powershell
# Ver qué proceso está usando el puerto 8001
netstat -ano | findstr ":8001"

# Matar el proceso (reemplaza PID con el número que aparece)
taskkill /PID <PID> /F
```

## Comandos Útiles:

### Ver logs del servicio:
```powershell
Get-EventLog -LogName Application -Source "MasivosBackend" -Newest 10
```

### Reiniciar el servicio:
```powershell
Restart-Service MasivosBackend
```

### Detener el servicio:
```powershell
Stop-Service MasivosBackend
```

### Ver puertos en uso:
```powershell
netstat -ano | findstr ":8001"
netstat -ano | findstr ":3000"
```
