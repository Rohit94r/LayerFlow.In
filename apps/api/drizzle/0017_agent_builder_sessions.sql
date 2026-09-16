CREATE TABLE "agent_builder_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"step" text DEFAULT 'goal' NOT NULL,
	"goal" text DEFAULT '' NOT NULL,
	"draft" jsonb NOT NULL DEFAULT '{"name":"","description":"","role":"custom","systemPrompt":"","tools":[],"model":{"modelId":null,"provider":null,"temperature":0.7,"maxTokens":2048,"autoSwitch":true},"permissions":{},"maxIterations":25,"timeoutMs":300000}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_builder_sessions" ADD CONSTRAINT "agent_builder_sessions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "agent_builder_sessions" ADD CONSTRAINT "agent_builder_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
CREATE INDEX "agent_builder_sessions_workspace_id_idx" ON "agent_builder_sessions" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "agent_builder_sessions_user_id_idx" ON "agent_builder_sessions" USING btree ("user_id");--> statement-breakpoint
