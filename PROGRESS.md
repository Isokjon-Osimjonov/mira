# 🪞 Mira Cosmetics — Project Progress

> Last updated: 2026-06-02
> Version: 0.3.0-dev
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
| Management APIs | ✅ Done | 100% |
| Notifications | ✅ Done | 100% |
| Automation | ✅ Done | 100% |
| Admin Panel | 🟡 Setup Only | 5% |
| Mobile App | 🟢 Auth Done | 25% |
| Telegram Bot | ✅ Done | 100% |
| CI/CD | ✅ Done | 95% |
| DevOps/Docker | 🟡 Local Only | 20% |

---

## ✅ Completed

### Mobile App (Sprint 2 — Auth Flow UI)
- [x] PrimaryButton component (styled, no-animation version)
- [x] PhoneInput component (UZB/KOR region toggle, prefix prefilled)
- [x] OtpInput component (6 boxes, hidden input)
- [x] login.tsx — phone + region input
- [x] otp.tsx — 6-box OTP, timer, attempts guard, Telegram deeplink check
- [x] profile-setup.tsx — name + avatar picker
- [x] notification-permission.tsx — Expo notifications permission
- [x] auth/_layout.tsx — Stack navigator
- [x] iOS Telegram deeplink safety (Linking.canOpenURL check)
- [x] 3 attempts lockout on OTP
- [x] 5-minute countdown timer with cleanup
- [x] Fixed gesture-handler version (~2.16.0)
- [x] Simplified root layout (removed GestureHandlerRootView for now)
- [x] Verified all auth screen default exports
- [x] Updated notification-permission for Expo Go compatibility
- [x] Downgraded Reanimated to ~3.10.1 for stability
- [x] Removed Reanimated from PrimaryButton and OtpInput (to prevent crashes)
- [x] Migrated SafeAreaView to react-native-safe-area-context across all screens
- [x] Centralized font loading in _layout.tsx (fixed TypeError in PrimaryButton)
- [x] Removed useFonts from individual components and screens

## Sprint 3 — API Integration
Status: ✅ Complete
Date: 2026-06-08

### Completed
- [x] auth.service.ts — requestOtp, verifyOtp, logout
- [x] customer.service.ts — getMe, updateProfile, savePushToken
- [x] index.tsx — useAuthStore.initialize() on splash
- [x] login.tsx — POST /auth/request-otp, token → otp params
- [x] otp.tsx — real token in deeplink, POST /auth/verify-otp
- [x] profile-setup.tsx — PATCH /customers/me
- [x] notification-permission.tsx — placeholder for dev build
- [x] .env created with local API URL and bot username
- [x] Silent refresh implemented in auth-store.ts
- [x] BASE_URL fallbacks in api.ts for Expo Go/EAS
- [x] Fixed profile update logic (firstName/lastName splitting)
- [x] Refined OTP token extraction with 64-char verification
- [x] Updated Customer type in auth-store for string telegramId support
- [x] Server-side avatar upload endpoint (Cloudinary)
- [x] Mobile upload service and profile-setup integration
- [x] CORS and Error Logging improvements on server

### Critical flow
Login → requestOtp → token → Telegram deeplink → user gets OTP in Telegram → enters in app → verifyOtp → JWT saved → route to profile or home

### Pending
- [ ] Push token registration (needs dev build)
- [ ] Test with real backend running

