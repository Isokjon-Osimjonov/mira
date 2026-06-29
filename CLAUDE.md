# Mira Cosmetics — Codebase Law

Every developer (human or AI) working on this project MUST follow these rules strictly. This is the single source of truth for architecture, standards, and conventions.

---

## 1. PROJECT OVERVIEW

- **Stack**: Node.js (Express), TypeScript, Drizzle ORM, PostgreSQL, Redis (BullMQ), Socket.io, Grammy (Telegram Bot).
- **Monorepo**: Nx managed.
- **Packages**:
  - `apps/api`: Express backend.
  - `apps/admin`: React Vite dashboard.
  - `apps/mobile`: Expo React Native app.
  - `libs/db`: Shared Drizzle schema and client.
  - `libs/shared-types`: Common TypeScript interfaces and enums.
  - `libs/shared-utils`: Common helper functions.
- **Markets**: Uzbekistan (UZB) and South Korea (KOR).
- **Language**: Uzbek ONLY in UI (Customer/Admin). English for logs and internal system messages.
- **Brand Style**: 
  - Color: `#E11D74`
  - Font: `Inter` (No italic used anywhere in the design).

---

## 2. ABSOLUTE NO-HARDCODING RULES

Nothing that changes between environments or depends on business state may be hardcoded.

- **URLs**: Always use `env.XXX` (e.g., `env.ADMIN_URL`, `env.CORS_ORIGINS`).
- **Monetary Thresholds**: Always from `settings` table (e.g., `minOrderKorKrw`).
- **Timeouts**: Always from `settings` table (e.g., `paymentTimeoutMinutes`).
- **Currency**: Product prices are stored in KRW. Currency symbol and conversion rates come from DB.
- **Regions**: `UZB` or `KOR` strings MUST come from JWT payload (`req.user.region`) or DB.
- **Telegram**: `ADMIN_GROUP_CHAT_ID` and `BOT_TOKEN` must be in `env`.
- **Bot Username**: Always `env.BOT_USERNAME`.
- **Domain Names**: Always `env.NODE_ENV` dependent via `env`.
- **Error Messages**: Always use defined constants or localized strings in services.
- **Statuses/Enums**: Always import from `@mira/db` (e.g., `orderStatusEnum`).

### Examples:
❌ **WRONG**: `if (order.status === 'DELIVERED')`
✅ **CORRECT**: `if (order.status === orderStatusEnum.enumValues[7])` (or better, import enum object).

❌ **BAD**: `const SHIPPING_FEE = 3000`
✅ **CORRECT**: `const { minOrderKorKrw } = await getSettings()`

---

## 3. ERROR CODE REGISTRY

### Standard Codes (`@mira/shared-types`)
- `UNAUTHORIZED`: 401 - Authentication required.
- `FORBIDDEN`: 403 - Missing permissions.
- `NOT_FOUND`: 404 - Resource not found.
- `VALIDATION_ERROR`: 400 - Zod or manual validation failed.
- `RATE_LIMITED`: 429 - Too many requests.
- `INTERNAL_ERROR`: 500 - Unexpected server error.
- `INVALID_TOKEN`: 401 - JWT is malformed.
- `TOKEN_EXPIRED`: 401 - JWT has expired.

### AI Domain (`ai.service.ts`)
- `AI_AUTH_ERROR`: 500 - AI service credentials missing or invalid.
- `AI_QUOTA_EXCEEDED`: 429 - AI provider limit reached.
- `AI_GENERATION_FAILED`: 500 - AI failed to produce valid output.

### Cart Domain (Future)
- `PRODUCT_INACTIVE`: 400 - Product is hidden.
- `PRODUCT_NO_REGIONAL_CONFIG`: 400 - Product not available in user region.
- `INSUFFICIENT_STOCK`: 400 - Requested quantity exceeds available stock.
- `INVALID_QUANTITY`: 400 - Quantity must be > 0.
- `CART_ITEM_NOT_FOUND`: 404 - Item not in cart.
- `CART_ITEM_UNAUTHORIZED`: 403 - Cart belongs to another user.

