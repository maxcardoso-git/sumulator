# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy all package files
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/

# Install all dependencies
RUN npm install

# Copy source
COPY apps/backend ./apps/backend

# Generate Prisma client
WORKDIR /app/apps/backend
RUN npx prisma generate

# Build
RUN npm run build

# Production stage
FROM node:20-slim AS production

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built files from builder
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=builder /app/node_modules ./node_modules

WORKDIR /app/apps/backend

EXPOSE 4000

CMD ["node", "dist/main.js"]
