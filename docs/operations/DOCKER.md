# mdedit.io - Docker Setup

## Quick Start

Voraussetzung fuer den empfohlenen Release-/Betriebspfad: Docker Compose sowie ein gesetztes `COOKIE_SECRET` fuer produktionsnahe Umgebungen.

### Mit Docker Compose (empfohlen)

```bash
# Build und Start
docker compose up -d --build

# Logs anzeigen
docker compose logs -f

# Stoppen
docker compose down

# Stoppen und Daten löschen
docker compose down -v
```

Die Anwendung ist dann erreichbar unter: http://localhost:3210

Health-Check:

```bash
curl -fsS http://localhost:3210/health
```

Vor einem Release sollte der betriebsnahe Check erfolgreich sein:

```bash
docker compose up -d --build md-tree
docker compose exec -T md-tree env CHROMIUM_BIN=/usr/bin/chromium node scripts/visual-smoke.js
```

### Mit Docker direkt

```bash
# Image bauen
docker build -t mdedit-io .

# Container starten
docker run -d \
  --name mdedit-io \
  -p 3210:3210 \
  -v $(pwd)/data:/app/data \
  mdedit-io

# Logs anzeigen
docker logs -f mdedit-io

# Container stoppen
docker stop mdedit-io
docker rm mdedit-io
```

## Datenpersistenz

Die SQLite-Datenbank wird im `./data` Verzeichnis gespeichert und bleibt beim Container-Neustart erhalten.

## Reverse Proxy (Nginx/Traefik)

Beispiel für Nginx:

```nginx
server {
    listen 80;
    server_name md.example.com;
    client_max_body_size 16m;
    
    location / {
        proxy_pass http://localhost:3210;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Fuer PDF-Exporte sollte der Reverse Proxy mindestens `client_max_body_size 16m;` setzen, damit paged Preview HTML nicht an einer zu kleinen Request-Grenze scheitert.

## Umgebungsvariablen

- `NODE_ENV`: Umgebung (production/development)
- `PORT`: Port auf dem der Server läuft (default: 3210)
- `DATA_DIR`: Verzeichnis für SQLite-Datenbank (default: /app/data)
- `COOKIE_SECRET`: Session-Secret; in produktionsnahen Umgebungen explizit setzen
- `RATE_LIMIT_MAX`: API Rate Limit pro Zeitfenster
- `SESSION_TTL_DAYS`: Aufbewahrungsdauer inaktiver Sessions

## Image Update

```bash
# Rebuild und Neustart
docker compose build
docker compose up -d
```

## Host Guardrails

Fuer produktionsnahe Hosts sollte jeder dauerhaft laufende Compose-Service explizite
Ressourcengrenzen tragen. Der Minimalstandard auf diesem Host ist:

- `mem_reservation` und `mem_limit` pro Dienst
- `pids_limit` fuer Anwendungs- und Proxy-Container
- `init: true` fuer lang laufende App-Container
- zur Lastdaempfung begrenzte Parallelitaet bei Exports (`MAX_CONCURRENT_EXPORTS=2` fuer mdedit)

Schneller Betriebscheck:

```bash
bash scripts/host-ops-check.sh
```

Der Check zeigt:

- Host-RAM und Swap
- laufende Container
- Container ohne harte Memory-/PID-Grenzen
- aktuelle Top-Docker-Memory-Consumer
- `fail2ban`-Status fuer `sshd`
- effektive SSH-Haertung

Wenn ein Host-Absturz oder OOM vermutet wird, zuerst diese drei Checks fahren:

```bash
bash scripts/host-ops-check.sh
journalctl -b -1 -n 200 --no-pager
sudo fail2ban-client status sshd
```

## Backup

```bash
# Datenbank sichern
docker compose exec md-tree sqlite3 /app/data/data.sqlite ".backup /app/data/backup.sqlite"

# Backup-Datei kopieren
cp ./data/backup.sqlite ./backup-$(date +%Y%m%d).sqlite
```

## Troubleshooting

### Container startet nicht

```bash
# Logs prüfen
docker compose logs md-tree

# Container-Status prüfen
docker compose ps
```

### Ports bereits belegt

Ändern Sie den Port in `docker-compose.yml`:

```yaml
ports:
  - "8080:3210"  # Host:Container
```

### Datenbank-Fehler

```bash
# Container neu starten
docker compose restart md-tree

# Datenbank zurücksetzen (ACHTUNG: Datenverlust!)
rm -rf ./data/*
docker compose restart md-tree
```

## Release-Hinweise

- Die Browser-Runtime wird aus lokal vendorten Assets ausgeliefert; fuer den Standardbetrieb sind keine externen Browser-CDNs erforderlich.
- `deploy-prod.sh` erzwingt Node 20+ und fuehrt vor dem Build `npm run audit:prod` sowie `npm run smoke:visual` aus.
- Fuer reproduzierbare Freigaben ist `npm run release:check` der minimale Gate vor einem oeffentlichen Rollout.
