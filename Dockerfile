FROM node:23-alpine AS base

# Install pnpm globally
RUN npm install -g pnpm

# Set the working directory
WORKDIR /app

# Copy package.json and pnpm-lock.yaml to install dependencies first
COPY package.json package-lock.json ./

# Install dependencies
RUN pnpm install


FROM base AS builder

# Copy the rest of the application files
COPY . .

# Build the application
RUN rm -rf .next && pnpm run build

FROM node:23-alpine AS runner

# Install pnpm in the runner stage
RUN npm install -g pnpm

# Set the working directory
WORKDIR /app

# Copy the necessary files from the builder stage for the standalone build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static .next/static

# Change ownership of the files to the node user
RUN chown -R node:node /app

# Switch to the non-root user
USER node

# Add healthcheck for container monitoring
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# 设置 Python API URL 环境变量，可以根据实际部署环境修改
ENV PYTHON_API_URL=${PYTHON_API_URL}

# Expose the port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
