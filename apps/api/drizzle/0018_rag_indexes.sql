CREATE INDEX "files_checksum_idx" ON "files" USING btree ("checksum");--> statement-breakpoint
CREATE INDEX "usage_ledger_created_idx" ON "usage_ledger" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "usage_rollups_day_idx" ON "usage_rollups" USING btree ("day");--> statement-breakpoint
CREATE INDEX "memories_workspace_source_idx" ON "memories" USING btree ("workspace_id","source_type","source_id");--> statement-breakpoint
CREATE INDEX "memories_workspace_updated_idx" ON "memories" USING btree ("workspace_id","updated_at");--> statement-breakpoint
CREATE INDEX "memory_embeddings_memory_id_idx" ON "memory_embeddings" USING btree ("memory_id");