# mdedit.io

Browser-based Markdown editor with live preview, document structure view, and export to Markdown, DOCX, and PDF.

## Documentation

- Operations and deployment docs: `docs/operations/`
- Architecture and engineering notes: `docs/engineering/`
- Product and feature concepts: `docs/concepts/`
- Examples and test material: `docs/examples/`, `docs/testing/`

You can find an overview in [docs/README.md](docs/README.md).

## Getting Started

### Prerequisites

- Node.js 20 or newer for local development, release checks, and `deploy-prod.sh`
- Docker and Docker Compose for the recommended runtime path
- Pandoc/LaTeX only for certain export paths outside the container

The browser runtime is loaded from locally bundled assets in `public/vendor/` and `public/vendor/npm/`. The active app path does not depend on external browser CDNs.

### Option 1: Docker (recommended)

```bash
# Start the containers
docker compose up -d

# Check status
docker compose ps

# Show logs
docker compose logs -f

# Or use the management script
./docker.sh start
./docker.sh logs
```

The app is available locally at `http://localhost:3210`.

See [docs/operations/DOCKER.md](docs/operations/DOCKER.md) for details.

**Security note for production:**

Before deploying to production, you **MUST** set a secure cookie secret:

```bash
# Create a .env file (based on .env.example)
cp .env.example .env

# Generate a secure secret
openssl rand -hex 32

# Add it to .env:
COOKIE_SECRET=your_generated_secret_here
```

For Docker Compose:

```bash
# Set the environment variable
export COOKIE_SECRET=$(openssl rand -hex 32)
docker compose up -d
```

Before public releases or production deployments, the release gate should always pass successfully:

```bash
npm run release:check
```

### Option 2: Direct Node.js start

1. Install dependencies:
   - `npm install`
2. Install Pandoc and LaTeX (for PDF export):
   ```bash
   # Ubuntu/Debian
   sudo apt-get install pandoc texlive-xetex texlive-latex-recommended librsvg2-bin
   ```
3. Start the server:
   - `npm run dev`
4. The app runs at `http://localhost:3210`.

Note: `npm run release:check` and `./deploy-prod.sh` require local Node 20+. If your host intentionally stays older, use the Docker path for production-like test runs.

## Nginx Reverse Proxy (example)

Point both domains to the same server:

```nginx
server {
  listen 80;
  server_name mdedit.io www.mdedit.io;

  location / {
    proxy_pass http://127.0.0.1:3210;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## Notes

- Session-based via HttpOnly cookie (`sid`)
- History is kept per session, no login required
- Tree view is based exclusively on headings (H1-H6)

## Security & Features

### Implemented security measures

- ✅ **Rate limiting**: 100 requests/minute per IP
- ✅ **Security headers**: CSP, HSTS, X-Frame-Options (via Helmet)
- ✅ **Secure cookies**: HttpOnly, SameSite=Lax, Secure in production
- ✅ **Input validation**: Markdown size limit (1 MB), SQL injection protection
- ✅ **Privacy**: Pastes are private by default (session-bound)
- ✅ **Temp file cleanup**: Automatic cleanup after export
- ✅ **Self-hosted frontend runtime**: Browser dependencies are served locally instead of being loaded from external CDNs at runtime

### Sharing & Privacy

Pastes are **private** by default and only visible within the current session. To share a paste:

```javascript
// POST /api/pastes/:id/share
{ "shared": true } // Makes the paste public via permalink
```

Only pastes explicitly marked as `shared: true` are visible to other users via permalink.

### Maintenance & Cleanup

Old sessions (>30 days inactive) should be cleaned up regularly:

```bash
# Manual
node cleanup.js

# Via cron (daily at 3:00 AM)
0 3 * * * cd /path/to/app && node cleanup.js >> /var/log/md-cleanup.log 2>&1
```

The cleanup script removes:
- Sessions with no activity for 30 days
- Orphaned pastes (whose session was deleted)
- Runs VACUUM for database optimization

## License

The source code of mdedit.io is licensed under the Apache License 2.0.

Copyright 2026 Matthias Hertel.

See `LICENSE` and `NOTICE` for details.

Documentation and website content are licensed under Creative Commons Attribution 4.0 International unless otherwise noted.

The names `mdedit`, `mdedit.io`, the domain, logos, icons and other brand assets are not licensed under the Apache License 2.0. See `TRADEMARKS.md`.

## Attribution

mdedit.io was originally created by Matthias Hertel.

When redistributing this software, please retain the copyright notice, license text and NOTICE file as required by the Apache License 2.0.
