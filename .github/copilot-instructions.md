# Copilot Instructions — mdedit

Diese Datei ist verbindlich für alle Copilot-Sessions in diesem Repository.

---

## 1. Projektkontext

**mdedit** ist ein browser-basierter Markdown-Editor mit Fokus auf ernsthafte Dokumente (wissenschaftliche Arbeiten, Bücher, professionelle Langdokumente). Produktionspfad: `https://mdedit.io`. Entwicklung lokal unter `http://127.0.0.1:3210`.

**Architektur:**
- `server.js` — Fastify-Server, Routen, Export-Pipeline (Pandoc/wkhtmltopdf/LibreOffice)
- `public/app.js` — gesamte Editor-Logik (CodeMirror, Einstellungen, UI)
- `public/index.html` — Shell, alle UI-Elemente
- `public/styles.css` — alle Styles
- `public/modules/` — Layout-Preprocessor, Paged.js-Integration
- `public/i18n/*.json` — Lokalisierungsdateien (DE primär, EN und weitere)
- `public/tips.json` / `public/tips-en.json` — Editor-Hints
- `scripts/` — Smoke-Tests, Layout-Unit-Tests, i18n-Validierung

**Planungskanon:** `tmp/internal/product/` (lokal, nicht in Git)

---

## 2. Planungshierarchie (Top-Down, verbindlich)

```
concept.md / concept-*.md       ← konzeptuelle Basis
    ↓
roadmap.md                       ← Initiative sequenzieren
    ↓
sprints/SPR-XX.md                ← Sprint anlegen (aus sprints.md)
    ↓
tickets/INIT-NNN.md              ← Tickets anlegen (aus tickets.md)
    ↓
Code schreiben
```

**Regeln:**
1. Kein Sprint ohne zugehörige Initiative in `roadmap.md`.
2. Kein Ticket ohne zugehörigen Sprint in `sprints/SPR-XX.md`.
3. Nur Tickets umsetzen, die im aktiven Sprint unter `## Tickets` gelistet sind.
4. Entdeckte Out-of-Scope-Arbeit → neues Ticket anlegen, Sprint entscheiden, erst dann umsetzen.
5. Konzeptreife ist Voraussetzung für Sprintstatus. Unklare Tickets bleiben `prepared`.

**Legacy-Regel:**
- Artefakte, die vor dem 2026-05-13 erstellt oder zuletzt auf `done` gesetzt wurden, gelten als Legacy-Bestand.
- Legacy-Artefakte muessen nicht proaktiv auf das aktuelle Template nachgezogen werden.
- Sobald ein Legacy-Ticket oder Legacy-Sprint wieder aktiv bearbeitet, im Status geaendert, als Grundlage fuer neue Arbeit erweitert oder als `done` neu bestaetigt wird, muss es vor diesem Schritt auf die aktuelle Mindeststruktur gehoben werden.
- Neue Artefakte und alle neu bearbeiteten Artefakte muessen den aktuellen Vorlagen entsprechen.

---

## 3. Qualitätsregeln für Tickets

Jedes Ticket in `tickets/INIT-NNN.md` muss enthalten:

| Abschnitt | Pflicht | Inhalt |
|-----------|---------|--------|
| Metadaten-Tabelle | ✅ | Sprint, Typ, Status |
| **Problem** | ✅ | Beobachtbares Problem, keine Lösung |
| **Ziel** | ✅ | Eine überprüfbare Aussage |
| **Scope** | ✅ | In Scope + Out of Scope explizit |
| **Akzeptanzkriterien / DoD** | ✅ | Checkliste, mindestens 3 Punkte |
| **Implementierung** | bei Engineering | Dateipfade + Funktionsnamen |
| **Evidenz** | nach Umsetzung | Konkreter Beweis (Code-Anker + Validierung) |

**Evidenz-Format:**
- Bevorzugt: Datei + Funktionsname / Route / Selektor / Datenstruktur + ausgefuehrter Check
- Zeilennummern nur als zusaetzlicher Hinweis, nicht als alleiniger Nachweis

**Verbote:**
- Kein Ticket auf `done` ohne ausgefüllten Evidenz-Abschnitt.
- Kein Ticket auf `done` ohne alle DoD-Punkte erfüllt.
- Keine vagen Ziele ("verbessern", "optimieren") ohne messbares Kriterium.

**Template:** `tmp/internal/product/templates/ticket-template.md`

---

## 4. Qualitätsregeln für Sprints

