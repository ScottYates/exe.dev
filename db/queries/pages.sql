-- name: GetPageByID :one
SELECT * FROM pages WHERE id = ?;

-- name: GetPageBySlug :one
SELECT * FROM pages WHERE slug = ?;

-- name: GetPagesByUserID :many
SELECT * FROM pages WHERE user_id = ? ORDER BY created_at;

-- name: CreatePage :exec
INSERT INTO pages (id, user_id, name, bg_color, bg_image, config, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?);

-- name: UpdatePage :exec
UPDATE pages SET name = ?, bg_color = ?, bg_image = ?, config = ?, updated_at = ? WHERE id = ?;

-- name: UpdatePageSlug :exec
UPDATE pages SET slug = ?, updated_at = ? WHERE id = ?;

-- name: UpdatePagePublic :exec
UPDATE pages SET is_public = ?, updated_at = ? WHERE id = ?;

-- name: UpdatePageSlugAccess :exec
UPDATE pages SET slug_access = ?, updated_at = ? WHERE id = ?;

-- name: CheckSlugExists :one
SELECT COUNT(*) FROM pages WHERE slug = ? AND id != ?;

-- name: DeletePage :exec
DELETE FROM pages WHERE id = ?;
