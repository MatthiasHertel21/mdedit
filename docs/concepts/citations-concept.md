# Scientific Documents & Citations Concept

Stand: 2026-05-06
Status: Zielbild und Produkt-/Architekturkonzept, keine Implementierung in diesem Schritt.

## Ziel

mdedit soll fuer laengere wissenschaftliche Arbeiten belastbar nutzbar werden.
Das Ziel ist nicht nur "Markdown mit gutem PDF-Export", sondern ein reproduzierbarer Thesis-Workflow.

Im Kern braucht mdedit dafuer drei Dinge:

- belastbare wissenschaftliche Metadaten
- referenzierbare Dokumentsemantik
- exportnahe, fachlich korrekte PDF- und DOCX-Pfade

## Leitthese

Fuer wissenschaftliche Dokumente fehlen mdedit heute weniger Layout-Funktionen als semantische Dokumentfunktionen.

Das Produkt hat bereits starke Bausteine fuer Druck und PDF:

- paged Preview mit Paged.js und Chromium
- Layoutmodell fuer wissenschaftsnahe Dokumente
- Pandoc-basierte Exportpfade
- Markdown-Attribute, Tabellen, Mermaid, KaTeX, TOC und Layoutmarker

Die Luecke liegt heute vor allem in:

- echtem YAML-Frontmatter mit sauberer Preview
- nativen Captions, Labels und Cross-References
- automatischer Nummerierung
- belastbaren Zitations- und Literaturpfaden
- echten seitengebundenen Fussnoten fuer note-style Anwendungsfaelle

## Produktbild

mdedit soll fuer wissenschaftliche Dokumente einen eigenen Modus erhalten.

Dieser Modus ist kein zweiter Editor, sondern eine Schicht ueber dem bestehenden Markdown- und Layoutsystem.

Er besteht aus drei Ebenen:

1. Metadatenebene
2. Dokumentsemantik
3. Exportpfade

## Verifizierter Ist-Zustand

### Bereits vorhanden

- Markdown-Vorschau mit `markdown-it`
- PDF- und DOCX-Export ueber Pandoc-basierte Pfade
- paged / druckechte Visualisierung mit Paged.js und Chromium
- Layout-Konfiguration fuer wissenschaftsnahe Dokumente
- Markdown-Fussnoten in Vorschau und Druck-CSS
- Tabellenlayouts, Mermaid und KaTeX

### Verifizierte Grenzen

- YAML-Frontmatter wird in der Live-Vorschau heute nicht als Frontmatter behandelt.
- Der bestehende `layout`-Block am Dokumentende ist fuer Layout gut geeignet, aber kein Ersatz fuer wissenschaftliche Dokumentmetadaten.
- Rohsyntax wie Pandoc-Zitationen oder Referenzmarker wird in der Browser-Vorschau nicht semantisch aufgeloest.
- Captions, Nummerierung, Listenverzeichnisse und Cross-References sind teilweise im Schema vorbereitet, aber nicht end-to-end abgesichert.
- Die vorhandene Fussnoten-Darstellung ist eine Endnoten-/Fussnoten-Sektion im Dokumentfluss, keine echte Seitenfussnote.
- Echte seitengebundene Zitat-Fussnoten sind im aktuellen Paged-Chromium-Stack nicht belastbar zusagbar.

## Schlussfolgerung

Es gibt zwei unterschiedliche Problemklassen, die getrennt behandelt werden muessen:

1. semantische Dokumentmodellierung
2. fachlich korrekte Exportverarbeitung

Die erste Klasse betrifft Frontmatter, Labels, Captions, Nummerierung, Cross-References, Appendix-Logik und Autorenkommentare.
Die zweite Klasse betrifft Citeproc, DOCX-/PDF-Pfade und echte Fussnotenstile.

Beides haengt zusammen, sollte aber nicht in einer einzelnen ad-hoc Exportfunktion vermischt werden.

## Normative Leitentscheidungen

### 1. Pandoc + Citeproc bleibt die normative Zitationsinstanz

