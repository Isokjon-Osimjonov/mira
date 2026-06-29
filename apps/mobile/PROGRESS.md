## Sprint 1 — Splash + Onboarding

Status: ✅ Complete
Date: 2026-06-07

### Completed

- [x] Mobile color tokens file (src/lib/tokens.ts)
- [x] Splash screen with routing logic (src/app/index.tsx)
- [x] Onboarding 3-slide screen (src/app/onboarding.tsx)
- [x] AsyncStorage gate: onboarding_complete
- [x] SecureStore gate: refresh_token
- [x] Routes: /onboarding → /auth/login → /(tabs)/home

### Known gaps (Sprint 2)

- [ ] /auth/login screen not built yet
- [ ] /(tabs)/home screen not built yet
- [ ] @expo-google-fonts/inter may need pnpm add

## Sprint 1 Fix — Entry point routing

- [x] app.json updated: name, icon paths, expo-router plugin, splash bg #E11D74
- [x] package.json main set to expo-router/entry
- [x] expo.router.root set to src/app
- [x] Asset paths corrected

### Sprint 1 Fix 2 — AsyncStorage → expo-secure-store

- [x] Replaced AsyncStorage with expo-secure-store throughout
- [x] Both onboarding_complete and refresh_token use SecureStore
- [x] No native modules required — works in Expo Go

### Sprint 1 Fix 3 — Onboarding Refinement

- [x] Switched to network placeholder URLs for hero images
- [x] Corrected background colors to use `tokens.colors.background`
- [x] Fixed text alignment and centered all typography
- [x] Removed labels/badges above headings
- [x] Matched button and progress bar styles to reference

### Sprint 1 Fix 4 — Placeholder routes

- [x] Created /auth/login placeholder
- [x] Created /(tabs)/\_layout.tsx
- [x] Created /(tabs)/home placeholder
- [x] All routes referenced in index.tsx now exist

### Sprint 1 Fix 5 — NFT Style Onboarding

- [x] Full rewrite of onboarding.tsx with NFT marketplace aesthetic
- [x] Dynamic background and status bar per slide
- [x] Top-left large bold typography
- [x] Floating center images (network placeholders)
- [x] Circle button navigation (no swipe)
- [x] Slide counter "01 — 03"

### Sprint 1 Fix — Config consolidation

- [x] Deleted app.json
- [x] app.config.ts updated: Mira Market, white splash, pink #E11D74
- [x] adaptive-icon.png copied from icon.png
- [x] All old Mira Cosmetics references removed
