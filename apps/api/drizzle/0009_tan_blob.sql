ALTER TABLE "prompts" ADD COLUMN "source" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "prompts" ADD COLUMN "run_count" integer DEFAULT 0 NOT NULL;