# Multi-stage production image for Fly.io.
# Secrets are injected at runtime with `fly secrets set`; never bake them here.
#
# The build context is apps/mcp-server-cloud/ only. Run
# `node scripts/bundle-catalog.mjs` first (deploy-mcp.yml does): it writes
# data/ (registry, SKILL.md bodies, agents, LICENSE/NOTICE files) and
# data/manifest.json. The build fails when the manifest is missing or any
# bundled file does not match its sha256.

FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline --no-audit

FROM node:22-alpine AS builder

WORKDIR /app

COPY tsconfig.json ./
COPY src/ ./src/
COPY scripts/ ./scripts/
COPY data/ ./data/
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json

RUN node scripts/bundle-catalog.mjs --verify data
# tsc directly: `npm run build` would re-run the bundler, which needs the repo.
RUN npx tsc

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline --omit=dev --no-audit \
  && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/data ./data
RUN test -f data/manifest.json

RUN addgroup -g 1001 -S nodejs && adduser -S commander -u 1001
USER commander

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

# node --experimental-vm-modules not needed for ESM top-level await in Node 22
CMD ["node", "dist/index.js"]
