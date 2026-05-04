# mdedit.io Security Status

**Datum:** 4. Mai 2026  
**Status:** Implementierte Basis-Schutzmaßnahmen vorhanden, weitere Härtung empfohlen

Diese Datei beschreibt den aktuellen Sicherheitsstand der Codebase. Sie ist kein externes Audit und keine formale Zertifizierung.

## Implementierte Security-Maßnahmen

### 🔴 P0 - KRITISCH (behoben)

#### 1. Cookie Secret Hardcoded ✅
**Problem:** Secret war hardcoded als "change-me"  
**Fix:** 
- ENV-Variable `COOKIE_SECRET` implementiert
- Fallback generiert sicheren Random-Secret mit Warnung
- `.env.example` mit Anleitung erstellt
- Docker Compose aktualisiert

**Dateien:** `server.js`, `.env.example`, `docker-compose.yml`

#### 2. Rate Limiting fehlte ✅
**Problem:** Keine DoS-Protection  
**Fix:**
- `@fastify/rate-limit` integriert
- Limit: 100 Requests/Minute pro IP
- Localhost whitelisted für Entwicklung

**Dateien:** `package.json`, `server.js`

#### 3. Security Headers fehlten ✅
**Problem:** Keine CSP, HSTS, etc.  
**Fix:**
- `@fastify/helmet` integriert
- Strict Content-Security-Policy konfiguriert
- restriktive Header per Helmet konfiguriert

**Dateien:** `package.json`, `server.js`

#### 4. Permalink Privacy-Leak ✅
**Problem:** Alle Pastes waren öffentlich via UUID zugänglich  
**Fix:**
- Neues `shared` Boolean-Feld in DB
- Nur explizit geteilte Pastes sind öffentlich
- API-Endpoint `/api/pastes/:id/share` für Toggle
- GET-Endpoint prüft nun `shared=1` Status

**Dateien:** `server.js`, `db.js`

#### 5. Secure Cookie Flag ✅
**Problem:** Cookies wurden auch über HTTP übertragen  
**Fix:**
- `secure: process.env.NODE_ENV === "production"`
- Automatisch HTTPS-only in Production

**Dateien:** `server.js`

### 🟠 P1 - HOCH (behoben)

#### 6. Temp File Cleanup ✅
**Problem:** Temp-Dateien wurden bei Errors nicht gelöscht  
**Fix:**
- `try/finally` Block in `exportWithPandoc()`
- Garantiertes Cleanup via `fs.rm(recursive)`
- Error-Logging bei Cleanup-Failures

**Dateien:** `server.js`

#### 7. Input Validation ✅
**Problem:** Keine Größenlimits auf Markdown  
**Fix:**
- Explizite Validierung: max 1MB Markdown
- HTTP 413 bei Überschreitung
- Title-Truncation auf 100 Zeichen

**Dateien:** `server.js`

### 🟡 P2 - PERFORMANCE (behoben)

#### 8. Fehlende DB-Indizes ✅
**Problem:** Langsame Queries bei vielen Pastes  
**Fix:**
- Composite Index: `(session_id, updated_at DESC)`
- Index auf `(shared, id)` für Permalink-Queries
- Index auf `sessions.last_seen` für Cleanup
- `busy_timeout` auf 5000ms erhöht

**Dateien:** `db.js`

#### 9. Session Cleanup fehlte ✅
**Problem:** Datenbank wächst unbegrenzt  
**Fix:**
- `cleanup.js` Script erstellt
- Entfernt Sessions >30 Tage inaktiv
- Löscht verwaiste Pastes
- VACUUM für DB-Optimierung
- Cron-Anleitung im README

**Dateien:** `cleanup.js`, `README.md`

#### 10. Client-seitige HTML-Sanitization für gerendertes Markdown ✅
**Problem:** Markdown-Rendering nutzt HTML-Injektion im Browser und braucht Schutz gegen unsichere Tags, Attribute und URLs  
**Fix:**
- `sanitizeRenderedHtml()` entfernt blockierte Tags wie `script`, `iframe`, `object`, `embed` und Formular-Elemente
- Event-Handler-Attribute wie `onclick` und `srcdoc` werden entfernt
- `href`- und `src`-Werte werden gegen Allow-Listen geprüft
- Inline-Styles werden auf wenige erlaubte Properties reduziert