### API & Core
- [x] Auth API (Customer OTP + Admin JWT)
- [x] Products API (Categories, Products, Inventory, Upload)
- [x] Settings API (Singleton system config)
- [x] Exchange Rate API (Manual + Auto-fetch)
- [x] Cart API (DB-backed, regional pricing)
- [x] Coupon API (Complex validation, all types)
- [x] Orders API (Checkout, Status Machine, Analytics)
- [x] Boxes + KOR Shipping Tiers API
- [x] Wishlists + Waitlists API
- [x] Notifications API (History + Read status)
- [x] Customers Admin API (Management + Stats)
- [x] Admin Users + Roles API (RBAC)
- [x] Suppliers + Purchase Orders API
- [x] Expenses API (Categories + Summary)
- [x] Dashboard & Analytics API
- [x] Excel Reports API (P&L, Sales, Inventory, etc.)
- [x] Unified Notifications (Telegram + Expo Push)
- [x] Cron Jobs (5 automated background tasks)
- [x] Grammy Bot integration (Auth + Alerts)
- [x] Socket.io real-time updates
- [x] ESLint module boundaries
- [x] Prettier configuration
- [x] DB Seeded (Settings, Categories, Tiers, Roles)
- [x] Full API Test Suite (34/34 functional flows passing)
- [x] **Backend verified and ready for frontend integration**

### Infrastructure

- [x] Nx monorepo (pnpm workspaces, node-linker=hoisted)
- [x] apps/api (Express + TypeScript)
- [x] apps/admin (React + Vite + Shadcn/ui + Tailwind v3)
- [x] apps/mobile (Expo RN + NativeWind v4 + RN Reusables)
- [x] libs/shared-types, shared-utils, db, ui-config

---

## 🚧 In Progress

### Sprint #9 — Admin Panel UI
- [x] Foundation setup (layout, routing, auth)
- [x] Login page
- [ ] Dashboard page
- [ ] Orders management
- [ ] Products management
- [ ] Inventory management
- [ ] Customers management
- [ ] Analytics & Reports
- [ ] Settings
- [ ] Telegram posts
- [ ] Admin users & roles

### Mobile App
- [ ] Mobile: Auth (OTP)
- [ ] Mobile: Home & Category browse

---

## 📋 Pending

### Mobile
- [ ] Mobile: Product list + detail
- [ ] Mobile: Cart & Checkout
- [ ] Mobile: Order history + detail

---

## 🧪 Test Results

**Date**: 2026-06-02
**Environment**: Development (Local)

| Endpoint | Status | Note |
|----------|--------|------|
| /health | ✅ PASS | Uptime confirmed |
| Settings API | ✅ PASS | Admin CRUD + Public View |
| Exchange Rates | ✅ PASS | Live UZS/USD data |
| Categories & Products | ✅ PASS | Created complex products with regional pricing |
| Inventory & Batches | ✅ PASS | Stock count auto-updates correctly |
| Coupons | ✅ PASS | Validation & Activation flow |
| Suppliers & POs | ✅ PASS | Supplier orders and items tracking |
| Dashboard & Analytics | ✅ PASS | High-performance aggregations |
| Expenses | ✅ PASS | Categorized expense tracking |
| Admin Security | ✅ PASS | 401/403 protections enforced |
| Rate Limiting | ✅ PASS | OTP restricted to 5 req/10 min |
| Code Formatting | ✅ PASS | 112 files formatted with Prettier |

---

## 🔄 Changelog

### v0.3.8-dev (2026-06-03)
- **Token Refresh Fix**:
  - Rewrote `api.ts` to ensure `axios-auth-refresh` interceptor is registered correctly.
  - Removed conflicting manual 401 response interceptors from `main.tsx`.
  - Updated `AppLayout` to handle session validation errors more gracefully, distinguishing between temporary network issues and permanent session loss.
  - Ensured `withCredentials: true` is consistently applied to all authentication-related requests.

### v0.3.7-dev (2026-06-03)
- **Admin Auth Refactor**:
  - Moved `/me` inline handler from `admin-auth.router.ts` to `admin-auth.controller.ts` and `admin-auth.service.ts`.
  - Implemented `getAdminMe()` in the service layer for database access.
  - Implemented `getMe()` in the controller layer for request handling and response formatting.
  - Replaced `console.error` with `authLogger` for better error tracking.
  - Cleaned up redundant imports and simplified the router definition.

