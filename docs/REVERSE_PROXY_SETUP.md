# 🔧 Configuración de Reverse Proxy - Guía Completa

Esta guía explica cómo configurar el sistema para funcionar detrás de un reverse proxy Apache en CentOS.

## 📋 Arquitectura

```
Internet → CentOS (Apache) → Windows Server (192.168.2.91)
                ↓
        /masivos_owo → Frontend (Next.js :3000)
        /masivos_owo/api → Backend (FastAPI :8001)
```

## 🔧 Configuración del Frontend (Windows Server)

### 1. Configurar variables de entorno

Edita el archivo `.env.local` en el frontend:

```bash
# En Windows Server
cd C:\Users\alejandro.carvajal\Documents\masivos_owo\frontend
notepad .env.local
```

Agrega/modifica estas variables:

```env
# Backend API URL (accesible desde el navegador del cliente)
NEXT_PUBLIC_API_URL=http://tu-dominio.com/masivos_owo/api

# Base path para reverse proxy
NEXT_PUBLIC_BASE_PATH=/masivos_owo
```

### 2. Rebuild del Frontend

Después de cambiar la configuración, debes reconstruir el frontend:

```powershell
cd C:\Users\alejandro.carvajal\Documents\masivos_owo\frontend

# Instalar dependencias (si es necesario)
npm install

# Rebuild
npm run build

# Reiniciar el servicio (si usas servicio de Windows)
Restart-Service MasivosFrontend

# O si lo ejecutas manualmente, detén (Ctrl+C) y vuelve a iniciar:
npm start
```

### 3. Verificar que el frontend esté corriendo

```powershell
# Verificar que Next.js esté escuchando en el puerto 3000
netstat -ano | findstr ":3000"
```

Deberías ver algo como:
```
TCP    0.0.0.0:3000    0.0.0.0:0    LISTENING    1234
```

## 🐧 Configuración de Apache (CentOS)

### 1. Actualizar la configuración de Apache

En el servidor CentOS, edita el archivo de configuración:

```bash
sudo nano /etc/httpd/conf.d/masivos_owo.conf
```

Usa esta configuración (IMPORTANTE: el orden de las reglas ProxyPass importa):

```apache
<VirtualHost *:80>
    ServerName tu-dominio.com
    
    # Enable rewrite engine
    RewriteEngine On
    
    # WebSocket support for Next.js HMR (development)
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/masivos_owo/(.*)$ ws://192.168.2.91:3000/masivos_owo/$1 [P,L]
    
    # Proxy for Backend API (FastAPI on port 8001)
    # IMPORTANT: This must come BEFORE the frontend proxy
    ProxyPass /masivos_owo/api http://192.168.2.91:8001
    ProxyPassReverse /masivos_owo/api http://192.168.2.91:8001
    
    # Proxy for Next.js static files (_next directory)
    ProxyPass /masivos_owo/_next http://192.168.2.91:3000/masivos_owo/_next
    ProxyPassReverse /masivos_owo/_next http://192.168.2.91:3000/masivos_owo/_next
    
    # Proxy for Frontend (Next.js on port 3000)
    # This should be LAST to catch all other routes
    ProxyPass /masivos_owo http://192.168.2.91:3000/masivos_owo
    ProxyPassReverse /masivos_owo http://192.168.2.91:3000/masivos_owo
    
    # Preserve host header
    ProxyPreserveHost On
    
    # Proxy timeout settings
    ProxyTimeout 300
    
    # Additional proxy settings
    <Proxy *>
        Order deny,allow
        Allow from all
    </Proxy>
    
    # Logs
    ErrorLog /var/log/httpd/masivos_owo_error.log
    CustomLog /var/log/httpd/masivos_owo_access.log combined
</VirtualHost>
```

### 2. Verificar la configuración de Apache

```bash
# Verificar sintaxis
sudo apachectl configtest

# Si todo está OK, deberías ver:
# Syntax OK
```

### 3. Reiniciar Apache

```bash
sudo systemctl restart httpd

# Verificar que esté corriendo
sudo systemctl status httpd
```

