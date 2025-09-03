#!/bin/bash

# ========================================
# AdvDeception Service Status Check
# ========================================

echo "🔍 Checking AdvDeception Services Status..."
echo "=========================================="

# Check Backend (Port 5000)
echo -n "🔧 Backend (Port 5000): "
if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "✅ RUNNING"
    echo "   Health: $(curl -s http://localhost:5000/api/health | jq -r '.status' 2>/dev/null || echo 'Unknown')"
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
echo "   Backend Process: $(ps aux | grep server-temp | grep -v grep | wc -l) running"
echo "   Frontend Process: $(ps aux | grep react-scripts | grep -v grep | wc -l) running"

# Check Logs
echo ""
echo "📝 Recent Logs:"
if [ -f "backend/mock-backend.log" ]; then
    echo "   Backend Log (last 5 lines):"
    tail -5 backend/mock-backend.log | sed 's/^/     /'
else
    echo "   Backend Log: Not found"
fi

echo ""
echo "🌐 Access URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:5000/api"
echo "   Backend Health: http://localhost:5000/api/health"
echo "   Backend Test: http://localhost:5000/api/test"
