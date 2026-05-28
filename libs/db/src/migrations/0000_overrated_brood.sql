CREATE TYPE "public"."delivery_type" AS ENUM('international_cargo', 'domestic_courier');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending_payment', 'payment_rejected', 'payment_confirmed', 'order_confirmed', 'packaging', 'shipped', 'customs', 'delivering', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('korean_bank', 'uzb_bank', 'e9pay');--> statement-breakpoint
CREATE TYPE "public"."region" AS ENUM('UZB', 'KOR');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('customer', 'admin');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" varchar(20) NOT NULL,
	"phone_region" "region" NOT NULL,
	"telegram_id" bigint,
	"tg_username" varchar(100),
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100),
	"profile_image_url" varchar(500),
	"role" "user_role" DEFAULT 'customer' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"expo_push_token" varchar(500),
	"referral_code" varchar(12),
	"referred_by_id" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_phone_unique" UNIQUE("phone"),
	CONSTRAINT "users_telegram_id_unique" UNIQUE("telegram_id"),
	CONSTRAINT "users_referral_code_unique" UNIQUE("referral_code")
);
