# mdedit.io

Browserbasierter Markdown-Editor mit Live-Vorschau, Strukturansicht und Export nach Markdown, DOCX und PDF.

## Dokumentation

- Betriebs- und Deployment-Doku: `docs/operations/`
- Architektur- und Engineering-Notizen: `docs/engineering/`
- Produkt- und Feature-Konzepte: `docs/concepts/`
- Strategie und GTM-Material: `docs/strategy/`
- Beispiele und Testmaterial: `docs/examples/`, `docs/testing/`

Eine Übersicht findest du in [docs/README.md](docs/README.md).

## Start

### Voraussetzungen

- Node.js 20 oder neuer fuer lokale Entwicklung, Release-Checks und `deploy-prod.sh`
- Docker und Docker Compose fuer den empfohlenen Betriebsweg
- Pandoc/LaTeX nur fuer bestimmte Exportpfade ausserhalb des Containers

Die Browser-Runtime wird aus lokal mitgelieferten Assets unter `public/vendor/` und `public/vendor/npm/` geladen. Der aktive App-Pfad haengt nicht von externen Browser-CDNs ab.

### Option 1: Docker (empfohlen)

```bash
# Container starten
docker compose up -d

# Status prüfen
docker compose ps

# Logs anzeigen
docker compose logs -f

# Oder mit Management-Script
./docker.sh start
./docker.sh logs
```

Die App läuft lokal auf `http://localhost:3210`.

Siehe [docs/operations/DOCKER.md](docs/operations/DOCKER.md) für Details.

**🔒 Sicherheitshinweis für Production:**

Vor dem Deployment in Production **MUSS** ein sicherer Cookie-Secret gesetzt werden:

```bash
# .env Datei erstellen (basierend auf .env.example)
cp .env.example .env

# Sicheren Secret generieren
openssl rand -hex 32

# In .env eintragen:
COOKIE_SECRET=ihr_generierter_secret_hier
```

Für Docker Compose:
```bash
# Umgebungsvariable setzen
export COOKIE_SECRET=$(openssl rand -hex 32)
docker compose up -d
```

Vor oeffentlichen Releases oder Production-Deployments sollte immer der Release-Gate erfolgreich laufen:

```bash
npm run release:check
```

### Option 2: Direkter Node.js-Start

1. Abhängigkeiten installieren:
   - `npm install`
2. Pandoc und LaTeX installieren (für PDF-Export):
   ```bash
   # Ubuntu/Debian
   sudo apt-get install pandoc texlive-xetex texlive-latex-recommended librsvg2-bin
   ```
3. Server starten:
   - `npm run dev`
4. App läuft auf `http://localhost:3210`.

Hinweis: `npm run release:check` und `./deploy-prod.sh` setzen lokal Node 20+ voraus. Wenn dein Host absichtlich aelter bleibt, nutze den Docker-Pfad fuer den betriebsnahen Testlauf.

## Nginx Reverse Proxy (Beispiel)

Beide Domains auf denselben Server leiten:

```
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

## Notizen

- Session über HttpOnly Cookie (`sid`)
- Historie pro Session, kein Login
- Baumansicht basiert ausschließlich auf Überschriften (H1–H6)

## Sicherheit & Features

### Implementierte Security-Maßnahmen

- ✅ **Rate Limiting**: 100 Requests/Minute pro IP
- ✅ **Security Headers**: CSP, HSTS, X-Frame-Options (via Helmet)
- ✅ **Secure Cookies**: HttpOnly, SameSite=Lax, Secure in Production
- ✅ **Input Validation**: Markdown-Größenlimit (1MB), SQL-Injection-Schutz
- ✅ **Privacy**: Pastes sind standardmäßig privat (session-bound)
- ✅ **Temp File Cleanup**: Automatische Bereinigung nach Export
- ✅ **Self-hosted Frontend Runtime**: Browser-Abhaengigkeiten werden lokal ausgeliefert statt zur Laufzeit von externen CDNs geladen

### Sharing & Privacy

Pastes sind standardmäßig **privat** und nur für die eigene Session sichtbar. Um einen Paste zu teilen:

```javascript
// POST /api/pastes/:id/share
{ "shared": true }  // Macht Paste öffentlich via Permalink
```

Nur explizit als `shared: true` markierte Pastes sind via Permalink für andere Nutzer sichtbar.

### Wartung & Cleanup

Alte Sessions (>30 Tage inaktiv) sollten regelmäßig bereinigt werden:

```bash
# Manuell
node cleanup.js

# Via Cron (täglich um 3:00 Uhr)
0 3 * * * cd /pfad/zu/app && node cleanup.js >> /var/log/md-cleanup.log 2>&1
```

Das Cleanup-Script entfernt:
- Sessions ohne Aktivität seit 30 Tagen
- Verwaiste Pastes (deren Session gelöscht wurde)
- Führt VACUUM für Datenbank-Optimierung aus

## License

The source code of mdedit.io is licensed under the Apache License 2.0.

Copyright 2026 Matthias Hertel.

See `LICENSE` and `NOTICE` for details.

Documentation and website content are licensed under Creative Commons Attribution 4.0 International unless otherwise noted.

The names `mdedit`, `mdedit.io`, the domain, logos, icons and other brand assets are not licensed under the Apache License 2.0. See `TRADEMARKS.md`.

## Attribution

mdedit.io was originally created by Matthias Hertel.

When redistributing this software, please retain the copyright notice, license text and NOTICE file as required by the Apache License 2.0.
