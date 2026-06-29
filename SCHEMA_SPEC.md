# SCHEMA_SPEC.md — Mira Cosmetics

# Master Reference for Drizzle ORM Schema Generation

# Version: 2.0 | Tables: 39 | Files: 20

---

## PROJECT CONTEXT

**Brand:** Mira Cosmetics — Korean cosmetics e-commerce
**Markets:** Uzbekistan (UZB) + South Korea (KOR)
**Stack:** PostgreSQL + Drizzle ORM + TypeScript (strict)
**Path:** `libs/db/src/schema/`
**Package:** `@mira/db`

---

## DRIZZLE CONVENTIONS — FOLLOW EXACTLY

```typescript
// ─── Imports pattern ───────────────────────────────────────────
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  date,
  index,
  uniqueIndex,
  check,
  primaryKey,
  jsonb,
  decimal,
  smallint,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'

// ─── Monetary values ────────────────────────────────────────────
// ALL KRW/UZS amounts → bigint (no decimals in Korean Won)
// USD amounts → integer (whole dollars, no cents needed)
// Example: ₩18,500 stored as 18500n (bigint)

// ─── Timestamps ─────────────────────────────────────────────────
// Always withTimezone: true
// created_at: .defaultNow().notNull()
// updated_at: .defaultNow().notNull() — trigger via app logic
// deleted_at: nullable — soft delete pattern

// ─── UUID ───────────────────────────────────────────────────────
// All PKs: uuid().primaryKey().defaultRandom()

// ─── Relations ──────────────────────────────────────────────────
// Define in SAME file as table, AFTER table definition
// Export: tableNameRelations

// ─── Type exports ───────────────────────────────────────────────
// Always export at bottom of each table:
// export type TableName = typeof tableName.$inferSelect
// export type NewTableName = typeof tableName.$inferInsert

// ─── APPEND-ONLY tables ─────────────────────────────────────────
// Comment: // APPEND-ONLY — no UPDATE or DELETE ever
// Tables: order_status_history, stock_movements,
//         coupon_redemptions, pick_pack_audit,
//         batch_adjustments, auth_tokens (after use)

// ─── CHECK constraints ──────────────────────────────────────────
// Name pattern: {table}_{field}_check
// Example: orders_status_check, products_region_check

// ─── Index naming ───────────────────────────────────────────────
// Name pattern: idx_{table}_{column}
// Unique index: {table}_{column}_idx
```

---

## FILE STRUCTURE

```
libs/db/src/schema/
  enums.ts                    ← All pgEnum definitions
  admin-users.ts              ← admin_users, roles, role_permissions
  auth.ts                     ← auth_tokens, refresh_tokens
  customers.ts                ← customers, user_addresses, user_notification_settings
  categories.ts               ← categories (self-referential parent_id)
  products.ts                 ← products, product_regional_configs
  inventory.ts                ← inventory_batches, stock_movements,
                                 stock_reservations, batch_adjustments
  carts.ts                    ← carts, cart_items
  boxes.ts                    ← boxes, kor_shipping_tiers
  orders.ts                   ← orders, order_items,
                                 order_status_history, order_expenses
  coupons.ts                  ← coupons, coupon_redemptions, user_coupons
  settings.ts                 ← settings (singleton), exchange_rate_snapshots
  expenses.ts                 ← expense_categories, expenses
  telegram.ts                 ← telegram_channels, telegram_posts,
                                 telegram_post_channels
  social.ts                   ← wishlists, waitlists
  audit.ts                    ← pick_pack_audit
  analytics.ts                ← daily_sales_summary
  notifications.ts            ← notifications_log
  index.ts                    ← export * from all files
```

---

## ════════════════════════════════════════════════

## FILE: enums.ts

## ════════════════════════════════════════════════

```typescript
// NOTE: Drizzle pgEnum creates real PostgreSQL ENUM types
// For flexibility, some fields use varchar + CHECK instead

export const regionEnum = pgEnum('region', ['UZB', 'KOR'])

export const orderStatusEnum = pgEnum('order_status', [
  'DRAFT',
  'PENDING_PAYMENT',
  'PAYMENT_SUBMITTED',
  'PAYMENT_CONFIRMED',
  'PAYMENT_REJECTED',
  'PACKING',
  'SHIPPED',
  'DELIVERED',
  'CANCELED',
  'REFUNDED',
])

export const paymentMethodEnum = pgEnum('payment_method', ['KOREAN_BANK', 'UZB_BANK', 'E9PAY'])

export const orderSourceEnum = pgEnum('order_source', ['STOREFRONT', 'MANUAL'])

export const deliveryCoveredByEnum = pgEnum('delivery_covered_by', ['CUSTOMER', 'BUSINESS'])

export const couponTypeEnum = pgEnum('coupon_type', ['PERCENTAGE', 'FIXED', 'FREE_SHIPPING'])

export const couponScopeEnum = pgEnum('coupon_scope', [
  'ENTIRE_ORDER',
  'PRODUCTS',
  'CATEGORIES',
  'BRANDS',
])

export const couponStatusEnum = pgEnum('coupon_status', [
  'DRAFT',
  'ACTIVE',
  'PAUSED',
  'EXPIRED',
  'ARCHIVED',
])

export const stockMovementTypeEnum = pgEnum('stock_movement_type', [
  'STOCK_IN',
  'RESERVED',
  'RESERVATION_RELEASED',
  'DEDUCTED',
  'ADJUSTED',
  'RETURNED',
  'ADJUSTMENT_IN',
  'ADJUSTMENT_OUT',
])

export const stockReservationStatusEnum = pgEnum('stock_reservation_status', [
  'ACTIVE',
  'RELEASED',
  'CONVERTED',
])

export const telegramPostStatusEnum = pgEnum('telegram_post_status', [
  'DRAFT',
  'SCHEDULED',
  'SENT',
  'FAILED',
])

export const notificationTypeEnum = pgEnum('notification_type', [
  'ORDER_STATUS',
  'PAYMENT_CONFIRMED',
  'PAYMENT_REJECTED',
  'SHIPPED',
  'DELIVERED',
  'STOCK_BACK',
  'PRICE_DROP',
  'PROMO',
  'SYSTEM',
])

export const notificationChannelEnum = pgEnum('notification_channel', ['PUSH', 'TELEGRAM', 'BOTH'])

export const notificationStatusEnum = pgEnum('notification_status', ['SENT', 'FAILED', 'PENDING'])

export const exchangeRateSourceEnum = pgEnum('exchange_rate_source', ['API', 'MANUAL'])

export const orderExpenseTypeEnum = pgEnum('order_expense_type', [
  'CARGO_COST',
  'COUPON_DISCOUNT',
  'DELIVERY_ABSORBED',
  'CUSTOMS',
  'PACKAGING',
  'OTHER',
])

export const revokeReasonEnum = pgEnum('revoke_reason', [
  'LOGOUT',
  'ROTATION',
  'SECURITY',
  'EXPIRED',
  'ADMIN',
])

export const pickPackActionEnum = pgEnum('pick_pack_action', [
  'SCAN_SUCCESS',
  'SCAN_MISMATCH',
  'MANUAL_FALLBACK',
  'ITEM_CONFIRMED',
  'ORDER_PACKED',
])

export const pickPackResultEnum = pgEnum('pick_pack_result', ['OK', 'ERROR'])
```

---

## ════════════════════════════════════════════════

## FILE: admin-users.ts

## Tables: roles, role_permissions, admin_users

## ════════════════════════════════════════════════

### TABLE: roles

