ALTER TABLE "syndication_jobs" ADD COLUMN "content" text;
--> statement-breakpoint
ALTER TABLE "syndication_jobs" ADD COLUMN "metadata" jsonb;
