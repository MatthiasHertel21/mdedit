# Citations Implementation Plan

Stand: 2026-05-06
Status: Umsetzungsplan, keine Implementierung in diesem Schritt.

Bezug: `citations-concept.md`

## Ziel

Dieser Plan beschreibt die technische Umsetzung fuer wissenschaftliche Zitationen in mdedit.
Im Fokus stehen:

- fachlich korrekte Zitationsaufloesung
- belastbare PDF- und DOCX-Exporte
- minimale Eingriffe in bestehende Architektur
- klar getrennte Exportpfade fuer Literaturverzeichnis-Stile und echte Fussnotenstile

## Leitentscheidung

Pandoc mit Citeproc bleibt die einzige normative Instanz fuer Zitationsaufloesung.

Das bedeutet:

- keine eigene Zitationslogik im Frontend
- keine Formatierung von Literaturangaben durch `markdown-it`
- keine Kopplung von Stilfragen an CSS oder manuelle Fussnoten

## Ist-Architektur

### Relevante Komponenten

- Client-Editor erzeugt Markdown
- Preview basiert auf `markdown-it`
- Paged Preview basiert auf Paged.js
- PDF/DOCX-Export laeuft serverseitig ueber `/api/export/:format`
- serverseitiger PDF-Export kann Chromium-Paged, wkhtmltopdf oder Pandoc/LaTeX verwenden

### Kritische Beobachtung

Der aktuelle Paged-Export nutzt das vom Client gelieferte HTML.
Damit fehlt im Paged-Pfad heute die semantische Zitationsaufloesung.

## Ziel-Architektur

Die Ziel-Architektur erweitert den bestehenden Exportpfad um einen serverseitigen Citeproc-Vorverarbeitungsschritt. Dieser Schritt wird ausgefuehrt, bevor das HTML an Paged/Chromium uebergeben wird. Fuer DOCX laeuft Citeproc direkt als Teil des Pandoc-Aufrufs. Fuer den LaTeX-basierten Fussnotenpfad entfaellt der HTML-Zwischenschritt vollstaendig; Pandoc erzeugt das PDF direkt.

## Exportmodi

Es werden drei Exportmodi unterschieden.

### 1. `pdf-paged-citations`

Verwendung:

- Autor-Jahr-Stile
- numerische Stile
- zentrales Literaturverzeichnis
- druckechtes Layout mit Seitenvorschau

Pipeline:

`Markdown + Metadaten + Bibliografie -> Pandoc --citeproc -> HTML -> Paged/Chromium -> PDF`

### 2. `pdf-latex-footnotes`

Verwendung:

- note-style CSL mit echten Zitat-Fussnoten
- Layouts, bei denen seitengebundene Fussnoten Pflicht sind

Pipeline:

`Markdown + Metadaten + Bibliografie -> Pandoc --citeproc -> PDF via LaTeX`

### 3. `docx-citations`

Verwendung:

- Word-kompatible wissenschaftliche Texte
- spaetere Hochschulvorlagen per `reference.docx`

Pipeline:

`Markdown + Metadaten + Bibliografie -> Pandoc --citeproc -> DOCX`

## Metadatenmodell

Zitationsrelevante Metadaten muessen bei jedem Export vollstaendig und konsistent verarbeitbar sein. Sie koennen aus zwei Quellen stammen: dem dokumentinternen YAML-Frontmatter und expliziten API-Parametern. Dokumentinternes Frontmatter hat Vorrang; API-Parameter koennen gezielt einzelne Felder ueberschreiben, duerfen aber den Frontmatter-Block nicht zerstoeren.

## Dokumentquelle

Das Dokument bleibt Markdown.
Zitationsrelevante Metadaten muessen als echte Export-Metadaten verarbeitbar sein.

Notwendige Felder:

- `title`
- `author`
- `lang`
- `bibliography`
- `csl`
- `reference-section-title`
- `nocite`
- `link-citations`
- `link-bibliography`

## Ablagestrategie

