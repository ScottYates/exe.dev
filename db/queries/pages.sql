-- name: GetPageByID :one
SELECT * FROM pages WHERE id = ?;

-- name: GetPagesByUserID :many
SELECT * FROM pages WHERE user_id = ? ORDER BY created_at;

-- name: CreatePage :exec
INSERT INTO pages (id, user_id, name, bg_color, bg_image, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?);

-- name: UpdatePage :exec
UPDATE pages SET name = ?, bg_color = ?, bg_image = ?, updated_at = ? WHERE id = ?;

-- name: DeletePage :exec
DELETE FROM pages WHERE id = ?;
