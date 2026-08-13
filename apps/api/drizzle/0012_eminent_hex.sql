ALTER TABLE "ai_agents" ADD COLUMN "schedule_cron" text;--> statement-breakpoint
ALTER TABLE "ai_agents" ADD COLUMN "schedule_tz" text;--> statement-breakpoint
ALTER TABLE "ai_agents" ADD COLUMN "scheduling_enabled" boolean DEFAULT false NOT NULL;