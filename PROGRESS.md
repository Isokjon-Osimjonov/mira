# 🪞 Mira Cosmetics — Project Progress

> Last updated: 2026-06-02
> Version: 0.2.0-dev
> Sprint: #7 — Dashboard & Marketing

---

## 📊 Status Dashboard

| Layer | Status | Progress |
|-------|--------|----------|
| Infrastructure | ✅ Done | 100% |
| Database Schema | ✅ Done | 100% |
| Auth API | ✅ Done | 100% |
| Products API | ✅ Done | 100% |
| Orders API | ✅ Done | 100% |
| Admin Panel | 🟡 Setup Only | 5% |
| Mobile App | 🟡 Setup Only | 5% |
| Telegram Bot | 🟡 Setup Only | 10% |
| CI/CD | ✅ Done | 90% |
| DevOps/Docker | 🟡 Local Only | 20% |

---

## ✅ Completed

### API
- [x] Auth API
- [x] Products API (Categories, Products, Inventory, Upload)
- [x] Settings API
- [x] Exchange Rate API
- [x] Cart API
- [x] Coupon API
- [x] Orders API
- [x] Boxes + KOR Shipping Tiers API
- [x] Wishlists + Waitlists API
- [x] Notifications API
- [x] Customers Admin API
- [x] Admin Users + Roles API

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

### Sprint #7 — Dashboard & Marketing
- [ ] Dashboard/Analytics API
- [ ] Telegram Posts API
- [ ] Expenses API
- [ ] Cron jobs setup

---

## 📋 Pending

### Mobile
- [ ] Mobile: Home screen
- [ ] Mobile: Category browse
- [ ] Mobile: Product list + detail
- [ ] Mobile: Cart screen
- [ ] Mobile: Checkout flow (3 screens)
- [ ] Mobile: Order history + detail
- [ ] Mobile: Receipt reupload screen

### Admin
- [ ] Admin: Dashboard (sales summary, KPIs)
- [ ] Admin: Customer management UI
- [ ] Admin: Coupon management UI
- [ ] Admin: Exchange rate management UI
- [ ] Admin: Settings page UI
- [ ] Admin: RBAC permissions page UI

### DevOps
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

### v0.2.0-dev (2026-06-02)
- Complete Backend API Implementation
- Products, Settings, Exchange Rates, Cart, Coupons, Orders
- Wishlists, Waitlists, Notifications, Admin Management
- Integrated Socket.io and Telegram Bot notifications

### v0.1.0-dev (2026-05-30)
- Initial monorepo setup
- 39-table PostgreSQL schema
- EAS Build working (preview APK)
- CI/CD pipelines (5 GitHub Actions workflows)
- Admin + API servers running locally