### Coupon Domain (Future)
- `COUPON_NOT_FOUND`: 404 - Code does not exist.
- `COUPON_INACTIVE`: 400 - Coupon is paused.
- `COUPON_EXPIRED`: 400 - End date passed.
- `COUPON_NOT_STARTED`: 400 - Start date in future.
- `COUPON_MAX_USES_REACHED`: 400 - Global limit reached.
- `COUPON_REGION_MISMATCH`: 400 - Coupon not valid in user region.
- `COUPON_MIN_ORDER_NOT_MET`: 400 - Order total too low for coupon.

### Product Domain (`products.service.ts`)
- `PRODUCT_NOT_FOUND`: 404 - Product does not exist or deleted.
- `DUPLICATE_BARCODE`: 400 - Barcode or SKU already exists.

### Settings Domain (`settings.service.ts`)
- `SETTINGS_NOT_FOUND`: 500 - Critical: Singleton row missing.

### Exchange Rate Domain (`exchange-rates.service.ts`)
- `EXCHANGE_RATE_NOT_FOUND`: 404 - No snapshots in DB.
- `API_KEY_MISSING`: 400 - Exchange rate provider key not in env.
- `API_GATEWAY_ERROR`: 502 - External provider failed.

### Order Domain (`orders.service.ts`)
- `ORDER_NOT_FOUND`: 404 - Order does not exist.
- `ORDER_UNAUTHORIZED`: 403 - Order belongs to another customer.
- `INVALID_STATUS_TRANSITION`: 400 - Status cannot move from A to B.
- `PAYMENT_DEADLINE_EXCEEDED`: 400 - Order auto-canceled.
- `INVALID_DISCOUNT`: 400 - discount > subtotal.

### Inventory Domain (`inventory.service.ts`)
- `BATCH_NOT_FOUND`: 404 - batch does not exist.
- `WRITE_OFF_QTY_EXCEEDED`: 400 - qty > batch.currentQty.

### Customer Domain (`customers.service.ts`)
- `CUSTOMER_NOT_FOUND`: 404 - customer not found.
- `WALK_IN_PHONE_REQUIRED`: 400 - KOR region needs phone.
- `ADDRESS_NOT_FOUND`: 404 - address not found.
- `ADDRESS_UNAUTHORIZED`: 403 - address belongs to different customer.
- `ADDRESS_LIMIT_EXCEEDED`: 400 - max 10 addresses reached.
- `ADDRESS_IN_USE`: 400 - address used in active order.
- `JUSO_API_ERROR`: 502 - Korea address search failed.
- `WRITE_OFF_QTY_EXCEEDED`: 400 - qty > batch.currentQty.
- `BATCH_NOT_FOUND`: 404 - batch does not exist.
- `INVALID_DISCOUNT`: 400 - discount > subtotal.

### Pick & Pack (`pick-pack.service.ts`)
- `BOX_NOT_FOUND`: 404 - Box size does not exist.
- `SCAN_MISMATCH`: 400 - Barcode does not match expected item.
- `ITEM_ALREADY_SCANNED`: 400 - Duplicate scan.
- `ITEM_NOT_IN_ORDER`: 400 - Scanned item not part of current order.
- `BOX_OVERFLOW`: 400 - Scanned items exceed box capacity.
- `COUPON_MIN_QTY_NOT_MET`: 400 - Too few items for coupon.
- `COUPON_FIRST_ORDER_ONLY`: 400 - Only for new customers.
- `COUPON_ONE_PER_CUSTOMER`: 400 - User already used this coupon.
- `COUPON_DUPLICATE_CODE`: 400 - Code already exists in DB.

### Order Domain (Future)
- `ORDER_NOT_FOUND`: 404 - Order not found.
- `ORDER_UNAUTHORIZED`: 403 - Order belongs to another user.
- `PAYMENT_ALREADY_SUBMITTED`: 400 - Receipt already uploaded.
- `PAYMENT_DEADLINE_PASSED`: 400 - 30m window expired.
- `ORDER_ALREADY_CANCELED`: 400 - Cannot modify canceled order.
- `ORDER_INVALID_STATUS_TRANSITION`: 400 - E.g., DELIVERED -> PENDING.

