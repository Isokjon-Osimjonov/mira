ALTER TABLE "settings" ALTER COLUMN "telegram_url" SET DATA TYPE varchar(500);--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "instagram_url" SET DATA TYPE varchar(500);--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "website_url" SET DATA TYPE varchar(500);--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "phone_number" varchar(50);--> statement-breakpoint
ALTER TABLE "settings" DROP COLUMN "uzb_cargo_usd_per_kg";--> statement-breakpoint
ALTER TABLE "settings" DROP COLUMN "usd_to_krw";