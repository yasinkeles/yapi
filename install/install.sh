#!/bin/bash

###############################################################################
# Yapi - Dependency Installer (Linux/Unix)
# Author: YASİN KELEŞ (Yapi)
###############################################################################

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         Yapi Dependency Installer                             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "This script will ONLY install Node.js dependencies for:"
echo -e "   1. Backend Dependencies"
echo -e "   2. Frontend Dependencies"
echo -e "   3. Env Configuration (.env)"
echo -e "   4. Database Initialization"
echo ""
echo -e "Current directory: $(pwd)"
echo ""

# Check for root is removed - installing deps shouldn't necessarily require root unless in protected dir

read -p "Are you sure you want to continue? (yes/no): " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}Installation cancelled.${NC}"
    exit 0
fi

echo -e "${BLUE}[Checking system requirements]${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js not found! Please install Node.js first.${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Node.js $(node -v) found${NC}"
fi

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm not found. Please install Node.js first.${NC}"
    exit 1
else
    echo -e "${GREEN}✓ npm $(npm -v) found${NC}"
fi

echo ""
echo -e "${BLUE}[1/4] Installing backend dependencies...${NC}"
cd backend
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend dependencies installed${NC}"
else
    echo -e "${RED}Failed to install backend dependencies${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}[2/4] Installing frontend dependencies...${NC}"
cd ../frontend
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
else
    echo -e "${RED}Failed to install frontend dependencies${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}[3/4] Setting up backend environment...${NC}"
cd ../backend

# Create .env if not exists
# Force recreate .env
if [ -f .env ]; then
    echo -e "${YELLOW}Removing existing .env to regenerate...${NC}"
    rm .env
fi

echo -e "${YELLOW}Creating .env file...${NC}"
cat > .env << 'EOF'
# Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# JWT Configuration
JWT_SECRET=CHANGE_THIS_TO_A_SECURE_RANDOM_STRING_AT_LEAST_32_CHARS
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
REFRESH_TOKEN_SECRET=CHANGE_THIS_TO_ANOTHER_RANDOM_STRING_AT_LEAST_32_CHARS

# Encryption
ENCRYPTION_KEY=CHANGE_THIS_TO_A_VERY_LONG_STRING_AT_LEAST_32_CHARS_FOR_ENCRYPTION_KEY
ENCRYPTION_SALT=CHANGE_THIS_TO_A_RANDOM_SALT_AT_LEAST_16_CHARS

# CORS Configuration
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
# Note: Add your server IP (e.g., http://192.168.1.x:3000) to CORS_ORIGIN if accessing remotely

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs

# Database Connection Pool
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_POOL_IDLE_TIMEOUT=30000
DB_POOL_ACQUIRE_TIMEOUT=30000
EOF
echo -e "${GREEN}✓ .env file created${NC}"
echo -e "${YELLOW}⚠ IMPORTANT: Edit backend/.env later to change secrets!${NC}"

echo ""
echo -e "${BLUE}[4/4] Initializing database...${NC}"
node src/database/init.js
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database initialized${NC}"
else
    echo -e "${RED}Failed to initialize database${NC}"
    exit 1
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                  Installation Complete! ✓                      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
