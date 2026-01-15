# verify_env.ps1
# Script para verificar la configuración del archivo .env

Write-Host "🔍 Verificando configuración del entorno..." -ForegroundColor Green
Write-Host ""

$BackendDir = "C:\Users\alejandro.carvajal\Documents\masivos_owo\backend"
$EnvFile = "$BackendDir\.env"
$EnvExampleFile = "$BackendDir\.env.example"

# Verificar que estamos en el directorio correcto
if (-not (Test-Path $BackendDir)) {
    Write-Host "❌ No se encuentra el directorio del backend: $BackendDir" -ForegroundColor Red
    exit 1
}

Write-Host "📁 Directorio del backend: $BackendDir" -ForegroundColor Cyan
Write-Host ""

# Verificar si existe .env
if (Test-Path $EnvFile) {
    Write-Host "✅ Archivo .env encontrado" -ForegroundColor Green
    
    # Leer y mostrar variables (sin mostrar valores sensibles)
    Write-Host ""
    Write-Host "📋 Variables configuradas:" -ForegroundColor Yellow
    
    $envContent = Get-Content $EnvFile
    foreach ($line in $envContent) {
        if ($line -match '^([^=]+)=(.*)$') {
            $varName = $matches[1].Trim()
            $varValue = $matches[2].Trim()
            
            # Mostrar si está configurada o vacía
            if ($varValue -eq "" -or $varValue -eq '""' -or $varValue -eq "''") {
                Write-Host "  ⚠️  $varName = (vacío)" -ForegroundColor Yellow
            } else {
                # Ocultar valores sensibles
                if ($varName -like "*TOKEN*" -or $varName -like "*PASSWORD*" -or $varName -like "*SECRET*") {
                    Write-Host "  ✅ $varName = ****" -ForegroundColor Green
                } else {
                    Write-Host "  ✅ $varName = $varValue" -ForegroundColor Green
                }
            }
        }
    }
} else {
    Write-Host "❌ Archivo .env NO encontrado" -ForegroundColor Red
    
    if (Test-Path $EnvExampleFile) {
        Write-Host ""
        Write-Host "💡 Se encontró .env.example. ¿Deseas copiarlo a .env? (S/N)" -ForegroundColor Yellow
        $response = Read-Host
        
        if ($response -eq "S" -or $response -eq "s") {
            Copy-Item $EnvExampleFile $EnvFile
            Write-Host "✅ Archivo .env creado desde .env.example" -ForegroundColor Green
            Write-Host ""
            Write-Host "⚠️  IMPORTANTE: Edita el archivo .env con tus credenciales:" -ForegroundColor Yellow
            Write-Host "   notepad $EnvFile" -ForegroundColor Cyan
        }
    } else {
        Write-Host "❌ Tampoco se encontró .env.example" -ForegroundColor Red
    }
    
    exit 1
}

Write-Host ""
Write-Host "🔍 Verificando variables críticas de WhatsApp..." -ForegroundColor Green

# Leer el archivo .env y verificar variables críticas
$envVars = @{}
Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $envVars[$matches[1].Trim()] = $matches[2].Trim()
    }
}

$criticalVars = @(
    "WHATSAPP_ACCESS_TOKEN",
    "WHATSAPP_BUSINESS_ACCOUNT_ID",
    "WHATSAPP_PHONE_NUMBER_ID"
)

$allConfigured = $true
foreach ($var in $criticalVars) {
    $value = $envVars[$var]
    if (-not $value -or $value -eq "" -or $value -eq '""' -or $value -eq "''" -or $value -like "*your_*" -or $value -like "*example*") {
        Write-Host "  ❌ $var no está configurado" -ForegroundColor Red
        $allConfigured = $false
    } else {
        Write-Host "  ✅ $var está configurado" -ForegroundColor Green
    }
}

Write-Host ""

if ($allConfigured) {
    Write-Host "✅ Todas las variables críticas están configuradas" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔄 Ahora reinicia el servicio del backend:" -ForegroundColor Yellow
    Write-Host "   Restart-Service MasivosBackend" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   O si lo estás ejecutando manualmente, detén y vuelve a iniciar:" -ForegroundColor Yellow
    Write-Host "   Ctrl+C para detener" -ForegroundColor Cyan
    Write-Host "   .\start_backend.ps1 para iniciar" -ForegroundColor Cyan
} else {
    Write-Host "⚠️  Algunas variables críticas no están configuradas" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📝 Edita el archivo .env:" -ForegroundColor Yellow
    Write-Host "   notepad $EnvFile" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📚 Para obtener las credenciales de WhatsApp:" -ForegroundColor Yellow
    Write-Host "   1. Ve a https://developers.facebook.com/" -ForegroundColor Cyan
    Write-Host "   2. Crea o selecciona tu app de WhatsApp Business" -ForegroundColor Cyan
    Write-Host "   3. Ve a WhatsApp > API Setup" -ForegroundColor Cyan
    Write-Host "   4. Copia el Access Token y Phone Number ID" -ForegroundColor Cyan
    Write-Host "   5. Ve a WhatsApp > Getting Started para el Business Account ID" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "📊 Ubicación del archivo .env:" -ForegroundColor Yellow
Write-Host "   $EnvFile" -ForegroundColor Cyan