```
Purpose: Dynamic RBAC roles (ADMIN, MANAGER, EDITOR, VIEWER, etc.)
Pattern: Admin creates/edits roles, assigns permissions per role

Fields:
  id           uuid PK defaultRandom
  name         varchar(50) UNIQUE NOT NULL  -- "ADMIN", "MANAGER"
  description  text nullable
  is_active    boolean default true NOT NULL
  created_at   timestamp NOT NULL defaultNow
  updated_at   timestamp NOT NULL defaultNow

Indexes:
  name_idx: uniqueIndex on name
```

### TABLE: role_permissions

```
Purpose: Junction — which permissions each role has
Pattern: resource:action pairs (products:read, orders:write)

Fields:
  id         uuid PK defaultRandom
  role_id    uuid NOT NULL FK→roles.id CASCADE DELETE
  resource   varchar(50) NOT NULL  -- 'products','orders','customers',
                                   -- 'inventory','settings','analytics',
                                   -- 'telegram','expenses','coupons',
                                   -- 'exchange_rates','boxes','users','roles'
  action     varchar(20) NOT NULL  -- 'read','write','delete'
  created_at timestamp NOT NULL defaultNow

Constraints:
  UNIQUE: (role_id, resource, action)
  CHECK: action IN ('read', 'write', 'delete')

Indexes:
  role_id_idx: on role_id
```

### TABLE: admin_users

```
Purpose: Admin panel users (separate from mobile app customers)
Auth: Email + password (bcrypt hashed)
RBAC: role_id FK to roles, is_super_admin bypasses all checks

Fields:
  id                   uuid PK defaultRandom
  email                varchar(255) UNIQUE NOT NULL
  password_hash        text NOT NULL
  full_name            text NOT NULL default ''
  role_id              uuid nullable FK→roles.id SET NULL
  is_super_admin       boolean default false NOT NULL
                       -- true = bypass all permission checks
                       -- Permissions CRUD only visible when is_super_admin=true
                       -- Cannot change own is_super_admin via UI
  is_active            boolean default true NOT NULL
  must_change_password boolean default false NOT NULL
  last_login_at        timestamp nullable
  deleted_at           timestamp nullable  -- soft delete
  created_at           timestamp NOT NULL defaultNow
  updated_at           timestamp NOT NULL defaultNow

Constraints:
  CHECK: NOT (is_super_admin = true AND role_id IS NOT NULL)
         -- super admin has no role, role_id must be null
  CHECK: is_super_admin = true OR role_id IS NOT NULL
         -- regular admin must have a role assigned

Indexes:
  email_idx: uniqueIndex on email
  role_id_idx: on role_id
  deleted_at_idx: on deleted_at

Relations:
  role: one(roles) via role_id
```

---

## ════════════════════════════════════════════════

## FILE: auth.ts

## Tables: auth_tokens, refresh_tokens

## ════════════════════════════════════════════════

### TABLE: auth_tokens

```
Purpose: Phone OTP deep-link tokens for mobile authentication
Flow: Phone entered → token generated → t.me/bot?start=TOKEN →
      Bot sends OTP → user enters OTP → verified → JWT issued
TTL: 5 minutes
Security: One-use, max 3 attempts, rate limited per phone

Fields:
  id          uuid PK defaultRandom
  token       varchar(64) UNIQUE NOT NULL     -- crypto.randomBytes(32).hex()
  phone       varchar(20) NOT NULL            -- +998... or +82...
  telegram_id bigint nullable                 -- filled when bot receives /start
  otp         varchar(6) nullable             -- 6-digit, filled by bot
  attempts    smallint default 0 NOT NULL     -- max 3, increment on wrong OTP
  used        boolean default false NOT NULL  -- true after successful verify
  expires_at  timestamp NOT NULL              -- created_at + 5 minutes
  created_at  timestamp NOT NULL defaultNow

Indexes:
  token_idx: uniqueIndex on token
  phone_idx: on phone
  expires_at_idx: on expires_at  -- for cron cleanup
```

### TABLE: refresh_tokens

```
Purpose: JWT refresh tokens for both customers and admin users
Pattern: DB-backed refresh (not pure stateless) enables instant revoke
Security: Rotation on every refresh, family tracking for theft detection
Polymorphic: Either customer_id OR admin_user_id must be set (not both)

Fields:
  id              uuid PK defaultRandom
  token           varchar(128) UNIQUE NOT NULL  -- hashed with bcrypt
  customer_id     uuid nullable FK→customers.id CASCADE DELETE
  admin_user_id   uuid nullable FK→admin_users.id CASCADE DELETE
  family_id       uuid NOT NULL                 -- same family = same login session
                                                -- reuse of old family token → revoke all
  device_info     text nullable                 -- "iPhone 14, iOS 17, Expo SDK 52"
  ip_address      varchar(45) nullable          -- IPv4 or IPv6
  user_agent      text nullable
  is_revoked      boolean default false NOT NULL
  revoked_at      timestamp nullable
  revoked_reason  revokeReasonEnum nullable      -- LOGOUT/ROTATION/SECURITY/EXPIRED/ADMIN
  last_used_at    timestamp nullable
  expires_at      timestamp NOT NULL            -- 7 days from creation
  created_at      timestamp NOT NULL defaultNow

Constraints:
  CHECK: (customer_id IS NOT NULL)::int + (admin_user_id IS NOT NULL)::int = 1
         -- exactly one must be set

Indexes:
  token_idx: uniqueIndex on token
  customer_id_idx: on customer_id
  admin_user_id_idx: on admin_user_id
  family_id_idx: on family_id
  expires_at_idx: on expires_at
  is_revoked_idx: on is_revoked
```

---

## ════════════════════════════════════════════════

## FILE: customers.ts

## Tables: customers, user_addresses, user_notification_settings

## ════════════════════════════════════════════════

### TABLE: customers

```
Purpose: Mobile app users (separate from admin_users)
Auth: Phone OTP via Telegram bot
Region: Determined by phone prefix — PERMANENT, never changes

Fields:
  id                uuid PK defaultRandom
  phone             varchar(20) UNIQUE NOT NULL  -- +998... or +82...
  phone_region      regionEnum NOT NULL           -- UZB (+998) / KOR (+82) — permanent
  telegram_id       bigint UNIQUE nullable        -- from bot auth, used for notifications
  tg_username       varchar(100) nullable         -- @username, if available
  first_name        varchar(100) NOT NULL
  last_name         varchar(100) nullable
  profile_image_url varchar(500) nullable         -- Cloudinary URL
  is_active         boolean default true NOT NULL -- false = account deleted (App Store req)
  is_verified       boolean default false NOT NULL -- true after OTP verified
  expo_push_token   varchar(500) nullable         -- for push notifications
  referral_code     varchar(12) UNIQUE nullable   -- auto-generated on creation
  referred_by_id    uuid nullable FK→customers.id SET NULL  -- self-referential
  deleted_at        timestamp nullable            -- soft delete
  created_at        timestamp NOT NULL defaultNow
  updated_at        timestamp NOT NULL defaultNow

Indexes:
  phone_idx: uniqueIndex on phone
  telegram_id_idx: uniqueIndex on telegram_id
  referral_code_idx: uniqueIndex on referral_code
  phone_region_idx: on phone_region
  is_active_idx: on is_active

Relations:
  addresses: many(user_addresses)
  notificationSettings: one(user_notification_settings)
  wishlists: many(wishlists)
  waitlists: many(waitlists)
  carts: one(carts)
  orders: many(orders)
  referredBy: one(customers, self)
  referrals: many(customers, self)
```

### TABLE: user_addresses

