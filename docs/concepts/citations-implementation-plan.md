# Citations Implementation Plan

Stand: 2026-05-10
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

## Entscheidungsupdate 2026-05-10

- filesystem-basierte `.bib`-Dateipfade werden als unterstuetzter Autorenworkflow per Breaking Change entfernt
- die normative lokale Quelle fuer wissenschaftliche Dokumente ist eine dokumentgebundene eingebettete Bibliothek
- Zotero ist der erste externe Bibliotheks-Connector; OpenAlex dient als offener Recherche- und Metadaten-Lookup
- geteilte oder exportierte wissenschaftliche Dokumente muessen ohne Live-Zugriff auf externe Dienste reproduzierbar bleiben; dafuer gibt es einen lokalen Snapshot-Modus
- `docs/examples/masterthesis-reference.md` und die zugehoerigen Thesis-Fixtures werden im Rollout auf das eingebettete Bibliografieformat migriert

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

Der bestehende Paged-Render-Stack fuer Layout, Margin-Boxes und Seitenaufteilung bleibt dabei erhalten. Der Citeproc-Pfad ersetzt fuer Zitationsdokumente nicht die Layoutlogik, sondern die semantische HTML-Quelle. Dieselbe citeproc-verarbeitete HTML-Quelle soll fuer bibliography-orientierte Dokumente sowohl den paged Preview als auch den paged PDF-Pfad speisen.

## Exportmodi

Es werden drei Exportmodi unterschieden.

### 1. `pdf-paged-citations`

Verwendung:

- Autor-Jahr-Stile
- numerische Stile
- zentrales Literaturverzeichnis
- druckechtes Layout mit Seitenvorschau

Pipeline:

`Markdown + Metadaten + eingebettete Bibliothek oder Snapshot -> Pandoc --citeproc -> HTML -> Paged/Chromium -> PDF`

### 2. `pdf-latex-footnotes`

Verwendung:

- note-style CSL mit echten Zitat-Fussnoten
- Layouts, bei denen seitengebundene Fussnoten Pflicht sind

Pipeline:

`Markdown + Metadaten + eingebettete Bibliothek oder Snapshot -> Pandoc --citeproc -> PDF via LaTeX`

### 3. `docx-citations`

Verwendung:

- Word-kompatible wissenschaftliche Texte
- spaetere Hochschulvorlagen per `reference.docx`

Pipeline:

`Markdown + Metadaten + eingebettete Bibliothek oder Snapshot -> Pandoc --citeproc -> DOCX`

## Metadatenmodell

Zitationsrelevante Metadaten muessen bei jedem Export vollstaendig und konsistent verarbeitbar sein. Das dokumentinterne YAML-Frontmatter ist die normative Quelle fuer fachliche Zitationsmetadaten. Explizite API-Parameter sind zulaessig fuer operative Steuerung wie Exportmodus, Preview-Aktualisierung oder spaetere UI-Vorbelegungen; sie duerfen den Frontmatter-Block nicht zerstoeren.

## Dokumentquelle

Das Dokument bleibt Markdown. Zitationsrelevante Metadaten muessen als echte Export-Metadaten verarbeitbar sein.

Notwendige Felder:

- `title`
- `author`
- `lang`
- `citation-source`
- `csl`
- `reference-section-title`
- `nocite`
- `link-citations`
- `link-bibliography`

Optional zulaessig:

- `bibliography-visible`
- `zotero-library`
- `zotero-collection`

## Ablagestrategie

Die Ablage ist local-first.

Normativer Regelfall:

- dokumentseitige Metadaten im YAML-Frontmatter
- dokumentgebundene eingebettete Bibliothek als versionierter Block im Markdown

Externe Anbindungen sind nachgelagert:

- Zotero als read-only Bibliotheks-Connector
- OpenAlex als offener Lookup fuer Recherche und Metadatenimport
- `hybrid` als Dokumentmodus, der fuer Export und Teilen einen lokalen Snapshot der verwendeten Quellen festschreibt

Beispiel:

```yaml
---
title: Meine Arbeit
author:
  - Max Mustermann
lang: de-DE
citation-source: embedded
csl: csl/apa.csl
reference-section-title: Literaturverzeichnis
bibliography-visible: false
---
```

Beispiel fuer die eingebettete Bibliothek:

````markdown
```mdedit-bibliography
{
  "version": 1,
  "format": "csl-json",
  "items": [
    {
      "id": "doe2020",
      "type": "book",
      "title": "Example Book",
      "author": [{ "family": "Doe", "given": "Jane" }],
      "issued": { "date-parts": [[2020]] },
      "publisher": "Example Press"
    }
  ]
}
```
````

## Serverseitige Umsetzung

Die serverseitige Umsetzung erweitert die bestehenden Pandoc-Hilfsfunktionen um einen dedizierten Citeproc-Vorverarbeitungsschritt. Bestehende Exportpfade bleiben fuer nicht-wissenschaftliche Dokumente unveraendert aktiv; der neue Pfad wird eingeschlagen, sobald Zitationsmetadaten oder Zitationssyntax erkannt werden.

