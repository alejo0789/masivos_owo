# 🚀 Guía de Deployment - Masivos OWO

Esta guía te ayudará a desplegar la aplicación en un servidor CentOS con Apache.

## 📋 Requisitos del Servidor

- CentOS 7/8 o superior
- Apache 2.4+
- Python 3.8+
- Node.js 18+
- Git
- Acceso SSH al servidor

## 🔧 Preparación del Servidor

### 1. Conectarse al Servidor

```bash
ssh usuario@ip-del-servidor
```

### 2. Instalar Dependencias del Sistema

```bash
# Actualizar el sistema
sudo yum update -y

# Instalar Python 3.8+ (si no está instalado)
sudo yum install python3 python3-pip python3-devel -y

# Instalar Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install nodejs -y

# Instalar Git
sudo yum install git -y

# Instalar herramientas de desarrollo
sudo yum groupinstall "Development Tools" -y
```

### 3. Verificar Instalaciones

```bash
python3 --version  # Debe ser 3.8 o superior
node --version     # Debe ser 18.x
npm --version
git --version
```

## 📥 Clonar el Repositorio

```bash
# Navegar al directorio de aplicaciones
cd /var/www/

# Clonar el repositorio (usa GitLab o GitHub según prefieras)
sudo git clone https://github.com/alejo0789/masivos_owo.git
# O desde GitLab:
# sudo git clone https://gitlab.com/ingenieroia_acertemos/masivos_owo.git

# Dar permisos al usuario
sudo chown -R $USER:$USER masivos_owo
cd masivos_owo
```

## 🐍 Configuración del Backend

### 1. Crear Entorno Virtual

```bash
cd /var/www/masivos_owo/backend

# Crear entorno virtual
python3 -m venv venv

# Activar entorno virtual
source venv/bin/activate
```

### 2. Instalar Dependencias de Python

```bash
# Asegúrate de estar en el entorno virtual (debe aparecer (venv) en el prompt)
pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Configurar Variables de Entorno

```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Editar el archivo .env con tus credenciales
nano .env
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

Guarda con `Ctrl+O`, `Enter`, y sal con `Ctrl+X`.

### 4. Crear Directorios Necesarios

```bash
# Crear directorio para uploads
mkdir -p uploads

# Dar permisos
chmod 755 uploads
```

### 5. Probar el Backend

```bash
# Activar entorno virtual si no está activo
source venv/bin/activate

# Ejecutar el servidor de prueba
uvicorn main:app --host 0.0.0.0 --port 8001

# Presiona Ctrl+C para detener
```

## ⚛️ Configuración del Frontend

### 1. Instalar Dependencias de Node.js

```bash
cd /var/www/masivos_owo/frontend

# Instalar dependencias
npm install
```

### 2. Configurar Variables de Entorno

```bash
# Copiar el archivo de ejemplo
cp env.example .env.local

# Editar el archivo
nano .env.local
```

**Contenido del archivo `.env.local`:**
```env
NEXT_PUBLIC_API_URL=https://saman.lafortuna.com.co/masivos_owo/api
```

### 3. Construir la Aplicación para Producción

```bash
# Build de producción
npm run build

# Esto creará la carpeta .next con los archivos optimizados
```

### 4. Probar el Frontend

```bash
# Ejecutar en modo producción
npm start

# Presiona Ctrl+C para detener
```

## 🔄 Configurar Servicios Systemd

### 1. Crear Servicio para el Backend

```bash
sudo nano /etc/systemd/system/masivos-backend.service
```

**Contenido del archivo:**
```ini
[Unit]
Description=Masivos OWO Backend API
After=network.target

[Service]
Type=simple
User=apache
Group=apache
WorkingDirectory=/var/www/masivos_owo/backend
Environment="PATH=/var/www/masivos_owo/backend/venv/bin"
ExecStart=/var/www/masivos_owo/backend/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8001
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 2. Crear Servicio para el Frontend

```bash
sudo nano /etc/systemd/system/masivos-frontend.service
```

**Contenido del archivo:**
```ini
[Unit]
Description=Masivos OWO Frontend
After=network.target

[Service]
Type=simple
User=apache
Group=apache
WorkingDirectory=/var/www/masivos_owo/frontend
Environment="PATH=/usr/bin:/bin"
Environment="NODE_ENV=production"
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 3. Habilitar y Iniciar los Servicios

```bash
# Recargar systemd
sudo systemctl daemon-reload

# Habilitar servicios para que inicien al arrancar
sudo systemctl enable masivos-backend
sudo systemctl enable masivos-frontend

# Iniciar servicios
sudo systemctl start masivos-backend
sudo systemctl start masivos-frontend

# Verificar estado
sudo systemctl status masivos-backend
sudo systemctl status masivos-frontend
```

