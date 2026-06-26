# apps/api/Dockerfile
# Production image — runs via tsx, matches dev pattern.
# apps/api has zero runtime imports from monorepo libs
# (confirmed via grep audit), so only apps/api itself
# needs to be in the image.

FROM node:20-alpine AS deps

RUN npm install -g pnpm@10
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json ./apps/api/
COPY libs/db/package.json ./libs/db/
COPY libs/shared-types/package.json ./libs/shared-types/
COPY libs/shared-utils/package.json ./libs/shared-utils/

RUN pnpm install --frozen-lockfile --filter @mira/api --prod

FROM node:20-alpine AS runner

RUN apk add --no-cache dumb-init wget

WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY apps/api/src ./apps/api/src
COPY apps/api/package.json ./apps/api/package.json
COPY apps/api/tsconfig.json ./apps/api/tsconfig.json
COPY tsconfig.base.json ./
COPY libs/db ./libs/db
COPY libs/shared-types ./libs/shared-types
COPY libs/shared-utils ./libs/shared-utils

# Build arg for tracking which commit this image came from
ARG GIT_SHA=unknown
LABEL git_sha=$GIT_SHA
ENV GIT_SHA=$GIT_SHA

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

WORKDIR /app/apps/api

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["npx", "tsx", "src/main.ts"]
