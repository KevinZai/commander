# Multi-stage production image for Fly.io.
# Secrets are injected at runtime with `fly secrets set`; never bake them here.

FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline --no-audit

FROM node:22-alpine AS builder

WORKDIR /app

COPY tsconfig.json ./
COPY src/ ./src/
COPY scripts/ ./scripts/
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json

# The data/ directory with registry.yaml should already exist from the local prebuild step.
# If it doesn't, npm run build will fail gracefully and skip bundling.
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline --omit=dev --no-audit \
  && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/data ./data

RUN addgroup -g 1001 -S nodejs && adduser -S commander -u 1001
USER commander

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

# node --experimental-vm-modules not needed for ESM top-level await in Node 22
CMD ["node", "dist/index.js"]
