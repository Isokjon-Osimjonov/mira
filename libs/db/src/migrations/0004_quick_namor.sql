CREATE TABLE "cargo_dates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cargo_date" date NOT NULL,
	"note" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "box_cost_krw" bigint DEFAULT 0;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "estimated_delivery_start" date;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "estimated_delivery_end" date;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cargo_date_id" uuid;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "cargo_transit_days_min" integer DEFAULT 7 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "cargo_transit_days_max" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_cargo_date_id_cargo_dates_id_fk" FOREIGN KEY ("cargo_date_id") REFERENCES "public"."cargo_dates"("id") ON DELETE set null ON UPDATE no action;