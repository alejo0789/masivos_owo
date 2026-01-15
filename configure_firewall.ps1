# configure_firewall.ps1
# Script para configurar el firewall de Windows para Masivos OWO

Write-Host "🔥 Configurando Firewall de Windows..." -ForegroundColor Green

# Permitir puerto 8001 (Backend API)
New-NetFirewallRule -DisplayName "Masivos OWO - Backend API" `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 8001 `
    -Action Allow `
    -Profile Any

Write-Host "✅ Puerto 8001 (Backend) permitido" -ForegroundColor Green

# Permitir puerto 3000 (Frontend)
New-NetFirewallRule -DisplayName "Masivos OWO - Frontend" `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 3000 `
    -Action Allow `
    -Profile Any

Write-Host "✅ Puerto 3000 (Frontend) permitido" -ForegroundColor Green

# Permitir HTTP (puerto 80)
New-NetFirewallRule -DisplayName "Masivos OWO - HTTP" `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 80 `
    -Action Allow `
    -Profile Any

Write-Host "✅ Puerto 80 (HTTP) permitido" -ForegroundColor Green

# Permitir HTTPS (puerto 443)
New-NetFirewallRule -DisplayName "Masivos OWO - HTTPS" `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 443 `
    -Action Allow `
    -Profile Any

Write-Host "✅ Puerto 443 (HTTPS) permitido" -ForegroundColor Green

Write-Host ""
Write-Host "🎉 Configuración del firewall completada!" -ForegroundColor Green
Write-Host ""
Write-Host "Ahora puedes acceder a:" -ForegroundColor Yellow
Write-Host "  - Backend API: http://IP-DEL-SERVIDOR:8001/docs" -ForegroundColor Cyan
Write-Host "  - Frontend: http://IP-DEL-SERVIDOR:3000" -ForegroundColor Cyan