Sprint-Dokumente in `sprints/SPR-XX.md` sind statusabhaengig:

| Abschnitt | Pflicht | Inhalt |
|-----------|---------|--------|
| Metadaten | ✅ | Status, Initiative, Stand |
| **Sprintziel** | ✅ | Ein Satz, nutzerseitig, nicht technisch |
| **Tickets** | ✅ | Tabelle oder Liste mit allen Sprint-Tickets |
| **Scope** | ab `active` | In Sprint + explizit nicht in Sprint |
| **Dokumentations-Pflichten** | ab `active` | help.html, tips.json oder n/a-Begruendung |
| **Exit-Kriterien** | ab `active` | Checkliste, alle Punkte abhakbar |
| **Evidenz** | ab `done` | Konkreter Nachweis pro Kriterium |

**Status-Regel:**
- `planned` / `prepared`: kompakte Sprint-Spec mit Metadaten, Ziel und Tickets reicht.
- `active`: Scope, Dokumentations-Pflichten und Exit-Kriterien muessen gepflegt sein.
- `done`: Evidenz-Abschnitt muss ausgefuellt sein.

**Sprint-Abschluss-Gate (verbindlich vor `done`):**
1. Alle Tickets im Sprint auf `done`.
2. `node scripts/layout-unit-test.js` → Exit 0.
3. `node scripts/i18n-validate.js` → keine neuen fehlenden Keys.
4. Relevante Smoke-Skripte gruen (je nach Sprintinhalt), z. B. `npm run smoke:stats`, `npm run smoke:reference-citations`, `npm run smoke:visual`, `node scripts/spr03-smoke.js` oder ein sprintspezifischer Check.
5. `help.html` / `help-en.html` aktualisiert — oder `help: n/a – <Grund>` gesetzt.
6. `tips.json` / `tips-en.json` aktualisiert — oder `tips: n/a – <Grund>` gesetzt.
7. Evidenz-Abschnitt ausgefüllt (keine Schätzwerte, konkrete Belege).
8. `sprints.md` Kanban-Tabelle aktualisiert.

**Template:** `tmp/internal/product/templates/sprint-template.md`

---

## 5. Qualitätsregeln für Concepts

Jedes Concept-Dokument `concept-*.md` muss enthalten:

| Abschnitt | Pflicht |
|-----------|---------|
| Problem und Motivation | ✅ |
| Leitfragen | ✅ |
| Zielgruppe | ✅ |
| Produktthese | ✅ |
| Scope und Grenzen (explizit beides) | ✅ |
| Technische Leitplanken | bei Engineering-lastigen Concepts |
| Offene Fragen | ✅ |
| Entscheidungslog | ✅ |

**Verbote:**
- Kein Concept ohne explizite Out-of-Scope-Liste.
- Keine Produktthese, die nicht falsifizierbar ist.

**Template:** `tmp/internal/product/templates/concept-template.md`

---

## 5a. Qualitätsregeln für Marketing / Discoverability

Marketing-Arbeit wird in zwei Typen unterschieden:

1. **Aktionen** — Directory-Submissions, Community-Posts, Outreach, Wettbewerbsbeobachtung, externe Profile
2. **Inhalte** — Landingpages, Meta-/OG-Texte, Sample-/Proof-Flaechen, Help-/Docs-Erweiterungen, Vergleichs- und Use-Case-Seiten

### Pflichtregeln fuer Marketing-Aktionen

- Jede Aktion braucht Zielplattform, Ziel der Aktion und eine klare Produkt- oder Evaluationsfolge (`App`, `Help`, `Sample Output`, `GitHub`, `Self-Hosting`).
- Einreichungen und Posts muessen auf kanonischen Produktdaten basieren: Name, URL, GitHub-Repo, Lizenz, Kernbeschreibung, keine ad-hoc Varianten.
- Keine erfundenen Markt-, Kunden-, Ranking-, Review- oder Nutzungsangaben. Wenn etwas nicht belegt ist, wird es nicht behauptet.
- Vergleichsaussagen zu Konkurrenz nur dann, wenn sie konkret und sachlich pruefbar sind (z. B. `self-hosted`, `no account`, `PDF/DOCX export`, `citations`).
- Community-Posts und Kommentare duerfen nicht als Copy-Paste-Spam verteilt werden; Kanaltext muss angepasst und im Ton zum Kanal passend sein.
- Evidence fuer Aktionen: Plattform, Datum, Status (`submitted`, `live`, `rejected`, `scheduled`), Ziel-URL oder Thread/Submission-Link und ggf. Review-Hinweis.