### v0.3.6-dev (2026-06-03)
- **Professional Sidebar Layout**:
  - Implemented shadcn/ui "sidebar-08" design for the Admin panel.
  - Added Mira branding with `Flower2` logo and primary pink theme.
  - Responsive navigation with `SidebarProvider`, `SidebarInset`, and `SidebarTrigger`.
  - Grouped navigation items (Umumiy, Savdo, Mahsulotlar, Moliya, Marketing, Tizim).
  - Breadcrumb navigation in the header synchronized with the current route.
  - `NavUser` component with initials avatar and dropdown for profile/logout.
  - Integrated live exchange rate display in the sidebar footer.
  - Cleaned up obsolete layout code and simplified routing structure.

### v0.3.5-dev (2026-06-03)
- **Auth Implementation Cleanup**:
  - Simplified `AuthGate` by removing eager server-side session validation (moved to layout level).
  - Optimized Zustand store hydration with `setTimeout` for empty states.
  - Fixed logout race condition by removing manual `localStorage.removeItem`.
  - Ensured correct dynamic import and execution of API logout.
  - Cleaned up unused derived state functions and imports.
  - Aligned auth checks across Router and AppLayout.

### v0.3.4-dev (2026-06-03)
- **Session Validation & Reliability**:
  - Implemented `GET /admin/auth/me` endpoint in API for robust session state synchronization.
  - Enhanced `AuthGate` in Admin panel with timeout safety (4s) and component unmount handling.
  - Improved offline tolerance: app remains functional if server is temporarily unreachable during boot.
  - Added `text-muted-foreground` styling to loading state in Admin panel.

### v0.3.3-dev (2026-06-03)
- **Professional Secure Auth Rewrite**:
  - Rewrote Zustand auth store with derived state (pure `isAuthenticated` function).
  - Implemented cross-tab synchronization for login/logout using `BroadcastChannel`.
  - Added `AuthGate` with server-side session validation (`GET /me`) on application boot.
  - Improved security by removing stored `isAuthenticated` boolean (prevents local tampering).
  - Added offline tolerance for session validation.
  - Cleaned up redundant code and fixed circular dependencies in logout flow.
  - Verified with comprehensive type checking.

### v0.3.2-dev (2026-06-03)
- **Admin Panel Refinement**: 
  - Fixed API URL duplication issue (double /api/v1).
  - Implemented correct TanStack Router redirection with state preservation.
  - Refreshed Login page UI with better validation and error feedback.
  - Added centralized health check utility.
  - Aligned environment variables with backend expectations.

### v0.3.1-dev (2026-06-03)
- **Production Hardening**: Complete infrastructure upgrade.
  - Pino structured logging (replaces console.log).
  - Redis caching (settings, rates, categories, brands).
  - BullMQ queues (notifications, deadlines, posts) with Bull Board UI.
  - Sentry error tracking integration.
  - Database connection pooling (pg.Pool).
  - Query timeout configuration.
  - Enhanced health check (DB + Redis status).
  - Morgan HTTP request logging mapped to Pino.
  - Graceful shutdown handlers for all services.

### v0.3.0-dev (2026-06-02)
- **Redesigned Invoices**: Complete overhaul of the PDF invoice generation.
  - Premium, NuraSkin-inspired clean layout with pink branding.
  - Async image loading for product thumbnails (rounded 36x36).
  - Detailed financial breakdown: coupon discounts, manual order discounts, and cargo fees.
  - Automatic dual-currency support (KRW/UZS) for Uzbekistan region.
  - Placeholder visuals for products without images.

### v0.2.9-dev (2026-06-02)
- **Backend Verification & Stabilization**:
  - Customer order cancellation flow with stock release.
  - Customer refund request system with admin alerts.
  - Waitlist stock notification engine (Push + Telegram).
  - Product image management: reorder and Cloudinary validation.
  - Dynamic Order Invoice PDF generation using `pdfkit`.
  - Customer order search and status filtering.
  - Public `brands` endpoint with region filtering.
  - Product-specific stock movement history for audit.
  - Automated and manual database backups via Telegram.
  - Extended admin order search (order number + phone).

