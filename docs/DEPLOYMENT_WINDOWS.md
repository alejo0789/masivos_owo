# 🚀 Guía de Deployment - Windows Server

Esta guía te ayudará a desplegar la aplicación en Windows Server con IIS (Internet Information Services).

## 📋 Requisitos del Servidor

- Windows Server 2016 o superior
- IIS 10+
- Python 3.8+
- Node.js 18+
- Git para Windows
- URL Rewrite Module para IIS
- Application Request Routing (ARR) para IIS

## 🔧 Preparación del Servidor

### 1. Instalar IIS

Abre PowerShell como Administrador y ejecuta:

```powershell
# Instalar IIS con características necesarias
Install-WindowsFeature -name Web-Server -IncludeManagementTools
Install-WindowsFeature -name Web-WebSockets
Install-WindowsFeature -name Web-App-Dev
```

### 2. Instalar URL Rewrite y ARR

1. **URL Rewrite Module**:
   - Descarga desde: https://www.iis.net/downloads/microsoft/url-rewrite
   - Instala el módulo

2. **Application Request Routing (ARR)**:
   - Descarga desde: https://www.iis.net/downloads/microsoft/application-request-routing
   - Instala ARR
   - Abre IIS Manager → Click en el servidor → Application Request Routing Cache → Server Proxy Settings
   - Marca "Enable proxy" y aplica

### 3. Instalar Python

```powershell
# Descargar Python 3.11 (o la versión que prefieras)
# Ve a https://www.python.org/downloads/windows/
# Descarga el instalador y asegúrate de marcar "Add Python to PATH"

# Verificar instalación
python --version
pip --version
```

### 4. Instalar Node.js

```powershell
# Descargar Node.js 18 LTS
# Ve a https://nodejs.org/
# Descarga e instala el instalador .msi

# Verificar instalación
node --version
npm --version
```

### 5. Instalar Git

```powershell
# Descargar Git para Windows
# Ve a https://git-scm.com/download/win
# Instala con las opciones por defecto

# Verificar instalación
git --version
```

## 📥 Clonar el Repositorio

Abre PowerShell como Administrador:

```powershell
# Navegar al directorio de IIS
cd C:\inetpub\wwwroot

# Clonar el repositorio
git clone https://github.com/alejo0789/masivos_owo.git
# O desde GitLab:
# git clone https://gitlab.com/ingenieroia_acertemos/masivos_owo.git

cd masivos_owo
```

## 🐍 Configuración del Backend

### 1. Crear Entorno Virtual

```powershell
cd C:\inetpub\wwwroot\masivos_owo\backend

# Crear entorno virtual
python -m venv venv

# Activar entorno virtual
.\venv\Scripts\Activate.ps1
```

**Nota**: Si obtienes un error de política de ejecución, ejecuta:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 2. Instalar Dependencias

```powershell
# Asegúrate de que el entorno virtual esté activado (debe aparecer (venv) en el prompt)
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Configurar Variables de Entorno

```powershell
# Copiar el archivo de ejemplo
copy .env.example .env

# Editar el archivo .env con Notepad
notepad .env
```

**Contenido del archivo `.env`:**
```env
# API Configuration
API_BASE_URL=https://api.example.com
API_TOKEN=tu_token_aqui

# WhatsApp Configuration
WHATSAPP_API_URL=https://graph.facebook.com/v17.0
WHATSAPP_ACCESS_TOKEN=tu_token_whatsapp
WHATSAPP_PHONE_NUMBER_ID=tu_phone_number_id

# n8n Webhooks
N8N_WEBHOOK_URL_WHATSAPP=https://tu-n8n.com/webhook/whatsapp
N8N_WEBHOOK_URL_EMAIL=https://tu-n8n.com/webhook/email
```

### 4. Crear Directorios Necesarios

```powershell
# Crear directorio para uploads
New-Item -ItemType Directory -Force -Path uploads
```

### 5. Probar el Backend

```powershell
# Activar entorno virtual si no está activo
.\venv\Scripts\Activate.ps1

