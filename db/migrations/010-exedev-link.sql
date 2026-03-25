-- Link exe.dev user IDs to Google OAuth users
ALTER TABLE users ADD COLUMN exedev_id TEXT;

-- Create index for looking up by exedev_id
CREATE INDEX idx_users_exedev_id ON users(exedev_id);

-- Record execution of this migration
INSERT OR IGNORE INTO migrations (migration_number, migration_name)
VALUES (010, '010-exedev-link');