### Pflichtregeln fuer Marketing-Inhalte

- Jede neue On-Domain-Seite braucht eine konkrete Such-, Evaluations- oder Aktivierungsintention; keine generischen SEO-Texte ohne harten mdedit-Bezug.
- Jede Seite braucht mindestens einen Proof-Baustein: Sample-PDF, Screenshot, Referenzdokument, konkretes Setup-Snippet oder belastbares Feature-Beispiel.
- Jede Seite braucht einen klaren CTA-Pfad zur App, zu Help/Docs, zu GitHub oder zu Self-Hosting.
- Meta-Title, Meta-Description, interne Links und ggf. Sitemap-/Indexierungsrelevanz muessen im betroffenen Scope mitgeprueft werden.
- Off-Domain-Texte sollen adaptiert werden; dieselbe kanonische Produktaussage darf mehrfach verwendet werden, aber keine vollstaendige Textduplikation ohne Kanalanpassung.
- Kunden-, Nutzer- oder Social-Proof-Elemente nur mit echter Quelle und Verwendungsrecht.

### Evidenz-Format fuer Marketing

- **Aktionen:** Plattform + Datum + Status + eingereichte Ziel-URL / Thread-Link + verwendete Kurzbeschreibung oder CTA
- **On-Domain-Inhalte:** Route / Datei + Proof-Baustein + CTA-Ziel + ausgefuehrter Check (Smoke, HTTP-Check, Index-/Sitemap-Check, manueller UI-Check)
- **Monitoring / Beobachtung:** Quelle + Datum + beobachteter Befund + abgeleitete Konsequenz oder `keine Aktion`

**Template-Hinweis:**
- GTM-, Product-, Docs- und Discoverability-Tickets sollen im Ticket-Template den Zusatzblock `Produkt-/Marketing-Spezifik` ausfuellen, statt Marketing-Anforderungen lose als Stichpunkte zu notieren.

---

## 6. Code-Konventionen

### Allgemein
- **Minimal-invasiv:** Nur ändern, was direkt vom Ticket gefordert wird. Kein Refactoring nebenbei.
- **Keine neuen Abhängigkeiten** ohne explizite Entscheidung im Ticket oder Concept.
- **Sicherheit:** Keine XSS-Vektoren in dynamisch erzeugtem HTML (`innerHTML` nur mit sanitizierten Inhalten). Alle Server-Inputs validieren (siehe `SCI-008`-Muster).
- **Aenderungen an Persistenz / Runtime bewusst schneiden:** Schema-, Daten- oder Deploy-Aenderungen muessen als eigenes Risiko betrachtet und in Implementierung + Evidenz explizit benannt werden.

### JavaScript (`public/app.js`)
- Neue Funktionen direkt nach verwandten Funktionen einbauen, nicht am Dateiende.
- Event-Listener nur über `document.getElementById` oder `querySelector`; keine jQuery.
- Settings-Defaults in `defaultSettings` (Zeile ~57) pflegen, nicht verstreut.
- Alle nutzer-sichtbaren Strings müssen i18n-fähig sein (über `t()` oder `i18n`-Mechanismus).

### Server (`server.js`)
- Neue Routen mit Fastify-Schema-Validierung versehen.
- Keine Filesystem-Pfade aus User-Input ohne Sanitizing.
- Export-Routen folgen dem Muster der bestehenden `/export/*`-Handler.

### Persistenz / Datenbank
- Aenderungen an SQLite-Schema oder Initialisierung muessen idempotent sein und bei bestehender Datenbank sauber anlaufen.
- Schema-Aenderungen brauchen einen Nachweis fuer Bestandsdaten-Vertraeglichkeit oder einen expliziten Migrations-/Backfill-Schritt.
- Neue Felder, Tabellen oder Indizes in `db.js` nur mit begruendeter Rueckwaertskompatibilitaet und konkretem Validierungscheck.

### Accessibility / Langdokumente
- UI-Aenderungen muessen Tastaturbedienung, sichtbaren Fokus und sinnvolle ARIA-/Button-/Label-Semantik im betroffenen Workflow erhalten.
- Aenderungen an Preview, Outline, Layout, Mermaid, Zitationen oder Print duerfen Langdokument-Workflows nicht regressieren; wenn betroffen, mit Referenzdokument oder geeignetem Smoke/Layout-Test gegenpruefen.
- Mobile- oder Overlay-UI darf keine Kernaktion unzugaenglich machen (Editor, Preview, Export, Navigation, Dialoge).

