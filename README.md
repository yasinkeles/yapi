# Yapi Platform

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**Transform your databases into REST APIs in minutes**

[Features](#features) • [Quick Start](#quick-start) • [Documentation](#documentation) • [Deployment](#deployment)

</div>

---

## 🚀 Overview

Yapi is a powerful platform that allows you to create REST API endpoints from your existing databases without writing code. Connect multiple databases (PostgreSQL, MySQL, MS SQL, Oracle, SQLite) and expose them as secure, rate-limited REST APIs.

**Developed by YASİN KELEŞ (Yapi)**

## ✨ Features

### 🗄️ Multi-Database Support
- **PostgreSQL** - Full support with connection pooling
- **MySQL** - Optimized queries and transactions
- **MS SQL Server** - Native driver integration
- **Oracle** - Enterprise database support
- **SQLite** - Embedded database for development

### 🔐 Security First
- JWT-based authentication
- API key management
- Role-based access control (Admin/User)
- Rate limiting (configurable per endpoint)
- CORS protection
- SQL injection prevention

### 📊 Analytics & Monitoring
- Real-time API usage statistics
- Response time tracking
- Error rate monitoring
- Request volume charts
- Database connection health

### 🎨 Modern UI
- Dark theme interface
- Responsive design
- Real-time updates
- Intuitive dashboard
- Easy configuration

### ⚡ Performance
- Connection pooling
- Query optimization
- Caching support
- Async/await architecture
- PM2 cluster mode ready

## 🏗️ Architecture

```
┌─────────────────┐
│   Frontend      │  React + Tailwind CSS
│   (Admin Panel) │  Modern Dark UI
└────────┬────────┘
         │
         │ REST API
         │
┌────────▼────────┐
│   Backend       │  Node.js + Express
│   (API Server)  │  JWT Auth + Rate Limiting
└────────┬────────┘
         │
         │ Database Adapters
         │
┌────────▼────────────────────────┐
│  PostgreSQL │ MySQL │ MS SQL   │
│  Oracle     │ SQLite           │
└──────────────────────────────────┘
```

## 📋 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Option 1: Automated Installation (Recommended)

#### Linux/Unix:
```bash
cd install
chmod +x install.sh
sudo ./install.sh
```

#### Windows:
```cmd
cd install
install.bat
```

The script will:
- ✅ Check system requirements
- ✅ Install all dependencies
- ✅ Build frontend
- ✅ Initialize database
- ✅ Configure PM2
- ✅ Start the application

### Option 2: Development Mode (Local Start)

To run both backend and frontend simultaneously for development:

#### Linux/Unix:
```bash
./start-dev.sh
```

#### Windows:
```cmd
start-dev.bat
```

### Option 3: Manual Installation

#### 1. Clone the repository
```bash
git clone <repository-url>
cd api
```

#### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env and configure settings
node src/database/init.js
npm start
```

#### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

#### 4. Access the Application
- **Backend API**: http://localhost:3000
- **Admin Panel**: http://localhost:5173
- **Health Check**: http://localhost:3000/health

#### 5. Login
Check `backend/logs/init.log` for default credentials:
```
Username: admin
Password: [generated-password]
```

## 🎯 Usage

### 1. Add a Data Source

Navigate to **Data Sources** and click **Add Data Source**:

```javascript
{
  "name": "My PostgreSQL DB",
  "type": "postgresql",
  "host": "localhost",
  "port": 5432,
  "database": "mydb",
  "username": "user",
  "password": "pass"
}
```

### 2. Create an API Endpoint

Go to **API Endpoints** and click **Create Endpoint**:

```javascript
{
  "name": "Get Users",
  "path": "users",
  "method": "GET",
  "dataSource": "My PostgreSQL DB",
  "query": "SELECT * FROM users WHERE id = :id",
  "authMode": "api_key"
}
```

### 3. Generate an API Key

Visit **API Keys** and create a new key:

```javascript
{
  "name": "Mobile App Key",
  "expiresAt": "2025-12-31"
}
```

### 4. Call Your API

```bash
curl -X GET \
  'http://localhost:3000/api/v1/users?id=123' \
  -H 'X-API-Key: your-api-key-here'
```

## 📚 API Documentation

### Authentication

#### Admin Endpoints
```
POST /admin/auth/login
POST /admin/auth/logout
POST /admin/auth/refresh
GET  /admin/auth/me
POST /admin/auth/change-password
```

#### Data Sources
```
GET    /admin/data-sources
POST   /admin/data-sources
GET    /admin/data-sources/:id
PUT    /admin/data-sources/:id
DELETE /admin/data-sources/:id
POST   /admin/data-sources/:id/test
```

#### API Endpoints
```
GET    /admin/api-endpoints
POST   /admin/api-endpoints
GET    /admin/api-endpoints/:id
PUT    /admin/api-endpoints/:id
DELETE /admin/api-endpoints/:id
POST   /admin/api-endpoints/:id/test
```

#### API Keys
```
GET    /admin/api-keys
POST   /admin/api-keys
DELETE /admin/api-keys/:id
```

### Dynamic API Endpoints

All created endpoints are available at:
```
GET/POST/PUT/DELETE /api/v1/{your-endpoint-path}
```

Query parameters are automatically mapped to SQL parameters:
```sql
-- SQL Query
SELECT * FROM users WHERE id = :id AND status = :status

-- API Call
GET /api/v1/users?id=123&status=active
```

## 🔧 Configuration

### Environment Variables

Create `backend/.env`:

```env
# Server
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# JWT
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# CORS
CORS_ORIGIN=http://localhost:5173,https://yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Database Pool
DB_POOL_MIN=2
DB_POOL_MAX=10
```

## 🚀 Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy with PM2

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup startup script
pm2 startup
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🛠️ Development

### Project Structure

```
api/
├── backend/
│   ├── src/
│   │   ├── adapters/        # Database adapters
│   │   ├── controllers/     # Route controllers
│   │   ├── middleware/      # Express middleware
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   └── utils/           # Utilities
│   ├── data/                # SQLite database
│   └── logs/                # Application logs
│
├── frontend/
│   ├── src/                 # React source code
│   └── dist/                # Production build
│
├── install/
│   ├── install.sh           # Linux installation
│   └── install.bat          # Windows installation
│
├── backup/
│   ├── dailybackup/         # Daily DB snapshots
│   ├── backup.sh            # Linux daily backup
│   └── backup.bat           # Windows daily backup
│
├── exports/                 # Generated setup packages
│   ├── export.sh            # Linux packaging tool
│   └── export.bat           # Windows packaging tool
│
├── start-dev.sh             # Linux dev start
├── start-dev.bat            # Windows dev start
├── DEPLOYMENT.md            # Deployment guide
├── KURULUM.txt              # TR kurulum rehberi
└── README.md                # This file
```

### Tech Stack

**Backend:**
- Node.js + Express
- JWT authentication
- SQLite (metadata storage)
- Multiple database drivers

**Frontend:**
- React 18
- Tailwind CSS
- Recharts (analytics)
- Axios (HTTP client)

## 📊 Screenshots

### Dashboard
Modern dark theme with real-time statistics and quick actions.

### API Endpoints
Create and manage REST API endpoints with visual query builder.

### Analytics
Track API usage, response times, and error rates in real-time.

## 🔒 Security

- **Authentication**: JWT with refresh tokens
- **Authorization**: Role-based access control
- **Rate Limiting**: Configurable per endpoint
- **SQL Injection**: Parameterized queries
- **CORS**: Configurable origins
- **Secrets**: Environment variable based

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License.

## 👨‍💻 Author

**YASİN KELEŞ (Yapi)**

## 🙏 Acknowledgments

- Built with modern web technologies
- Inspired by the need for rapid API development
- Community feedback and contributions

## 📞 Support

For issues and questions:
- Check the [DEPLOYMENT.md](DEPLOYMENT.md) guide
- Review application logs: `pm2 logs yapi-backend`
- Contact: YASİN KELEŞ (Yapi)

---

<div align="center">

**Made with ❤️ by YASİN KELEŞ (Yapi)**

</div>
