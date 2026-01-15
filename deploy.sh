#!/bin/bash

# Script de Deployment Automatizado para Masivos OWO
# Uso: ./deploy.sh [update|fresh]

set -e  # Salir si hay algún error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuración
APP_DIR="/var/www/masivos_owo"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"

# Función para imprimir mensajes
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar si estamos en el directorio correcto
if [ ! -d "$APP_DIR" ]; then
    print_error "Directorio $APP_DIR no encontrado"
    exit 1
fi

# Función para deployment completo (primera vez)
fresh_deploy() {
    print_info "Iniciando deployment completo..."
    
    # Backend
    print_info "Configurando Backend..."
    cd "$BACKEND_DIR"
    
    if [ ! -d "venv" ]; then
        print_info "Creando entorno virtual..."
        python3 -m venv venv
    fi
    
    print_info "Activando entorno virtual..."
    source venv/bin/activate
    
    print_info "Instalando dependencias de Python..."
    pip install --upgrade pip
    pip install -r requirements.txt
    
    if [ ! -f ".env" ]; then
        print_warning "Archivo .env no encontrado. Copiando desde .env.example..."
        cp .env.example .env
        print_warning "¡IMPORTANTE! Edita el archivo .env con tus credenciales:"
        print_warning "nano $BACKEND_DIR/.env"
    fi
    
    print_info "Creando directorio de uploads..."
    mkdir -p uploads
    chmod 755 uploads
    
    # Frontend
    print_info "Configurando Frontend..."
    cd "$FRONTEND_DIR"
    
    print_info "Instalando dependencias de Node.js..."
    npm install
    
    if [ ! -f ".env.local" ]; then
        print_warning "Archivo .env.local no encontrado. Copiando desde env.example..."
        cp env.example .env.local
        print_warning "¡IMPORTANTE! Edita el archivo .env.local:"
        print_warning "nano $FRONTEND_DIR/.env.local"
    fi
    
    print_info "Construyendo aplicación de producción..."
    npm run build
    
    # Configurar servicios systemd
    print_info "Configurando servicios systemd..."
    
    # Servicio Backend
    sudo tee /etc/systemd/system/masivos-backend.service > /dev/null <<EOF
[Unit]
Description=Masivos OWO Backend API
After=network.target

[Service]
Type=simple
User=apache
Group=apache
WorkingDirectory=$BACKEND_DIR
Environment="PATH=$BACKEND_DIR/venv/bin"
ExecStart=$BACKEND_DIR/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8001
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    
    # Servicio Frontend
    sudo tee /etc/systemd/system/masivos-frontend.service > /dev/null <<EOF
[Unit]
Description=Masivos OWO Frontend
After=network.target

[Service]
Type=simple
User=apache
Group=apache
WorkingDirectory=$FRONTEND_DIR
Environment="PATH=/usr/bin:/bin"
Environment="NODE_ENV=production"
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    
    print_info "Recargando systemd..."
    sudo systemctl daemon-reload
    
    print_info "Habilitando servicios..."
    sudo systemctl enable masivos-backend
    sudo systemctl enable masivos-frontend
    
    print_info "Configurando permisos..."
    sudo chown -R apache:apache "$APP_DIR"
    sudo chmod -R 755 "$APP_DIR"
    sudo chmod -R 775 "$BACKEND_DIR/uploads"
    
    # Configurar SELinux si está habilitado
    if command -v getenforce &> /dev/null && [ "$(getenforce)" != "Disabled" ]; then
        print_info "Configurando SELinux..."
        sudo setsebool -P httpd_can_network_connect 1
        sudo chcon -R -t httpd_sys_content_t "$APP_DIR/"
        sudo chcon -R -t httpd_sys_rw_content_t "$BACKEND_DIR/uploads/"
    fi
    
    print_info "Iniciando servicios..."
    sudo systemctl start masivos-backend
    sudo systemctl start masivos-frontend
    
    print_info "Reiniciando Apache..."
    sudo systemctl restart httpd
    
    print_info "✅ Deployment completo exitoso!"
    print_info "Verifica el estado de los servicios:"
    echo "  sudo systemctl status masivos-backend"
    echo "  sudo systemctl status masivos-frontend"
}

# Función para actualizar (cuando ya está deployado)
update_deploy() {
    print_info "Actualizando aplicación..."
    
    cd "$APP_DIR"
    
    print_info "Obteniendo últimos cambios del repositorio..."
    git pull
    
    # Actualizar Backend
    print_info "Actualizando Backend..."
    cd "$BACKEND_DIR"
    source venv/bin/activate
    pip install -r requirements.txt
    
    # Actualizar Frontend
    print_info "Actualizando Frontend..."
    cd "$FRONTEND_DIR"
    npm install
    npm run build
    
    print_info "Reiniciando servicios..."
    sudo systemctl restart masivos-backend
    sudo systemctl restart masivos-frontend
    
    print_info "✅ Actualización completada!"
    
    # Mostrar estado de los servicios
    print_info "Estado de los servicios:"
    sudo systemctl status masivos-backend --no-pager -l
    sudo systemctl status masivos-frontend --no-pager -l
}

# Función para mostrar logs
show_logs() {
    print_info "Mostrando logs de los servicios..."
    echo ""
    echo "=== BACKEND LOGS ==="
    sudo journalctl -u masivos-backend -n 20 --no-pager
    echo ""
    echo "=== FRONTEND LOGS ==="
    sudo journalctl -u masivos-frontend -n 20 --no-pager
}

# Función para verificar estado
check_status() {
    print_info "Verificando estado de los servicios..."
    echo ""
    echo "=== BACKEND STATUS ==="
    sudo systemctl status masivos-backend --no-pager
    echo ""
    echo "=== FRONTEND STATUS ==="
    sudo systemctl status masivos-frontend --no-pager
    echo ""
    echo "=== APACHE STATUS ==="
    sudo systemctl status httpd --no-pager
}

# Menú principal
case "${1:-}" in
    fresh)
        fresh_deploy
        ;;
    update)
        update_deploy
        ;;
    logs)
        show_logs
        ;;
    status)
        check_status
        ;;
    *)
        echo "Uso: $0 {fresh|update|logs|status}"
        echo ""
        echo "Comandos:"
        echo "  fresh   - Deployment completo (primera vez)"
        echo "  update  - Actualizar aplicación existente"
        echo "  logs    - Mostrar logs de los servicios"
        echo "  status  - Verificar estado de los servicios"
        exit 1
        ;;
esac