```
Purpose: Saved delivery addresses per customer
Regions: UZB and KOR have different address formats in same table
Multiple: Customer can have multiple addresses, one is default

Fields:
  id               uuid PK defaultRandom
  customer_id      uuid NOT NULL FK→customers.id CASCADE DELETE
  label            text default 'Manzil' NOT NULL  -- "Uy", "Ish", "Ota-ona"
  region_code      regionEnum NOT NULL              -- UZB or KOR format
  is_default       boolean default false NOT NULL
  recipient_name   text NOT NULL
  phone            text NOT NULL

  -- UZB specific (nullable for KOR addresses)
  uzb_region       text nullable    -- Viloyat (Toshkent, Samarqand...)
  uzb_city         text nullable    -- Shahar/Tuman
  uzb_district     text nullable    -- Tuman
  uzb_street       text nullable    -- Ko'cha va uy raqami

  -- KOR specific (nullable for UZB addresses)
  kor_postal_code  text nullable    -- 5-digit postal code
  kor_road_address text nullable    -- Juso API road address
  kor_detail       text nullable    -- Apartment/detail
  kor_building     text nullable    -- Building name

  created_at       timestamp NOT NULL defaultNow
  updated_at       timestamp NOT NULL defaultNow

Constraints:
  -- App layer enforces: UZB addresses have uzb_region,
  --                     KOR addresses have kor_postal_code

Indexes:
  customer_id_idx: on customer_id
  region_code_idx: on region_code
```

### TABLE: user_notification_settings

```
Purpose: Per-customer notification preferences
Pattern: 1:1 with customers, created on registration
Toggles: Each notification type can be enabled/disabled

Fields:
  id                 uuid PK defaultRandom
  customer_id        uuid UNIQUE NOT NULL FK→customers.id CASCADE DELETE
  order_status       boolean default true NOT NULL
  payment_confirmed  boolean default true NOT NULL
  payment_rejected   boolean default true NOT NULL
  shipped            boolean default true NOT NULL
  delivered          boolean default true NOT NULL
  stock_back         boolean default true NOT NULL
  price_drop         boolean default true NOT NULL
  promotions         boolean default false NOT NULL
  updated_at         timestamp NOT NULL defaultNow

Indexes:
  customer_id_idx: uniqueIndex on customer_id  -- 1:1 enforced
```

---

## ════════════════════════════════════════════════

## FILE: categories.ts

## Tables: categories

## ════════════════════════════════════════════════

### TABLE: categories

```
Purpose: Product categories with optional parent (2-level hierarchy)
Hierarchy: Parent category → child category (max 2 levels)
Example: "Skincare" (parent) → "Toner", "Serum", "Moisturizer" (children)

Fields:
  id          uuid PK defaultRandom
  name        text NOT NULL               -- O'zbek tilida
  slug        text UNIQUE NOT NULL        -- url-friendly: "toner", "skin-care"
  image_url   text nullable               -- Cloudinary URL
  parent_id   uuid nullable FK→categories.id SET NULL  -- null = top-level
  sort_order  integer default 0 NOT NULL  -- for display ordering
  is_active   boolean default true NOT NULL
  deleted_at  timestamp nullable
  created_at  timestamp NOT NULL defaultNow
  updated_at  timestamp NOT NULL defaultNow

Indexes:
  slug_idx: uniqueIndex on slug
  parent_id_idx: on parent_id
  is_active_idx: on is_active
  deleted_at_idx: on deleted_at

Relations:
  parent: one(categories, self)
  children: many(categories, self)
  products: many(products)
```

---

## ════════════════════════════════════════════════

## FILE: products.ts

## Tables: products, product_regional_configs

## ════════════════════════════════════════════════

### TABLE: products

```
Purpose: Korean cosmetics product catalog
Pricing: NOT here — in product_regional_configs (per region)
Stock: Via inventory_batches (batch-level tracking)
Language: All text fields in Uzbek only

Fields:
  id               uuid PK defaultRandom
  barcode          varchar(50) UNIQUE NOT NULL  -- Korean product barcode (EAN-13)
  sku              varchar(50) UNIQUE NOT NULL  -- Internal: MC-BRAND-001
  name             varchar(255) NOT NULL        -- O'zbek tilida
  brand_name       varchar(100) NOT NULL        -- "COSRX", "MISSHA", "INNISFREE"
  category_id      uuid NOT NULL FK→categories.id RESTRICT

  -- Content
  description_uz   text nullable
  how_to_use_uz    text nullable
  ingredients      jsonb NOT NULL default '[]'  -- string[]
  skin_types       jsonb NOT NULL default '[]'  -- string[] ["dry","oily","combination"]
  benefits         jsonb NOT NULL default '[]'  -- string[]

  -- Physical dimensions
  weight_grams     integer NOT NULL default 0   -- SHIPPING weight (with packaging)
  volume_ml        integer nullable             -- PRODUCT content volume (50ml serum)
  volume_unit      varchar(10) nullable         -- 'ml', 'g', 'oz'

  -- Media
  image_urls       jsonb NOT NULL default '[]'  -- string[], index[0] = main image

  -- Display options
  is_active        boolean default true NOT NULL
  show_stock_count boolean default false NOT NULL  -- show exact stock number in app

  sort_order       integer default 0 NOT NULL  -- for admin display ordering

  -- Audit
  deleted_at       timestamp nullable
  created_at       timestamp NOT NULL defaultNow
  updated_at       timestamp NOT NULL defaultNow

Indexes:
  barcode_idx: uniqueIndex on barcode
  sku_idx: uniqueIndex on sku
  brand_name_idx: on brand_name
  category_id_idx: on category_id
  deleted_at_idx: on deleted_at

Relations:
  category: one(categories)
  regionalConfigs: many(product_regional_configs)
  inventoryBatches: many(inventory_batches)
  wishlists: many(wishlists)
  waitlists: many(waitlists)
```

### TABLE: product_regional_configs

```
Purpose: Per-product per-region pricing and availability
Pattern: One row per product per region (max 2 rows per product: UZB + KOR)
Wholesale: min_wholesale_qty threshold — if cart qty >= this, apply wholesale_price
Currency: Always KRW for this project

Fields:
  id                uuid PK defaultRandom
  product_id        uuid NOT NULL FK→products.id CASCADE DELETE
  region_code       varchar(5) NOT NULL       -- 'UZB' or 'KOR'
  retail_price      bigint NOT NULL           -- KRW, e.g. 18500
  wholesale_price   bigint NOT NULL           -- KRW, e.g. 14000
  currency          varchar(3) NOT NULL default 'KRW'
  min_wholesale_qty integer NOT NULL default 5  -- cart qty >= this → wholesale price
  min_order_qty     integer NOT NULL default 1  -- minimum qty per cart item
  is_available      boolean default true NOT NULL
  created_at        timestamp NOT NULL defaultNow
  updated_at        timestamp NOT NULL defaultNow

Constraints:
  UNIQUE: (product_id, region_code)
  CHECK: region_code IN ('UZB', 'KOR')
  CHECK: currency IN ('KRW')
  CHECK: retail_price > 0
  CHECK: wholesale_price > 0
  CHECK: wholesale_price <= retail_price
  CHECK: min_wholesale_qty >= 1
  CHECK: min_order_qty >= 1

Indexes:
  product_region_idx: uniqueIndex on (product_id, region_code)
  product_id_idx: on product_id

Business Rule:
  Server calculates price: IF cart_item.qty >= min_wholesale_qty
    THEN use wholesale_price ELSE use retail_price
  Client NEVER calculates price — always trust server
```

---

## ════════════════════════════════════════════════

## FILE: inventory.ts

