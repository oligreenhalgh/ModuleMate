#!/bin/sh
set -e

# Capture Cloud Run's PORT (default 8080) before overriding
NGINX_PORT=${PORT:-8080}

# Seed the database if it doesn't exist
if [ ! -f "$DATABASE_PATH" ]; then
  echo "Seeding database..."
  cd /app/server && PORT=${BACKEND_PORT:-3001} node --import tsx src/seed.ts
  echo "Database seeded."
fi

# Start the Express backend on its own port
echo "Starting backend on port ${BACKEND_PORT:-3001}..."
cd /app/server && PORT=${BACKEND_PORT:-3001} node --import tsx src/index.ts &

# Wait for backend to be ready
sleep 2

# Start nginx in foreground on Cloud Run's PORT
echo "Starting nginx on port ${NGINX_PORT}..."
sed -i "s/listen 8080/listen ${NGINX_PORT}/" /etc/nginx/http.d/default.conf
nginx -g "daemon off;"
