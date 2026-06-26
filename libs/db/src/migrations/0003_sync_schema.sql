ALTER TYPE "public"."stock_movement_type" ADD VALUE 'GIFT';--> statement-breakpoint
ALTER TYPE "public"."stock_movement_type" ADD VALUE 'SAMPLE';--> statement-breakpoint
ALTER TYPE "public"."stock_movement_type" ADD VALUE 'WRITE_OFF';--> statement-breakpoint
ALTER TYPE "public"."stock_movement_type" ADD VALUE 'EXPIRED';--> statement-breakpoint
ALTER TYPE "public"."stock_movement_type" ADD VALUE 'DAMAGED';--> statement-breakpoint
ALTER TYPE "public"."stock_movement_type" ADD VALUE 'ADJUSTMENT';--> statement-breakpoint
ALTER TYPE "public"."telegram_post_status" ADD VALUE 'ARCHIVED';--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"method" varchar(50) NOT NULL,
	"region" varchar(10) NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"bank_name" text,
	"account_number" text,
	"holder_name" text,
	"instructions" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_methods_method_unique" UNIQUE("method")
);
--> statement-breakpoint
CREATE TABLE "shipping_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"region" varchar(10) NOT NULL,
	"min_order_amount" bigint NOT NULL,
	"shipping_cost" bigint NOT NULL,
	"currency" varchar(3) DEFAULT 'KRW' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telegram_post_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text DEFAULT '',
	"link1_label" text DEFAULT 'Telegram',
	"link1_url" text DEFAULT '',
	"link2_label" text DEFAULT 'Instagram',
	"link2_url" text DEFAULT '',
	"link3_label" text DEFAULT 'Website',
	"link3_url" text DEFAULT '',
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid,
	"admin_name" text,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"old_value" jsonb,
	"new_value" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"link" text,
	"is_read" boolean DEFAULT false,
	"data" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "banners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(200) NOT NULL,
	"subtitle" varchar(300),
	"button_text" varchar(50),
	"image_url" text,
	"bg_color" varchar(7) DEFAULT '#E11D74',
	"link_type" varchar(20) DEFAULT 'none',
	"link_value" text,
	"region_code" varchar(5),
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "boxes" DROP CONSTRAINT "boxes_max_weight_check";--> statement-breakpoint
ALTER TABLE "boxes" DROP CONSTRAINT "boxes_box_weight_check";--> statement-breakpoint
ALTER TABLE "boxes" DROP CONSTRAINT "boxes_price_usd_check";--> statement-breakpoint
ALTER TABLE "purchase_orders" DROP CONSTRAINT "purchase_orders_status_check";--> statement-breakpoint
DROP TYPE "public"."coupon_scope";--> statement-breakpoint
CREATE TYPE "public"."coupon_scope" AS ENUM('ALL', 'PRODUCT', 'CATEGORY', 'CUSTOMER');--> statement-breakpoint
ALTER TABLE "boxes" ALTER COLUMN "max_weight_kg" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "boxes" ALTER COLUMN "box_weight_kg" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "boxes" ALTER COLUMN "price_usd" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "coupons" ALTER COLUMN "scope" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "coupons" ALTER COLUMN "scope" SET DEFAULT 'ALL';--> statement-breakpoint
ALTER TABLE "exchange_rate_snapshots" ALTER COLUMN "krw_to_uzs" SET DATA TYPE numeric(10, 4);--> statement-breakpoint
ALTER TABLE "exchange_rate_snapshots" ALTER COLUMN "usd_to_krw" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "exchange_rate_snapshots" ALTER COLUMN "cargo_rate_krw_per_kg" SET DATA TYPE numeric(12, 2);--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "min_order_kor_krw" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "login_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "locked_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "source" varchar(20) DEFAULT 'APP' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_addresses" ADD COLUMN "full_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "user_addresses" ADD COLUMN "province" text;--> statement-breakpoint
ALTER TABLE "user_addresses" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "user_addresses" ADD COLUMN "address_line1" text NOT NULL;--> statement-breakpoint
ALTER TABLE "user_addresses" ADD COLUMN "address_line2" text;--> statement-breakpoint
ALTER TABLE "user_addresses" ADD COLUMN "postal_code" text;--> statement-breakpoint
ALTER TABLE "user_notification_settings" ADD COLUMN "push_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user_notification_settings" ADD COLUMN "telegram_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_new" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_batches" ADD COLUMN "supplier_id" uuid;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN "reason" text;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN "recipient_name" varchar(200);--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN "recipient_phone" varchar(30);--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN "written_off_by" uuid;--> statement-breakpoint
ALTER TABLE "boxes" ADD COLUMN "size_label" text;--> statement-breakpoint
ALTER TABLE "boxes" ADD COLUMN "length_cm" numeric;--> statement-breakpoint
ALTER TABLE "boxes" ADD COLUMN "width_cm" numeric;--> statement-breakpoint
ALTER TABLE "boxes" ADD COLUMN "height_cm" numeric;--> statement-breakpoint
ALTER TABLE "boxes" ADD COLUMN "cost_krw" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "boxes" ADD COLUMN "stock_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "boxes" ADD COLUMN "min_stock" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "boxes" ADD COLUMN "image_urls" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_mode" varchar(10) DEFAULT 'RECEIPT' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "order_discount_pct" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "order_discount_flat" bigint;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "refund_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "product_id" uuid;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "category_id" uuid;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "customer_id" uuid;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "usd_to_krw" integer DEFAULT 1350 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "min_order_uzb_uzs" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "expense_categories" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "expense_categories" ADD COLUMN "color" varchar(20) DEFAULT '#6366f1';--> statement-breakpoint
ALTER TABLE "expense_categories" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "reference_id" uuid;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "reference_type" varchar(50);--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "payment_status" varchar(20) DEFAULT 'UNPAID' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "paid_amount_krw" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "phone" varchar(30);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "email" varchar(200);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "payment_terms" text;--> statement-breakpoint
ALTER TABLE "telegram_channels" ADD COLUMN "type" text DEFAULT 'channel';--> statement-breakpoint
ALTER TABLE "telegram_channels" ADD COLUMN "member_count" integer;--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_admin_id_admin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shipping_tiers_region_idx" ON "shipping_tiers" USING btree ("region");--> statement-breakpoint
CREATE INDEX "shipping_tiers_min_amount_idx" ON "shipping_tiers" USING btree ("min_order_amount");--> statement-breakpoint
CREATE INDEX "admin_audit_logs_admin_id_idx" ON "admin_audit_logs" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "admin_audit_logs_created_at_idx" ON "admin_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "admin_notifications_read_idx" ON "admin_notifications" USING btree ("is_read","created_at");--> statement-breakpoint
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_written_off_by_admin_users_id_fk" FOREIGN KEY ("written_off_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_addresses" DROP COLUMN "recipient_name";--> statement-breakpoint
ALTER TABLE "user_addresses" DROP COLUMN "uzb_region";--> statement-breakpoint
ALTER TABLE "user_addresses" DROP COLUMN "uzb_city";--> statement-breakpoint
ALTER TABLE "user_addresses" DROP COLUMN "uzb_district";--> statement-breakpoint
ALTER TABLE "user_addresses" DROP COLUMN "uzb_street";--> statement-breakpoint
ALTER TABLE "user_addresses" DROP COLUMN "kor_postal_code";--> statement-breakpoint
ALTER TABLE "user_addresses" DROP COLUMN "kor_road_address";--> statement-breakpoint
ALTER TABLE "user_addresses" DROP COLUMN "kor_detail";--> statement-breakpoint
ALTER TABLE "user_addresses" DROP COLUMN "kor_building";--> statement-breakpoint
ALTER TABLE "settings" DROP COLUMN "min_order_uzb_krw";--> statement-breakpoint
ALTER TABLE "suppliers" DROP COLUMN "contact_phone";--> statement-breakpoint
ALTER TABLE "suppliers" DROP COLUMN "contact_email";--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_source_check" CHECK ("customers"."source" IN ('APP', 'WALK_IN', 'MANUAL'));--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_payment_mode_check" CHECK ("orders"."payment_mode" IN ('RECEIPT', 'IMMEDIATE'));--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_payment_status_check" CHECK ("purchase_orders"."payment_status" IN ('UNPAID','PARTIAL','PAID'));--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_status_check" CHECK ("purchase_orders"."status" IN ('DRAFT','ORDERED','PARTIAL','RECEIVED','CANCELLED'));