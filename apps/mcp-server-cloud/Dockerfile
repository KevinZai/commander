# Multi-stage build — node:22-alpine (LTS)
# Secrets are NEVER baked into this image.
# Fly.io secrets are injected at runtime via fly secrets set.
# OP vault refs: op://Alfred/cc-commander-*/

FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# ─── Production image ──────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install production deps only
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S commander -u 1001
USER commander

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

# node --experimental-vm-modules not needed for ESM top-level await in Node 22
CMD ["node", "dist/index.js"]
