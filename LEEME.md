# Integra Suite en DigitalOcean (reemplaza a Supabase)

Contenido: `server.js` (API + sitio), `public/index.html` (tu ERP adaptado),
`create-admin.js`, `backup.sh`, `nginx-integra.conf`.

## 0. ANTES de apagar nada: respalda tus datos actuales
En el sistema viejo, con la sesión donde ves tus datos: Configuración → **Descargar Backup**.
Guarda ese archivo. Lo vas a importar en el sistema nuevo.

## 1. Preparar el Droplet (Ubuntu)
    sudo apt update && sudo apt install -y nginx sqlite3 certbot python3-certbot-nginx
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs
    sudo npm install -g pm2

## 2. Subir y arrancar
    # copie esta carpeta al servidor, por ejemplo a /opt/integra
    cd /opt/integra && npm install --omit=dev
    node create-admin.js adminsys "UNA_CLAVE_FUERTE_DE_8+" "Su nombre"
    pm2 start server.js --name integra && pm2 save && pm2 startup

## 3. Dominio y HTTPS
    sudo cp nginx-integra.conf /etc/nginx/sites-available/integra   # edite TU_DOMINIO
    sudo ln -s /etc/nginx/sites-available/integra /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx
    sudo certbot --nginx -d TU_DOMINIO
(Apunte el DNS del dominio a la IP del Droplet antes de este paso.)

## 4. Primer ingreso
Entre con `adminsys` y en Configuración → **Importar** cargue el backup del paso 0.
Luego cree de nuevo a los usuarios en el módulo Usuarios (las contraseñas viejas
estaban en Supabase y no se pueden copiar). Los colaboradores ya comparten datos.

## 5. Respaldos (obligatorio)
    sudo crontab -e   y agregar:   30 2 * * * /opt/integra/backup.sh
Copie de vez en cuando /var/backups/integra a su computador o a otro lugar.

## Notas
- Datos: `data/integra.db`; imágenes: `data/uploads/` (se comprimen a máx. 1000 px).
- Las claves de IA/correo (Gemini, Brevo, etc.) siguen guardándose solo en cada navegador.
- Actualizar: reemplace `public/index.html` y ejecute `pm2 restart integra`.