### v0.2.8-dev (2026-06-02)
- **New Feature**: Customer Profile management (update name and photo with Cloudinary validation).
- **New Feature**: Expo Push Token registration and per-device management.
- **New Feature**: Customer Notification Settings (toggle order updates, stock alerts, promotions).
- **New Feature**: Admin Self-service Password Change with complexity requirements and token revocation.
- **Improvement**: `mustChangePassword` flag now correctly returned in Admin Auth responses.
- **Automation**: Batch Expiry Alert Cron (daily 08:00 KST) with tiered urgency notifications.
- **Verification**: Low Stock Alert system verified and integrated across all inventory movement points.

### v0.2.7-dev (2026-06-02)
- **New Endpoint**: `GET /api/v1/admin/products/by-barcode/:barcode` for exact product lookup.
  - Returns product details, current stock levels, and regional pricing.
  - Optimized for inventory and purchase order workflows.

### v0.2.6-dev (2026-06-02)
- **New Module**: Addresses API (Customer + Admin).
  - Multi-region support (UZB + KOR formats).
  - Juso API integration for Korean address search.
  - Limit: max 10 addresses per customer.
  - Default address management.
  - CRUD for both customers (self) and admins (for customers).

### v0.2.5-dev (2026-06-02)
- **New Feature**: Stock Write-Off API (GIFT, SAMPLE, DAMAGED, EXPIRED, LOST, ADJUSTMENT).
  - Integrated with Expenses module (auto-expense for damages).
  - Gift tracking with recipient info.
- **New Feature**: Immediate Payment Mode for Manual Orders.
  - Bypasses reservation, deducts stock immediately (FIFO).
  - Automatically recognizes revenue in daily analytics.
  - Supports order-level discounts (% or flat).
- **New Feature**: Walk-in Customer quick registration.
  - Generates placeholder phone for UZB if missing.
  - Tracks customer source (APP vs WALK_IN).

### v0.2.4-dev (2026-06-02)
- **AI Module Upgrade**: Integrated OpenAI GPT-4o Vision for product image analysis.
  - fill-product-image: Automated metadata extraction from photos.
  - generate-post-image: Mode B Telegram post generation directly from images.
  - Hybrid AI strategy: Using GPT-4o for multi-modal tasks and Gemini for text-only tasks.
  - Rate limiting (10/min) and Cloudinary URL validation for image analysis.

### v0.2.3-dev (2026-06-02)
- **Security Hardening**: Implemented 12 production-grade security fixes.
  - Production error handler (stack trace masking)
  - Admin account lockout (5 attempts → 30min lock)
  - Cloudinary URL validation (SSRF prevention)
  - Grammy bot rate limiting
  - DDoS mitigation (express-slow-down)
  - SQL injection prevention (LIKE query escaping)
  - ORDER BY injection prevention (Sort field whitelist)
  - API quota protection (Exchange rate cooldown)
  - Security headers (CSP/HSTS via Helmet)
  - XSS prevention (Input sanitization middleware)
  - Security audit logging framework

### v0.2.2-dev (2026-06-02)
- **Bug Fix**: Context-aware `telegramId` update logic in `verifyOtp`. Now correctly handles Telegram account switching for existing customers while blocking cross-user conflicts.
- **Bug Fix**: Improved OTP transaction atomicity by including token consumption within the same unit of work.

### v0.2.1-dev (2026-06-02)
- **Bug Fix**: Implemented `TELEGRAM_ALREADY_LINKED` check to prevent Telegram ID hijacking across phone numbers.
- **Bug Fix**: Wrapped `verifyOtp` logic in a DB transaction for atomicity (prevents token wastage on failure).

### v0.2.0-dev (2026-06-02)
- Complete Backend API implementation (22 modules)
- Verified with 34 functional endpoint tests
- Unified multi-channel Notification System (Telegram + Push)
- Automated Background Jobs (Cron)
- Dynamic Excel Report Generation
- Dashboard & Financial Analytics suite
- RBAC Management & Admin Security

### v0.1.0-dev (2026-05-30)
- Initial monorepo setup
- 39-table PostgreSQL schema
- CI/CD pipelines
