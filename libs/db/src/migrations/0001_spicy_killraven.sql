CREATE TYPE "public"."coupon_scope" AS ENUM('ENTIRE_ORDER', 'PRODUCTS', 'CATEGORIES', 'BRANDS');--> statement-breakpoint
CREATE TYPE "public"."coupon_status" AS ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."coupon_type" AS ENUM('PERCENTAGE', 'FIXED', 'FREE_SHIPPING');--> statement-breakpoint
CREATE TYPE "public"."delivery_covered_by" AS ENUM('CUSTOMER', 'BUSINESS');--> statement-breakpoint
CREATE TYPE "public"."exchange_rate_source" AS ENUM('API', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('PUSH', 'TELEGRAM', 'BOTH');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('SENT', 'FAILED', 'PENDING');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('ORDER_STATUS', 'PAYMENT_CONFIRMED', 'PAYMENT_REJECTED', 'SHIPPED', 'DELIVERED', 'STOCK_BACK', 'PRICE_DROP', 'PROMO', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."order_expense_type" AS ENUM('CARGO_COST', 'COUPON_DISCOUNT', 'DELIVERY_ABSORBED', 'CUSTOMS', 'PACKAGING', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."order_source" AS ENUM('STOREFRONT', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."pick_pack_action" AS ENUM('SCAN_SUCCESS', 'SCAN_MISMATCH', 'MANUAL_FALLBACK', 'ITEM_CONFIRMED', 'ORDER_PACKED');--> statement-breakpoint
CREATE TYPE "public"."pick_pack_result" AS ENUM('OK', 'ERROR');--> statement-breakpoint
CREATE TYPE "public"."revoke_reason" AS ENUM('LOGOUT', 'ROTATION', 'SECURITY', 'EXPIRED', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_type" AS ENUM('STOCK_IN', 'RESERVED', 'RESERVATION_RELEASED', 'DEDUCTED', 'ADJUSTED', 'RETURNED', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT');--> statement-breakpoint
CREATE TYPE "public"."stock_reservation_status" AS ENUM('ACTIVE', 'RELEASED', 'CONVERTED');--> statement-breakpoint
CREATE TYPE "public"."telegram_post_status" AS ENUM('DRAFT', 'SCHEDULED', 'SENT', 'FAILED');--> statement-breakpoint
CREATE TABLE "daily_order_sequences" (
	"date" date NOT NULL,
	"last_seq" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "daily_order_sequences_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"full_name" text DEFAULT '' NOT NULL,
	"role_id" uuid,
	"is_super_admin" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"last_login_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email"),
	CONSTRAINT "admin_users_super_admin_role_check" CHECK (NOT ("admin_users"."is_super_admin" = true AND "admin_users"."role_id" IS NOT NULL)),
	CONSTRAINT "admin_users_regular_admin_role_check" CHECK ("admin_users"."is_super_admin" = true OR "admin_users"."role_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"resource" varchar(50) NOT NULL,
	"action" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_permissions_action_check" CHECK ("role_permissions"."action" IN ('read', 'write', 'delete'))
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "auth_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" varchar(64) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"telegram_id" bigint,
	"otp" varchar(6),
	"attempts" smallint DEFAULT 0 NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" varchar(128) NOT NULL,
	"customer_id" uuid,
	"admin_user_id" uuid,
	"family_id" uuid NOT NULL,
	"device_info" text,
	"ip_address" varchar(45),
	"user_agent" text,
	"is_revoked" boolean DEFAULT false NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_reason" "revoke_reason",
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_unique" UNIQUE("token"),
	CONSTRAINT "refresh_tokens_user_check" CHECK (("refresh_tokens"."customer_id" IS NOT NULL)::int + ("refresh_tokens"."admin_user_id" IS NOT NULL)::int = 1)
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" varchar(20) NOT NULL,
	"phone_region" "region" NOT NULL,
	"telegram_id" bigint,
	"tg_username" varchar(100),
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100),
	"profile_image_url" varchar(500),
	"is_active" boolean DEFAULT true NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"expo_push_token" varchar(500),
	"referral_code" varchar(12),
	"referred_by_id" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_phone_unique" UNIQUE("phone"),
	CONSTRAINT "customers_telegram_id_unique" UNIQUE("telegram_id"),
	CONSTRAINT "customers_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "user_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"label" text DEFAULT 'Manzil' NOT NULL,
	"region_code" "region" NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"recipient_name" text NOT NULL,
	"phone" text NOT NULL,
	"uzb_region" text,
	"uzb_city" text,
	"uzb_district" text,
	"uzb_street" text,
	"kor_postal_code" text,
	"kor_road_address" text,
	"kor_detail" text,
	"kor_building" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_notification_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"order_status" boolean DEFAULT true NOT NULL,
	"payment_confirmed" boolean DEFAULT true NOT NULL,
	"payment_rejected" boolean DEFAULT true NOT NULL,
	"shipped" boolean DEFAULT true NOT NULL,
	"delivered" boolean DEFAULT true NOT NULL,
	"stock_back" boolean DEFAULT true NOT NULL,
	"price_drop" boolean DEFAULT true NOT NULL,
	"promotions" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_notification_settings_customer_id_unique" UNIQUE("customer_id")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"image_url" text,
	"parent_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "product_regional_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"region_code" varchar(5) NOT NULL,
	"retail_price" bigint NOT NULL,
	"wholesale_price" bigint NOT NULL,
	"currency" varchar(3) DEFAULT 'KRW' NOT NULL,
	"min_wholesale_qty" integer DEFAULT 5 NOT NULL,
	"min_order_qty" integer DEFAULT 1 NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_regional_configs_region_code_check" CHECK ("product_regional_configs"."region_code" IN ('UZB', 'KOR')),
	CONSTRAINT "product_regional_configs_currency_check" CHECK ("product_regional_configs"."currency" IN ('KRW')),
	CONSTRAINT "product_regional_configs_retail_price_check" CHECK ("product_regional_configs"."retail_price" > 0),
	CONSTRAINT "product_regional_configs_wholesale_price_check" CHECK ("product_regional_configs"."wholesale_price" > 0),
	CONSTRAINT "product_regional_configs_price_compare_check" CHECK ("product_regional_configs"."wholesale_price" <= "product_regional_configs"."retail_price"),
	CONSTRAINT "product_regional_configs_min_wholesale_qty_check" CHECK ("product_regional_configs"."min_wholesale_qty" >= 1),
	CONSTRAINT "product_regional_configs_min_order_qty_check" CHECK ("product_regional_configs"."min_order_qty" >= 1)
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"barcode" varchar(50) NOT NULL,
	"sku" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"brand_name" varchar(100) NOT NULL,
	"category_id" uuid NOT NULL,
	"description_uz" text,
	"how_to_use_uz" text,
	"ingredients" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"skin_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"benefits" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"weight_grams" integer DEFAULT 0 NOT NULL,
	"volume_ml" integer,
	"volume_unit" varchar(10),
	"image_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"show_stock_count" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_barcode_unique" UNIQUE("barcode"),
	CONSTRAINT "products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "batch_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"admin_id" uuid,
	"field_changed" text NOT NULL,
	"old_value" text NOT NULL,
	"new_value" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"batch_ref" varchar(100),
	"initial_qty" integer NOT NULL,
	"current_qty" integer NOT NULL,
	"cost_price" bigint NOT NULL,
	"cost_currency" varchar(3) DEFAULT 'KRW' NOT NULL,
	"expiry_date" date,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_batches_initial_qty_check" CHECK ("inventory_batches"."initial_qty" > 0),
	CONSTRAINT "inventory_batches_current_qty_check" CHECK ("inventory_batches"."current_qty" >= 0)
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"order_id" uuid,
	"movement_type" "stock_movement_type" NOT NULL,
	"quantity_delta" integer NOT NULL,
	"qty_before" integer NOT NULL,
	"qty_after" integer NOT NULL,
	"performed_by" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_movements_qty_after_check" CHECK ("stock_movements"."qty_after" >= 0),
	CONSTRAINT "stock_movements_qty_consistency_check" CHECK ("stock_movements"."qty_after" = "stock_movements"."qty_before" + "stock_movements"."quantity_delta")
);
--> statement-breakpoint
CREATE TABLE "stock_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"customer_id" uuid,
	"order_item_id" uuid NOT NULL,
	"batch_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"status" "stock_reservation_status" DEFAULT 'ACTIVE' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_reservations_quantity_check" CHECK ("stock_reservations"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cart_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"price_snapshot" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cart_items_quantity_check" CHECK ("cart_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "carts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"region_code" text DEFAULT 'UZB' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "carts_customer_id_unique" UNIQUE("customer_id")
);
--> statement-breakpoint
CREATE TABLE "boxes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"max_weight_kg" numeric(8, 3) NOT NULL,
	"box_weight_kg" numeric(8, 3) NOT NULL,
	"price_usd" numeric(10, 2) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "boxes_max_weight_check" CHECK ("boxes"."max_weight_kg" > 0),
	CONSTRAINT "boxes_box_weight_check" CHECK ("boxes"."box_weight_kg" > 0),
	CONSTRAINT "boxes_price_usd_check" CHECK ("boxes"."price_usd" >= 0)
);
--> statement-breakpoint
CREATE TABLE "kor_shipping_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" varchar(100),
	"max_order_krw" bigint,
	"cargo_fee_krw" bigint NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kor_shipping_tiers_cargo_fee_check" CHECK ("kor_shipping_tiers"."cargo_fee_krw" >= 0)
);
--> statement-breakpoint
CREATE TABLE "order_expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"type" "order_expense_type" NOT NULL,
	"amount_krw" bigint NOT NULL,
	"note" text,
	"created_by" uuid,
	"is_auto" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_expenses_amount_krw_check" CHECK ("order_expenses"."amount_krw" >= 0)
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"batch_id" uuid,
	"quantity" integer NOT NULL,
	"unit_price_snapshot" bigint NOT NULL,
	"negotiated_price_krw" bigint,
	"subtotal_snapshot" bigint NOT NULL,
	"cargo_fee_snapshot" bigint DEFAULT 0 NOT NULL,
	"currency_snapshot" varchar(3) DEFAULT 'KRW' NOT NULL,
	"cost_at_sale_krw" bigint,
	"is_scanned" boolean DEFAULT false NOT NULL,
	"scanned_at" timestamp with time zone,
	"scanned_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_items_quantity_check" CHECK ("order_items"."quantity" > 0),
	CONSTRAINT "order_items_unit_price_snapshot_check" CHECK ("order_items"."unit_price_snapshot" > 0),
	CONSTRAINT "order_items_subtotal_snapshot_check" CHECK ("order_items"."subtotal_snapshot" >= 0)
);
--> statement-breakpoint
CREATE TABLE "order_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"from_status" varchar(25),
	"to_status" varchar(25) NOT NULL,
	"changed_by" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" varchar(20) NOT NULL,
	"customer_id" uuid NOT NULL,
	"profile_region" varchar(5) NOT NULL,
	"delivery_region" varchar(5) NOT NULL,
	"status" "order_status" DEFAULT 'PENDING_PAYMENT' NOT NULL,
	"order_source" "order_source" DEFAULT 'STOREFRONT' NOT NULL,
	"subtotal" bigint DEFAULT 0 NOT NULL,
	"discount_amount" bigint DEFAULT 0 NOT NULL,
	"cargo_fee" bigint DEFAULT 0 NOT NULL,
	"total_amount" bigint DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'KRW' NOT NULL,
	"total_weight_grams" integer DEFAULT 0 NOT NULL,
	"box_id" uuid,
	"box_weight_snapshot" numeric(8, 3),
	"box_price_snapshot" bigint,
	"coupon_id" uuid,
	"coupon_code" varchar(50),
	"rate_snapshot_id" uuid,
	"payment_method" "payment_method",
	"payment_amount" bigint,
	"payment_reference" text,
	"payment_receipt_url" text,
	"payment_submitted_at" timestamp with time zone,
	"payment_deadline" timestamp with time zone,
	"payment_verified_by" uuid,
	"payment_verified_at" timestamp with time zone,
	"payment_rejected_at" timestamp with time zone,
	"payment_rejected_reason" text,
	"payment_confirmed_by" uuid,
	"payment_confirmed_at" timestamp with time zone,
	"packed_by" uuid,
	"packed_at" timestamp with time zone,
	"tracking_number" varchar(100),
	"shipped_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"delivery_full_name" text,
	"delivery_phone" text,
	"delivery_address_line1" text,
	"delivery_address_line2" text,
	"delivery_city" text,
	"delivery_postal_code" text,
	"delivery_fee_charged" bigint DEFAULT 0 NOT NULL,
	"delivery_fee_actual" bigint,
	"delivery_covered_by" "delivery_covered_by",
	"customer_note" text,
	"refund_amount" bigint,
	"refunded_at" timestamp with time zone,
	"refunded_by" uuid,
	"refund_note" text,
	"payment_currency" varchar(3),
	"payment_amount_uzs" bigint,
	"admin_note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number"),
	CONSTRAINT "orders_profile_region_check" CHECK ("orders"."profile_region" IN ('UZB', 'KOR')),
	CONSTRAINT "orders_delivery_region_check" CHECK ("orders"."delivery_region" IN ('UZB', 'KOR')),
	CONSTRAINT "orders_total_amount_check" CHECK ("orders"."total_amount" >= 0),
	CONSTRAINT "orders_subtotal_check" CHECK ("orders"."subtotal" >= 0),
	CONSTRAINT "orders_discount_amount_check" CHECK ("orders"."discount_amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "coupon_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coupon_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"discount_amount" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"type" "coupon_type" DEFAULT 'PERCENTAGE' NOT NULL,
	"value" bigint NOT NULL,
	"value_krw" bigint,
	"max_discount_cap" bigint,
	"max_discount_krw" bigint,
	"scope" "coupon_scope" DEFAULT 'ENTIRE_ORDER' NOT NULL,
	"applicable_resource_ids" uuid[],
	"applicable_brands" varchar(100)[],
	"min_order_amount" bigint DEFAULT 0 NOT NULL,
	"min_order_krw" bigint,
	"min_order_qty" integer DEFAULT 1 NOT NULL,
	"region_code" varchar(3),
	"first_order_only" boolean DEFAULT false NOT NULL,
	"one_per_customer" boolean DEFAULT false NOT NULL,
	"exclude_wholesale" boolean DEFAULT false NOT NULL,
	"target_customer_ids" uuid[],
	"starts_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"max_uses_total" integer,
	"max_uses_per_customer" integer DEFAULT 1 NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"auto_apply" boolean DEFAULT false NOT NULL,
	"is_stackable" boolean DEFAULT false NOT NULL,
	"is_promotional" boolean DEFAULT false NOT NULL,
	"promo_display_text" text,
	"status" "coupon_status" DEFAULT 'DRAFT' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "coupons_code_unique" UNIQUE("code"),
	CONSTRAINT "coupons_value_check" CHECK ("coupons"."value" > 0)
);
--> statement-breakpoint
CREATE TABLE "user_coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"coupon_id" uuid NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"used_at" timestamp with time zone,
	"order_id" uuid,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exchange_rate_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"krw_to_uzs" integer NOT NULL,
	"usd_to_krw" integer NOT NULL,
	"cargo_rate_krw_per_kg" integer NOT NULL,
	"source" "exchange_rate_source" DEFAULT 'API' NOT NULL,
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lock_column" char(1) DEFAULT 'X' NOT NULL,
	"payment_timeout_minutes" integer DEFAULT 30 NOT NULL,
	"low_stock_threshold" integer DEFAULT 10 NOT NULL,
	"uzb_cargo_usd_per_kg" integer DEFAULT 10 NOT NULL,
	"standard_shipping_fee_krw" bigint DEFAULT 3000 NOT NULL,
	"free_shipping_threshold_krw" bigint DEFAULT 50000 NOT NULL,
	"min_order_uzb_krw" bigint DEFAULT 0 NOT NULL,
	"min_order_kor_krw" bigint DEFAULT 0 NOT NULL,
	"kor_bank_enabled" boolean DEFAULT false NOT NULL,
	"kor_bank_name" text,
	"kor_bank_holder" text,
	"kor_bank_number" text,
	"kor_e9pay_enabled" boolean DEFAULT false NOT NULL,
	"kor_e9pay_name" text,
	"kor_e9pay_account" text,
	"uzb_bank_enabled" boolean DEFAULT false NOT NULL,
	"uzb_bank_name" text,
	"uzb_bank_holder" text,
	"uzb_bank_number" text,
	"telegram_url" varchar(200),
	"instagram_url" varchar(200),
	"website_url" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"icon" varchar(50),
	"is_system" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expense_categories_name_unique" UNIQUE("name"),
	CONSTRAINT "expense_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"amount_krw" bigint NOT NULL,
	"description" text NOT NULL,
	"expense_date" date NOT NULL,
	"receipt_url" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expenses_amount_check" CHECK ("expenses"."amount_krw" > 0)
);
--> statement-breakpoint
CREATE TABLE "telegram_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" varchar(50) NOT NULL,
	"channel_name" varchar(200) NOT NULL,
	"channel_username" varchar(100),
	"region_code" varchar(5),
	"is_active" boolean DEFAULT true NOT NULL,
	"added_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "telegram_channels_chat_id_unique" UNIQUE("chat_id")
);
--> statement-breakpoint
CREATE TABLE "telegram_post_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"channel_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"sent_at" timestamp with time zone,
	"telegram_message_id" varchar(50),
	"error_msg" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "telegram_post_channels_status_check" CHECK ("telegram_post_channels"."status" IN ('PENDING', 'SENT', 'FAILED'))
);
--> statement-breakpoint
CREATE TABLE "telegram_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid,
	"title" varchar(300) NOT NULL,
	"content" text NOT NULL,
	"image_url" text,
	"status" "telegram_post_status" DEFAULT 'DRAFT' NOT NULL,
	"scheduled_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waitlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"notified" boolean DEFAULT false NOT NULL,
	"notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wishlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pick_pack_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"order_item_id" uuid NOT NULL,
	"performed_by" uuid NOT NULL,
	"action" "pick_pack_action" NOT NULL,
	"scan_input" varchar(100),
	"expected_barcode" varchar(50),
	"result" "pick_pack_result" NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_sales_summary" (
	"date" date NOT NULL,
	"region_code" text NOT NULL,
	"product_id" uuid NOT NULL,
	"units_sold" integer DEFAULT 0 NOT NULL,
	"revenue_krw" bigint DEFAULT 0 NOT NULL,
	"cogs_krw" bigint DEFAULT 0 NOT NULL,
	"cargo_krw" bigint DEFAULT 0 NOT NULL,
	"coupon_discount_krw" bigint DEFAULT 0 NOT NULL,
	"order_count" integer DEFAULT 0 NOT NULL,
	"refund_count" integer DEFAULT 0 NOT NULL,
	"refunded_revenue_krw" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "daily_sales_summary_date_region_code_product_id_pk" PRIMARY KEY("date","region_code","product_id")
);
--> statement-breakpoint
CREATE TABLE "notifications_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid,
	"type" "notification_type" NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"title" varchar(300) NOT NULL,
	"body" text NOT NULL,
	"data" jsonb,
	"order_id" uuid,
	"status" "notification_status" DEFAULT 'PENDING' NOT NULL,
	"error_msg" text,
	"sent_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "users" CASCADE;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'PENDING_PAYMENT'::text;--> statement-breakpoint
