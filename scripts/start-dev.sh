#!/bin/bash

echo "========================================"
echo "Multi-Database API Service"
echo "Starting Development Environment"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if node_modules exist in backend
if [ ! -d "backend/node_modules" ]; then
    echo -e "${RED}[ERROR] Backend dependencies not installed!${NC}"
    echo "Please run: cd backend && npm install"
    echo ""
    exit 1
fi

# Check if node_modules exist in frontend
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}[WARNING] Frontend dependencies not installed!${NC}"
    echo "Please run: cd frontend && npm install"
    echo ""
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Stopping services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Trap Ctrl+C
trap cleanup INT TERM

echo "Starting Backend Server..."
cd backend
npm run dev &
BACKEND_PID=$!

echo ""
echo "Waiting 3 seconds for backend to start..."
sleep 3

echo ""
echo "Starting Frontend Development Server..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "========================================"
echo -e "${GREEN}Services Started!${NC}"
echo "========================================"
echo "Backend API: http://localhost:3000"
echo "Frontend UI: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for processes
wait
