CREATE TABLE "rescue_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"session_id" text,
	"project_id" text,
	"source_tool" text NOT NULL,
	"source_model" text DEFAULT 'unknown' NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"error_message" text,
	"summary" text DEFAULT '' NOT NULL,
	"passport" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"improved_prompt" text DEFAULT '' NOT NULL,
	"prompt_score" integer,
	"prompt_scores" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"diff" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"costs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recommended_model_id" text DEFAULT '' NOT NULL,
	"recommended_reason" text DEFAULT '' NOT NULL,
	"continue_pack" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"original_words" integer DEFAULT 0 NOT NULL,
	"compressed_words" integer DEFAULT 0 NOT NULL,
	"compression_percent" integer DEFAULT 0 NOT NULL,
	"saved" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "savings" jsonb;--> statement-breakpoint
ALTER TABLE "workspace_settings" ADD COLUMN "token_saver" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "rescue_reports" ADD CONSTRAINT "rescue_reports_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rescue_reports" ADD CONSTRAINT "rescue_reports_session_id_prompt_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."prompt_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rescue_reports" ADD CONSTRAINT "rescue_reports_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rescue_reports_workspace_idx" ON "rescue_reports" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "rescue_reports_updated_idx" ON "rescue_reports" USING btree ("updated_at");