DROP TYPE "public"."order_status";--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('DRAFT', 'PENDING_PAYMENT', 'PAYMENT_SUBMITTED', 'PAYMENT_CONFIRMED', 'PAYMENT_REJECTED', 'PACKING', 'SHIPPED', 'DELIVERED', 'CANCELED', 'REFUNDED');--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'PENDING_PAYMENT'::"public"."order_status";--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET DATA TYPE "public"."order_status" USING "status"::"public"."order_status";--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "payment_method" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."payment_method";--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('KOREAN_BANK', 'UZB_BANK', 'E9PAY');--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "payment_method" SET DATA TYPE "public"."payment_method" USING "payment_method"::"public"."payment_method";--> statement-breakpoint
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_referred_by_id_customers_id_fk" FOREIGN KEY ("referred_by_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notification_settings" ADD CONSTRAINT "user_notification_settings_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_regional_configs" ADD CONSTRAINT "product_regional_configs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_adjustments" ADD CONSTRAINT "batch_adjustments_batch_id_inventory_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."inventory_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_adjustments" ADD CONSTRAINT "batch_adjustments_admin_id_admin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_batch_id_inventory_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."inventory_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_performed_by_admin_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_batch_id_inventory_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."inventory_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_expenses" ADD CONSTRAINT "order_expenses_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_expenses" ADD CONSTRAINT "order_expenses_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_batch_id_inventory_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."inventory_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_scanned_by_admin_users_id_fk" FOREIGN KEY ("scanned_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_changed_by_admin_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_box_id_boxes_id_fk" FOREIGN KEY ("box_id") REFERENCES "public"."boxes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_rate_snapshot_id_exchange_rate_snapshots_id_fk" FOREIGN KEY ("rate_snapshot_id") REFERENCES "public"."exchange_rate_snapshots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_payment_verified_by_admin_users_id_fk" FOREIGN KEY ("payment_verified_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_payment_confirmed_by_admin_users_id_fk" FOREIGN KEY ("payment_confirmed_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_packed_by_admin_users_id_fk" FOREIGN KEY ("packed_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_refunded_by_admin_users_id_fk" FOREIGN KEY ("refunded_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_coupons" ADD CONSTRAINT "user_coupons_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_coupons" ADD CONSTRAINT "user_coupons_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exchange_rate_snapshots" ADD CONSTRAINT "exchange_rate_snapshots_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_channels" ADD CONSTRAINT "telegram_channels_added_by_admin_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_post_channels" ADD CONSTRAINT "telegram_post_channels_post_id_telegram_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."telegram_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_post_channels" ADD CONSTRAINT "telegram_post_channels_channel_id_telegram_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."telegram_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_posts" ADD CONSTRAINT "telegram_posts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_posts" ADD CONSTRAINT "telegram_posts_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlists" ADD CONSTRAINT "waitlists_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlists" ADD CONSTRAINT "waitlists_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pick_pack_audit" ADD CONSTRAINT "pick_pack_audit_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pick_pack_audit" ADD CONSTRAINT "pick_pack_audit_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pick_pack_audit" ADD CONSTRAINT "pick_pack_audit_performed_by_admin_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_sales_summary" ADD CONSTRAINT "daily_sales_summary_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications_log" ADD CONSTRAINT "notifications_log_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_order_sequences_date_idx" ON "daily_order_sequences" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_users_email_idx" ON "admin_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "admin_users_role_id_idx" ON "admin_users" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "admin_users_deleted_at_idx" ON "admin_users" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "role_permissions_role_id_idx" ON "role_permissions" USING btree ("role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "role_permissions_unique_idx" ON "role_permissions" USING btree ("role_id","resource","action");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_name_idx" ON "roles" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_tokens_token_idx" ON "auth_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "auth_tokens_phone_idx" ON "auth_tokens" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "auth_tokens_expires_at_idx" ON "auth_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "refresh_tokens_token_idx" ON "refresh_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "refresh_tokens_customer_id_idx" ON "refresh_tokens" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_admin_user_id_idx" ON "refresh_tokens" USING btree ("admin_user_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_family_id_idx" ON "refresh_tokens" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "refresh_tokens_is_revoked_idx" ON "refresh_tokens" USING btree ("is_revoked");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_phone_idx" ON "customers" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_telegram_id_idx" ON "customers" USING btree ("telegram_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_referral_code_idx" ON "customers" USING btree ("referral_code");--> statement-breakpoint
CREATE INDEX "customers_phone_region_idx" ON "customers" USING btree ("phone_region");--> statement-breakpoint
CREATE INDEX "customers_is_active_idx" ON "customers" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "user_addresses_customer_id_idx" ON "user_addresses" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "user_addresses_region_code_idx" ON "user_addresses" USING btree ("region_code");--> statement-breakpoint
CREATE UNIQUE INDEX "user_notification_settings_customer_id_idx" ON "user_notification_settings" USING btree ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_idx" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "categories_parent_id_idx" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "categories_is_active_idx" ON "categories" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "categories_deleted_at_idx" ON "categories" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "product_regional_configs_product_region_idx" ON "product_regional_configs" USING btree ("product_id","region_code");--> statement-breakpoint
CREATE INDEX "product_regional_configs_product_id_idx" ON "product_regional_configs" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_barcode_idx" ON "products" USING btree ("barcode");--> statement-breakpoint
CREATE UNIQUE INDEX "products_sku_idx" ON "products" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "products_brand_name_idx" ON "products" USING btree ("brand_name");--> statement-breakpoint
CREATE INDEX "products_category_id_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "products_deleted_at_idx" ON "products" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "batch_adjustments_batch_id_idx" ON "batch_adjustments" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "batch_adjustments_admin_id_idx" ON "batch_adjustments" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "inventory_batches_product_id_idx" ON "inventory_batches" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "inventory_batches_received_at_idx" ON "inventory_batches" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "inventory_batches_expiry_date_idx" ON "inventory_batches" USING btree ("expiry_date");--> statement-breakpoint
CREATE INDEX "inventory_batches_current_qty_idx" ON "inventory_batches" USING btree ("current_qty");--> statement-breakpoint
CREATE INDEX "stock_movements_product_id_idx" ON "stock_movements" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "stock_movements_batch_id_idx" ON "stock_movements" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "stock_movements_order_id_idx" ON "stock_movements" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "stock_movements_movement_type_idx" ON "stock_movements" USING btree ("movement_type");--> statement-breakpoint
CREATE INDEX "stock_movements_created_at_idx" ON "stock_movements" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "stock_reservations_order_id_idx" ON "stock_reservations" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "stock_reservations_order_item_id_idx" ON "stock_reservations" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "stock_reservations_batch_id_idx" ON "stock_reservations" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "stock_reservations_product_id_idx" ON "stock_reservations" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "stock_reservations_status_idx" ON "stock_reservations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "stock_reservations_expires_at_idx" ON "stock_reservations" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cart_items_cart_product_idx" ON "cart_items" USING btree ("cart_id","product_id");--> statement-breakpoint
CREATE INDEX "cart_items_cart_id_idx" ON "cart_items" USING btree ("cart_id");--> statement-breakpoint
CREATE INDEX "cart_items_product_id_idx" ON "cart_items" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "carts_customer_id_idx" ON "carts" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "order_expenses_order_id_idx" ON "order_expenses" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_expenses_type_idx" ON "order_expenses" USING btree ("type");--> statement-breakpoint
CREATE INDEX "order_expenses_created_at_idx" ON "order_expenses" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_product_id_idx" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "order_items_batch_id_idx" ON "order_items" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "order_status_history_order_id_idx" ON "order_status_history" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_status_history_created_at_idx" ON "order_status_history" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_order_number_idx" ON "orders" USING btree ("order_number");--> statement-breakpoint
CREATE INDEX "orders_customer_id_idx" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_payment_deadline_idx" ON "orders" USING btree ("payment_deadline");--> statement-breakpoint
CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "coupon_redemptions_coupon_id_idx" ON "coupon_redemptions" USING btree ("coupon_id");--> statement-breakpoint
CREATE INDEX "coupon_redemptions_customer_id_idx" ON "coupon_redemptions" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "coupon_redemptions_order_id_idx" ON "coupon_redemptions" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "coupons_code_idx" ON "coupons" USING btree ("code");--> statement-breakpoint
CREATE INDEX "coupons_status_idx" ON "coupons" USING btree ("status");--> statement-breakpoint
CREATE INDEX "coupons_auto_apply_idx" ON "coupons" USING btree ("auto_apply");--> statement-breakpoint
CREATE INDEX "coupons_expires_at_idx" ON "coupons" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_coupons_unique_idx" ON "user_coupons" USING btree ("customer_id","coupon_id");--> statement-breakpoint
CREATE INDEX "user_coupons_customer_id_idx" ON "user_coupons" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "user_coupons_coupon_id_idx" ON "user_coupons" USING btree ("coupon_id");--> statement-breakpoint
CREATE INDEX "user_coupons_is_used_idx" ON "user_coupons" USING btree ("is_used");--> statement-breakpoint
CREATE INDEX "exchange_rate_snapshots_created_at_idx" ON "exchange_rate_snapshots" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "exchange_rate_snapshots_source_idx" ON "exchange_rate_snapshots" USING btree ("source");--> statement-breakpoint
CREATE UNIQUE INDEX "settings_lock_idx" ON "settings" USING btree ("lock_column");--> statement-breakpoint
CREATE UNIQUE INDEX "expense_categories_name_idx" ON "expense_categories" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "expense_categories_slug_idx" ON "expense_categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "expenses_expense_date_idx" ON "expenses" USING btree ("expense_date");--> statement-breakpoint
CREATE INDEX "expenses_category_id_idx" ON "expenses" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "expenses_created_by_idx" ON "expenses" USING btree ("created_by");--> statement-breakpoint
CREATE UNIQUE INDEX "telegram_channels_chat_id_idx" ON "telegram_channels" USING btree ("chat_id");--> statement-breakpoint
CREATE UNIQUE INDEX "telegram_post_channels_unique_idx" ON "telegram_post_channels" USING btree ("post_id","channel_id");--> statement-breakpoint
CREATE INDEX "telegram_post_channels_post_id_idx" ON "telegram_post_channels" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "telegram_post_channels_channel_id_idx" ON "telegram_post_channels" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "telegram_posts_status_idx" ON "telegram_posts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "telegram_posts_scheduled_at_idx" ON "telegram_posts" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "telegram_posts_product_id_idx" ON "telegram_posts" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "waitlists_customer_product_idx" ON "waitlists" USING btree ("customer_id","product_id");--> statement-breakpoint
CREATE INDEX "waitlists_product_id_notified_idx" ON "waitlists" USING btree ("product_id","notified");--> statement-breakpoint
CREATE UNIQUE INDEX "wishlists_customer_product_idx" ON "wishlists" USING btree ("customer_id","product_id");--> statement-breakpoint
CREATE INDEX "wishlists_product_id_idx" ON "wishlists" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "pick_pack_audit_order_id_idx" ON "pick_pack_audit" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "pick_pack_audit_order_item_id_idx" ON "pick_pack_audit" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "pick_pack_audit_performed_by_idx" ON "pick_pack_audit" USING btree ("performed_by");--> statement-breakpoint
CREATE INDEX "pick_pack_audit_created_at_idx" ON "pick_pack_audit" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "daily_sales_summary_date_idx" ON "daily_sales_summary" USING btree ("date");--> statement-breakpoint
CREATE INDEX "daily_sales_summary_region_idx" ON "daily_sales_summary" USING btree ("region_code");--> statement-breakpoint
CREATE INDEX "daily_sales_summary_date_region_idx" ON "daily_sales_summary" USING btree ("date","region_code");--> statement-breakpoint
CREATE INDEX "notifications_log_customer_id_idx" ON "notifications_log" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "notifications_log_type_idx" ON "notifications_log" USING btree ("type");--> statement-breakpoint
CREATE INDEX "notifications_log_status_idx" ON "notifications_log" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notifications_log_created_at_idx" ON "notifications_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notifications_log_unread_idx" ON "notifications_log" USING btree ("customer_id","read_at");--> statement-breakpoint
CREATE INDEX "notifications_log_order_id_idx" ON "notifications_log" USING btree ("order_id");--> statement-breakpoint
DROP TYPE "public"."delivery_type";--> statement-breakpoint
DROP TYPE "public"."user_role";