Kurzfristig genuegt eine einfache Kombination aus:

- dokumentseitigen Metadaten
- zentral abgelegten Ressourcen an einem festen Pfad im Server-Datenverzeichnis

Hinweis: "projektweite Ressourcen" bedeutet in mdedit konkret Dateien an vereinbarten Pfaden relativ zum Server-Datenverzeichnis (z.B. `/app/data/bibliography/`). Ein allgemeines Projektkonzept existiert in mdedit derzeit nicht.

Beispiel:

```yaml
---
title: Meine Arbeit
author:
  - Max Mustermann
lang: de-DE
bibliography:
  - bibliography/references.bib
csl: csl/apa.csl
reference-section-title: Literaturverzeichnis
---
```

## Serverseitige Umsetzung

Die serverseitige Umsetzung erweitert die bestehenden Pandoc-Hilfsfunktionen um einen dedizierten Citeproc-Vorverarbeitungsschritt. Bestehende Exportpfade bleiben unveraendert aktiv; der neue Pfad wird nur eingeschlagen, wenn Zitationsmetadaten oder Zitationssyntax erkannt werden.

## Neue Kernfunktion

Es wird eine serverseitige Funktion benoetigt, die exportfaehiges Citeproc-HTML erzeugt.

Beispielname:

- `renderCitationsToHtml(markdown, options)`

Verhaeltnis zu bestehenden Funktionen:

- `renderCitationsToHtml()` ruft intern `runPandoc()` auf
- `exportWithPandoc()` wird fuer den bestehenden HTML-basierten Exportpfad unveraendert beibehalten
- der neue Pfad ersetzt `exportWithPandoc()` nur fuer Dokumente mit erkannter Zitationssyntax; alle anderen Dokumente laufen wie bisher

Input:

- Markdown-Dokument
- optional explizite Exportoptionen
- Ressourcenpfad fuer `.bib`, `.csl` und Medien

Output:

- citeproc-verarbeitetes HTML
- erkannter Zitationsmodus
- Metadaten fuer Folgeentscheidungen im PDF-Pfad

## Pandoc-Aufruf

Empfohlene Pandoc-Parameter fuer HTML-Zwischenformat:

- `--from=...` als explizit definierter wissenschaftlicher Reader beziehungsweise dokumentierte wissenschaftliche Markdown-Teilmenge
- `--to=html5`
- `--citeproc`
- `--standalone`
- `--resource-path=...`

Wichtig:

- der konkrete `--from`-Wert darf nicht implizit aus dem Status quo abgeleitet werden
- vor der Implementierung muss definiert werden, welche mdedit-Syntax Pandoc direkt lesen darf und welche normalisiert werden muss

Optional spaeter:

- `--metadata-file`
- `--lua-filter` fuer Erweiterungen

## Exportentscheidung im Server

Die bestehende Exportlogik sollte vor dem eigentlichen PDF-Lauf eine Entscheidung treffen.

Diese Entscheidung ist serverseitig normativ. Der Client darf Modi vorgeben, aber nicht die eigentliche Pfadwahl implizit durch UI-Flags erzwingen.

Pseudologik:

1. Eingehendes Markdown analysieren.
2. Pruefen, ob Zitationsmetadaten oder Zitationssyntax vorliegen.
3. Falls nein: bestehende Exportlogik unveraendert.
4. Falls ja:
   - fuer PDF Stilklasse bestimmen
   - fuer Paged-Stile zuerst Citeproc-HTML erzeugen
  - fuer Fussnotenstile vor SCI-023 einen klaren Fehler zurueckgeben; ab SCI-023 den LaTeX-basierten PDF-Pfad waehlen
5. Fuer DOCX immer Citeproc vor dem Export ausfuehren.

## Stilklassifikation

Die Stilklassifikation darf nicht nur an Dateinamen haengen.
Zulaessig sind zwei Stufen:

### MVP

