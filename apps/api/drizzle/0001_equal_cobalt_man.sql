ALTER TABLE "compare_jobs" ALTER COLUMN "prompt_version_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "compare_jobs" ADD COLUMN "content" text;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "output" text;