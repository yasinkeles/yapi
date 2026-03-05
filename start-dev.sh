#!/bin/bash

echo "[1/2] Starting Backend..."
cd backend && npm run dev &

echo "[2/2] Starting Frontend..."
cd ../frontend && npm run dev &

echo ""
echo "All services are starting in background."
echo "Backend: http://localhost:3000"
echo "Frontend: http://localhost:5173"
echo ""
echo "To stop them, use: pkill -f node"
wait
