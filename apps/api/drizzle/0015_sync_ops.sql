CREATE TABLE "sync_devices" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"device_id" text NOT NULL,
	"name" text,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_operations" (
	"op_id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"device_id" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"op_tick" bigint DEFAULT 0 NOT NULL,
	"state" text DEFAULT 'synced' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"sequence" bigserial NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sync_devices" ADD CONSTRAINT "sync_devices_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_operations" ADD CONSTRAINT "sync_operations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sync_devices_workspace_device_uq" ON "sync_devices" USING btree ("workspace_id","device_id");--> statement-breakpoint
CREATE INDEX "sync_devices_workspace_id_idx" ON "sync_devices" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "sync_operations_workspace_sequence_idx" ON "sync_operations" USING btree ("workspace_id","sequence");--> statement-breakpoint
CREATE INDEX "sync_operations_workspace_entity_idx" ON "sync_operations" USING btree ("workspace_id","entity");