## Neue Kernfunktion

Es wird eine serverseitige Funktion benoetigt, die exportfaehiges Citeproc-HTML erzeugt.

Beispielname:

- `renderCitationsToHtml(markdown, options)`

Verhaeltnis zu bestehenden Funktionen:

- `renderCitationsToHtml()` ruft intern `runPandoc()` auf
- `exportWithPandoc()` bleibt fuer den bestehenden HTML-basierten Exportpfad erhalten
- der neue Pfad ersetzt `exportWithPandoc()` nur fuer Dokumente mit erkannter Zitationssyntax; alle anderen Dokumente laufen wie bisher

Input:

- Markdown-Dokument
- optional explizite Exportoptionen
- extrahierte eingebettete Bibliothek oder lokaler Snapshot
- optionaler Ressourcenpfad fuer `.csl` und Medien

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
- explizite Aktualisierung eines paged Preview, der fuer bibliography-orientierte Dokumente serverseitig erzeugtes Citeproc-HTML verwendet

Erforderlich ab Phase 2 / SCI-019 (clientseitig):

- sichtbare Exportoptionen fuer Zitationsstil und Exportmodus

Erforderlich im MVP (serverseitig):

- Normalisierung oder klare Eingrenzung der wissenschaftlichen Markdown-Teilmenge vor dem Pandoc-Aufruf
- Routing-Logik fuer bibliography- versus footnote-orientierte Exportpfade
- Bereitstellung derselben citeproc-verarbeiteten HTML-Quelle fuer paged Preview und paged PDF

## Nicht im ersten Schritt noetig

- live gerenderte Citeproc-Vorschau in jeder Editor-Aenderung
- bidirektionale Synchronisation mit Zotero
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
  "citationMode": "bibliography"
}
```

Wichtig:

- Bibliografie-, CSL- und Sprachangaben kommen im MVP aus dem YAML-Frontmatter des Dokuments
- der Server muss weiterhin den dokumentinternen YAML-Block respektieren
- explizite API-Parameter duerfen nur operative Steuerung leisten oder spaeter gezielt und validiert ueberschreiben

## DOCX-Export-Request

Analog zum PDF-Export, aber ohne Paged-spezifische Felder.

## Dateizugriff und Ressourcen

## Ressourcenpfad

Es braucht einen klaren Ressourcenpfad fuer:

- `.csl`
- eingebettete Bilder
- spaeter `reference.docx`

Empfehlung:

- relativer Pfad aus dem Arbeitsverzeichnis des Servers
- zusaetzliche Begrenzung auf erlaubte Projektverzeichnisse

## Validierung

Vor dem Pandoc-Lauf muessen folgende Dinge serverseitig validiert werden:

- eingebettete Bibliothek oder lokaler Snapshot sind parsebar
- CSL-Datei existiert
- YAML ist parsebar
- Eingabe ist groessenbegrenzt
- Ressourcenpfade liegen innerhalb des erlaubten Datenverzeichnisses (Path-Traversal-Schutz)

Path-Traversal-Schutz bleibt fuer `.csl`, Medien und spaetere Vorlagenpflicht. Dokumente mit filesystem-basierten `.bib`-Pfaden gelten nach der Breaking Change als ungueltig und muessen mit einer klaren Migrationsfehlermeldung abgelehnt werden.

Bei Fehlern braucht es klare Exportfehler:

- eingebettete Bibliothek fehlt oder ist ungueltig
- legacy `.bib`-Pfadworkflow wird nicht mehr unterstuetzt
- CSL nicht gefunden
- Pandoc-Zitationsfehler
- ungueltige Metadaten

## Vorschau-Strategie

## Phase 1

Normativ ist der Export, nicht die Live-Vorschau.

Im MVP sinnvoll und fuer paged Paritaet noetig:

- serverseitig generiertes Citeproc-HTML fuer bibliography-orientierte Dokumente
- explizite Aktualisierung des paged Preview ueber denselben HTML-Stand wie der paged PDF-Export
- normale unpaged Preview darf editornah bleiben

## Phase 2

Ausbau des Preview-Pfads:

- `POST /api/preview/citations/html`

Rueckgabe:

- citeproc-verarbeitetes HTML plus Validierungs- oder Statusinformationen fuer exportnahe Ansichten ausserhalb des paged Preview

Damit kann die exportnahe wissenschaftliche Vorschau ueber den paged Preview hinaus ausgebaut werden, ohne eine zweite semantische Zitationslogik im Frontend einzufuehren.

## Tests

## Unit- und Integrationsfaelle

- Zitationssyntax wird mit eingebetteter Bibliothek korrekt aufgeloest
- `#refs` fuehrt zu Literaturverzeichnis an definierter Stelle
- Wechsel des CSL-Stils aendert Darstellung ohne Quelldateiaenderung
- DOCX enthaelt Zitate und Literaturverzeichnis
- Paged-PDF enthaelt aufgeloeste Zitate statt Rohsyntax
- paged Preview und paged PDF liefern auf derselben Runtime fuer dieselbe citeproc-verarbeitete HTML-Quelle dieselbe Seitenzahl und dieselbe Platzierung des Literaturverzeichnisses
- note-style PDF laeuft ueber separaten Fussnotenpfad (SCI-023/Sprint 6, kein Teil des Citeproc Export MVP)
- `masterthesis-reference.md` funktioniert nach der Migration ohne externe `.bib`-Datei

