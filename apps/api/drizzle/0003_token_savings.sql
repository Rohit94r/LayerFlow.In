ALTER TABLE "runs" ADD COLUMN "savings" jsonb;--> statement-breakpoint
ALTER TABLE "workspace_settings" ADD COLUMN "token_saver" boolean DEFAULT false NOT NULL;
