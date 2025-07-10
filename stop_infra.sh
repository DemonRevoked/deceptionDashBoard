#!/bin/bash
# Stop SSH honeypot stack
echo "Stopping SSH honeypot stack..."
docker compose -f cpd-blocks/ssh-honeypot/docker-compose.yml down

# Stop main infrastructure (backend, frontend, db)
echo "Stopping main infrastructure stack..."
docker compose down

echo "Removing network..."
docker network rm advdeception-net

echo "All services stopped." 