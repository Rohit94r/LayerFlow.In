-- 002_sync_meta.sql — durable sync identity and watermark for lf.

CREATE TABLE IF NOT EXISTS sync_meta (
    key     TEXT PRIMARY KEY,
    value   TEXT NOT NULL DEFAULT ''
);
