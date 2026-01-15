#!/bin/bash

# Script Rápido de Actualización
# Este script hace git pull y reinicia los servicios

echo "🔄 Actualizando Masivos OWO..."

cd /var/www/masivos_owo

echo "📥 Obteniendo cambios del repositorio..."
git pull

echo "🐍 Actualizando Backend..."
cd backend
source venv/bin/activate
pip install -r requirements.txt --quiet
deactivate

echo "⚛️ Actualizando Frontend..."
cd ../frontend
npm install --silent
npm run build

echo "🔄 Reiniciando servicios..."
sudo systemctl restart masivos-backend
sudo systemctl restart masivos-frontend

echo "✅ ¡Actualización completada!"
echo ""
echo "📊 Estado de los servicios:"
sudo systemctl status masivos-backend --no-pager | head -n 3
sudo systemctl status masivos-frontend --no-pager | head -n 3
