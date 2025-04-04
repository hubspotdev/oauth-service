# Use Node.js LTS version with Debian
FROM node:20-bullseye-slim

# Set working directory
WORKDIR /app

# Install OpenSSL and other required dependencies
RUN apt-get update -y && \
    apt-get install -y openssl libssl-dev pkg-config build-essential && \
    rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Expose port 3001
EXPOSE 3001

# Command to run the application
CMD ["npm", "run", "dev"]
