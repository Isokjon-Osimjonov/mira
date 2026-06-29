# 🪞 Mira Cosmetics — Project Progress

> Last updated: 2026-06-08
> Version: 0.3.0-dev
> Sprint: #7 — Dashboard & Marketing

---

## 📊 Status Dashboard

| Layer           | Status          | Progress |
| --------------- | --------------- | -------- |
| Infrastructure  | ✅ Done         | 100%     |
| Database Schema | ✅ Done         | 100%     |
| Auth API        | ✅ Done         | 100%     |
| Products API    | ✅ Done         | 100%     |
| Orders API      | ✅ Done         | 100%     |
| Management APIs | ✅ Done         | 100%     |
| Notifications   | ✅ Done         | 100%     |
| Automation      | ✅ Done         | 100%     |
| Admin Panel     | 🟡 Setup Only   | 10%      |
| Mobile App      | 🟢 Catalog Done | 50%      |
| Telegram Bot    | ✅ Done         | 100%     |
| CI/CD           | ✅ Done         | 95%      |
| DevOps/Docker   | 🟡 Local Only   | 20%      |

---

## ✅ Completed

### Sprint 5 — Mobile catalog UI

- [x] product.service.ts — getProducts, getProductById, getExchangeRate, getCategories
- [x] exchange-store.ts — Zustand rate store
- [x] price.ts — formatKRW, formatUZS helpers
- [x] ProductCard component — badge logic, wishlist, UZS display
- [x] SectionHeader component
- [x] home.tsx — full home screen with real API data
- [x] product/[id].tsx — full detail screen, tab layout, NaN fix
- [x] product/\_layout.tsx
- [x] Global design system update: removed shadows, standardized fonts to max 500/600, refined pink color usage

### Sprint 5 — Server prep for mobile catalog

- [x] DB: isNew + isFeatured added to products table
- [x] Migration created and run
- [x] GET /api/v1/exchange-rates/current (public)
- [x] Product list response includes categoryName, isNew, isFeatured, isAvailable
- [x] Products filterable by ?featured=true
- [x] Products sortable by ?sort=newest|bestselling
- [x] Admin: isNew + isFeatured toggles on product edit

### Sprint 5 — Infrastructure (Mobile)

- [x] App.tsx deleted (dead Nx code)
- [x] tokens.ts expanded: spacing, radius, fontSize, shadow, new colors
- [x] QueryClientProvider wired in \_layout.tsx
- [x] Floating pill tab bar — 4 tabs with Feather icons
- [x] Active tab: pink pill with label
- [x] Inactive tab: icon only, muted color
- [x] Safe area insets applied to tab bar
- [x] SkeletonLoader component created
- [x] expo-image verified (added to package.json and installed)
- [x] paddingBottom: 100 on all tab screens

### Sprint 4 — Auth hardening (Mobile)

- [x] initialize() sends X-Client-Type: mobile header
- [x] Session expired → router.replace('/auth/login')
- [x] Logout invalidates token on server (mobile body)
- [x] handleResend requests fresh OTP token
- [x] profileImageUrl not overwritten on name update
- [x] refreshToken optional guard in verifyOtp
- [x] home.tsx shows customer name + logout button

### Sprint 3 — API Integration (Mobile)

- [x] auth.service.ts — requestOtp, verifyOtp, logout
- [x] customer.service.ts — getMe, updateProfile, savePushToken
- [x] index.tsx — useAuthStore.initialize() on splash
- [x] login.tsx — POST /auth/request-otp, token → otp params
- [x] otp.tsx — real token in deeplink, POST /auth/verify-otp
- [x] profile-setup.tsx — PATCH /customers/me
- [x] Silent refresh implemented in auth-store.ts
- [x] BASE_URL fallbacks in api.ts for Expo Go/EAS
- [x] Server-side avatar upload endpoint (Cloudinary)
- [x] Mobile upload service and profile-setup integration

### Sprint 2 — Auth Flow UI (Mobile)

- [x] PrimaryButton component
- [x] PhoneInput component
- [x] OtpInput component
- [x] login.tsx — phone + region input
- [x] otp.tsx — 6-box OTP, timer, attempts guard
- [x] profile-setup.tsx — name + avatar picker
- [x] Migrated SafeAreaView to react-native-safe-area-context

