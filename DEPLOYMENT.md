# Yapi - Deployment Guide

## Quick Installation

### Linux/Unix Server
```bash
chmod +x install.sh
sudo ./install.sh
```

### Windows Server
```cmd
install.bat
```

## What the Installation Script Does

1. ✅ Checks system requirements (Node.js, npm, PM2)
2. ✅ Installs all backend dependencies
3. ✅ Installs all frontend dependencies
4. ✅ Builds frontend for production
5. ✅ Creates .env configuration file
6. ✅ Initializes SQLite database
7. ✅ Sets up PM2 process manager
8. ✅ (Linux only) Optionally configures Nginx

## Post-Installation Steps

### 1. Secure Your Installation

Edit `backend/.env` and change:
```env
JWT_SECRET=your-very-secure-random-string-at-least-32-characters-long
```

Generate a secure secret:
```bash
# Linux/Mac
openssl rand -base64 32

# Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### 2. Update CORS Settings

In `backend/.env`, update CORS_ORIGIN with your production domain:
```env
CORS_ORIGIN=https://yourdomain.com,https://api.yourdomain.com
```

### 3. Get Default Login Credentials

Check the initialization log:
```bash
# Linux/Mac
cat backend/logs/init.log

# Windows
type backend\logs\init.log
```

Look for lines like:
```
Default admin user created:
Username: admin
Password: [generated-password]
```

### 4. Access Your Application

- **Backend API**: `http://your-server:3000`
- **Admin Panel**: `http://your-server` (if Nginx configured)
- **Health Check**: `http://your-server:3000/health`

## PM2 Management Commands

```bash
# View status
pm2 status

# View logs
pm2 logs yapi-backend

# Restart application
pm2 restart yapi-backend

# Stop application
pm2 stop yapi-backend

# Monitor resources
pm2 monit

# View detailed info
pm2 show yapi-backend
```

## Nginx Configuration (Linux)

If you chose to configure Nginx during installation, your site is available at your domain.

### Enable HTTPS with Let's Encrypt

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal is configured automatically
```

## Manual Deployment (Without Script)

### Backend

```bash
cd backend
npm install
node src/database/init.js
npm start
```

### Frontend

```bash
cd frontend
npm install
npm run build
# Serve the 'dist' folder with any web server
```

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3000` |
| `HOST` | Server host | `0.0.0.0` |
| `JWT_SECRET` | JWT signing secret | **MUST CHANGE** |
| `JWT_ACCESS_EXPIRY` | Access token expiry | `15m` |
| `JWT_REFRESH_EXPIRY` | Refresh token expiry | `7d` |
| `CORS_ORIGIN` | Allowed CORS origins | `http://localhost:5173` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |
| `LOG_LEVEL` | Logging level | `info` |
| `DB_POOL_MIN` | Min DB connections | `2` |
| `DB_POOL_MAX` | Max DB connections | `10` |

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 3000
# Linux/Mac
lsof -i :3000

# Windows
netstat -ano | findstr :3000

# Kill the process or change PORT in .env
```

### PM2 Not Starting
```bash
# Check logs
pm2 logs yapi-backend --lines 100

# Delete and restart
pm2 delete yapi-backend
pm2 start ecosystem.config.js
```

### Database Errors
```bash
# Re-initialize database
cd backend
node src/database/init.js
```

### Frontend Not Loading
```bash
# Rebuild frontend
cd frontend
npm run build

# Check Nginx configuration
sudo nginx -t
sudo systemctl restart nginx
```

## Security Checklist

- [ ] Changed JWT_SECRET to a secure random string
- [ ] Updated CORS_ORIGIN with production domains
- [ ] Changed default admin password
- [ ] Enabled HTTPS (SSL certificate)
- [ ] Configured firewall (allow only 80, 443)
- [ ] Set up regular backups for SQLite database
- [ ] Reviewed and adjusted rate limiting settings
- [ ] Enabled PM2 startup on boot

## Backup & Restore

### Backup Database
```bash
# SQLite database location
cp backend/data/database.sqlite backend/data/database.backup.sqlite

# With timestamp
cp backend/data/database.sqlite "backend/data/database.$(date +%Y%m%d_%H%M%S).sqlite"
```

### Restore Database
```bash
cp backend/data/database.backup.sqlite backend/data/database.sqlite
pm2 restart yapi-backend
```

## Updating the Application

```bash
# Pull latest changes
git pull

# Update backend
cd backend
npm install
pm2 restart yapi-backend

# Update frontend
cd ../frontend
npm install
npm run build

# Reload Nginx (if used)
sudo systemctl reload nginx
```

## Support

For issues and questions:
- Check logs: `pm2 logs yapi-backend`
- Review this documentation
- Contact: YASİN KELEŞ (Yapi)

---

**Developed by YASİN KELEŞ (Yapi)**
