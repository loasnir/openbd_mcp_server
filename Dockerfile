# Multi-stage build for OpenBD MCP Server

# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Run as non-root user for security
USER node

# Set environment variables
ENV NODE_ENV=production

# Expose MCP server (if needed for HTTP transport)
# EXPOSE 3000

# Start the MCP server
CMD ["node", "dist/index.js"]
