#!/bin/sh
set -e

# Seed the database if it doesn't exist
if [ ! -f "$DATABASE_PATH" ]; then
  echo "Seeding database..."
  cd /app/server && node --import tsx src/seed.ts
  echo "Database seeded."
fi

# Start the Express backend
echo "Starting backend on port ${PORT:-3001}..."
cd /app/server && node --import tsx src/index.ts &

# Wait for backend to be ready
sleep 2

# Start nginx in foreground
echo "Starting nginx on port 80..."
nginx -g "daemon off;"
