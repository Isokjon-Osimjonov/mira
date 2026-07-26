FROM node:20-alpine
WORKDIR /app

RUN npm install -g pnpm@10

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
COPY apps/api ./apps/api
COPY libs/db ./libs/db
COPY libs/shared-types ./libs/shared-types
COPY libs/shared-utils ./libs/shared-utils
COPY libs/ui-config ./libs/ui-config

# Install production deps only
RUN pnpm install --frozen-lockfile --prod --filter @mira/api...

# Remove dev files
RUN find . -name "*.test.ts" -delete && \
  find . -name "*.spec.ts" -delete && \
  find . -name "__tests__" -type d -exec rm -rf {} + \
  2>/dev/null || true

EXPOSE 4000
CMD ["node", "--import", "tsx/esm", "apps/api/src/main.ts"]
