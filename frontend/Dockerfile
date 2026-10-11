# Multi-stage production build for AgentSentry Frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first for efficient Docker layer caching
COPY package*.json ./

# Install dependencies cleanly
RUN npm ci || npm install

# Copy application source
COPY . .

# Build with empty VITE_API_BASE_URL so requests use same-origin relative URLs (/api/v1)
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build the production React application
RUN npm run build

# Stage 2: Serve static assets with Nginx
FROM nginx:alpine

# Copy compiled frontend from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration with SPA routing and API proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# Health check
HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
