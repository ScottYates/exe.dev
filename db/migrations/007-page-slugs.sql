-- Add slug column to pages for custom URLs

ALTER TABLE pages ADD COLUMN slug TEXT DEFAULT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug) WHERE slug IS NOT NULL;

-- Record execution of this migration
INSERT OR IGNORE INTO migrations (migration_number, migration_name)
VALUES (007, '007-page-slugs');
