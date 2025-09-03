#!/bin/bash

# ========================================
# AdvDeception Mock Backend Startup Script
# ========================================

echo "🚀 Starting AdvDeception Mock Backend for Frontend Testing..."

# Check if we're in the right directory
if [ ! -f "backend/server-temp.js" ]; then
    echo "❌ Error: server-temp.js not found in backend directory!"
    echo "Please run this script from the central-infrastructure directory."
    exit 1
fi

# Navigate to backend directory
cd backend

echo "🔧 Starting mock backend server..."
echo "📋 This server will accept any login credentials for testing"
echo "🌐 Server will be available at: http://localhost:5000"
echo ""

# Start the mock server
node server-temp.js
