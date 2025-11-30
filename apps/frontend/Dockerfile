# Build stage
FROM node:20-alpine AS builder

# Build arguments for version info
ARG GIT_COMMIT_HASH=unknown
ARG BUILD_DATE

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/frontend/package*.json ./apps/frontend/

# Install dependencies
RUN npm install

# Copy source
COPY apps/frontend ./apps/frontend

# Set environment variables for Vite build
ENV VITE_GIT_COMMIT_HASH=$GIT_COMMIT_HASH
ENV VITE_BUILD_DATE=$BUILD_DATE

# Build
WORKDIR /app/apps/frontend
RUN npm run build

# Production stage - serve with nginx
FROM nginx:alpine AS production

# Copy nginx config
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