## Tables: inventory_batches, stock_movements,

## stock_reservations, batch_adjustments

## ════════════════════════════════════════════════

### TABLE: inventory_batches

```
Purpose: Batch-level inventory tracking per product
Creation: Admin manually creates when receiving goods from supplier
FIFO: Stock deducted from oldest batch first (by received_at)
Stock level: SUM of current_qty across all active batches per product

Fields:
  id             uuid PK defaultRandom
  product_id     uuid NOT NULL FK→products.id RESTRICT
  batch_ref      varchar(100) nullable     -- supplier batch/lot number
  initial_qty    integer NOT NULL          -- quantity when received
  current_qty    integer NOT NULL          -- remaining (decremented on deduction)
  cost_price     bigint NOT NULL           -- cost per unit in KRW (paid to supplier)
  cost_currency  varchar(3) NOT NULL default 'KRW'
  expiry_date    date nullable             -- product expiry
  received_at    timestamp NOT NULL defaultNow
  notes          text nullable
  created_at     timestamp NOT NULL defaultNow
  updated_at     timestamp NOT NULL defaultNow

Constraints:
  CHECK: initial_qty > 0
  CHECK: current_qty >= 0

Indexes:
  product_id_idx: on product_id
  received_at_idx: on received_at    -- FIFO ordering
  expiry_date_idx: on expiry_date
  current_qty_idx: on current_qty    -- find batches with stock
```

### TABLE: stock_movements

```
Purpose: APPEND-ONLY audit log of all stock changes
Pattern: Every inventory change creates a movement record
FIFO: System auto-selects oldest batch (received_at ASC, current_qty > 0)
NOTE: orderId has NO FK constraint (circular dep with orders) — enforced at app layer

Fields:
  id              uuid PK defaultRandom
  batch_id        uuid NOT NULL FK→inventory_batches.id
  product_id      uuid NOT NULL FK→products.id
  order_id        uuid nullable             -- NO FK — circular dep, app layer enforced
  movement_type   stockMovementTypeEnum NOT NULL
  quantity_delta  integer NOT NULL          -- positive=in, negative=out
  qty_before      integer NOT NULL          -- batch qty before movement
  qty_after       integer NOT NULL          -- batch qty after movement
  performed_by    uuid nullable FK→admin_users.id SET NULL
  note            text nullable
  created_at      timestamp NOT NULL defaultNow

Constraints:
  CHECK: qty_after >= 0
  CHECK: qty_after = qty_before + quantity_delta

Indexes:
  product_id_idx: on product_id
  batch_id_idx: on batch_id
  order_id_idx: on order_id
  movement_type_idx: on movement_type
  created_at_idx: on created_at
```

### TABLE: stock_reservations

```
Purpose: Reserve stock when order is created (checkout submit)
Timer: Released when payment_deadline passes (auto-cancel)
       Converted to DEDUCTED when payment confirmed + packed
NOTE: order_id, customer_id, order_item_id have NO FK — circular dep

Fields:
  id             uuid PK defaultRandom
  order_id       uuid NOT NULL        -- NO FK, app layer
  customer_id    uuid nullable        -- NO FK, app layer
  order_item_id  uuid NOT NULL        -- NO FK, app layer
  batch_id       uuid NOT NULL FK→inventory_batches.id
  product_id     uuid NOT NULL FK→products.id
  quantity       integer NOT NULL
  status         stockReservationStatusEnum default 'ACTIVE' NOT NULL
  expires_at     timestamp NOT NULL   -- = order.payment_deadline
  created_at     timestamp NOT NULL defaultNow
  updated_at     timestamp NOT NULL defaultNow

Constraints:
  CHECK: quantity > 0

Indexes:
  order_id_idx: on order_id
  order_item_id_idx: on order_item_id
  batch_id_idx: on batch_id
  product_id_idx: on product_id
  status_idx: on status
  expires_at_idx: on expires_at      -- for cron cleanup
```

### TABLE: batch_adjustments

```
Purpose: APPEND-ONLY audit log of batch field changes by admin
Pattern: When admin corrects qty, expiry, cost → record old/new values

Fields:
  id             uuid PK defaultRandom
  batch_id       uuid NOT NULL FK→inventory_batches.id CASCADE DELETE
  admin_id       uuid nullable FK→admin_users.id SET NULL
  field_changed  text NOT NULL    -- 'current_qty', 'expiry_date', 'cost_price'
  old_value      text NOT NULL
  new_value      text NOT NULL
  reason         text nullable
  created_at     timestamp NOT NULL defaultNow

Indexes:
  batch_id_idx: on batch_id
  admin_id_idx: on admin_id
```

---

## ════════════════════════════════════════════════

## FILE: carts.ts

## Tables: carts, cart_items

## ════════════════════════════════════════════════

### TABLE: carts

```
Purpose: Persistent shopping cart (1 per customer)
Region: Inherited from customer, used for price calculation
Pattern: Cart is created on first add-to-cart, never deleted

Fields:
  id           uuid PK defaultRandom
  customer_id  uuid UNIQUE NOT NULL FK→customers.id CASCADE DELETE
  region_code  text NOT NULL default 'UZB'   -- from customer.phone_region
  created_at   timestamp NOT NULL defaultNow
  updated_at   timestamp NOT NULL defaultNow

Indexes:
  customer_id_idx: uniqueIndex on customer_id

Relations:
  customer: one(customers)
  items: many(cart_items)
```

### TABLE: cart_items

```
Purpose: Items in a customer's cart
Price: Server recalculates on each request — price_snapshot is advisory only
Wholesale: Auto-applied when qty >= product_regional_configs.min_wholesale_qty

Fields:
  id              uuid PK defaultRandom
  cart_id         uuid NOT NULL FK→carts.id CASCADE DELETE
  product_id      uuid NOT NULL FK→products.id CASCADE DELETE
  quantity        integer NOT NULL
  price_snapshot  bigint NOT NULL default 0
                  -- last calculated price (retail or wholesale) in KRW
                  -- recalculated server-side on each cart view
  created_at      timestamp NOT NULL defaultNow
  updated_at      timestamp NOT NULL defaultNow

Constraints:
  UNIQUE: (cart_id, product_id)
  CHECK: quantity > 0

Indexes:
  cart_product_idx: uniqueIndex on (cart_id, product_id)
  cart_id_idx: on cart_id
  product_id_idx: on product_id
```

---

## ════════════════════════════════════════════════

## FILE: boxes.ts

## Tables: boxes, kor_shipping_tiers

## ════════════════════════════════════════════════

### TABLE: boxes

```
Purpose: Admin-configurable cargo boxes for UZB international shipping
Cargo formula: (products_weight_kg + box.weight_kg) × settings.uzb_cargo_usd_per_kg
               → converted to KRW via exchange_rate_snapshots.usd_to_krw

Fields:
  id             uuid PK defaultRandom
  name           varchar(50) NOT NULL    -- "S", "M", "L", "XL"
  max_weight_kg  decimal(8,3) NOT NULL   -- max total weight this box supports
  box_weight_kg  decimal(8,3) NOT NULL   -- box's own weight (adds to cargo)
  price_usd      decimal(10,2) NOT NULL  -- box cost in USD
  sort_order     integer default 0 NOT NULL
  is_active      boolean default true NOT NULL
  created_at     timestamp NOT NULL defaultNow
  updated_at     timestamp NOT NULL defaultNow

Constraints:
  CHECK: max_weight_kg > 0
  CHECK: box_weight_kg > 0
  CHECK: price_usd >= 0
```

### TABLE: kor_shipping_tiers