**Dateien:** `public/app.js`

## Noch offen / Empfehlungen

### Rendering-Sanitization weiter härten oder auf DOMPurify umstellen
**Status:** ⚠️ Teilweise umgesetzt  
**Risiko:** MITTEL  
**Aufwand:** 2-4 Stunden  
**Beschreibung:** Es existiert bereits eine eigene Sanitization im Client. Sie reduziert das Risiko deutlich, ist aber eine proprietäre Allow-List und sollte gezielt weiter geprüft oder durch eine etablierte Bibliothek wie DOMPurify ersetzt werden.

**Empfohlene Lösung:**
```bash
npm install dompurify isomorphic-dompurify
```
Dann die bestehende Sanitization zentral ablösen oder gezielt gegen DOMPurify benchmarken und die verbleibenden HTML-Einschleusungspfade vereinheitlichen.

### CSRF-Protection
**Status:** ⚠️ Ausstehend  
**Risiko:** MITTEL  
**Aufwand:** 1 Stunde  
**Beschreibung:** State-changing Endpoints (POST/PUT/DELETE) haben keine CSRF-Tokens.

**Empfohlene Lösung:**
```bash
npm install @fastify/csrf-protection
```

### Horizontal Scalability
**Status:** ⚠️ Ausstehend  
**Risiko:** NIEDRIG (nur bei hoher Last)  
**Aufwand:** 1-2 Tage  
**Beschreibung:** SQLite-Sessions verhindern Load-Balancing über mehrere Server.

**Empfohlene Lösung:**
- Redis für Session-Storage, oder
- Sticky Sessions im Load Balancer (nginx `ip_hash`)

## Deployment-Checklist

Vor Production-Deployment prüfen:

- [ ] `COOKIE_SECRET` gesetzt (ENV-Variable)
- [ ] `NODE_ENV=production` gesetzt
- [ ] HTTPS/TLS konfiguriert (für Secure-Cookies)
- [ ] Nginx Reverse Proxy mit korrekten Headers
- [ ] Cron-Job für `cleanup.js` eingerichtet
- [ ] Backup-Strategie für SQLite-DB (z.B. litestream)
- [ ] Monitoring/Logging konfiguriert
- [ ] Rate-Limit-Settings für Production angepasst

## Testing

Funktionstest nach Update:
```bash
# Dependencies installieren
npm install

# Server starten (Dev)
npm run dev

# Tests durchführen:
# 1. Paste erstellen → sollte funktionieren
# 2. 101 Requests schnell → sollte rate-limited werden
# 3. Share-Toggle testen → POST /api/pastes/:id/share
# 4. Permalink ohne Share → sollte 404 geben
# 5. Export PDF/DOCX → Temp-Files sollten gelöscht werden
```

## Known Issues

### Fastify npm audit Warning
**Status:** Beobachten  
**Details:** `npm audit` sollte immer gegen die aktuell installierten Dependencies bewertet werden. Die Codebase nutzt derzeit Fastify `^5.8.5`, nicht mehr die frühere v4-Linie. Deshalb dürfen ältere Hinweise auf v4.x nicht mehr als Statusbeschreibung verwendet werden.

**Mitigation:** 
- Rate Limiting ist implementiert (schützt vor DoS)
- Body-Validation ist aktiv
- Monitoring empfohlen

**Langfristig:** Dependencies regelmäßig mit `npm run audit:prod` und dem Release-Gate prüfen.

## Zusammenfassung

**✅ Vorhanden:** mehrere wirksame Basis-Schutzmaßnahmen  
**⚠️ Offen:** vor allem CSRF sowie weitere Härtung der Sanitization  
**Einordnung:** solide Basis für eine selbst gehostete Beta, aber kein Anlass für überzogene Security-Versprechen

**Nächste Schritte:**
1. Dependencies installieren (`npm install`)
2. `.env` Datei mit COOKIE_SECRET erstellen
3. Testing durchführen
4. Rendering-Sanitization weiter härten oder durch DOMPurify ersetzen
5. Bei Bedarf: CSRF-Schutz ergänzen
6. Production-Deployment mit Checklist
