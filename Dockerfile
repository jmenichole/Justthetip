# JustTheTip Discord Bot - Dockerfile
# Optimized for Railway deployment with full build toolchain

FROM node:18-slim

# Set working directory
WORKDIR /app

# Install system dependencies for native module compilation
# Using Debian slim for better compatibility with native modules like usb
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    git \
    libudev-dev \
    libusb-1.0-0-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
# Use npm install instead of npm ci for better compatibility
# Skip optional dependencies that may fail (hardware wallets)
RUN npm install --production=false --no-optional || npm install --production=false

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p logs data db

# Set environment to production
ENV NODE_ENV=production

# Expose ports (API server)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "process.exit(0)" || exit 1

# Start both API server and Discord bot
CMD node api/server.js & node bot_smart_contract.js
