# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/frontend/package*.json ./apps/frontend/

# Install dependencies
RUN npm install

# Copy source
COPY apps/frontend ./apps/frontend

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
