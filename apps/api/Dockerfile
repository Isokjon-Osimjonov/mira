# Stage 1: Dependencies & Deploy Pruned Workspace
FROM node:20-alpine AS deps
WORKDIR /app
RUN npm install -g pnpm@10

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
COPY apps/api/package.json ./apps/api/
COPY libs/db/package.json ./libs/db/
COPY libs/shared-types/package.json ./libs/shared-types/
COPY libs/shared-utils/package.json ./libs/shared-utils/
COPY libs/ui-config/package.json ./libs/ui-config/

# Install workspace deps, deploy isolated production packages for @mira/api, and prune mobile/frontend root dependencies
RUN pnpm install --frozen-lockfile && \
    pnpm --filter @mira/api deploy --prod --legacy /pruned && \
    rm -rf /pruned/node_modules/react-native \
           /pruned/node_modules/@react-native \
           /pruned/node_modules/expo \
           /pruned/node_modules/@expo \
           /pruned/node_modules/react-native-svg \
           /pruned/node_modules/react-native-web \
           /pruned/node_modules/react \
           /pruned/node_modules/react-dom \
           /pruned/node_modules/@types/react \
           /pruned/node_modules/@types/react-dom \
           /pruned/node_modules/react-devtools-core \
           /pruned/node_modules/lightningcss* \
           /pruned/node_modules/metro* \
           /pruned/node_modules/@babel \
           2>/dev/null || true && \
    find /pruned -name "*.test.*" -delete && \
    find /pruned -name "*.spec.*" -delete

# Stage 2: Production Runner (Target: <500MB)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy only isolated prod node_modules from deps stage (under 500MB total)
COPY --from=deps /pruned/node_modules ./node_modules

# Copy workspace config and source files needed by tsx
COPY package.json tsconfig.base.json .npmrc* ./
COPY apps/api/package.json apps/api/tsconfig.json ./apps/api/
COPY apps/api/src ./apps/api/src
COPY libs/db/src ./libs/db/src
COPY libs/shared-types/src ./libs/shared-types/src
COPY libs/shared-utils/src ./libs/shared-utils/src

EXPOSE 4000
CMD ["node", "--import", "tsx/esm", "apps/api/src/main.ts"]
