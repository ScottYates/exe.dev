-- Add favicon column to rss_feeds
ALTER TABLE rss_feeds ADD COLUMN favicon TEXT DEFAULT '';

-- Record execution of this migration
INSERT OR IGNORE INTO migrations (migration_number, migration_name)
VALUES (005, '005-favicons');