mdedit soll keine eigene wissenschaftliche Zitationslogik im Frontend aufbauen.

Begruendung:

- Pandoc versteht Zitationssyntax, YAML-Metadaten und Bibliografiedateien.
- CSL liefert standardisierte Stildefinitionen.
- Dieselbe Quelle kann fuer PDF und DOCX genutzt werden.
- wissenschaftliche Stilregeln gehoeren nicht in CSS-Heuristiken des Frontends.

### 2. Wissenschaftliche Metadaten brauchen echtes YAML-Frontmatter

Wissenschaftliche Metadaten sollen nicht in einem proprietaeren `layout`-Block versteckt werden.

Begruendung:

- Titel, Autoren, Sprache, Bibliografie, CSL und Referenzsektion sind semantische Dokumentdaten.
- sie muessen fuer Pandoc/Citeproc unveraendert verarbeitbar bleiben
- sie muessen exportorientiert und spaeter auch UI-seitig editierbar sein

### 3. Captions, Labels, Nummerierung und Cross-References sind ein gemeinsames System

Diese Funktionen sollen nicht separat und nacheinander als Einzeltricks gebaut werden.

Begruendung:

- eine Caption ohne Label ist fuer Thesen nur halb nutzbar
- eine Nummerierung ohne Referenzauflosung bleibt fehleranfaellig
- Mermaid, Bilder und Tabellen sollen auf dieselbe Referenzlogik aufsetzen

### 4. Echte Fussnotenstile brauchen einen separaten PDF-Pfad

Note-style-Anwendungsfaelle sollen nicht ueber denselben Paged-Chromium-Pfad versprochen werden wie Literaturverzeichnis-orientierte Stile.

Begruendung:

- echte Seitenfussnoten sind im aktuellen HTML/Paged-Stack nicht belastbar genug
- ein LaTeX-basierter Pandoc-Pfad ist dafuer fachlich sauberer

## Zielarchitektur

### Ebene A: Metadaten

mdedit unterstuetzt wissenschaftliche Dokumentmetadaten ueber echtes YAML-Frontmatter am Dokumentanfang.

Beispiel:

```yaml
---
title: Titel der Masterarbeit
author:
  - Max Mustermann
date: 2026-05-06
lang: de-DE
bibliography:
  - bibliography/references.bib
csl: csl/apa.csl
reference-section-title: Literaturverzeichnis
link-citations: true
link-bibliography: true
---
```

Der bestehende `layout`-Block bleibt erhalten, aber mit klar getrennter Rolle:

- Frontmatter fuer Dokumentmetadaten und Exportsemantik
- `layout`-Block fuer Seitenlayout, Typografie und Print-Optionen

Beide Formate koexistieren im selben Dokument.

### Ebene B: Dokumentsemantik

Das wissenschaftliche Dokumentmodell soll folgende semantische Objekte kennen:

- Sections / Kapitel
- Tabellen
- Abbildungen
- Mermaid-Diagramme
- Formeln
- Appendix-Eintraege

Jedes Objekt kann spaeter folgende Eigenschaften tragen:

- optionale ID / Label
- optionale Caption
- automatische Nummer
- referenzierbarer Typ

Beispielhafte Zielsyntax:

```md
![Systemarchitektur](architektur.png){#fig:architektur width=80%}
: Abbildung: Systemarchitektur der Anwendung
```

```md
````mermaid {#fig:prozess caption="Forschungsprozess"}
flowchart LR
  A[Problem] --> B[Methode] --> C[Ergebnis]
````
```

```md
Wie in @fig:architektur dargestellt ...
Siehe Kapitel @sec:methodik.
```

### Ebene C: Exportpfade

#### Fall A: Paged PDF mit Literaturverzeichnis

`Markdown + YAML + Bibliografie -> Pandoc --citeproc -> HTML -> Paged/Chromium -> PDF`

Geeignet fuer:

- Autor-Jahr-Stile
- numerische Stile
- Literaturverzeichnis-orientierte wissenschaftliche Dokumente
- druckechtes Seitenlayout

#### Fall B: DOCX-Export

