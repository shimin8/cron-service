# ------------------------------------
# STAGE 1: Build Stage (Compilation)
# ------------------------------------
FROM node:20-alpine AS builder

# Set working directory for all subsequent commands
WORKDIR /app

# Copy package files first to leverage Docker layer caching
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code and build
COPY src/ ./src/
RUN npm run build 
# We assume 'npm run build' executes 'tsc' and outputs to /app/dist

# ------------------------------------
# STAGE 2: Production Stage (Runtime)
# ------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Copy ONLY the production dependencies (package.json and node_modules)
COPY package*.json ./
# Install only production dependencies
RUN npm install --only=production

# Copy the compiled code from the builder stage
COPY --from=builder /app/dist ./dist/

# Expose the API port (though typically done via a cloud service's load balancer)
EXPOSE 3000 

# Define the default command to run the API service
# This is the ENTRYPOINT for the container. It runs index-api.js by default.
CMD ["node", "dist/index-api.js"] 
# Note: We will override this CMD for the scheduler and worker using Docker Compose.