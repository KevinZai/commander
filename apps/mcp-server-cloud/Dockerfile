# Multi-stage production image for Fly.io.
# Secrets are injected at runtime with `fly secrets set`; never bake them here.
#
# Catalog content is baked in, never fetched at runtime. The build context is
# apps/mcp-server-cloud/, which cannot see the repository registry or skill
# sources, so data/ must be produced from the release checkout BEFORE the image
# build:
#   node scripts/bundle-catalog.mjs      (also run by `npm run build`)
# The builder stage copies that bundle and re-verifies every file hash; a
# missing or incomplete bundle fails the image build.

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

# Fails here when data/ was not bundled into the build context.
COPY data/ ./data/
RUN node scripts/bundle-catalog.mjs --verify

# Compile only: `npm run build` would re-run the bundler, which needs the repo.
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
COPY --from=builder /app/scripts/bundle-catalog.mjs ./scripts/bundle-catalog.mjs

# Final gate on the runtime layer itself.
RUN node scripts/bundle-catalog.mjs --verify

RUN addgroup -g 1001 -S nodejs && adduser -S commander -u 1001
USER commander

EXPOSE 8080

# /health returns 503 when the catalog has zero skills or agents, or a listed
# skill body is unreadable; wget exits non-zero on 503.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

# node --experimental-vm-modules not needed for ESM top-level await in Node 22
CMD ["node", "dist/index.js"]
