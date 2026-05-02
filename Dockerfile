FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code and config
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript code
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built code from builder
COPY --from=builder /app/dist ./dist

# Copy any necessary documentation or workflow files if needed at runtime
COPY workflows/ ./workflows/
COPY docs/ ./docs/
COPY AGENTS.md ./
COPY zynx-mcp-dashboard.html ./

# Set environment variables
ENV NODE_ENV=production
# Cloud Run injects the PORT environment variable dynamically (defaults to 8080)
# Our backend uses process.env.PORT, but config defaults it to ZYNX_BACKEND_PORT
ENV PORT=8080

# Expose port (Documentation purpose)
EXPOSE 8080

# Start the Zynx Agent Backend by default
CMD ["npm", "run", "start:backend"]
