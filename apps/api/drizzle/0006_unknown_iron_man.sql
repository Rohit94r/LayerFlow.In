CREATE TABLE "ai_chat_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"model" text,
	"provider" text,
	"key_hint" text,
	"key_id" text,
	"tokens_in" integer DEFAULT 0 NOT NULL,
	"tokens_out" integer DEFAULT 0 NOT NULL,
	"cost_micro" bigint DEFAULT 0 NOT NULL,
	"latency_ms" integer,
	"switched_from" jsonb,
	"error_code" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_chat_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"project_id" text,
	"title" text DEFAULT 'New chat' NOT NULL,
	"source" text DEFAULT 'new' NOT NULL,
	"rescue_report_id" text,
	"default_model" text,
	"auto_switch" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"passport" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_message_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_key_health" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"provider" text NOT NULL,
	"key_id" text,
	"key_hint" text NOT NULL,
	"status" text DEFAULT 'healthy' NOT NULL,
	"last_status_code" integer,
	"last_error_code" text,
	"last_error_at" timestamp with time zone,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"cooldown_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_chat_messages" ADD CONSTRAINT "ai_chat_messages_session_id_ai_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ai_chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_chat_sessions" ADD CONSTRAINT "ai_chat_sessions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_chat_sessions" ADD CONSTRAINT "ai_chat_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_chat_sessions" ADD CONSTRAINT "ai_chat_sessions_rescue_report_id_rescue_reports_id_fk" FOREIGN KEY ("rescue_report_id") REFERENCES "public"."rescue_reports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_key_health" ADD CONSTRAINT "provider_key_health_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_chat_messages_session_idx" ON "ai_chat_messages" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_chat_sessions_workspace_idx" ON "ai_chat_sessions" USING btree ("workspace_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_key_health_workspace_key_uq" ON "provider_key_health" USING btree ("workspace_id","key_id");--> statement-breakpoint
CREATE INDEX "provider_key_health_workspace_idx" ON "provider_key_health" USING btree ("workspace_id","provider");