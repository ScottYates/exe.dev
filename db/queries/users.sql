-- name: GetUserByID :one
SELECT * FROM users WHERE id = ?;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = ?;

-- name: CreateUser :exec
INSERT INTO users (id, email, name, picture, created_at, last_login)
VALUES (?, ?, ?, ?, ?, ?);

-- name: UpdateUserLogin :exec
UPDATE users SET name = ?, picture = ?, last_login = ? WHERE id = ?;

-- name: CreateSession :exec
INSERT INTO sessions (id, user_id, created_at, expires_at)
VALUES (?, ?, ?, ?);

-- name: GetSession :one
SELECT s.*, u.email, u.name as user_name, u.picture 
FROM sessions s 
JOIN users u ON s.user_id = u.id 
WHERE s.id = ? AND s.expires_at > CURRENT_TIMESTAMP;

-- name: DeleteSession :exec
DELETE FROM sessions WHERE id = ?;

-- name: DeleteExpiredSessions :exec
DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP;

-- name: GetUserByExedevID :one
SELECT * FROM users WHERE exedev_id = ?;

-- name: LinkExedevID :exec
UPDATE users SET exedev_id = ? WHERE id = ?;

-- name: UpdatePagesOwnership :exec
UPDATE pages SET user_id = ? WHERE user_id = ?;
