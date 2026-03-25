-- Add slug_access flag to allow private pages to be accessed via slug without login

ALTER TABLE pages ADD COLUMN slug_access INTEGER DEFAULT 0;

-- Record execution of this migration
INSERT OR IGNORE INTO migrations (migration_number, migration_name)
VALUES (009, '009-slug-access');
