CREATE TABLE IF NOT EXISTS "banners" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" varchar(200) NOT NULL,
  "subtitle" varchar(300),
  "button_text" varchar(50),
  "image_url" text,
  "bg_color" varchar(7) DEFAULT '#E11D74',
  "link_type" varchar(20) DEFAULT 'none',
  "link_value" text,
  "region_code" varchar(5),
  "is_active" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