`Markdown + YAML + Bibliografie -> Pandoc --citeproc -> DOCX`

Geeignet fuer:

- Word-kompatible wissenschaftliche Texte
- spaetere Hochschulvorlagen per `reference.docx`

#### Fall C: PDF fuer echte Fussnotenstile

`Markdown + YAML + Bibliografie -> Pandoc --citeproc -> PDF via LaTeX`

Geeignet fuer:

- note-style CSL
- echte seitengebundene Zitat-Fussnoten
- Szenarien mit hoher Fussnotenanforderung

## Funktionsumfang des wissenschaftlichen Dokumentmodus

### Prioritaet 1

- echtes YAML-Frontmatter
- BibTeX/CSL-Workflow ueber Pandoc/Citeproc

### Prioritaet 2

- nativer Referenzkern fuer Captions, Labels, Nummerierung und Cross-References
- wissenschaftliche Exportmodi im UI
- exportnahe serverseitige Vorschau fuer wissenschaftliche Dokumente
- Appendix-Modus
- Tabellen-Metadaten fuer Caption, ID, Breite und Sonderlayout

### Prioritaet 3

- wissenschaftliche Spezialcontainer wie `definition`, `theorem`, `example`, `research-question`
- TOC-Optionen direkt im Markdown
- offizielle Autorenkommentar-Syntax

## Empfehlungen zu Syntax und Scope

### Frontmatter

Frontmatter ist die offizielle Syntax fuer wissenschaftliche Metadaten.

### Autorenkommentare

Autorenkommentare sollen nicht auf rohe HTML-Kommentare aufsetzen, weil HTML-Kommentare im bestehenden Layout-Preprocessor bereits fuer Layoutmarker verwendet werden.
Zugleich ist `%%` innerhalb von Mermaid-Diagrammen bereits als Kommentarsyntax belegt; eine globale Autorenkommentar-Syntax darf deshalb nicht unscoped dieselben Marker wiederverwenden.

Bevorzugte Zielrichtung:

- eigener semantischer Container oder klar abgegrenzte Syntax ausserhalb von Code-Fences
- keine unscoped Wiederverwendung von `%%`, um Konflikte mit Mermaid-Kommentaren zu vermeiden

### Captions

Captions sollen fuer Bilder, Tabellen und Mermaid auf dasselbe Modell aufsetzen.

### Cross-References

Cross-References sollen fuer mindestens folgende Typen vorgesehen werden:

- `@sec:...`
- `@fig:...`
- `@tbl:...`
- spaeter `@eq:...` und `@app:...`

### TOC

Der aktuelle `[[toc]]`-Mechanismus bleibt kompatibel.
Erweiterte TOC-Optionen sind sinnvoll, aber nicht Blocker fuer den wissenschaftlichen MVP.

### Appendix

Ein offizieller Appendix-Modus ist fachlich sinnvoll, aber nach Nummerierung und Referenzmodell zu priorisieren.

## Vorschaukonzept

### Phase 1

Normativ ist der Export, nicht die normale Live-Vorschau.

Zulaessige Zwischenstufe:

- Frontmatter wird in der Preview nicht als normaler Dokumentinhalt gerendert
- Referenzmarker koennen in der normalen Preview zunaechst roh oder vereinfacht erscheinen
- der Export erzeugt das fachlich korrekte Ergebnis

### Phase 2

Spaeter moegliche Varianten:

- serverseitige exportnahe Vorschau fuer wissenschaftliche Dokumente
- Paged Preview auf Basis serverseitig erzeugten, semantisch aufgeloesten HTMLs

Empfehlung:

- fuer wissenschaftliche Zuverlaessigkeit eher serverseitige Vorschau als eigene Frontend-Heuristiken

## Nicht-Ziele im ersten Schritt

- eigener Citation-Formatter im Frontend
- perfekte WYSIWYG-Vorschau fuer alle Zitationsstile in jeder Tippbewegung
- proprietaere Parallelsyntax fuer bibliografische Kerndaten ohne YAML-Kompatibilitaet
- automatische Konvertierung freier Literaturangaben in strukturierte Datensaetze
- echte Seitenfussnoten im Chromium-Paged-Export ohne Spezialpfad

