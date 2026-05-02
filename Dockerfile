# Multi-stage build for optimized image size
FROM node:20-slim AS base

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    pandoc \
    wkhtmltopdf \
    lmodern \
    poppler-utils \
    fonts-dejavu \
    fonts-liberation \
    fonts-noto \
    fonts-noto-cjk \
    texlive-latex-base \
    texlive-latex-recommended \
    texlive-latex-extra \
    texlive-xetex \
    texlive-fonts-recommended \
    librsvg2-bin \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY server.js .
COPY db.js .
COPY public ./public/
COPY scripts ./scripts/

# Create data directory for SQLite
RUN mkdir -p /app/data

# Environment variables
ENV NODE_ENV=production
ENV PORT=3210
ENV DATA_DIR=/app/data
ENV CHROMIUM_BIN=/usr/bin/chromium

# Expose port
EXPOSE 3210

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3210/api/pastes', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Use existing node user (UID/GID 1000) instead of creating new user
RUN chown -R node:node /app && \
    chmod 755 /app/data

USER node

# Start application
CMD ["node", "server.js"]