---

## 4. API RESPONSE ENVELOPE

ALL endpoints MUST return the same shape:

### Success
```typescript
{
  "data": T,
  "error": null,
  "meta": { "page": 1, "limit": 20, "total": 100, "hasNext": true, "hasPrev": false } // optional
}
```

### Error
```typescript
{
  "data": null,
  "error": {
    "message": "Inson tushunadigan xabar",
    "code": "ERROR_CODE_STRING"
  }
}
```

---

## 5. ERROR THROWING PATTERN

- **Service Layer**: Throw a literal object.
```typescript
throw { status: 404, code: 'NOT_FOUND', message: 'Topilmadi' }
```
- **Controller Layer**: Wrap in try/catch and use the envelope.
```typescript
try {
  const result = await Service.doSomething()
  return res.json({ data: result, error: null })
} catch (e: any) {
  return res.status(e.status ?? 500).json({ 
    data: null, 
    error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } 
  })
}
```

---

## 6. MONETARY VALUES

- **DB Storage**: `bigint` (Postgres).
- **Drizzle Mode**: `bigint` (returns as JS `bigint`).
- **Arithmetic**: ALWAYS use `BigInt()` and `n` suffix.
- **JSON Response**: ALWAYS convert to `Number()` before sending to client (safe up to 9 quadrillion).
- **Calculations**:
  - Percentage: `amount * BigInt(percent) / 100n`
  - Total: `price * BigInt(qty)`
- **NEVER**: Use `float`, `double`, `parseFloat`, `Math.round`, or `.toFixed()` for money.

---

## 7. AUTHENTICATION & PERMISSIONS

### Middleware
- `requireCustomer`: Validates customer JWT.
- `requireAdmin`: Validates admin JWT.
- `requirePermission(resource, action)`: Checks `role_permissions` table.
- `requireSuperAdmin`: Checks `is_super_admin` flag in JWT.

### Resources
`'products'`, `'orders'`, `'customers'`, `'inventory'`, `'settings'`, `'analytics'`, `'telegram'`, `'expenses'`, `'coupons'`, `'exchange_rates'`, `'boxes'`, `'users'`, `'roles'`.

### Actions
`'read'`, `'write'`, `'delete'`.

---

## 8. DATABASE PATTERNS

- **ORM**: Drizzle only.
- **Soft Delete**: `deletedAt` column. Filter it in every `select`.
- **Singleton**: `settings` table uses `lock_column char(1) DEFAULT 'X' UNIQUE`.
- **Timestamps**: `timestamp({ withTimezone: true })`.
- **IDs**: `uuid().primaryKey().defaultRandom()`.
- **Performance**: Use `.leftJoin()` or `tx.transaction()` for batching. Avoid looping queries.
- **Inventory**: FIFO order via `ORDER BY created_at ASC` or `received_at ASC` on batches.
- **Accounting**:
  - Revenue Recognition: Cash basis, at `PAYMENT_CONFIRMED`.
  - COGS Recognition: At `PAYMENT_CONFIRMED` (updated with actual costs at `PACKING`).
  - Revenue Reversal: At `REFUNDED` status (includes stock return).

---

## 9. SOCKET.IO EVENTS

ALWAYS use `emit` helpers from `apps/api/src/config/socket.ts`.

- `order:new`: New order created.
- `order:status_changed`: Status transition.
- `payment:receipt_uploaded`: Customer uploaded receipt.
- `payment:confirmed`/`rejected`: Verification results.
- `stock:low`/`out`: Inventory alerts.
- `exchange_rate:updated`: New rate snapshot.
- `settings:updated`: System settings changed.

---

## 10. TELEGRAM NOTIFICATIONS

ALWAYS use helpers from `apps/api/src/bot/helpers/notify.ts`.

- `sendAdminAlert(msg)`: Text to admin group.
- `notifyNewOrder(data)`: Formatted order info to admin group.
- `notifyCustomer(tgId, msg)`: Direct message to customer.

---

