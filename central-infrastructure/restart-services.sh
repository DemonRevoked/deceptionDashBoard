#!/bin/bash

# ========================================
# AdvDeception Services Restart Script
# ========================================

set -e

echo "🔄 Restarting AdvDeception Services..."
echo "====================================="

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    echo "Please ensure .env file exists with proper configuration."
    exit 1
fi

# Stop existing services
echo "🛑 Stopping existing services..."
docker-compose down

echo "⏳ Waiting for services to stop..."
sleep 5

# Start services
echo "🚀 Starting services..."
docker-compose --env-file .env up -d

echo "⏳ Waiting for services to start..."
sleep 10

# Load environment variables to get ports
export $(cat .env | grep -v '^#' | xargs)

# Check service health
echo ""
echo "🔍 Checking service health..."

# Check backend
if curl -s http://localhost:${BACKEND_PORT:-5000}/api/health/quick > /dev/null 2>&1; then
    echo "✅ Backend is running and healthy"
else
    echo "⚠️  Backend may still be starting up..."
fi

# Check frontend
if curl -s http://localhost:${FRONTEND_PORT:-3000} > /dev/null 2>&1; then
    echo "✅ Frontend is running"
else
    echo "⚠️  Frontend may still be starting up..."
fi

echo ""
echo "🎉 Services restart completed!"
echo "📋 Service Status:"
echo "   Backend: http://localhost:${BACKEND_PORT:-5000}/api/health"
echo "   Frontend: http://localhost:${FRONTEND_PORT:-3000}"
echo "   Load Balancer: http://localhost:${LOAD_BALANCER_PORT:-80}"
echo ""
echo "🔍 Check status with: ./check-status.sh"
echo "📝 View logs with: docker-compose logs -f"
