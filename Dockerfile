# ============================================
# Stage 1: Build the frontend
# ============================================
FROM node:20-alpine AS frontend-build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ============================================
# Stage 2: Build the backend
# ============================================
FROM node:20-alpine AS backend-build

RUN apk add --no-cache python3 make g++

WORKDIR /app/server
COPY server/package.json server/package-lock.json* ./
RUN npm install --omit=dev
COPY server/ .

# ============================================
# Stage 3: Production image
# ============================================
FROM node:20-alpine

RUN apk add --no-cache nginx python3 make g++

WORKDIR /app

# Copy backend
COPY --from=backend-build /app/server ./server

# Copy frontend build output
COPY --from=frontend-build /app/dist ./dist

# Rebuild native modules (better-sqlite3) for this exact alpine image
WORKDIR /app/server
RUN npm rebuild better-sqlite3

# Create uploads directory and data directory
RUN mkdir -p /app/server/uploads /app/data

# Copy nginx config
COPY nginx.conf /etc/nginx/http.d/default.conf

# Copy entrypoint
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

WORKDIR /app

EXPOSE 80

ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_PATH=/app/data/modulemate.db

CMD ["/app/docker-entrypoint.sh"]