# Ejecutar el servidor de prueba
uvicorn main:app --host 127.0.0.1 --port 8001

# Presiona Ctrl+C para detener
```

## ⚛️ Configuración del Frontend

### 1. Instalar Dependencias

```powershell
cd C:\inetpub\wwwroot\masivos_owo\frontend

# Instalar dependencias
npm install
```

### 2. Configurar Variables de Entorno

```powershell
# Copiar el archivo de ejemplo
copy env.example .env.local

# Editar el archivo
notepad .env.local
```

**Contenido del archivo `.env.local`:**
```env
NEXT_PUBLIC_API_URL=https://tu-dominio.com/masivos_owo/api
```

### 3. Construir la Aplicación para Producción

```powershell
# Build de producción
npm run build
```

### 4. Probar el Frontend

```powershell
# Ejecutar en modo producción
npm start

# Presiona Ctrl+C para detener
```

## 🔄 Configurar Servicios de Windows

### 1. Instalar NSSM (Non-Sucking Service Manager)

```powershell
# Descargar NSSM desde https://nssm.cc/download
# Extraer el archivo ZIP
# Copiar nssm.exe a C:\Windows\System32\

# O usar Chocolatey si lo tienes instalado:
choco install nssm -y
```

### 2. Crear Servicio para el Backend

```powershell
# Crear el servicio
nssm install MasivosBackend "C:\inetpub\wwwroot\masivos_owo\backend\venv\Scripts\python.exe" "C:\inetpub\wwwroot\masivos_owo\backend\venv\Scripts\uvicorn.exe main:app --host 127.0.0.1 --port 8001"

# Configurar el directorio de trabajo
nssm set MasivosBackend AppDirectory "C:\inetpub\wwwroot\masivos_owo\backend"

# Configurar el servicio para que se inicie automáticamente
nssm set MasivosBackend Start SERVICE_AUTO_START

# Configurar reinicio en caso de fallo
nssm set MasivosBackend AppExit Default Restart
nssm set MasivosBackend AppRestartDelay 5000

# Iniciar el servicio
nssm start MasivosBackend

# Verificar estado
nssm status MasivosBackend
```

### 3. Crear Servicio para el Frontend

```powershell
# Crear el servicio
nssm install MasivosFrontend "C:\Program Files\nodejs\npm.cmd" "start"

# Configurar el directorio de trabajo
nssm set MasivosFrontend AppDirectory "C:\inetpub\wwwroot\masivos_owo\frontend"

# Configurar variables de entorno
nssm set MasivosFrontend AppEnvironmentExtra NODE_ENV=production

# Configurar el servicio para que se inicie automáticamente
nssm set MasivosFrontend Start SERVICE_AUTO_START

# Configurar reinicio en caso de fallo
nssm set MasivosFrontend AppExit Default Restart
nssm set MasivosFrontend AppRestartDelay 5000

# Iniciar el servicio
nssm start MasivosFrontend

# Verificar estado
nssm status MasivosFrontend
```

### 4. Verificar Servicios

```powershell
# Ver servicios en ejecución
Get-Service | Where-Object {$_.Name -like "Masivos*"}

