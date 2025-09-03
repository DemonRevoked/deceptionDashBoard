#!/bin/bash

# ========================================
# AdvDeception VPS Services Status Check
# ========================================

echo "🔍 Checking VPS Services Status..."
echo "=================================="

# Check Backend (Port 5000)
echo -n "🔧 Backend (Port 5000): "
if curl -s http://localhost:5000/api/health/quick > /dev/null 2>&1; then
    echo "✅ RUNNING"
    
    # Check database connection
    db_status=$(curl -s http://localhost:5000/api/health/quick | grep -o '"database":"[^"]*"' | cut -d'"' -f4)
    if [ "$db_status" = "connected" ]; then
        echo "   Database: ✅ CONNECTED to VPS MongoDB"
    else
        echo "   Database: ❌ DISCONNECTED"
    fi
    
    # Check WebSocket
    ws_status=$(curl -s http://localhost:5000/api/health/quick | grep -o '"websocket":"[^"]*"' | cut -d'"' -f4)
    if [ "$ws_status" = "active" ]; then
        echo "   WebSocket: ✅ ACTIVE"
    else
        echo "   WebSocket: ❌ INACTIVE"
    fi
else
    echo "❌ NOT RUNNING"
fi

# Check Frontend (Port 3000)
echo -n "🎨 Frontend (Port 3000): "
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ RUNNING"
else
    echo "❌ NOT RUNNING"
fi

# Check Ports
echo ""
echo "📡 Port Status:"
echo "   Port 5000 (Backend): $(ss -tlnp | grep ':5000' | wc -l) listeners"
echo "   Port 3000 (Frontend): $(ss -tlnp | grep ':3000' | wc -l) listeners"

# Check Processes
echo ""
echo "🔄 Process Status:"
echo "   Backend Process: $(ps aux | grep 'server.js' | grep -v grep | wc -l) running"
echo "   Frontend Process: $(ps aux | grep 'react-scripts' | grep -v grep | wc -l) running"

# Check Logs
echo ""
echo "📝 Recent Logs:"
if [ -f "backend/vps-backend.log" ]; then
    echo "   Backend Log (last 5 lines):"
    tail -5 backend/vps-backend.log | sed 's/^/     /'
else
    echo "   Backend Log: Not found"
fi

if [ -f "frontend/vps-frontend.log" ]; then
    echo "   Frontend Log (last 5 lines):"
    tail -5 frontend/vps-frontend.log | sed 's/^/     /'
else
    echo "   Frontend Log: Not found"
fi

echo ""
echo "🌐 Access URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:5000/api"
echo "   Backend Health: http://localhost:5000/api/health/quick"
echo "   Backend Test: http://localhost:5000/api/test"

echo ""
echo "🔍 VPS Database Connection:"
echo "   Host: 10.0.44.77:27017"
echo "   Database: advdeception"
echo "   Status: $(curl -s http://localhost:5000/api/health/quick | grep -o '"database":"[^"]*"' | cut -d'"' -f4 || echo 'Unknown')"

echo ""
echo "📊 Client 1 Data Available:"
echo "   Collection: client_client_1"
echo "   Documents: 5 (scan alerts, deception detection, raw logs, AI responses, system events)"
echo "   Latest Activity: $(date -d '2025-08-29 16:07:40 +0530' '+%Y-%m-%d %H:%M:%S IST')"
