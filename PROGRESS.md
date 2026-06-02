# 🪞 Mira Cosmetics — Project Progress

> Last updated: 2026-05-30
> Version: 0.1.0-dev
> Sprint: #1 — Foundation

---

## 📊 Status Dashboard

| Layer | Status | Progress |
|-------|--------|----------|
| Infrastructure | ✅ Done | 100% |
| Database Schema | ✅ Done | 100% |
| Auth API | 🔴 Not Started | 0% |
| Products API | 🔴 Not Started | 0% |
| Orders API | 🔴 Not Started | 0% |
| Admin Panel | 🟡 Setup Only | 5% |
| Mobile App | 🟡 Setup Only | 5% |
| Telegram Bot | 🔴 Not Started | 0% |
| CI/CD | ✅ Done | 90% |
| DevOps/Docker | 🟡 Local Only | 20% |

---

## ✅ Completed

### Infrastructure
- [x] Nx monorepo (pnpm workspaces, node-linker=hoisted)
- [x] apps/api (Express + TypeScript)
- [x] apps/admin (React + Vite + Shadcn/ui + Tailwind v3)
- [x] apps/mobile (Expo RN + NativeWind v4 + RN Reusables)
- [x] libs/shared-types, shared-utils, db, ui-config
- [x] ESLint module boundaries (scope:api/admin/mobile/shared/db)
- [x] TypeScript strict mode, path aliases
- [x] .prettierrc, .gitignore, .npmrc (hoisted)
- [x] CLAUDE.md — lead engineer reference

### Database
- [x] Schema spec (39 tables, 19 enums) — SCHEMA_SPEC.md v2.0
- [x] All 39 tables migrated to PostgreSQL
- [x] Drizzle ORM schema files (20 TypeScript files)
- [x] drizzle.config.ts (dialect: postgresql)
- [x] Docker postgres (port 5433, mira_postgres)
- [x] Drizzle Studio verified (localhost:4984)
- [x] ALTER TABLE: admin_users.created_by + customers.notes

### Mobile
- [x] EAS Build configured (bundle: uz.miracosmetics)
- [x] First preview APK built successfully
- [x] Expo Router setup (_layout.tsx)
- [x] NativeWind v4 + Tailwind v3
- [x] app.config.ts (scheme: mira-cosmetics)
- [x] Placeholder assets (icon, splash, adaptive-icon)
- [x] Fixed: reanimated 4.1.7 + worklets 0.8.3 compatibility

### Admin
- [x] Vite + React + TypeScript
- [x] Shadcn/ui (baseColor: zinc, CSS vars violet)
- [x] Tailwind v3.4.x (downgraded from v4)
- [x] components.json configured
- [x] src/lib/utils.ts (cn helper)

### API
- [x] Express + TypeScript starter
- [x] Zod env validation (crash on startup if invalid)
- [x] /health endpoint
- [x] errorHandler middleware
- [x] Graceful shutdown (SIGTERM)

### CI/CD
- [x] GitHub Actions (5 workflows)
- [x] ci.yml — lint + type check (every push)
- [x] deploy-api.yml — Docker build + VPS (main branch)
- [x] deploy-admin.yml — Vite build + rsync (main branch)
- [x] mobile-ota.yml — EAS Update (main branch)
- [x] mobile-build.yml — EAS Build (version tags)
- [x] apps/api/Dockerfile (multi-stage)
- [x] Git remote → github.com/Isokjon-Osimjonov/mira
- [x] Git branching strategy setup

---

## 🚧 In Progress

### Sprint #1 — Auth Foundation
- [ ] BOT_TOKEN → @BotFather /newbot
- [ ] Grammy.js bot setup (apps/api/src/bot/)
- [ ] Auth API routes

---

## 📋 Pending

### Sprint #1 — Auth Foundation
- [ ] `POST /api/v1/auth/request-otp` — phone → deep link token
- [ ] `POST /api/v1/auth/verify-otp` — code → JWT
- [ ] `POST /api/v1/auth/refresh` — refresh token rotation
- [ ] `GET  /api/v1/auth/me` — current user
- [ ] Grammy.js /start TOKEN handler → send OTP
- [ ] Admin login: `POST /api/v1/admin/auth/login`
- [ ] Admin auth middleware (JWT + permission check)
- [ ] Mobile: Login screen UI
- [ ] Mobile: OTP screen UI
- [ ] Mobile: Profile setup screen (first login)

