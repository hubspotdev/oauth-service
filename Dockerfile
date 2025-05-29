# ---- Base Stage ----
FROM node:20-bullseye-slim AS base
WORKDIR /app

# Install system dependencies and clean up
RUN apt-get update && \
    apt-get install -y openssl curl && \
    rm -rf /var/lib/apt/lists/*

# Copy package files for dependency installation
COPY package*.json ./

# ---- Development Stage ----
FROM base AS development
# Install all dependencies (including dev dependencies)
RUN npm install

# Copy all source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# ---- Builder Stage ----
FROM development AS builder
# Build the TypeScript application
RUN npm run build

# ---- Dependencies Stage (Production) ----
FROM base AS deps
# Install only production dependencies
RUN npm ci --omit=dev

# ---- Production Stage ----
FROM node:20-bullseye-slim AS production
WORKDIR /app

# Install system dependencies and clean up
RUN apt-get update && \
    apt-get install -y openssl curl && \
    rm -rf /var/lib/apt/lists/*

# Copy only necessary files from previous stages
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Generate Prisma client for production
RUN npx prisma generate

# Switch to non-root user for security
USER node

# Expose the port the app runs on
EXPOSE 3001

# Start the application in production mode
CMD ["npm", "run", "prod"]
