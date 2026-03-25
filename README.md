# NewsForNerds

A customizable RSS dashboard for news junkies. Create pages with draggable, resizable widgets displaying RSS feeds, iframes, or custom HTML content.

## Features

- **RSS Feeds**: Add any RSS/Atom feed with automatic favicon detection
- **Iframe Widgets**: Embed any website with optional CSS injection and scroll position offset
- **HTML Widgets**: Create custom content with a visual WYSIWYG editor (TinyMCE)
- **Drag & Drop**: Freely position widgets anywhere on the canvas
- **Resizable**: Resize widgets by dragging corners/edges
- **Multiple Pages**: Create multiple dashboard pages
- **Customizable**: Per-widget colors, backgrounds, grid snapping
- **Keyboard Shortcuts**: Quick actions (press `?` to see all)
- **Google OAuth**: Secure authentication

## Requirements

- Go 1.21+ 
- SQLite (embedded, no separate install needed)
- Google OAuth credentials (for authentication)

## Quick Start

### 1. Clone and Build

```bash
git clone <repository-url> newsfornerds
cd newsfornerds
go build -o newsfornerds ./cmd/srv
```

### 2. Configure Environment

Copy the example environment file and fill in your Google OAuth credentials:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

**To get Google OAuth credentials:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project (or select existing)
3. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
4. Set application type to "Web application"
5. Add authorized redirect URI: `https://your-domain.com/auth/callback`
6. Copy the Client ID and Client Secret to your `.env` file

### 3. Run the Server

```bash
./newsfornerds -listen :8000
```

The server will automatically create `db.sqlite3` and run migrations on first start.

## Running as a Systemd Service

For production deployment, run as a systemd service:

### 1. Install the Service File

```bash
sudo cp newsfornerds.service /etc/systemd/system/newsfornerds.service
```

Edit the service file if needed to match your installation path.

### 2. Enable and Start

```bash
sudo systemctl daemon-reload
sudo systemctl enable newsfornerds.service
sudo systemctl start newsfornerds
```

### 3. Check Status

```bash
systemctl status newsfornerds
journalctl -u newsfornerds -f  # View logs
```

### 4. Restart After Updates

```bash
go build -o newsfornerds ./cmd/srv
sudo systemctl restart newsfornerds
```

## Project Structure

```
newsfornerds/
├── cmd/srv/           # Main entry point
├── srv/               # HTTP server and handlers
│   ├── templates/     # Go HTML templates
│   └── static/        # CSS, JavaScript, images
├── db/                # Database layer
│   ├── migrations/    # SQL migration files
│   ├── queries/       # SQL queries for sqlc
│   └── dbgen/         # Generated query code
├── .env.example       # Environment template
├── newsfornerds.service  # Systemd service file
└── go.mod             # Go module definition
```

## Database

The app uses SQLite with automatic migrations. The database file (`db.sqlite3`) is created in the working directory on first run.

Migrations are located in `db/migrations/` and run automatically in order.

## Configuration Options

### Command Line Flags

- `-listen <addr>`: Listen address (default: `:8000`)

### Environment Variables

- `GOOGLE_CLIENT_ID`: Google OAuth client ID (required)
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret (required)

## Usage Tips

### Keyboard Shortcuts

Press `?` on the dashboard to see all available shortcuts:

- `N` - Create new widget
- `G` - Toggle grid
- `R` - Refresh all feeds
- `X` - Mark all as read (while hovering a widget)
- `Esc` - Close dialogs

### Widget Types

1. **RSS Feed**: Enter any RSS/Atom feed URL
2. **Iframe**: Embed websites with optional CSS injection to hide elements
3. **HTML**: Create custom content with the visual editor

### Customization

- **Colors**: Each widget can have custom background, header, and text colors
- **Grid Snapping**: Enable grid in settings for aligned layouts
- **Lock Widgets**: Prevent accidental moves with the lock button
- **Header Size**: Adjust widget header height in page settings

## Hosting on YunoHost

YunoHost is a self-hosting platform that simplifies server administration. Here's how to deploy NewsForNerds on YunoHost.

### Prerequisites

- A YunoHost server (v11+)
- SSH access to your server
- A domain or subdomain configured in YunoHost

### 1. Install Go

SSH into your YunoHost server and install Go:

```bash
sudo apt update
sudo apt install golang-go
```

Or install a newer version manually:

```bash
wget https://go.dev/dl/go1.21.6.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.6.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin
```

### 2. Create App Directory and Build

```bash
sudo mkdir -p /opt/newsfornerds
sudo chown $USER:$USER /opt/newsfornerds
cd /opt/newsfornerds

# Clone or copy the source code
git clone <repository-url> .

# Build the binary
go build -o newsfornerds ./cmd/srv
```

### 3. Configure Environment

```bash
cp .env.example .env
nano .env
```

Add your Google OAuth credentials. Set the redirect URI in Google Cloud Console to:
`https://your-domain.com/auth/callback`

### 4. Create Systemd Service

```bash
sudo nano /etc/systemd/system/newsfornerds.service
```

Paste:

```ini
[Unit]
Description=NewsForNerds RSS Dashboard
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/newsfornerds
EnvironmentFile=/opt/newsfornerds/.env
ExecStart=/opt/newsfornerds/newsfornerds -listen 127.0.0.1:8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo chown -R www-data:www-data /opt/newsfornerds
sudo systemctl daemon-reload
sudo systemctl enable newsfornerds
sudo systemctl start newsfornerds
```

### 5. Configure Nginx Reverse Proxy

Create an Nginx config for your domain:

```bash
sudo nano /etc/nginx/conf.d/newsfornerds.conf
```

Paste (replace `newsfornerds.yourdomain.com` with your actual domain):

```nginx
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name newsfornerds.yourdomain.com;

    # SSL managed by YunoHost
    include /etc/nginx/conf.d/ssl/newsfornerds.yourdomain.com.conf;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name newsfornerds.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

### 6. Set Up SSL with YunoHost

Add the domain in YunoHost admin panel, then install Let's Encrypt certificate:

```bash
sudo yunohost domain add newsfornerds.yourdomain.com
sudo yunohost domain cert install newsfornerds.yourdomain.com
```

Or if using a subdomain of an existing domain, the wildcard cert may already cover it.

### 7. Reload Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 8. Verify

Visit `https://newsfornerds.yourdomain.com` and sign in with Google.

### Updating NewsForNerds on YunoHost

```bash
cd /opt/newsfornerds
git pull
go build -o newsfornerds ./cmd/srv
sudo systemctl restart newsfornerds
```

### Troubleshooting

- **Check service status**: `sudo systemctl status newsfornerds`
- **View logs**: `sudo journalctl -u newsfornerds -f`
- **Check Nginx errors**: `sudo tail -f /var/log/nginx/error.log`
- **Test local connection**: `curl http://127.0.0.1:8000/`

## Development

### Regenerate SQL Code

After modifying `db/queries/*.sql`:

```bash
go tool github.com/sqlc-dev/sqlc/cmd/sqlc generate
```

### Build for Production

```bash
CGO_ENABLED=0 go build -o newsfornerds ./cmd/srv
```

## License

MIT