## 🌐 Configuración de Apache

### 1. Crear Archivo de Configuración

```bash
sudo nano /etc/httpd/conf.d/masivos_owo.conf
```

**Contenido del archivo:**
```apache
<VirtualHost *:80>
    ServerName saman.lafortuna.com.co
    
    # Proxy para el frontend (Next.js en puerto 3000)
    ProxyPreserveHost On
    ProxyPass /masivos_owo http://127.0.0.1:3000/masivos_owo
    ProxyPassReverse /masivos_owo http://127.0.0.1:3000/masivos_owo
    
    # Proxy para el backend API (FastAPI en puerto 8001)
    ProxyPass /masivos_owo/api http://127.0.0.1:8001
    ProxyPassReverse /masivos_owo/api http://127.0.0.1:8001
    
    # Logs
    ErrorLog /var/log/httpd/masivos_owo_error.log
    CustomLog /var/log/httpd/masivos_owo_access.log combined
</VirtualHost>
```

### 2. Habilitar Módulos de Apache

```bash
# Habilitar mod_proxy
sudo yum install mod_ssl -y

# Verificar que los módulos estén habilitados
sudo httpd -M | grep proxy
```

### 3. Configurar SELinux (si está habilitado)

```bash
# Permitir que Apache haga conexiones de red
sudo setsebool -P httpd_can_network_connect 1

# Dar permisos a los directorios
sudo chcon -R -t httpd_sys_content_t /var/www/masivos_owo/
sudo chcon -R -t httpd_sys_rw_content_t /var/www/masivos_owo/backend/uploads/
```

### 4. Reiniciar Apache

```bash
# Verificar configuración
sudo apachectl configtest

# Si todo está OK, reiniciar Apache
sudo systemctl restart httpd
```

## 🔥 Configurar Firewall

```bash
# Permitir tráfico HTTP y HTTPS
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## ✅ Verificar el Deployment

1. **Backend API**: `https://saman.lafortuna.com.co/masivos_owo/api/docs`
2. **Frontend**: `https://saman.lafortuna.com.co/masivos_owo`

## 🔄 Actualizar la Aplicación

Cuando hagas cambios y quieras actualizar el servidor:

```bash
cd /var/www/masivos_owo

# Obtener últimos cambios
git pull

# Actualizar Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart masivos-backend

# Actualizar Frontend
cd ../frontend
npm install
npm run build
sudo systemctl restart masivos-frontend

# Verificar servicios
sudo systemctl status masivos-backend
sudo systemctl status masivos-frontend
```

## 📊 Comandos Útiles

### Ver Logs del Backend
```bash
sudo journalctl -u masivos-backend -f
```

### Ver Logs del Frontend
```bash
sudo journalctl -u masivos-frontend -f
```

### Ver Logs de Apache
```bash
sudo tail -f /var/log/httpd/masivos_owo_error.log
sudo tail -f /var/log/httpd/masivos_owo_access.log
```

### Reiniciar Servicios
```bash
sudo systemctl restart masivos-backend
sudo systemctl restart masivos-frontend
sudo systemctl restart httpd
```

### Detener Servicios
```bash
sudo systemctl stop masivos-backend
sudo systemctl stop masivos-frontend
```

## 🐛 Troubleshooting

### El backend no inicia
```bash
# Ver logs detallados
sudo journalctl -u masivos-backend -n 50

# Verificar que el puerto 8001 esté libre
sudo netstat -tulpn | grep 8001

# Probar manualmente
cd /var/www/masivos_owo/backend
source venv/bin/activate
uvicorn main:app --host 127.0.0.1 --port 8001
```

### El frontend no inicia
```bash
# Ver logs detallados
sudo journalctl -u masivos-frontend -n 50

# Verificar que el puerto 3000 esté libre
sudo netstat -tulpn | grep 3000

# Probar manualmente
cd /var/www/masivos_owo/frontend
npm start
```

### Error 502 Bad Gateway
- Verifica que los servicios estén corriendo
- Revisa los logs de Apache
- Verifica que los puertos 3000 y 8001 estén escuchando

### Error de permisos
```bash
# Dar permisos correctos
sudo chown -R apache:apache /var/www/masivos_owo
sudo chmod -R 755 /var/www/masivos_owo
sudo chmod -R 775 /var/www/masivos_owo/backend/uploads
```

## 🔒 Seguridad

1. **Nunca subas el archivo `.env` al repositorio**
2. **Usa HTTPS en producción**
3. **Mantén las dependencias actualizadas**
4. **Configura backups regulares de la base de datos**
5. **Limita el acceso SSH solo a IPs autorizadas**

---

**¿Necesitas ayuda?** Revisa los logs y contacta al equipo de desarrollo.
