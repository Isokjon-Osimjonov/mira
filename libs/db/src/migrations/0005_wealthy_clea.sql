ALTER TABLE "orders" ALTER COLUMN "refund_amount" SET DEFAULT 0;--> statement-breakpoint
UPDATE "orders" SET "refund_amount" = 0 WHERE "refund_amount" IS NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "refund_amount" SET NOT NULL;