## Technische Konsequenzen fuer mdedit

### Noetige Aenderungen an der Dokumentstruktur

- echtes YAML-Frontmatter in Preview und Export erkennen
- Editoroperationen frontmatter-sicher machen
- `layout`-Block und Frontmatter strikt trennen

### Noetige Aenderungen am semantischen Modell

- Labels fuer referenzierbare Objekte einfuehren
- Caption-/Nummerierungslogik auf Bilder, Tabellen und Mermaid ausdehnen
- Cross-Reference-Aufloesung vorbereiten
- Appendix- und spaeter Gleichungsnummerierung anschlussfaehig gestalten

### Noetige Aenderungen am Exportpfad

- Pandoc-Reader fuer wissenschaftliche Dokumente korrekt waehlen
- Frontmatter, Bibliografie und CSL aufloesen
- citeproc-verarbeitetes HTML fuer Paged-PDF erzeugen
- separaten PDF-Pfad fuer note-style-Fussnoten etablieren

## Risiken

- Erwartungsbruch, wenn Preview und Export semantisch unterschiedlich weit sind
- Pfad- und Ressourcenprobleme bei `.bib`- und `.csl`-Dateien
- halbfertige Caption-/Nummerierungsfeatures ohne Referenzkern erzeugen mehr Verwirrung als Nutzen
- Appendix- und Fussnotenfunktionen koennen leicht zu frueh versprochen werden
- Namenskonflikt mit bestehendem `preset-scientific`: Der CSS-Preset `preset-scientific` in `app.js` und `styles.css` ist ein rein visuelles Typo-Preset ohne dokumentsemantische Bedeutung. Der neue wissenschaftliche Dokumentmodus muss einen davon klar getrennten Bezeichner und eine eigene Zustandsrepraesentation erhalten, um Kollisionen im Code und in der UI zu vermeiden.

## Empfehlung fuer die Umsetzung

### Phase 1

- YAML-Frontmatter offiziell einfuehren
- wissenschaftliche Exportmetadaten verarbeiten
- Citeproc fuer PDF/DOCX produktiv machen

### Phase 2

- Referenzmodell fuer Sections, Bilder, Tabellen und Mermaid einfuehren
- automatische Nummerierung und Cross-References aufbauen
- native Captions anschliessen

### Phase 3

- wissenschaftliche Exportmodi, Appendix, Fussnotenpfad und exportnahe Vorschau ausbauen

## Akzeptanzkriterien fuer das Zielbild

- Ein wissenschaftliches Dokument kann gleichzeitig YAML-Frontmatter und `layout`-Block enthalten, ohne dass einer den anderen zerstoert.
- PDF und DOCX koennen ein Dokument mit Pandoc-Zitationssyntax, `.bib` und `.csl` fachlich korrekt exportieren.
- Bilder, Tabellen und Mermaid-Diagramme koennen mit IDs und Captions referenzierbar gemacht werden.
- Kapitel-, Tabellen- und Abbildungsnummern werden stabil und reproduzierbar erzeugt.
- Cross-References koennen im Export in nummerierte Referenzen aufgeloest werden.
- note-style-Fussnoten werden nicht ueber denselben Paged-PDF-Pfad versprochen wie Literaturverzeichnis-Stile.

## Entscheidungsvorlage

Die fachlich und technisch sauberste Richtung fuer mdedit ist:

- wissenschaftliche Dokumente als eigenen Produktmodus behandeln
- Zitationslogik an Pandoc+Citeproc delegieren
- Referenzmodell zentral fuer Captions, Nummerierung und Verweise aufbauen
- Paged/Chromium fuer Literaturverzeichnis-orientierte Stile nutzen
- echte Fussnotenstile ueber einen separaten PDF-Pfad behandeln

Damit entwickelt sich mdedit von "Markdown mit gutem PDF-Export" zu einem belastbaren wissenschaftlichen Markdown-Workflow.