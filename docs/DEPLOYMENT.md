# Deployment Guide

## Overview

Dias-Toffoli is deployed as a static web application served from a Docker container. The container runs nginx to serve the built files.

## Quick Start

```powershell
# Build and run with Docker Compose
docker compose up -d

# Access the application
# Open http://localhost:8080 in your browser
```

## Docker Configuration

### Dockerfile

```dockerfile
# Multi-stage build for optimal image size

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build for production
RUN pnpm build

# Stage 2: Serve
FROM nginx:alpine AS runner

# Copy custom nginx config
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

### nginx.conf

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Don't cache HTML (for updates)
    location ~* \.html$ {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    # MediaPipe WASM files - special headers
    location ~* \.(wasm)$ {
        add_header Cross-Origin-Opener-Policy "same-origin";
        add_header Cross-Origin-Embedder-Policy "require-corp";
        expires 1y;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Feature Policy for camera access
    add_header Permissions-Policy "camera=(self), microphone=()" always;
}
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  dias-toffoli:
    build:
      context: .
      dockerfile: docker/Dockerfile
    ports:
      - "8080:80"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

  # Optional: Development with hot reload
  dias-toffoli-dev:
    image: node:20-alpine
    working_dir: /app
    volumes:
      - .:/app
      - /app/node_modules
    ports:
      - "5173:5173"
    command: sh -c "corepack enable && pnpm install && pnpm dev --host"
    profiles:
      - dev
```

## File Structure

```
dias-toffoli/
├── docker/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── .dockerignore
├── docker-compose.yml
└── ...
```

### .dockerignore

```
node_modules
dist
.git
.gitignore
*.md
.vscode
.env*
coverage
tests
*.log
```

## Build Commands

### Development Build

```powershell
# Build image for development testing
docker build -t dias-toffoli:dev -f docker/Dockerfile .

# Run container
docker run -p 8080:80 dias-toffoli:dev
```

### Production Build

```powershell
# Build with tag
docker build -t dias-toffoli:latest -f docker/Dockerfile .
docker build -t dias-toffoli:v1.0.0 -f docker/Dockerfile .

# Push to registry (example with Docker Hub)
docker tag dias-toffoli:latest yourusername/dias-toffoli:latest
docker push yourusername/dias-toffoli:latest
```

### Multi-Platform Build

```powershell
# Build for multiple architectures (amd64 + arm64)
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t yourusername/dias-toffoli:latest \
  --push \
  -f docker/Dockerfile .
```

## Deployment Options

### Option 1: Single Server (Docker)

```powershell
# On your server
docker pull yourusername/dias-toffoli:latest
docker run -d -p 80:80 --name dias-toffoli yourusername/dias-toffoli:latest
```

### Option 2: Docker Compose on Server

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  dias-toffoli:
    image: yourusername/dias-toffoli:latest
    ports:
      - "80:80"
    restart: always
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

```powershell
docker compose -f docker-compose.prod.yml up -d
```

### Option 3: Kubernetes

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dias-toffoli
spec:
  replicas: 2
  selector:
    matchLabels:
      app: dias-toffoli
  template:
    metadata:
      labels:
        app: dias-toffoli
    spec:
      containers:
      - name: dias-toffoli
        image: yourusername/dias-toffoli:latest
        ports:
        - containerPort: 80
        resources:
          limits:
            memory: "128Mi"
            cpu: "100m"
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 10
          periodSeconds: 30
---
apiVersion: v1
kind: Service
metadata:
  name: dias-toffoli
spec:
  selector:
    app: dias-toffoli
  ports:
  - port: 80
    targetPort: 80
  type: LoadBalancer
```

### Option 4: Static Hosting (No Docker)

For platforms like Vercel, Netlify, or GitHub Pages:

```powershell
# Build locally
pnpm build

# Deploy dist folder to your hosting provider
```

## HTTPS Configuration

Camera access requires HTTPS (except localhost). Use a reverse proxy:

### With Traefik

```yaml
# docker-compose.prod.yml with Traefik
version: '3.8'

services:
  traefik:
    image: traefik:v2.10
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.letsencrypt.acme.email=you@example.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"
      - "./letsencrypt:/letsencrypt"

  dias-toffoli:
    image: yourusername/dias-toffoli:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.dias-toffoli.rule=Host(`dias-toffoli.example.com`)"
      - "traefik.http.routers.dias-toffoli.entrypoints=websecure"
      - "traefik.http.routers.dias-toffoli.tls.certresolver=letsencrypt"
```

## Environment Variables

The application doesn't require environment variables at runtime, but you can configure the build:

```powershell
# Build-time variables (in .env or docker build args)
VITE_APP_TITLE=Dias-Toffoli
VITE_DEFAULT_SCALE=pentatonic_major
VITE_MAX_HANDS=2
```

## Health Monitoring

### Check Container Status

```powershell
# View logs
docker logs dias-toffoli

# Check health
docker inspect --format='{{.State.Health.Status}}' dias-toffoli

# View resource usage
docker stats dias-toffoli
```

### Prometheus Metrics (Optional)

Add nginx-prometheus-exporter for metrics:

```yaml
services:
  dias-toffoli:
    # ... existing config

  nginx-exporter:
    image: nginx/nginx-prometheus-exporter:0.11
    command: -nginx.scrape-uri=http://dias-toffoli/stub_status
    ports:
      - "9113:9113"
```

## Troubleshooting

### Camera Not Working

1. Ensure HTTPS is configured (required for getUserMedia)
2. Check Permissions-Policy header allows camera
3. Test in incognito to rule out extensions

### MediaPipe Not Loading

1. Check CORS headers for CDN access
2. Verify WASM files have correct MIME types
3. Check browser console for specific errors

### Container Won't Start

```powershell
# Check logs
docker logs dias-toffoli

# Run interactively for debugging
docker run -it --rm dias-toffoli:latest sh
```

### Slow Performance

1. Ensure gzip is enabled
2. Check cache headers
3. Use production build (not dev)
4. Consider CDN for static assets

## CI/CD Example (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./docker/Dockerfile
          push: true
          tags: |
            ${{ secrets.DOCKERHUB_USERNAME }}/dias-toffoli:latest
            ${{ secrets.DOCKERHUB_USERNAME }}/dias-toffoli:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

## Quick Reference

```powershell
# Build
docker compose build

# Start
docker compose up -d

# Stop
docker compose down

# View logs
docker compose logs -f

# Rebuild and restart
docker compose up -d --build

# Remove everything
docker compose down -v --rmi all
```