### i18n
- Jeder neue UI-String bekommt einen Key in `public/i18n/de.json` (primär) und `public/i18n/en.json`.
- Übersetzungen für weitere Sprachen können als Stub (`""`) angelegt werden.
- Nach Änderungen: `node scripts/i18n-validate.js` ausführen.

### Tips (`public/tips.json`)
- Neue Tips am Ende anhängen, aufsteigende ID.
- Pflichtfelder: `id`, `category`, `title`, `text`, `example`.
- Immer synchron in `tips.json` (DE) und `tips-en.json` (EN) ergänzen.
- Nach Änderungen: JSON-Validität prüfen (`node -e "JSON.parse(require('fs').readFileSync('public/tips.json','utf8'))"`)

---

## 7. Arbeitsweise in Sessions

### Vor der Implementierung
1. Aktives Sprint-Dokument (`sprints/SPR-XX.md`) prüfen: Welche Tickets sind in Scope?
2. Ticket-Dokument lesen: Problem, Ziel, Akzeptanzkriterien verstehen.
3. Kurzen Plan nennen (3–5 Schritte) bevor Code geschrieben wird.

### Während der Implementierung
- Bei Scope-Abweichungen: stoppen, neues Ticket anlegen, erst dann umsetzen.
- Keine stillen Änderungen an unverwandten Dateien.
- Nach bedeutenden Schritten: Zwischenstand kurz erläutern.

### Nach der Implementierung
1. DoD-Punkte des Tickets abgleichen.
2. Relevante Smoke-Skripte nennen oder ausführen.
3. Evidenz in Ticket-Datei eintragen.
4. Ticket-Status auf `done`, Register in `tickets.md` aktualisieren.
5. Sprint-Exit-Kriterien prüfen — wenn alle erfüllt: Sprint auf `done`.
6. Bei Deploy-/Runtime-aehnlichen Aenderungen: Post-Deploy-Check oder begruendetes n/a festhalten.

### Validierung nach Änderungstyp
- **UI / i18n / Texte:** `node scripts/i18n-validate.js` und ein passender UI- oder Smoke-Check
- **Layout / Preview / Print:** `node scripts/layout-unit-test.js` plus `npm run smoke:visual` oder `npm run smoke:paged-parity`
- **Citations / Export:** `npm run smoke:reference-citations` und betroffene Export-/Preview-Checks
- **Stats / Marketing / Landingpages:** `npm run smoke:stats` oder ein passender Routen-Check; bei SEO-/Distribution-Flaechen zusaetzlich Meta-/CTA-/Linkpfad und ggf. Sitemap-/Indexierungscheck
- **Marketing-Aktionen / externe Distribution:** Submission-/Thread-Status, Ziel-URL, kanonische Produktdaten, angepasster Kanaltext und Evidenz der Einreichung dokumentieren
- **Server / API:** Syntax-/Fehlercheck, betroffener Endpunkt- oder Smoke-Check, Input-Validierung dokumentieren
- **Persistenz / DB / Schema:** Idempotenz mit bestehender DB oder Initialisierung pruefen, Rueckwaertskompatibilitaet dokumentieren, passenden Endpunkt-/Smoke-Check ausfuehren
- **Accessibility / UI-Interaktion:** Tastaturpfad, Fokus, ARIA/Labels und sichtbare Bedienbarkeit im betroffenen Workflow kurz pruefen
- **Langdokument / Preview / Navigation:** Referenzdokument, Layout-Test oder passender Smoke fuer lange Dokumente / grosse Tabellen / Zitationen / Mermaid nutzen
- **Deploy / Runtime / Infrastruktur-nah:** Syntax-/Build-Check vorab, danach HTTP-/Route-/Container- oder Prozess-Check fuer den betroffenen Pfad
- **Release-nahe Änderungen:** `npm run release:check` vor Freigabe, wenn mehrere kritische Bereiche betroffen sind

### Scope-Disziplin
- **Entdeckte Out-of-Scope-Arbeit** → Ticket anlegen (`tickets/INIT-NNN.md`), in `tickets.md` registrieren, Sprintzuordnung entscheiden. Erst dann umsetzen.
- **Produktplanung ist lokal:** `tmp/internal/product/` wird nicht committed. Planung bleibt getrennt von Codeänderungen.

---

