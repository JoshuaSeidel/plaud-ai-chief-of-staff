FROM node:20-alpine

# Update Alpine packages for security
RUN apk update && apk upgrade --no-cache

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8006/health || exit 1

# Expose port
EXPOSE 8006

# Run service
CMD ["node", "server.js"]
