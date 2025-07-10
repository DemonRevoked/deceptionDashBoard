#!/bin/bash
echo "=== Starting Infrastructure ==="
./estart_infra.sh
# Wait for MongoDB to be ready
sleep 5

echo "=== Initializing Database ==="
# Initialize the database with default honeypot
docker exec backend node init-db.js

echo "=== Database initialized ==="

echo "=== All services started successfully ==="
