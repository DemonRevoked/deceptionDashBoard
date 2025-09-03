#!/bin/sh

# Check if we're running without database service
if [ "$MONGO_URI" = "mongodb://mongo:27017/advdeception" ] && ! nc -z mongo 27017 2>/dev/null; then
    echo "Database service not available, skipping initialization..."
    echo "Starting server (will attempt database connection but continue if it fails)..."
    npm run dev
    exit 0
fi

# Check if database initialization should be skipped
if [ "$SKIP_DB_INIT" = "true" ]; then
    echo "Database initialization skipped (SKIP_DB_INIT=true)"
    echo "Starting server (will attempt database connection but continue if it fails)..."
    npm run dev
    exit 0
fi

# Wait for MongoDB to be ready
echo "Waiting for MongoDB to be ready..."
sleep 5

# Initialize the database
echo "Initializing database..."
node init-db.js

# Start the server
echo "Starting server..."
npm run dev 