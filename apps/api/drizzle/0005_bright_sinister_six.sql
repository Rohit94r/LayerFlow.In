CREATE TABLE "billing_events" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"type" text NOT NULL,
	"workspace_id" text,
	"payload" jsonb,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_events_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "dodo_customer_id" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "dodo_subscription_id" text;--> statement-breakpoint
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "billing_events_event_id_idx" ON "billing_events" USING btree ("event_id");