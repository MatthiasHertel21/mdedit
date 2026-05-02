# MD Tree App - Docker Setup

## Quick Start

### Mit Docker Compose (empfohlen)

```bash
# Build und Start
docker-compose up -d

# Logs anzeigen
docker-compose logs -f

# Stoppen
docker-compose down

# Stoppen und Daten löschen
docker-compose down -v
```

Die Anwendung ist dann erreichbar unter: http://localhost:3210

### Mit Docker direkt

```bash
# Image bauen
docker build -t md-tree-app .

# Container starten
docker run -d \
  --name md-tree \
  -p 3210:3210 \
  -v $(pwd)/data:/app/data \
  md-tree-app

# Logs anzeigen
docker logs -f md-tree

# Container stoppen
docker stop md-tree
docker rm md-tree
```

## Datenpersistenz

Die SQLite-Datenbank wird im `./data` Verzeichnis gespeichert und bleibt beim Container-Neustart erhalten.

## Reverse Proxy (Nginx/Traefik)

Beispiel für Nginx:

```nginx
server {
    listen 80;
    server_name md.example.com;
    
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

## Umgebungsvariablen

- `NODE_ENV`: Umgebung (production/development)
- `PORT`: Port auf dem der Server läuft (default: 3210)
- `DATA_DIR`: Verzeichnis für SQLite-Datenbank (default: /app/data)

## Image Update

```bash
# Rebuild und Neustart
docker-compose build
docker-compose up -d
```

## Backup

```bash
# Datenbank sichern
docker-compose exec md-tree sqlite3 /app/data/data.sqlite ".backup /app/data/backup.sqlite"

# Backup-Datei kopieren
cp ./data/backup.sqlite ./backup-$(date +%Y%m%d).sqlite
```

## Troubleshooting

### Container startet nicht

```bash
# Logs prüfen
docker-compose logs md-tree

# Container-Status prüfen
docker-compose ps
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
docker-compose restart md-tree

# Datenbank zurücksetzen (ACHTUNG: Datenverlust!)
rm -rf ./data/*
docker-compose restart md-tree
```