### Sprint #2 — Catalog
- [ ] `GET  /api/v1/categories` — list
- [ ] `GET  /api/v1/products` — list (filter, sort, paginate)
- [ ] `GET  /api/v1/products/:id` — detail
- [ ] Admin: Category CRUD
- [ ] Admin: Product CRUD (with image upload → Cloudinary)
- [ ] Admin: Inventory batch creation
- [ ] Mobile: Home screen
- [ ] Mobile: Category browse
- [ ] Mobile: Product list + detail

### Sprint #3 — Cart & Checkout
- [ ] `POST /api/v1/cart/add`
- [ ] `GET  /api/v1/cart`
- [ ] `DELETE /api/v1/cart/:itemId`
- [ ] `POST /api/v1/orders` — checkout submit
- [ ] `POST /api/v1/orders/:id/receipt` — upload receipt
- [ ] Stock reservation on checkout
- [ ] Auto-cancel cron (payment_deadline)
- [ ] Mobile: Cart screen
- [ ] Mobile: Checkout flow (3 screens)

### Sprint #4 — Orders & Payments
- [ ] Admin: Order management (list, detail, status change)
- [ ] Admin: Payment verification
- [ ] Admin: Pick & pack scanner
- [ ] `GET /api/v1/orders` — customer history
- [ ] Mobile: Order history + detail
- [ ] Mobile: Receipt reupload screen
- [ ] Telegram notifications (status changes)

### Sprint #5 — Admin Dashboard
- [ ] Admin: Dashboard (sales summary, KPIs)
- [ ] Admin: Customer management
- [ ] Admin: Coupon management
- [ ] Admin: Exchange rate management
- [ ] Admin: Settings page
- [ ] Admin: RBAC permissions page

### Sprint #6 — Polish
- [ ] Wishlists + Waitlists
- [ ] Push notifications
- [ ] Telegram marketing posts
- [ ] Analytics / Sales reports
- [ ] General expenses tracking
- [ ] Production VPS setup
- [ ] Docker compose (production)
- [ ] Domain + SSL setup

---

## 🐛 Known Issues

| # | Issue | File | Status | Notes |
|---|-------|------|--------|-------|
| 1 | `nx serve api/admin` needs project.json targets | apps/api/project.json | ✅ Fixed | Use `pnpm exec tsx watch src/main.ts` |
| 2 | `pnpm add` needs `-w` flag at root | setup.sh | ✅ Fixed | v2.0 |
| 3 | Tailwind v4 incompatible with NativeWind v4 | mobile/admin | ✅ Fixed | Pinned to v3.4.17 |
| 4 | reanimated 4.1.7 needs worklets 0.8.x | apps/mobile | ✅ Fixed | Pinned worklets ~0.8.0 |
| 5 | `drizzle-kit migrate` hangs | libs/db | ✅ Fixed | Use `drizzle-kit push` |
| 6 | admin_users.created_by missing | DB | ✅ Fixed | ALTER TABLE applied |
| 7 | customers.notes missing | DB | ✅ Fixed | ALTER TABLE applied |
| 8 | Shadcn baseColor violet not in registry | apps/admin | ✅ Fixed | Changed to zinc + CSS vars |
| 9 | EAS init fails with empty iOS fields | apps/mobile/eas.json | ✅ Fixed | Removed submit.ios section |

---

## 📝 Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Monorepo | Nx + pnpm | Metro compatibility, shared libs |
| Mobile | Expo managed | EAS Build, OTA updates |
| Admin | React + Vite | Speed, Shadcn ecosystem |
| DB | PostgreSQL + Drizzle | Type safety, migrations |
| Auth | JWT + DB-backed refresh | Instant revoke, multi-device |
| Currency | KRW primary | Korean supplier pricing |
| Inventory | Batch-level FIFO | Expiry tracking, cost accounting |
| Coupons | 1 manual + N auto (stackable) | Shopify/Coupang standard |
| Brand | Violet Luxe (#7C3AED) | Client confirmed |
| Scanner | Admin web + USB | Variant A: scan once + qty input |
| Settings | Singleton (lock_column) | Type-safe, no complex queries |

---

## 🔄 Changelog

### v0.1.0-dev (2026-05-30)
- Initial monorepo setup
- 39-table PostgreSQL schema
- EAS Build working (preview APK)
- CI/CD pipelines (5 GitHub Actions workflows)
- Admin + API servers running locally
