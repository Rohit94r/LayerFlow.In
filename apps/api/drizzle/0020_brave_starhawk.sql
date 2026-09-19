CREATE TABLE "device_commands" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text,
	"device_id" text,
	"command" text NOT NULL,
	"cwd" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"exit_code" integer,
	"output" text DEFAULT '' NOT NULL,
	"error_message" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "device_commands" ADD CONSTRAINT "device_commands_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "device_commands_workspace_status_idx" ON "device_commands" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "device_commands_workspace_created_idx" ON "device_commands" USING btree ("workspace_id","created_at");