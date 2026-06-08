# 🪞 Mira Cosmetics — Project Progress

> Last updated: 2026-06-08
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
| Admin Panel | 🟡 Setup Only | 10% |
| Mobile App | 🟢 Auth Done | 30% |
| Telegram Bot | ✅ Done | 100% |
| CI/CD | ✅ Done | 95% |
| DevOps/Docker | 🟡 Local Only | 20% |

---

## ✅ Completed

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
- [x] QueryClientProvider wired in _layout.tsx
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

---

## 🚧 In Progress

### Sprint #9 — Admin Panel UI
- [x] Foundation setup (layout, routing, auth)
- [x] Login page
- [ ] Dashboard page
- [ ] Products management (Basic list + Create/Edit Sheet)
- [ ] Categories management

### Mobile App
- [ ] Mobile: Home & Category browse
- [ ] Mobile: Product list + detail

---

## 📋 Pending

### Mobile
- [ ] Mobile: Cart & Checkout
- [ ] Mobile: Order history + detail

---

## 🧪 Test Results

**Date**: 2026-06-08
**Environment**: Development (Local)

| Endpoint | Status | Note |
|----------|--------|------|
| /health | ✅ PASS | Uptime confirmed |
| /api/v1/exchange-rates/current | ✅ PASS | Publicly returns rate + updatedAt |
| /api/v1/products | ✅ PASS | Returns categoryName, isNew, isFeatured, isAvailable |
| Products Filtering | ✅ PASS | ?featured=true works |
| Products Sorting | ✅ PASS | ?sort=newest|bestselling works |

---