- Im Citeproc Export MVP trifft der Server die normative Pfadentscheidung.
- bibliography-orientierte Dokumente laufen auf den Paged-Citeproc-Pfad.
- Requests fuer `PDF mit echten Fussnoten` werden bis SCI-023 mit klarem Fehler abgelehnt.
- Eine sichtbare Nutzerauswahl im Exportdialog folgt erst mit SCI-019 / Phase 2.

### Spaeter

- Nutzer waehlt im Exportdialog explizit:
  - `Paged PDF (Literaturverzeichnis)`
  - `PDF mit echten Fussnoten`
- der Server validiert diese Auswahl gegen vorhandene Metadaten und waehlt den finalen Exportpfad
- automatische Vorbelegung anhand des gewaehlten CSL-Stils
- explizite Uebersteuerung bleibt erhalten

## Clientseitige Umsetzung

## Minimalziel

Der Client muss fuer wissenschaftliche Exporte nicht sofort die finale Zitationsdarstellung in der Live-Vorschau abbilden.

Erforderlich im MVP (clientseitig):

- Erkennung, dass ein Dokument Zitationsmetadaten besitzt
- Uebergabe von Markdown plus Exportmetadaten an den Server

Erforderlich ab Phase 2 / SCI-019 (clientseitig):

- sichtbare Exportoptionen fuer Zitationsstil und Exportmodus

Erforderlich im MVP (serverseitig):

- Normalisierung oder klare Eingrenzung der wissenschaftlichen Markdown-Teilmenge vor dem Pandoc-Aufruf
- Routing-Logik fuer bibliography- versus footnote-orientierte Exportpfade

## Nicht im ersten Schritt noetig

- live gerenderte Citeproc-Vorschau in jeder Editor-Aenderung
- lokale Zitationsdatenbank im Browser
- clientseitige CSL-Auswertung

## API-Aenderungen

## PDF-Export-Request

Der Request sollte um zitationsrelevante Steuerfelder erweitert werden.

Beispiel:

```json
{
  "markdown": "...",
  "title": "...",
  "paged": true,
  "citationMode": "bibliography",
  "citationStyle": "apa.csl",
  "bibliography": ["bibliography/references.bib"]
}
```

Wichtig:

- der Server muss weiterhin den dokumentinternen YAML-Block respektieren
- explizite API-Parameter duerfen nur gezielt ueberschreiben

## DOCX-Export-Request

Analog zum PDF-Export, aber ohne Paged-spezifische Felder.

## Dateizugriff und Ressourcen

## Ressourcenpfad

Es braucht einen klaren Ressourcenpfad fuer:

- `.bib`
- `.csl`
- eingebettete Bilder
- spaeter `reference.docx`

Empfehlung:

- relativer Pfad aus dem Arbeitsverzeichnis des Servers
- zusaetzliche Begrenzung auf erlaubte Projektverzeichnisse

## Validierung

Vor dem Pandoc-Lauf muessen folgende Dinge serverseitig validiert werden:

- Bibliografiedateien existieren
- CSL-Datei existiert
- YAML ist parsebar
- Eingabe ist groessenbegrenzt
- Ressourcenpfade liegen innerhalb des erlaubten Datenverzeichnisses (Path-Traversal-Schutz)

Path-Traversal-Schutz ist Pflicht: Pfade fuer `.bib`- und `.csl`-Dateien koennen aus dem Dokument oder dem API-Request stammen. Vor jedem Pandoc-Aufruf muss `path.resolve()` auf den angegebenen Pfad angewendet und das Ergebnis gegen das erlaubte Basisverzeichnis (Server-Datenverzeichnis) abgeglichen werden. Pfade ausserhalb dieses Verzeichnisses oder absolute Pfade werden abgelehnt.

Bei Fehlern braucht es klare Exportfehler:

- Bibliografie nicht gefunden
- CSL nicht gefunden
- Pandoc-Zitationsfehler
- ungueltige Metadaten

## Vorschau-Strategie

## Phase 1

Normativ ist der Export, nicht die Live-Vorschau.

Optional sinnvoll:

- eigener Button `Export-Vorschau aktualisieren`
- serverseitig generiertes Citeproc-HTML fuer wissenschaftliche Layoutkontrolle

## Phase 2

Optionaler Endpunkt:

- `POST /api/preview/citations/html`

Rueckgabe:

- citeproc-verarbeitetes HTML fuer eine exportnahe Ansicht

Damit kann spaeter der Paged-Preview-Modus auf denselben HTML-Stand wie der PDF-Export gehoben werden.

## Tests

## Unit- und Integrationsfaelle

- Zitationssyntax wird mit `.bib` korrekt aufgeloest
- `#refs` fuehrt zu Literaturverzeichnis an definierter Stelle
- Wechsel des CSL-Stils aendert Darstellung ohne Quelldateiaenderung
- DOCX enthaelt Zitate und Literaturverzeichnis
- Paged-PDF enthaelt aufgeloeste Zitate statt Rohsyntax
- note-style PDF laeuft ueber separaten Fussnotenpfad (SCI-023/Sprint 6, kein Teil des Citeproc Export MVP)

## Visuelle Tests

Erweiterung des bestehenden visuellen Smoke-Tests um:

- fixture mit Literaturverzeichnis im Paged-Modus
- fixture mit note-style zur gezielten Pfadentscheidung
- fixture mit mehreren Zitatformen und Lokatoren

## Migrationsstrategie

## Phase 1

- Backend kann Citeproc-HTML fuer Exporte erzeugen
- Backend definiert und validiert die wissenschaftliche Markdown-Eingabe fuer Pandoc
- bestehender Paged-PDF-Pfad wird fuer Zitationsdokumente serverseitig ueber dieses HTML gespeist
- serverseitige Exportentscheidung fuer bibliography-orientierte Pfade ist implementiert
- Requests fuer den footnote-orientierten Modus geben bis SCI-023 einen klaren Fehler zurueck
- DOCX-Export bekommt Citeproc-Unterstuetzung

## Phase 2

- Frontend bietet Exportmodi fuer Zitationsdokumente an
- Frontend erkennt YAML-Metadaten und zeigt wissenschaftlichen Exportzustand an

## Phase 3

- produktiver LaTeX-Footnote-Pfad fuer note-style-Dokumente
- exportnahe serverseitige Vorschau
- optionale Verwaltung gemeinsam abgelegter Bibliografieressourcen im Server-Datenverzeichnis
- echte Vorlagenunterstuetzung fuer Hochschulen

## Risiko- und Aufwandseinschaetzung

### Niedriger Aufwand

- DOCX-Citeproc-Pfad
- Paged-PDF mit serverseitig erzeugtem Citeproc-HTML
- einfache YAML-Metadatenunterstuetzung im Export

### Mittlerer Aufwand

- Exportmodus-Umschaltung im UI
- robuste Dateipfad-Validierung
- serverseitige Vorschau

### Hoeherer Aufwand

- echte Fussnotenstile mit gesondertem PDF-Pfad
- komfortable Bibliografieverwaltung im Produkt

## Empfohlene erste Implementierung

1. Wissenschaftliche Markdown-Teilmenge und Pandoc-Reader vertraglich festlegen.
2. Citeproc im Server fuer DOCX aktivieren.
3. Citeproc-HTML fuer Paged-PDF erzeugen.
4. YAML-Metadaten im Exportpfad offiziell unterstuetzen.
5. Serverseitige Exportentscheidung fuer den Paged-PDF-Pfad einfuehren. (Der Fussnoten-PDF-Pfad folgt erst mit SCI-023/Sprint 6; Requests auf diesen Modus geben bis dahin einen klaren Fehler zurueck.)
6. Danach den Exportmodus im UI sichtbar machen.
7. Visuelle und inhaltliche Exporttests fuer Zitationsdokumente ergaenzen.

Damit wird mdedit schnell fuer wissenschaftliche Arbeiten mit zentralem Literaturverzeichnis nutzbar, ohne die Preview-Architektur sofort grundsaetzlich umzubauen.