## Visuelle Tests

Erweiterung des bestehenden visuellen Smoke-Tests um:

- fixture mit Literaturverzeichnis im Paged-Modus
- fixture mit Paritaetscheck zwischen paged Preview und paged PDF fuer bibliography-orientierte Zitationsdokumente
- fixture mit note-style zur gezielten Pfadentscheidung
- fixture mit mehreren Zitatformen und Lokatoren
- fixture mit eingebetteter Bibliothek und ausgeblendeter Rohdarstellung im Editor

## Migrationsstrategie

## Phase 1

- Backend kann Citeproc-HTML fuer Exporte erzeugen
- Backend definiert und validiert die wissenschaftliche Markdown-Eingabe fuer Pandoc
- Backend extrahiert die eingebettete Bibliothek oder einen lokalen Snapshot aus dem Dokument und erzeugt daraus die temporaere Citeproc-Ressource
- bestehender Paged-PDF-Pfad wird fuer Zitationsdokumente serverseitig ueber dieses HTML gespeist
- bibliography-orientierte Zitationsdokumente koennen denselben serverseitig erzeugten HTML-Stand im paged Preview verwenden
- serverseitige Exportentscheidung fuer bibliography-orientierte Pfade ist implementiert
- Requests fuer den footnote-orientierten Modus geben bis SCI-023 einen klaren Fehler zurueck
- DOCX-Export bekommt Citeproc-Unterstuetzung
- legacy Dokumente mit filesystem-basierten `.bib`-Pfaden erhalten einen klaren Breaking-Change-Hinweis statt stiller Weiterverarbeitung

## Phase 2

- Frontend bietet Exportmodi fuer Zitationsdokumente an
- Frontend erkennt YAML-Metadaten und zeigt wissenschaftlichen Exportzustand an
- Frontend fuehrt eine dokumentgebundene lokale Bibliothek inklusive Sichtbarkeitsoptionen ein
- `masterthesis-reference.md` und verwandte Thesis-Fixtures werden in das eingebettete Format migriert

## Phase 3

- produktiver LaTeX-Footnote-Pfad fuer note-style-Dokumente
- breiter ausgebaute exportnahe serverseitige Vorschau jenseits des paged Preview
- read-only Zotero-Connector plus lokaler Snapshot-Modus
- OpenAlex-Lookup fuer Recherche und Metadatenimport
- echte Vorlagenunterstuetzung fuer Hochschulen

## Risiko- und Aufwandseinschaetzung

### Niedriger Aufwand

- DOCX-Citeproc-Pfad
- Paged-PDF mit serverseitig erzeugtem Citeproc-HTML
- einfache YAML-Metadatenunterstuetzung im Export

### Mittlerer Aufwand

- Exportmodus-Umschaltung im UI
- robuste Validierung fuer eingebettete Bibliotheken und Snapshots
- breiter ausgebaute serverseitige Vorschau ausserhalb des paged Citations-MVP

### Hoeherer Aufwand

- echte Fussnotenstile mit gesondertem PDF-Pfad
- dokumentgebundene Quellenverwaltung im Produkt
- Zotero-Connector und Snapshot-Logik

## Empfohlene erste Implementierung

1. Wissenschaftliche Markdown-Teilmenge und Pandoc-Reader vertraglich festlegen.
2. Citeproc im Server fuer DOCX aktivieren.
3. Citeproc-HTML als gemeinsame semantische Quelle fuer paged Preview und Paged-PDF erzeugen.
4. YAML-Metadaten im Exportpfad offiziell unterstuetzen.
5. Serverseitige Exportentscheidung und paged Preview-Aktualisierung fuer den Paged-Citeproc-Pfad einfuehren. (Der Fussnoten-PDF-Pfad folgt erst mit SCI-023/Sprint 6; Requests auf diesen Modus geben bis dahin einen klaren Fehler zurueck.)
6. Danach dokumentgebundene eingebettete Bibliotheken mit lokalem Quellen-Modal einfuehren.
7. Anschliessend Zotero read-only und OpenAlex Lookup auf diesen lokalen Kern aufsetzen.
8. Visuelle und inhaltliche Exporttests fuer Zitationsdokumente inklusive `masterthesis-reference.md` im neuen Format ergaenzen.

Damit wird mdedit schnell fuer wissenschaftliche Arbeiten mit zentralem Literaturverzeichnis nutzbar, ohne an filesystem-basierten `.bib`-Dateipfaden als Autorenworkflow festzuhalten.