# Ver logs de eventos
Get-EventLog -LogName Application -Source "MasivosBackend" -Newest 10
Get-EventLog -LogName Application -Source "MasivosFrontend" -Newest 10
```

## 🌐 Configuración de IIS

### 1. Crear Sitio Web en IIS

Abre IIS Manager y:

1. Click derecho en "Sites" → "Add Website"
2. Configura:
   - **Site name**: MasivosOWO
   - **Physical path**: `C:\inetpub\wwwroot\masivos_owo\frontend`
   - **Binding**: 
     - Type: http
     - Port: 80
     - Host name: tu-dominio.com

### 2. Configurar Reverse Proxy

Crea un archivo `web.config` en `C:\inetpub\wwwroot\masivos_owo\`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <rewrite>
            <rules>
                <!-- Proxy para el Backend API -->
                <rule name="Backend API" stopProcessing="true">
                    <match url="^masivos_owo/api/(.*)" />
                    <action type="Rewrite" url="http://127.0.0.1:8001/{R:1}" />
                    <serverVariables>
                        <set name="HTTP_X_ORIGINAL_ACCEPT_ENCODING" value="{HTTP_ACCEPT_ENCODING}" />
                        <set name="HTTP_ACCEPT_ENCODING" value="" />
                    </serverVariables>
                </rule>
                
                <!-- Proxy para el Frontend -->
                <rule name="Frontend" stopProcessing="true">
                    <match url="^masivos_owo/(.*)" />
                    <action type="Rewrite" url="http://127.0.0.1:3000/masivos_owo/{R:1}" />
                    <serverVariables>
                        <set name="HTTP_X_ORIGINAL_ACCEPT_ENCODING" value="{HTTP_ACCEPT_ENCODING}" />
                        <set name="HTTP_ACCEPT_ENCODING" value="" />
                    </serverVariables>
                </rule>
            </rules>
            
            <outboundRules>
                <rule name="Restore Accept-Encoding" preCondition="NeedsRestoringAcceptEncoding">
                    <match serverVariable="HTTP_ACCEPT_ENCODING" pattern="^(.*)" />
                    <action type="Rewrite" value="{HTTP_X_ORIGINAL_ACCEPT_ENCODING}" />
                </rule>
                <preConditions>
                    <preCondition name="NeedsRestoringAcceptEncoding">
                        <add input="{HTTP_X_ORIGINAL_ACCEPT_ENCODING}" pattern=".+" />
                    </preCondition>
                </preConditions>
            </outboundRules>
        </rewrite>
        
        <!-- Configuración de seguridad -->
        <security>
            <requestFiltering>
                <requestLimits maxAllowedContentLength="52428800" /> <!-- 50MB -->
            </requestFiltering>
        </security>
    </system.webServer>
</configuration>
```

### 3. Configurar Permisos

```powershell
# Dar permisos a IIS_IUSRS
icacls "C:\inetpub\wwwroot\masivos_owo" /grant "IIS_IUSRS:(OI)(CI)F" /T
icacls "C:\inetpub\wwwroot\masivos_owo\backend\uploads" /grant "IIS_IUSRS:(OI)(CI)F" /T
```

### 4. Reiniciar IIS

```powershell
iisreset
```

## 🔥 Configurar Firewall

```powershell
# Permitir tráfico HTTP
New-NetFirewallRule -DisplayName "Allow HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow

# Permitir tráfico HTTPS
New-NetFirewallRule -DisplayName "Allow HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
```

## ✅ Verificar el Deployment

1. **Backend API**: `http://tu-dominio.com/masivos_owo/api/docs`
2. **Frontend**: `http://tu-dominio.com/masivos_owo`

## 🔄 Actualizar la Aplicación

Crea un script PowerShell `update.ps1`:

```powershell
# update.ps1
Write-Host "🔄 Actualizando Masivos OWO..." -ForegroundColor Green

cd C:\inetpub\wwwroot\masivos_owo

Write-Host "📥 Obteniendo cambios del repositorio..." -ForegroundColor Yellow
git pull

Write-Host "🐍 Actualizando Backend..." -ForegroundColor Yellow
cd backend
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
deactivate

Write-Host "⚛️ Actualizando Frontend..." -ForegroundColor Yellow
cd ..\frontend
npm install
npm run build

Write-Host "🔄 Reiniciando servicios..." -ForegroundColor Yellow
Restart-Service MasivosBackend
Restart-Service MasivosFrontend

Write-Host "✅ ¡Actualización completada!" -ForegroundColor Green

# Verificar estado de los servicios
Get-Service | Where-Object {$_.Name -like "Masivos*"} | Format-Table -AutoSize
```

Para ejecutar:
```powershell
.\update.ps1
```

## 📊 Comandos Útiles