## 8. QS-Checkliste für Sprint-Abschluss

Vor dem Setzen von `Status: done` im Sprint-Dokument:

```
[ ] Alle Tickets des Sprints: Status done + Evidenz ausgefüllt
[ ] node scripts/layout-unit-test.js → Exit 0
[ ] node scripts/i18n-validate.js → keine neuen fehlenden Keys
[ ] Relevanter Smoke grün (z. B. npm run smoke:stats / smoke:reference-citations / smoke:visual / node scripts/spr03-smoke.js)
[ ] Bei Marketing-/Discoverability-Arbeit: Proof, CTA-Pfad, kanonische Produktdaten und Submission-/Live-Status geprueft oder n/a dokumentiert
[ ] Bei DB-/Schema-Aenderungen: Initialisierung / Bestandsdaten-Vertraeglichkeit geprueft oder n/a dokumentiert
[ ] Bei UI-/Preview-Aenderungen: Accessibility-/Langdokument-Check im betroffenen Workflow durchgefuehrt oder n/a dokumentiert
[ ] Bei Deploy-/Runtime-Aenderungen: Post-Deploy-Check durchgefuehrt oder n/a dokumentiert
[ ] help.html / help-en.html: aktualisiert oder n/a begründet
[ ] tips.json / tips-en.json: aktualisiert oder n/a begründet
[ ] tips.json + tips-en.json: valides JSON geprüft
[ ] sprints.md Kanban: Status aktualisiert
[ ] Sprint-Datei: Evidenz-Abschnitt ausgefüllt (keine Platzhalter)
```

---

## 9. Was dieser Copilot nicht tut

- Keine Commits ohne funktionierenden Build/Smoke (außer explizit angefordert).
- Kein Refactoring oder "Verbesserungen" außerhalb des Ticket-Scope.
- Keine neuen npm-Dependencies ohne Ticket.
- Keine Änderungen an `deploy-prod.sh` oder Server-Konfiguration ohne expliziten Auftrag.
- Keine Löschung von Dateien ohne Bestätigung.
- Keine Annahmen über Produktionszustand — immer Codebase lesen, nicht raten.

---

## 10. Deployment & Sync-Regeln (verbindlich)

### Kanonischer Zustand

```
origin/main  ←→  Dev (md.2b6.de)  ←→  Prod (mdedit.io)
```

Alle drei müssen **immer auf demselben commit** laufen. Abweichungen sind ein Fehler, kein Normalzustand.

### Versionsprüfung

Am Sessionanfang, wenn Deployment-relevante Änderungen diskutiert werden oder ein Deploy geplant ist, immer prüfen:

```bash
curl -s http://127.0.0.1:3210/api/version     # Dev
curl -s https://mdedit.io/api/version          # Prod
git log --oneline -1                           # Lokaler HEAD
```

Wenn die drei Versionen abweichen: erst aufklären, dann handeln.

### Commit vor Deploy — keine Ausnahme

- **Vor jedem Deploy (dev oder prod) müssen alle relevanten Änderungen committed und gepusht sein.**
- Uncommitted Working-Tree-Änderungen werden niemals direkt deployed (weder durch `docker compose build` noch durch Datei-Kopieren).
- Ausnahme: explizit benannte Hotfix-Session mit sofortigem Folge-Commit.

### Prozess: Commit → Push → Deploy

```
1. git add <dateien>
2. git commit -m "<typ>: <beschreibung>"
3. git push origin main
4. Dev rebuilden:  docker compose build && docker compose up -d
5. Dev prüfen:     curl http://127.0.0.1:3210/api/version
6. Prod deployen:  PROD_DIR=... ./deploy-prod.sh  (nur nach explizitem Auftrag)
7. Prod prüfen:    curl https://mdedit.io/api/version
```

### Session-Ende-Pflicht

Am Ende jeder Session mit Code-Änderungen:
- Prüfen: `git status` — gibt es uncommitted changes?
- Wenn ja: entweder committen (bevorzugt) oder explizit als WIP festhalten (z. B. Session-Memory-Notiz).
- Niemals stillschweigend mit offenem Working Tree enden, wenn Änderungen deployment-relevant sind.

### Sync-Check als Teil der Sprint-Exit-Kriterien

In der QS-Checkliste (Abschnitt 8) gilt zusätzlich:
```
[ ] git status → kein uncommitted Code der bereits deployed ist
[ ] Dev und Prod laufen auf demselben commit (api/version check)
```
