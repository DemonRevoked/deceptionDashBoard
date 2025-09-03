#!/bin/bash

# ========================================
# AdvDeception Startup Script
# ========================================

set -e

echo "🚀 Starting AdvDeception Platform..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    echo "Please ensure .env file exists with proper configuration."
    echo "You can copy from env.example and customize it."
    exit 1
fi

# Load environment variables from .env
echo "📋 Loading environment configuration..."
export $(cat .env | grep -v '^#' | xargs)

# Verify critical environment variables
if [ -z "$MONGO_URI" ]; then
    echo "❌ Error: MONGO_URI not set in .env"
    exit 1
fi

echo "✅ Environment loaded successfully"
echo "🌐 MongoDB URI: $MONGO_URI"
echo "🔧 Backend Port: $BACKEND_PORT"
echo "🎨 Frontend Port: $FRONTEND_PORT"

# Test database connection first
echo "🧪 Testing VPS database connection..."
cd backend
node test-db.js
cd ..

if [ $? -eq 0 ]; then
    echo "✅ Database connection test successful"
else
    echo "❌ Database connection test failed"
    echo "Please check your VPS MongoDB configuration and network connectivity"
    exit 1
fi

# Start services with docker-compose
echo "🐳 Starting services with docker-compose.yml..."
docker-compose --env-file .env up -d

echo "✅ Services started successfully!"
echo ""
echo "📊 Service Status:"
echo "   Backend: http://localhost:$BACKEND_PORT"
echo "   Frontend: http://localhost:$FRONTEND_PORT"
echo "   Load Balancer: http://localhost:${LOAD_BALANCER_PORT:-80}"
echo ""
echo "🔍 Check service health:"
echo "   Backend: http://localhost:$BACKEND_PORT/api/health"
echo "   Frontend: http://localhost:$FRONTEND_PORT"
echo ""
echo "📝 Logs:"
echo "   docker-compose logs -f"

