-- Widgets and RSS feeds schema

-- Pages/dashboards
CREATE TABLE IF NOT EXISTS pages (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT 'My Page',
    bg_color TEXT DEFAULT '#1a1a2e',
    bg_image TEXT DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pages_user_id ON pages(user_id);

-- Widgets
CREATE TABLE IF NOT EXISTS widgets (
    id TEXT PRIMARY KEY,
    page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Widget',
    widget_type TEXT NOT NULL DEFAULT 'rss',
    pos_x INTEGER NOT NULL DEFAULT 0,
    pos_y INTEGER NOT NULL DEFAULT 0,
    width INTEGER NOT NULL DEFAULT 300,
    height INTEGER NOT NULL DEFAULT 400,
    bg_color TEXT DEFAULT '#16213e',
    text_color TEXT DEFAULT '#ffffff',
    header_color TEXT DEFAULT '#0f3460',
    config TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_widgets_page_id ON widgets(page_id);

-- RSS feeds (cached content)
CREATE TABLE IF NOT EXISTS rss_feeds (
    url TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '[]',
    last_fetched TIMESTAMP,
    last_error TEXT DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Record execution of this migration
INSERT OR IGNORE INTO migrations (migration_number, migration_name)
VALUES (002, '002-widgets');