### Ver Logs de Servicios
```powershell
# Ver logs del backend
Get-EventLog -LogName Application -Source "MasivosBackend" -Newest 20

# Ver logs del frontend
Get-EventLog -LogName Application -Source "MasivosFrontend" -Newest 20
```

### Gestionar Servicios
```powershell
# Ver estado
Get-Service MasivosBackend, MasivosFrontend

# Iniciar servicios
Start-Service MasivosBackend
Start-Service MasivosFrontend

# Detener servicios
Stop-Service MasivosBackend
Stop-Service MasivosFrontend

# Reiniciar servicios
Restart-Service MasivosBackend
Restart-Service MasivosFrontend
```

### Ver Puertos en Uso
```powershell
# Ver qué está usando los puertos 3000 y 8001
netstat -ano | findstr ":3000"
netstat -ano | findstr ":8001"
```

### Reiniciar IIS
```powershell
iisreset
```

## 🐛 Troubleshooting

### El backend no inicia

```powershell
# Ver logs detallados
nssm status MasivosBackend

# Probar manualmente
cd C:\inetpub\wwwroot\masivos_owo\backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --host 127.0.0.1 --port 8001
```

### El frontend no inicia

```powershell
# Ver logs detallados
nssm status MasivosFrontend

# Probar manualmente
cd C:\inetpub\wwwroot\masivos_owo\frontend
npm start
```

### Error 502 Bad Gateway

- Verifica que los servicios estén corriendo: `Get-Service Masivos*`
- Verifica que los puertos 3000 y 8001 estén escuchando: `netstat -ano | findstr ":3000"`
- Revisa los logs de IIS en `C:\inetpub\logs\LogFiles`

### Error de permisos

```powershell
# Dar permisos completos a IIS
icacls "C:\inetpub\wwwroot\masivos_owo" /grant "IIS_IUSRS:(OI)(CI)F" /T
icacls "C:\inetpub\wwwroot\masivos_owo" /grant "IUSR:(OI)(CI)F" /T
```

### Reinstalar un servicio

```powershell
# Detener y eliminar el servicio
nssm stop MasivosBackend
nssm remove MasivosBackend confirm

# Volver a crear el servicio (ver sección anterior)
```

## 🔒 Seguridad

1. **Nunca subas el archivo `.env` al repositorio**
2. **Usa HTTPS en producción** (configura un certificado SSL en IIS)
3. **Mantén las dependencias actualizadas**
4. **Configura backups regulares de la base de datos**
5. **Limita el acceso RDP solo a IPs autorizadas**
6. **Configura Windows Firewall correctamente**

## 📦 Backup

Crea un script de backup `backup.ps1`:

```powershell
# backup.ps1
$BackupDir = "C:\Backups\masivos_owo"
$Date = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$BackupPath = "$BackupDir\backup_$Date"

# Crear directorio de backup
New-Item -ItemType Directory -Force -Path $BackupPath

# Backup de la base de datos
Copy-Item "C:\inetpub\wwwroot\masivos_owo\backend\messaging.db" -Destination "$BackupPath\messaging.db"

# Backup de uploads
Copy-Item -Recurse "C:\inetpub\wwwroot\masivos_owo\backend\uploads" -Destination "$BackupPath\uploads"

# Backup de archivos .env
Copy-Item "C:\inetpub\wwwroot\masivos_owo\backend\.env" -Destination "$BackupPath\backend.env"
Copy-Item "C:\inetpub\wwwroot\masivos_owo\frontend\.env.local" -Destination "$BackupPath\frontend.env.local"

Write-Host "✅ Backup completado en: $BackupPath" -ForegroundColor Green

# Limpiar backups antiguos (más de 30 días)
Get-ChildItem $BackupDir | Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-30)} | Remove-Item -Recurse -Force
```

Programa el backup con Task Scheduler para que se ejecute diariamente.

---

**¿Necesitas ayuda?** Revisa los logs y contacta al equipo de desarrollo.