```
Purpose: Korea domestic shipping fee tiers (based on order amount)
Pattern: max_order_krw = null means "unlimited" (catches all above last tier)
Example: ₩0-30k = ₩3,000, ₩30k-50k = ₩2,500, ₩50k+ = FREE

Fields:
  id              uuid PK defaultRandom
  label           varchar(100) nullable   -- "₩50,000 미만", "무료배송"
  max_order_krw   bigint nullable         -- null = unlimited tier (free shipping)
  cargo_fee_krw   bigint NOT NULL         -- 0 = free shipping
  sort_order      integer default 0 NOT NULL
  is_active       boolean default true NOT NULL
  created_at      timestamp NOT NULL defaultNow
  updated_at      timestamp NOT NULL defaultNow

Constraints:
  CHECK: cargo_fee_krw >= 0
```

---

## ════════════════════════════════════════════════

## FILE: orders.ts

## Tables: orders, order_items, order_status_history, order_expenses

## ════════════════════════════════════════════════

### TABLE: orders

```
Purpose: Core order record — created when customer submits checkout
Number: MIRA-{YY}{MM}{DD}-{4_digit_seq} e.g. MIRA-260529-0001 (per-day sequence)
Region: profile_region from customer, delivery_region per this order (can differ)
Auto-cancel: payment_deadline — if receipt not uploaded by deadline → CANCELED
Timer restart: When admin rejects payment → payment_deadline updated to NOW + timeout

Fields:
  id                    uuid PK defaultRandom
  order_number          varchar(20) UNIQUE NOT NULL  -- MIRA-260529-0001
  customer_id           uuid NOT NULL FK→customers.id RESTRICT

  -- Region
  profile_region        varchar(5) NOT NULL  -- customer's permanent region
  delivery_region       varchar(5) NOT NULL  -- this order's delivery region (can differ)

  -- Status
  status                orderStatusEnum default 'PENDING_PAYMENT' NOT NULL
  order_source          orderSourceEnum default 'STOREFRONT' NOT NULL

  -- Financials (all in KRW unless noted)
  subtotal              bigint NOT NULL default 0   -- sum of item prices
  discount_amount       bigint NOT NULL default 0   -- coupon discount
  cargo_fee             bigint NOT NULL default 0   -- charged to customer
  total_amount          bigint NOT NULL default 0   -- subtotal - discount + cargo
  currency              varchar(3) NOT NULL default 'KRW'
  total_weight_grams    integer NOT NULL default 0  -- products + box weight

  -- Box (UZB only)
  box_id                uuid nullable FK→boxes.id SET NULL
  box_weight_snapshot   decimal(8,3) nullable       -- box weight at checkout time
  box_price_snapshot    bigint nullable              -- box price KRW at checkout time

  -- Coupon
  coupon_id             uuid nullable               -- NO FK, avoid circular
  coupon_code           varchar(50) nullable

  -- Rate snapshot (locked at checkout time)
  rate_snapshot_id      uuid nullable FK→exchange_rate_snapshots.id SET NULL

  -- Payment
  payment_method        paymentMethodEnum nullable
  payment_amount        bigint nullable             -- actual amount paid
  payment_reference     text nullable               -- bank transfer ref / e9pay txn
  payment_receipt_url   text nullable               -- latest receipt (Cloudinary)
  payment_submitted_at  timestamp nullable
  payment_deadline      timestamp nullable          -- auto-cancel timer
  payment_verified_by   uuid nullable FK→admin_users.id SET NULL
  payment_verified_at   timestamp nullable
  payment_rejected_at   timestamp nullable
  payment_rejected_reason text nullable             -- admin feedback shown to user
  payment_confirmed_by  uuid nullable FK→admin_users.id SET NULL
  payment_confirmed_at  timestamp nullable

  -- Fulfillment
  packed_by             uuid nullable FK→admin_users.id SET NULL
  packed_at             timestamp nullable
  tracking_number       varchar(100) nullable
  shipped_at            timestamp nullable
  delivered_at          timestamp nullable

  -- Delivery address snapshot (captured at checkout — immutable)
  delivery_full_name    text nullable
  delivery_phone        text nullable
  delivery_address_line1 text nullable              -- uzb street / kor road address
  delivery_address_line2 text nullable              -- uzb detail / kor detail
  delivery_city         text nullable               -- uzb city / kor city
  delivery_postal_code  text nullable               -- kor postal code

  -- Delivery fee
  delivery_fee_charged  bigint NOT NULL default 0   -- fee charged to customer
  delivery_fee_actual   bigint nullable             -- actual cost (may differ)
  delivery_covered_by   deliveryCoveredByEnum nullable  -- CUSTOMER or BUSINESS

  -- Customer note
  customer_note         text nullable               -- delivery instructions from customer

  -- Refund (REFUNDED status)
  refund_amount         bigint nullable             -- KRW amount refunded
  refunded_at           timestamp nullable
  refunded_by           uuid nullable FK→admin_users.id SET NULL
  refund_note           text nullable

  -- Payment currency (UZB bank = UZS, others = KRW)
  payment_currency      varchar(3) nullable         -- 'KRW' | 'UZS'
  payment_amount_uzs    bigint nullable             -- UZS amount for UZB bank payments
                                                   -- payment_amount stays in KRW for accounting

  -- Manual order fields
  admin_note            text nullable
  created_by            uuid nullable FK→admin_users.id SET NULL  -- MANUAL orders only

  created_at            timestamp NOT NULL defaultNow
  updated_at            timestamp NOT NULL defaultNow

Constraints:
  CHECK: profile_region IN ('UZB', 'KOR')
  CHECK: delivery_region IN ('UZB', 'KOR')
  CHECK: total_amount >= 0
  CHECK: subtotal >= 0
  CHECK: discount_amount >= 0

Indexes:
  order_number_idx: uniqueIndex on order_number
  customer_id_idx: on customer_id
  status_idx: on status
  payment_deadline_idx: on payment_deadline   -- for auto-cancel cron
  created_at_idx: on created_at

Business Rules:
  - order_number auto-generated: MIRA-{YY}{MM}{DD}-{seq} (seq resets daily)
  - payment_deadline = created_at + settings.payment_timeout_minutes
  - On payment rejection: payment_deadline = now + settings.payment_timeout_minutes
  - stock_reservations.expires_at = order.payment_deadline
  - Cron: every minute checks status IN ('PENDING_PAYMENT','PAYMENT_REJECTED')
           AND payment_deadline < NOW() → CANCELED + release stock + notify

Relations:
  customer: one(customers)
  box: one(boxes)
  rateSnapshot: one(exchange_rate_snapshots)
  items: many(order_items)
  statusHistory: many(order_status_history)
  expenses: many(order_expenses)
```

### TABLE: order_items

