# apps/api/Dockerfile
# Multi-stage build — production image

# ─── Stage 1: Dependencies ───────────────────────────────────
FROM node:20-alpine AS deps

RUN npm install -g pnpm@10

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY tsconfig.base.json ./

# Copy all package.json files (workspace packages)
COPY apps/api/package.json ./apps/api/
COPY libs/shared-types/package.json ./libs/shared-types/
COPY libs/shared-utils/package.json ./libs/shared-utils/
COPY libs/db/package.json ./libs/db/
COPY libs/ui-config/package.json ./libs/ui-config/

# Install only production deps
RUN pnpm install --frozen-lockfile --prod

# ─── Stage 2: Build ──────────────────────────────────────────
FROM node:20-alpine AS builder

RUN npm install -g pnpm@10

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY tsconfig.base.json ./
COPY apps/api ./apps/api
COPY libs/shared-types ./libs/shared-types
COPY libs/shared-utils ./libs/shared-utils
COPY libs/db ./libs/db
COPY libs/ui-config ./libs/ui-config

# Install all deps (including dev) for build
RUN pnpm install --frozen-lockfile

# Build
RUN cd apps/api && pnpm exec tsc -p tsconfig.json --outDir dist

# ─── Stage 3: Production ─────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache dumb-init

WORKDIR /app

ENV NODE_ENV=production

# Copy built files
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=deps /app/node_modules ./node_modules

# Non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

# dumb-init prevents zombie processes
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
