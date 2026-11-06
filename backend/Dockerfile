# ---- deps: install production dependencies (native modules compiled here) ----
FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# ---- runtime ----
FROM node:20-bookworm-slim
WORKDIR /app
# ffmpeg renders/transcodes reels; DejaVu provides the font used for on-screen text.
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg fonts-dejavu-core ca-certificates tini \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
    PORT=5000 \
    UPLOAD_DIR=/app/public/uploads
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY migrations ./migrations
COPY src ./src
# Runs as root so the process can write to a mounted persistent disk on any host.
RUN mkdir -p /app/public/uploads
EXPOSE 5000
ENTRYPOINT ["/usr/bin/tini", "--"]
# Apply database migrations, then start the API (which also runs the media worker).
CMD ["sh", "-c", "npx node-pg-migrate up --no-check-order && node src/server.js"]