```
Purpose: Line items within an order
Cost: cost_at_sale_krw from inventory batch — used for COGS in accounting
Batch: batch_id assigned by FIFO when order transitions to PACKING

Fields:
  id                    uuid PK defaultRandom
  order_id              uuid NOT NULL FK→orders.id CASCADE DELETE
  product_id            uuid NOT NULL FK→products.id RESTRICT
  batch_id              uuid nullable FK→inventory_batches.id SET NULL
                        -- assigned by FIFO on PACKING status
  quantity              integer NOT NULL

  -- Price snapshots (captured at order creation — immutable)
  unit_price_snapshot   bigint NOT NULL    -- retail or wholesale price at checkout
  negotiated_price_krw  bigint nullable    -- if admin overrides for MANUAL orders
  subtotal_snapshot     bigint NOT NULL    -- unit_price × quantity
  cargo_fee_snapshot    bigint NOT NULL default 0  -- cargo portion for this item
  currency_snapshot     varchar(3) NOT NULL default 'KRW'

  -- Cost (for accounting / COGS)
  cost_at_sale_krw      bigint nullable    -- batch.cost_price at time of sale

  -- Pricing rule: effective_unit_price = negotiated_price_krw ?? unit_price_snapshot
  --               Server always checks negotiated_price_krw first (MANUAL orders)

  -- Pick & pack
  is_scanned            boolean default false NOT NULL
  scanned_at            timestamp nullable
  scanned_by            uuid nullable FK→admin_users.id SET NULL

  created_at            timestamp NOT NULL defaultNow
  updated_at            timestamp NOT NULL defaultNow

Constraints:
  CHECK: quantity > 0
  CHECK: unit_price_snapshot > 0
  CHECK: subtotal_snapshot >= 0

Indexes:
  order_id_idx: on order_id
  product_id_idx: on product_id
  batch_id_idx: on batch_id
```

### TABLE: order_status_history

```
Purpose: APPEND-ONLY immutable audit trail of every status change
Query: ORDER BY created_at ASC to get timeline

Fields:
  id           uuid PK defaultRandom
  order_id     uuid NOT NULL FK→orders.id CASCADE DELETE
  from_status  varchar(25) nullable       -- null for initial status
  to_status    varchar(25) NOT NULL
  changed_by   uuid nullable FK→admin_users.id SET NULL
               -- null = system/auto change (timeout, etc.)
  note         text nullable              -- admin note / rejection reason
  created_at   timestamp NOT NULL defaultNow

Indexes:
  order_id_idx: on order_id
  created_at_idx: on created_at
```

### TABLE: order_expenses

```
Purpose: Internal business cost tracking per order (not visible to customer)
Accounting: Used to calculate actual profit per order
Auto: CARGO_COST (on SHIPPED), COUPON_DISCOUNT (on PAYMENT_CONFIRMED if coupon used),
      DELIVERY_ABSORBED (if delivery_covered_by = BUSINESS)
Manual: Admin adds CUSTOMS, PACKAGING, OTHER

Accounting formula per order:
  Revenue    = order.total_amount (what customer paid)
  COGS       = SUM(order_items.cost_at_sale_krw × quantity)
  Expenses   = SUM(order_expenses.amount_krw)
  Net profit = Revenue - COGS - Expenses

Fields:
  id           uuid PK defaultRandom
  order_id     uuid NOT NULL FK→orders.id CASCADE DELETE
  type         orderExpenseTypeEnum NOT NULL
  amount_krw   bigint NOT NULL
  note         text nullable
  created_by   uuid nullable FK→admin_users.id SET NULL  -- null = auto
  is_auto      boolean default false NOT NULL
  created_at   timestamp NOT NULL defaultNow

Constraints:
  CHECK: amount_krw >= 0

Indexes:
  order_id_idx: on order_id
  type_idx: on type
  created_at_idx: on created_at
```

---

## ════════════════════════════════════════════════

## FILE: coupons.ts

## Tables: coupons, coupon_redemptions, user_coupons

## ════════════════════════════════════════════════

### TABLE: coupons

```
Purpose: Discount coupons with comprehensive targeting options
Stacking: Manual coupons: max 1 per order
          Auto-apply coupons (is_stackable=true): can combine
Application: auto_apply=true → server applies at checkout without code
             auto_apply=false → user enters code manually

Fields:
  id                      uuid PK defaultRandom
  code                    varchar(50) UNIQUE NOT NULL   -- "MIRA2026", "WELCOME10"
  name                    varchar(100) NOT NULL
  description             text nullable
  type                    couponTypeEnum NOT NULL default 'PERCENTAGE'
  value                   bigint NOT NULL               -- % or KRW amount
  value_krw               bigint nullable               -- for FIXED type, KRW amount
  max_discount_cap        bigint nullable               -- max cap for PERCENTAGE
  max_discount_krw        bigint nullable
  scope                   couponScopeEnum NOT NULL default 'ENTIRE_ORDER'
  applicable_resource_ids uuid[] nullable               -- product/category UUIDs
  applicable_brands       varchar(100)[] nullable       -- brand names
  min_order_amount        bigint NOT NULL default 0
  min_order_krw           bigint nullable
  min_order_qty           integer NOT NULL default 1
  region_code             varchar(3) nullable           -- null = all regions
  first_order_only        boolean default false NOT NULL
  one_per_customer        boolean default false NOT NULL
  exclude_wholesale       boolean default false NOT NULL
  target_customer_ids     uuid[] nullable               -- null = all customers
  starts_at               timestamp nullable
  expires_at              timestamp nullable
  max_uses_total          integer nullable
  max_uses_per_customer   integer NOT NULL default 1
  usage_count             integer NOT NULL default 0
  auto_apply              boolean default false NOT NULL
  is_stackable            boolean default false NOT NULL
  is_promotional          boolean default false NOT NULL
  promo_display_text      text nullable
  status                  couponStatusEnum NOT NULL default 'DRAFT'
  created_by              uuid nullable FK→admin_users.id SET NULL
  created_at              timestamp NOT NULL defaultNow
  updated_at              timestamp NOT NULL defaultNow
  deleted_at              timestamp nullable

Constraints:
  CHECK: value > 0

Indexes:
  code_idx: uniqueIndex on code
  status_idx: on status
  auto_apply_idx: on auto_apply       -- fast lookup for auto-apply
  expires_at_idx: on expires_at
```

### TABLE: coupon_redemptions

```
Purpose: APPEND-ONLY record of every coupon use
NOTE: order_id has NO FK (circular dep) — enforced at app layer

Fields:
  id               uuid PK defaultRandom
  coupon_id        uuid NOT NULL FK→coupons.id
  customer_id      uuid NOT NULL FK→customers.id
  order_id         uuid NOT NULL              -- NO FK, app layer
  discount_amount  bigint NOT NULL            -- actual KRW discount applied
  created_at       timestamp NOT NULL defaultNow

Indexes:
  coupon_id_idx: on coupon_id
  customer_id_idx: on customer_id
  order_id_idx: on order_id
```

### TABLE: user_coupons

```
Purpose: Coupons assigned to specific customers (targeted coupons)

Fields:
  id           uuid PK defaultRandom
  customer_id  uuid NOT NULL FK→customers.id CASCADE DELETE
  coupon_id    uuid NOT NULL FK→coupons.id CASCADE DELETE
  is_used      boolean default false NOT NULL
  used_at      timestamp nullable
  order_id     uuid nullable               -- which order used it
  assigned_at  timestamp NOT NULL defaultNow

Constraints:
  UNIQUE: (customer_id, coupon_id)

Indexes:
  customer_id_idx: on customer_id
  coupon_id_idx: on coupon_id
  is_used_idx: on is_used
```

---

## ════════════════════════════════════════════════

## FILE: settings.ts

## Tables: settings (singleton), exchange_rate_snapshots

## ════════════════════════════════════════════════

### TABLE: settings