### 4. Verificar logs en caso de error

```bash
# Ver logs de error
sudo tail -f /var/log/httpd/masivos_owo_error.log

# Ver logs de acceso
sudo tail -f /var/log/httpd/masivos_owo_access.log
```

## 🔍 Verificación

### 1. Desde el servidor CentOS, verifica conectividad al Windows Server:

```bash
# Verificar que puedes alcanzar el frontend
curl -I http://192.168.2.91:3000/masivos_owo

# Verificar que puedes alcanzar el backend
curl -I http://192.168.2.91:8001/health
```

### 2. Desde un navegador, accede a:

- **Frontend**: `http://tu-dominio.com/masivos_owo`
- **Backend API Docs**: `http://tu-dominio.com/masivos_owo/api/docs`
- **Backend Config**: `http://tu-dominio.com/masivos_owo/api/config`

## 🐛 Troubleshooting

### Problema: 404 en archivos `_next/static/...`

**Causa**: Apache no está redirigiendo correctamente los archivos estáticos de Next.js.

**Solución**:
1. Asegúrate de que la regla `ProxyPass /masivos_owo/_next` esté ANTES de `ProxyPass /masivos_owo`
2. Reinicia Apache: `sudo systemctl restart httpd`
3. Reinicia Next.js en Windows Server

### Problema: Página carga sin estilos

**Causa**: Next.js no está configurado con el `basePath` correcto.

**Solución**:
1. Verifica que `next.config.ts` tenga `basePath: '/masivos_owo'`
2. Verifica que `.env.local` tenga `NEXT_PUBLIC_BASE_PATH=/masivos_owo`
3. Rebuild: `npm run build`
4. Reinicia el servidor: `npm start`

### Problema: Error 502 Bad Gateway

**Causa**: Apache no puede conectarse al Windows Server.

**Solución**:
1. Verifica que el firewall de Windows permita conexiones en los puertos 3000 y 8001
2. Verifica que los servicios estén corriendo en Windows:
   ```powershell
   netstat -ano | findstr ":3000"
   netstat -ano | findstr ":8001"
   ```
3. Verifica conectividad desde CentOS:
   ```bash
   telnet 192.168.2.91 3000
   telnet 192.168.2.91 8001
   ```

### Problema: API requests fallan (CORS)

**Causa**: El backend no está configurado para aceptar requests del dominio público.

**Solución**:
Edita el archivo `.env` del backend en Windows:
```env
FRONTEND_URL=http://tu-dominio.com
```

Reinicia el backend.

## 📝 Checklist de Deployment

- [ ] Frontend configurado con `basePath` en `next.config.ts`
- [ ] Variables de entorno configuradas en `.env.local`
- [ ] Frontend rebuildeado con `npm run build`
- [ ] Frontend corriendo en puerto 3000
- [ ] Backend corriendo en puerto 8001
- [ ] Firewall de Windows permite puertos 3000 y 8001
- [ ] Apache configurado con las reglas ProxyPass en el orden correcto
- [ ] Apache reiniciado
- [ ] Logs de Apache no muestran errores
- [ ] Página carga correctamente con estilos
- [ ] API requests funcionan correctamente

## 🔄 Actualización después de cambios

Cuando hagas cambios en el código:

**En Windows Server:**
```powershell
cd C:\Users\alejandro.carvajal\Documents\masivos_owo

# Pull cambios
git pull

# Frontend
cd frontend
npm install
npm run build
Restart-Service MasivosFrontend  # o npm start

# Backend
cd ..\backend
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
Restart-Service MasivosBackend  # o uvicorn main:app --host 0.0.0.0 --port 8001
```

**En CentOS (si cambiaste la configuración de Apache):**
```bash
sudo systemctl restart httpd
```

---

**Nota**: Esta configuración asume que estás en desarrollo. Para producción, considera:
- Usar HTTPS con certificados SSL
- Configurar Next.js en modo producción sin HMR
- Implementar rate limiting
- Configurar logs rotativos
