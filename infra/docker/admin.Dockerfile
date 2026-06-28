# apps/admin/Dockerfile

FROM node:20-alpine AS deps

RUN npm install -g pnpm@10
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/admin/package.json ./apps/admin/
COPY libs/shared-types/package.json ./libs/shared-types/
COPY libs/shared-utils/package.json ./libs/shared-utils/
COPY libs/ui-config/package.json ./libs/ui-config/

RUN pnpm install --frozen-lockfile --filter @mira/admin

FROM node:20-alpine AS builder

RUN npm install -g pnpm@10
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/admin/node_modules ./apps/admin/node_modules

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY tsconfig.base.json ./
COPY apps/admin ./apps/admin
COPY libs/shared-types ./libs/shared-types
COPY libs/shared-utils ./libs/shared-utils
COPY libs/ui-config ./libs/ui-config

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN cd apps/admin && pnpm exec vite build

FROM nginx:alpine AS runner

COPY --from=builder /app/apps/admin/dist /usr/share/nginx/html

RUN echo 'server { \
  listen 80; \
  root /usr/share/nginx/html; \
  index index.html; \
  location / { try_files $uri $uri/ /index.html; } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:80 || exit 1