```
Purpose: Global app settings — SINGLETON (always exactly 1 row)
Pattern: Never INSERT new rows after init — only UPDATE the single row
Seed: Created with default values in database seed
Payment toggles: Korean bank, UZB bank, E9pay — each independently enabled/disabled

Fields:
  id                          uuid PK defaultRandom

  -- Order & payment timeouts
  payment_timeout_minutes     integer NOT NULL default 30
                              -- auto-cancel timer after checkout
  low_stock_threshold         integer NOT NULL default 10

  -- UZB cargo settings
  uzb_cargo_usd_per_kg        integer NOT NULL default 10
                              -- $10/kg — admin configurable

  -- Order limits
  min_order_uzb_krw           bigint NOT NULL default 0
  min_order_kor_krw           bigint NOT NULL default 0

  -- Korean Bank (always enabled in app, admin updates details)
  kor_bank_enabled            boolean default false NOT NULL
  kor_bank_name               text nullable     -- "신한은행"
  kor_bank_holder             text nullable     -- "홍길동"
  kor_bank_number             text nullable     -- "110-123-456789"

  -- E9pay
  kor_e9pay_enabled           boolean default false NOT NULL
  kor_e9pay_name              text nullable
  kor_e9pay_account           text nullable

  -- UZB Bank
  uzb_bank_enabled            boolean default false NOT NULL
  uzb_bank_name               text nullable     -- "Kapitalbank"
  uzb_bank_holder             text nullable
  uzb_bank_number             text nullable

  -- Social links
  telegram_url                varchar(200) nullable
  instagram_url               varchar(200) nullable
  website_url                 varchar(200) nullable

  created_at                  timestamp NOT NULL defaultNow
  updated_at                  timestamp NOT NULL defaultNow
```

### TABLE: exchange_rate_snapshots

```
Purpose: Daily exchange rate records — locked onto orders at checkout
Source: Both rates fetched from exchangerate-api.com (auto cron daily)
        Admin can create MANUAL snapshot to override
Formula: cargo_rate_krw_per_kg = uzb_cargo_usd_per_kg × usd_to_krw
Orders: Lock rate_snapshot_id at checkout — immutable for that order

Fields:
  id                     uuid PK defaultRandom
  krw_to_uzs             integer NOT NULL      -- 1 KRW = X UZS (e.g. 10)
  usd_to_krw             integer NOT NULL      -- 1 USD = X KRW (e.g. 1350)
  cargo_rate_krw_per_kg  integer NOT NULL
                         -- calculated: settings.uzb_cargo_usd_per_kg × usd_to_krw
  source                 exchangeRateSourceEnum NOT NULL default 'API'
  note                   text nullable
  created_by             uuid nullable FK→admin_users.id SET NULL
                         -- null = auto cron fetch
  created_at             timestamp NOT NULL defaultNow

Indexes:
  created_at_idx: on created_at   -- get latest: ORDER BY created_at DESC LIMIT 1
  source_idx: on source
```

---

## ════════════════════════════════════════════════

## FILE: expenses.ts

## Tables: expense_categories, expenses

## ════════════════════════════════════════════════

### TABLE: expense_categories

```
Purpose: Categories for general business expenses
Seeded: Pre-made system categories (is_system=true, cannot delete)
Custom: Admin can add custom categories (is_system=false)

Seed data (is_system=true):
  Yuk tashish, Qadoq, Bojxona, Reklama, Soliq, Boshqa

Fields:
  id          uuid PK defaultRandom
  name        varchar(100) UNIQUE NOT NULL
  slug        varchar(100) UNIQUE NOT NULL      -- url-friendly
  icon        varchar(50) nullable              -- lucide icon name
  is_system   boolean default false NOT NULL    -- true = cannot delete
  is_active   boolean default true NOT NULL
  sort_order  integer default 0 NOT NULL
  created_at  timestamp NOT NULL defaultNow
```

### TABLE: expenses

```
Purpose: General business expenses (NOT per-order — see order_expenses for that)
Examples: Monthly ads spend, office supplies, tools, subscriptions

Fields:
  id              uuid PK defaultRandom
  category_id     uuid NOT NULL FK→expense_categories.id RESTRICT
  amount_krw      bigint NOT NULL
  description     text NOT NULL
  expense_date    date NOT NULL
  receipt_url     text nullable               -- Cloudinary receipt image
  created_by      uuid nullable FK→admin_users.id SET NULL
  created_at      timestamp NOT NULL defaultNow

Constraints:
  CHECK: amount_krw > 0

Indexes:
  expense_date_idx: on expense_date
  category_id_idx: on category_id
  created_by_idx: on created_by
```

---

## ════════════════════════════════════════════════

## FILE: telegram.ts

## Tables: telegram_channels, telegram_posts, telegram_post_channels

## ════════════════════════════════════════════════

### TABLE: telegram_channels

```
Purpose: Telegram channels the bot can post to (marketing broadcasts)
Multi-channel: Admin selects which channels when creating a post
Note: Bot must be admin of each channel

Fields:
  id               uuid PK defaultRandom
  chat_id          varchar(50) UNIQUE NOT NULL  -- Telegram chat ID (e.g. -1001234567890)
  channel_name     varchar(200) NOT NULL
  channel_username varchar(100) nullable        -- @mira_cosmetics_uz
  region_code      varchar(5) nullable          -- UZB/KOR/null (all)
  is_active        boolean default true NOT NULL
  added_by         uuid nullable FK→admin_users.id SET NULL
  created_at       timestamp NOT NULL defaultNow
  updated_at       timestamp NOT NULL defaultNow

Indexes:
  chat_id_idx: uniqueIndex on chat_id
```

### TABLE: telegram_posts

```
Purpose: Marketing posts sent or scheduled to Telegram channels
Scheduling: scheduled_at = null → send immediately, else send at scheduled time
Product link: Optional, links post to a specific product

Fields:
  id             uuid PK defaultRandom
  product_id     uuid nullable FK→products.id SET NULL
  title          varchar(300) NOT NULL
  content        text NOT NULL
  image_url      text nullable              -- Cloudinary image for post
  status         telegramPostStatusEnum NOT NULL default 'DRAFT'
  scheduled_at   timestamp nullable         -- null = immediate send
  sent_at        timestamp nullable
  created_by     uuid nullable FK→admin_users.id SET NULL
  created_at     timestamp NOT NULL defaultNow
  updated_at     timestamp NOT NULL defaultNow

Indexes:
  status_idx: on status
  scheduled_at_idx: on scheduled_at    -- for scheduler cron
  product_id_idx: on product_id
```

### TABLE: telegram_post_channels

```
Purpose: Which channels each post was (or will be) sent to
Status: Tracks send result per channel

Fields:
  id          uuid PK defaultRandom
  post_id     uuid NOT NULL FK→telegram_posts.id CASCADE DELETE
  channel_id  uuid NOT NULL FK→telegram_channels.id CASCADE DELETE
  status      varchar(20) NOT NULL default 'PENDING'
              -- PENDING / SENT / FAILED
  sent_at     timestamp nullable
  telegram_message_id varchar(50) nullable  -- Telegram message ID for edit/delete
  error_msg   text nullable
  created_at  timestamp NOT NULL defaultNow

Constraints:
  UNIQUE: (post_id, channel_id)
  CHECK: status IN ('PENDING', 'SENT', 'FAILED')

Indexes:
  post_id_idx: on post_id
  channel_id_idx: on channel_id
```

---

## ════════════════════════════════════════════════

## FILE: social.ts

## Tables: wishlists, waitlists

## ════════════════════════════════════════════════

### TABLE: wishlists

```
Purpose: Customer saved/liked products
Notify: When product price drops → notify customer (via notifications_log)

Fields:
  id          uuid PK defaultRandom
  customer_id uuid NOT NULL FK→customers.id CASCADE DELETE
  product_id  uuid NOT NULL FK→products.id CASCADE DELETE
  created_at  timestamp NOT NULL defaultNow

Constraints:
  UNIQUE: (customer_id, product_id)

Indexes:
  customer_product_idx: uniqueIndex on (customer_id, product_id)
  product_id_idx: on product_id    -- find all customers who liked a product
```

### TABLE: waitlists

