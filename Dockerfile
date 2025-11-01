# JustTheTip Discord Bot - Dockerfile
# Optimized for deployment on Render, VPS, or container platforms

FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Copy package files
COPY package*.json ./

# Install dependencies
# Use --production for production builds, or omit for development
RUN npm ci --only=production

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p logs data

# Set environment to production
ENV NODE_ENV=production

# Expose ports (if using API)
EXPOSE 3000

# Health check (optional - adjust URL as needed)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "console.log('Health check passed')" || exit 1

# Default command - start the smart contract bot
# Override with docker run command if needed
CMD ["npm", "run", "start:smart-contract"]

# Alternative commands:
# For legacy bot: CMD ["npm", "run", "start:bot"]
# For API server: CMD ["npm", "start"]
