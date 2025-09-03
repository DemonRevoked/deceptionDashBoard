#!/bin/bash

# ========================================
# AdvDeception Stop Script
# ========================================

echo "🛑 Stopping AdvDeception services..."

# Stop services
docker-compose down

echo "✅ Services stopped successfully!"
echo ""
echo "📝 To start again, run: ./start.sh"