```
Purpose: Out-of-stock notifications — customer wants to be notified when back
Trigger: When inventory batch added + current_qty > 0 → notify all waitlisted
State: notified=true after notification sent, but row kept for history

Fields:
  id          uuid PK defaultRandom
  customer_id uuid NOT NULL FK→customers.id CASCADE DELETE
  product_id  uuid NOT NULL FK→products.id CASCADE DELETE
  notified    boolean default false NOT NULL
  notified_at timestamp nullable
  created_at  timestamp NOT NULL defaultNow

Constraints:
  UNIQUE: (customer_id, product_id)

Indexes:
  customer_product_idx: uniqueIndex on (customer_id, product_id)
  product_id_notified_idx: on (product_id, notified)  -- find un-notified
```

---

## ════════════════════════════════════════════════

## FILE: audit.ts

## Tables: pick_pack_audit

## ════════════════════════════════════════════════

### TABLE: pick_pack_audit

```
Purpose: APPEND-ONLY record of USB barcode scanning during order packing
Method: Admin scans barcode → system verifies against order items
Batch: System auto-selects FIFO batch (admin can override)
Result: Each scan either OK (correct product) or ERROR (wrong product)

Fields:
  id               uuid PK defaultRandom
  order_id         uuid NOT NULL FK→orders.id CASCADE DELETE
  order_item_id    uuid NOT NULL FK→order_items.id CASCADE DELETE
  performed_by     uuid NOT NULL FK→admin_users.id
  action           pickPackActionEnum NOT NULL
  scan_input       varchar(100) nullable   -- what was scanned (barcode value)
  expected_barcode varchar(50) nullable    -- product.barcode
  result           pickPackResultEnum NOT NULL
  note             text nullable
  created_at       timestamp NOT NULL defaultNow

Indexes:
  order_id_idx: on order_id
  order_item_id_idx: on order_item_id
  performed_by_idx: on performed_by
  created_at_idx: on created_at
```

---

## ════════════════════════════════════════════════

## FILE: analytics.ts

## Tables: daily_sales_summary

## ════════════════════════════════════════════════

### TABLE: daily_sales_summary

```
Purpose: Pre-aggregated daily sales data for fast dashboard analytics
Update: Real-time when order.status → DELIVERED
        Also on REFUNDED (subtract from summary)
Cron: Daily reconciliation at midnight to catch any missed updates
COGS: From order_items.cost_at_sale_krw × quantity

Fields:
  date                  date NOT NULL
  region_code           text NOT NULL      -- 'UZB' or 'KOR'
  product_id            uuid NOT NULL FK→products.id CASCADE DELETE
  units_sold            integer NOT NULL default 0
  revenue_krw           bigint NOT NULL default 0   -- total customer payments
  cogs_krw              bigint NOT NULL default 0   -- total product cost
  cargo_krw             bigint NOT NULL default 0   -- total cargo expenses
  coupon_discount_krw   bigint NOT NULL default 0   -- total coupon discounts
  order_count           integer NOT NULL default 0
  refund_count          integer NOT NULL default 0
  refunded_revenue_krw  bigint  NOT NULL default 0  -- subtract on REFUNDED

Primary Key: (date, region_code, product_id)

Indexes:
  date_idx: on date
  region_idx: on region_code
  date_region_idx: on (date, region_code)  -- dashboard queries

Business Rule:
  On DELIVERED: UPDATE or INSERT INTO daily_sales_summary
    UPSERT with ON CONFLICT DO UPDATE SET
      units_sold += new_units
      revenue_krw += new_revenue
      cogs_krw += new_cogs
      etc.
  On REFUNDED: Subtract from summary
```

---

## ════════════════════════════════════════════════

## FILE: notifications.ts

## Tables: notifications_log

## ════════════════════════════════════════════════

### TABLE: notifications_log

```
Purpose: Record of all sent notifications (push + Telegram)
Debugging: Find failed notifications, resend if needed
Read status: Track when customer read the notification

Fields:
  id           uuid PK defaultRandom
  customer_id  uuid nullable FK→customers.id CASCADE DELETE
               -- null for system-wide broadcasts
  type         notificationTypeEnum NOT NULL
  channel      notificationChannelEnum NOT NULL
  title        varchar(300) NOT NULL
  body         text NOT NULL
  data         jsonb nullable   -- { orderId?, productId?, type }
               -- used for deep linking in mobile app
  order_id     uuid nullable    -- indexed shortcut for order notifications (NO FK)
  status       notificationStatusEnum NOT NULL default 'PENDING'
  error_msg    text nullable    -- if FAILED, store error
  sent_at      timestamp nullable
  read_at      timestamp nullable    -- when customer opened it
  created_at   timestamp NOT NULL defaultNow

Indexes:
  customer_id_idx: on customer_id
  type_idx: on type
  status_idx: on status
  created_at_idx: on created_at
  unread_idx: on (customer_id, read_at)  -- unread count query
  order_id_idx: on order_id              -- find notifications for specific order
```

---

## ════════════════════════════════════════════════

## FILE: index.ts

## ════════════════════════════════════════════════

```typescript
// Export everything from all schema files
export * from './enums'
export * from './admin-users'
export * from './auth'
export * from './customers'
export * from './categories'
export * from './products'
export * from './inventory'
export * from './carts'
export * from './boxes'
export * from './orders'
export * from './coupons'
export * from './settings'
export * from './expenses'
export * from './telegram'
export * from './social'
export * from './audit'
export * from './analytics'
export * from './notifications'
```

---

## ════════════════════════════════════════════════

## FILE: sequences.ts (ADD TO index.ts exports)

## Tables: daily_order_sequences

## ════════════════════════════════════════════════

### TABLE: daily_order_sequences

```
Purpose: Atomic daily sequence counter for order numbers
Pattern: MIRA-{YY}{MM}{DD}-{4_digit_seq_zero_padded}
Example: MIRA-260529-0001, MIRA-260529-0042

UPSERT on order creation:
  INSERT INTO daily_order_sequences (date, last_seq)
  VALUES (today, 1)
  ON CONFLICT (date) DO UPDATE SET last_seq = last_seq + 1
  RETURNING last_seq → use this as order seq

Fields:
  date      date UNIQUE NOT NULL
  last_seq  integer NOT NULL default 1

Indexes:
  date_idx: uniqueIndex on date
```

---

## GENERATION INSTRUCTIONS FOR AI

You are a senior TypeScript engineer. Generate all 19 Drizzle ORM schema files.

### Rules:

1. Use `drizzle-orm/pg-core` imports
2. Use `pgEnum` for all enums (defined in enums.ts, imported where needed)
3. All monetary values: `bigint({ mode: 'bigint' })`
4. All timestamps: `timestamp({ withTimezone: true })`
5. Define `relations()` in SAME file as table, after table definition
6. Export `type TableName = typeof table.$inferSelect`
7. Export `type NewTableName = typeof table.$inferInsert`
8. APPEND-ONLY tables: add comment `// APPEND-ONLY — no UPDATE or DELETE ever`
9. Self-referential FKs: use lazy reference `() => table`
10. Circular deps (orders ↔ stock_reservations, coupon_redemptions, stock_movements):
    NO FK constraint on those columns — comment: `// NO FK — circular dep, enforced at app layer`
11. Follow NuraSkin schema patterns for field naming (camelCase in TS, snake_case in DB)
12. Use `sql` tagged template for CHECK constraints
13. Add all indexes specified
14. All files must compile with: `npx tsc --noEmit --strict`

### Output:

One file at a time, starting with enums.ts
Each file: complete, compilable, no placeholders
