FROM node:20

# Install build tools for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies (includes native module compilation)
RUN npm ci --production

# Copy application source
COPY . .

# Environment
ENV NODE_ENV=production
ENV PORT=10000
ENV NSPECTOR_DB=/tmp/nspector.db

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "const http=require('http'); http.get('http://localhost:'+process.env.PORT+'/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

EXPOSE 10000

# Run as non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN chown -R appuser:appuser /app /tmp
USER appuser

CMD ["node", "server/server.js"]