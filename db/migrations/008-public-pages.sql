-- Add public flag to pages for public viewing

ALTER TABLE pages ADD COLUMN is_public INTEGER DEFAULT 0;

-- Record execution of this migration
INSERT OR IGNORE INTO migrations (migration_number, migration_name)
VALUES (008, '008-public-pages');
