-- Add config column to pages for storing grid settings and other options
ALTER TABLE pages ADD COLUMN config TEXT NOT NULL DEFAULT '{}';

-- Record execution of this migration
INSERT OR IGNORE INTO migrations (migration_number, migration_name)
VALUES (003, '003-page-config');
