-- name: GetFeedByURL :one
SELECT * FROM rss_feeds WHERE url = ?;

-- name: GetAllFeeds :many
SELECT * FROM rss_feeds ORDER BY url;

-- name: GetStaleFeeds :many
SELECT * FROM rss_feeds WHERE last_fetched IS NULL OR last_fetched < ? ORDER BY last_fetched;

-- name: UpsertFeed :exec
INSERT INTO rss_feeds (url, title, content, last_fetched, last_error, created_at)
VALUES (?, ?, ?, ?, ?, ?)
ON CONFLICT(url) DO UPDATE SET
    title = excluded.title,
    content = excluded.content,
    last_fetched = excluded.last_fetched,
    last_error = excluded.last_error;

-- name: CreateFeedIfNotExists :exec
INSERT OR IGNORE INTO rss_feeds (url, created_at) VALUES (?, ?);
