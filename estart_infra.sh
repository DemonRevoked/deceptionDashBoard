#!/bin/bash
echo "Creating network..."
docker network create advdeception-net
# Start main infrastructure (backend, frontend, db)
echo "Starting main infrastructure stack..."
docker compose up --build -d

# Start SSH honeypot stack
echo "Starting SSH honeypot stack..."
docker compose -f cpd-blocks/ssh-honeypot/docker-compose.yml up --build -d

echo "All services started." 