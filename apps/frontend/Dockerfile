# Build stage
FROM node:20-alpine AS builder

# Install git for version detection
RUN apk add --no-cache git

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/frontend/package*.json ./apps/frontend/

# Install dependencies
RUN npm install

# Copy .git directory to get commit hash (will be excluded from final image)
COPY .git ./.git

# Get git commit hash and build date
RUN GIT_HASH=$(git rev-parse HEAD 2>/dev/null || echo "unknown") && \
    echo "VITE_GIT_COMMIT_HASH=${GIT_HASH}" > /tmp/build-env && \
    echo "VITE_BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> /tmp/build-env

# Copy source
COPY apps/frontend ./apps/frontend

# Load build environment and build
WORKDIR /app/apps/frontend
RUN export $(cat /tmp/build-env | xargs) && npm run build

# Production stage - serve with nginx
FROM nginx:alpine AS production

# Copy nginx config
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