### API & Core (Completed)

- [x] Auth API (Customer OTP + Admin JWT)
- [x] Products API (Categories, Products, Inventory, Upload)
- [x] Settings API (Singleton system config)
- [x] Exchange Rate API (Manual + Auto-fetch)
- [x] Cart API (DB-backed, regional pricing)
- [x] Coupon API (Complex validation, all types)
- [x] Orders API (Checkout, Status Machine, Analytics)
- [x] Unified Notifications (Telegram + Expo Push)
- [x] Admin Users + Roles API (RBAC)
- [x] Suppliers + Purchase Orders API
- [x] Expenses API (Categories + Summary)
- [x] Dashboard & Analytics API
- [x] Excel Reports API
- [x] Cron Jobs (5 automated background tasks)

### Sprint 7 — Cart + Checkout + Orders

Status: ✅ Complete
Date: 2026-06-09

### Completed

- [x] cart.service.ts
- [x] cart-store.ts (Zustand)
- [x] Cart tab badge count
- [x] addToCart wired on home + categories + detail
- [x] cart.tsx — full cart screen
- [x] order.service.ts
- [x] address.service.ts
- [x] checkout/\_layout.tsx
- [x] checkout/address.tsx
- [x] checkout/payment.tsx
- [x] checkout/confirmed.tsx
- [x] orders/index.tsx
- [x] orders/[id].tsx placeholder
- [x] orders/\_layout.tsx
- [x] /upload/receipt endpoint on server

---

## 🚧 In Progress

### Sprint #9 — Admin Panel UI

- [x] Foundation setup (layout, routing, auth)
- [x] Login page
- [ ] Dashboard page
- [ ] Products management (Basic list + Create/Edit Sheet)
- [ ] Categories management

### Sprint 6 — Categories Screen

Status: ✅ Complete
Date: 2026-06-09

### Completed

- [x] categories.tsx — search bar, filter pills, popular horizontal, new arrivals 2-col grid
- [x] Reused ProductCard, SectionHeader, SkeletonLoader
- [x] Category filter pills wired to API
- [x] Empty state
- [x] productService.getProducts extended with q param

### Pending

- [ ] Cart screen
- [ ] Checkout flow
- [ ] Order history

---

## 📋 Pending

### Pending

- [ ] Mobile: Order history + detail (Implemented in Sprint 8)

---

## Sprint 8 — Profile + Addresses + Orders

Status: ✅ Complete
Date: 2026-06-09

### Completed

- [x] CRITICAL: useCartStore import in product/[id].tsx
- [x] CRITICAL: coupon raw SQL error hidden
- [x] CRITICAL: cart summary bar position fixed
- [x] address.service.ts — full CRUD + Juso search
- [x] profile/index screen — menu, logout, avatar
- [x] profile/\_layout.tsx
- [x] profile/addresses.tsx — list, set default, delete
- [x] profile/address-form.tsx — UZB + KOR forms, Juso
- [x] orders/index.tsx — list with status, countdown
- [x] orders/[id].tsx — detail, timeline, cancel
- [x] orders/\_layout.tsx
- [x] notifications/index.tsx placeholder
- [x] checkout/address.tsx — useFocusEffect refetch
- [x] home.tsx — removed logout button
- [x] formatCountdown + formatDate in price.ts
- [x] orderService.getOrders response fix

### What user can now do

- ✅ Add/edit/delete addresses
- ✅ Complete full checkout flow
- ✅ Track order status
- ✅ Cancel pending orders
- ✅ Logout from profile
- ✅ Navigate between all main screens

---

## 🧪 Test Results

**Date**: 2026-06-08
**Environment**: Development (Local)

| Endpoint                       | Status  | Note                                                 |
| ------------------------------ | ------- | ---------------------------------------------------- | ----------------- |
| /health                        | ✅ PASS | Uptime confirmed                                     |
| /api/v1/exchange-rates/current | ✅ PASS | Publicly returns rate + updatedAt                    |
| /api/v1/products               | ✅ PASS | Returns categoryName, isNew, isFeatured, isAvailable |
| Products Filtering             | ✅ PASS | ?featured=true works                                 |
| Products Sorting               | ✅ PASS | ?sort=newest                                         | bestselling works |

---
