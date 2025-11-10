# JustTheTip Discord Bot - Dockerfile
# Optimized for deployment on Render, VPS, or container platforms

FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies including linux-headers for native module compilation
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    linux-headers \
    eudev-dev \
    libusb-dev

# Copy package files
COPY package*.json ./

# Install dependencies
# Use --omit=dev for production builds (--only=production is deprecated)
RUN npm ci --omit=dev

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p logs data

# Set environment to production
ENV NODE_ENV=production

# Expose ports (if using API)
EXPOSE 3000

# Health check
# Note: For production, implement a proper health endpoint in your application
# and replace this with: CMD curl -f http://localhost:3000/health || exit 1
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "process.exit(0)" || exit 1

# Default command - start the smart contract bot
# Override with docker run command if needed
CMD ["npm", "run", "start:smart-contract"]

# Alternative commands:
# For legacy bot: CMD ["npm", "run", "start:bot"]
# For API server: CMD ["npm", "start"]