## 11. PAGINATION STANDARD

### Request
`GET /api/v1/resource?page=1&limit=20`

### Response Meta
```typescript
{
  "total": 150,
  "page": 1,
  "limit": 20,
  "totalPages": 8,
  "hasNext": true,
  "hasPrev": false
}
```

---

## 12. CLOUDINARY UPLOAD FLOW

1. **Sign**: Admin calls `GET /api/v1/admin/upload/sign?folder=products`.
2. **Direct Upload**: Frontend uploads file to Cloudinary using signature + apiKey.
3. **Save**: Frontend sends the resulting Cloudinary URL to API to be stored in DB.
- **Folders**: `products`, `receipts`, `expenses`, `telegram`, `profiles`.

---

## 13. BRANCH & COMMIT CONVENTION

- **Branches**: `feature/name`, `fix/name`, `hotfix/name`.
- **Commits**:
  - `feat(scope): message`
  - `fix(scope): message`
  - `refactor(scope): message`
  - `docs(scope): message`

---

## 14. FILE STRUCTURE CONVENTION

Every module in `apps/api/src/modules/` must have:

### `name.schema.ts`
```typescript
import { z } from 'zod';
export const CreateNameSchema = z.object({ ... });
```

### `name.service.ts`
```typescript
import { db } from '../../config/db';
export async function create(data: any) { ... }
```

### `name.controller.ts`
```typescript
import * as Service from './name.service';
export async function handle(req: Request, res: Response) { ... }
```

### `name.router.ts`
```typescript
import { Router } from 'express';
const router = Router();
router.post('/', ctrl.handle);
export default router;
```

---

## ══ PROGRESS TRACKING RULE (MANDATORY) ══

After EVERY task completion, Gemini MUST:

1. Update PROGRESS.md:
   - Move completed items from "Pending" → "Completed"
   - Update "In Progress" section
   - Add entry to Changelog
   - Update "Last updated" date at top

2. Update format:
   ✅ Completed: [x] Task name
   🚧 In Progress: [ ] Task name
   📋 Pending: [ ] Task name

3. Commit message must include:
   "docs: update PROGRESS.md"

This rule applies to ALL future Gemini sessions.
PROGRESS.md is the single source of project truth.

---

## ══ ADMIN PANEL RULES (MANDATORY) ══

NEVER hardcode:
  - API URLs → env.apiUrl only
  - Error messages → ERROR_MESSAGES map only
  - Currency formats → formatKRW/formatUZS utils only
  - Dates → formatDate/formatDateTime utils only
  - Status labels → STATUS_CONFIG objects only
  - Route paths → routes constants only

ALL UI TEXT IN UZBEK:
  - Labels, placeholders, tooltips
  - Toast messages
  - Error messages
  - Empty state text
  - Confirmation dialogs

ERROR HANDLING PATTERN:
  - API errors: caught by axios interceptor
  - Toast: automatic via queryClient mutation.onError
  - Manual toast: toast.error(getErrorMessage(code))
  - Never show raw error.message to user

CURRENCY DISPLAY:
  - Always use formatKRW() or formatUZS()
  - Exchange rate: from useExchangeRate() hook
  - UZB region: show UZS primary, KRW secondary
  - KOR region: show KRW only
  - Dashboard totals: always KRW

DATE DISPLAY:
  - Always use formatDate() or formatDateTime()
  - Format: DD.MM.YYYY or DD.MM.YYYY HH:mm
  - Relative: formatRelative() for recent items
  - NEVER: new Date().toString() directly

PERMISSIONS:
  - Use PermissionGate component for conditional render
  - Use usePermission() hook for logic
  - Super admin bypasses all checks
  - Hide buttons user can't use (don't just disable)

REAL-TIME UPDATES:
  - Socket events → toast + queryClient.invalidateQueries
  - Connect socket in AppLayout useEffect
  - Disconnect on unmount

COMPONENTS:
  - StatusBadge for all status displays
  - Skeleton for loading states (not spinners)
  - ScrollArea for overflow (not overflow-auto directly)
  - Shadcn Dialog/Sheet for forms (not inline)
