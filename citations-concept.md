# Citations Concept

Stand: 2026-05-03
Status: Analyse und Zielbild, keine Implementierung in diesem Schritt.

## Ziel

mdedit soll fuer wissenschaftliche Arbeiten nutzbar werden.
Das schliesst ein:

- standardkonforme Zitation im Text
- automatische Erzeugung eines Literaturverzeichnisses
- optionale Ausgabe in Fussnotenstilen
- reproduzierbare Exporte nach PDF und DOCX
- eine Vorschau, die moeglichst nah am Export liegt

## Verifizierter Ist-Zustand

### Bereits vorhanden

- Markdown-Fussnoten in Vorschau und Druck-CSS
- PDF- und DOCX-Export ueber Pandoc
- paged / druckechte Visualisierung mit Paged.js und Chromium
- Layout-Konfiguration fuer wissenschaftsnahe Dokumente

### Verifizierte Grenzen

- Der aktuelle Paged-Chromium-Pfad rendert nur das uebergebene HTML.
- Rohe Pandoc-Zitationssyntax wie `[@doe2020, p. 5]` wird im Chromium-PDF unveraendert gedruckt, wenn sie nicht vorher aufgeloest wurde.
- Ein zentrales Literaturverzeichnis funktioniert im Paged-Chromium-Modus, wenn das HTML vorher mit Pandoc `--citeproc` erzeugt wurde.
- Echte seitengebundene Zitat-Fussnoten funktionieren im aktuellen Paged-Chromium-Stack nicht belastbar.
- Die vorhandene Fussnoten-Darstellung ist derzeit eine normale Endnoten-/Fussnoten-Sektion im Dokumentfluss, keine echte Druck-Fussnote am Seitenende.

## Schlussfolgerung

Es gibt zwei klar zu trennende Aufgaben:

1. Zitation fachlich korrekt aufloesen.
2. Das aufgeloeste Ergebnis druckgetreu rendern.

Der zweite Teil ist mit Paged/Chromium fuer normale Literaturverzeichnisse bereits tragfaehig.
Der erste Teil muss vor dem Paged-Export passieren.

## Zielarchitektur

### Normativer Kern

Pandoc mit Citeproc ist die normative Instanz fuer wissenschaftliche Zitationen.

Begruendung:

- Pandoc versteht Zitationssyntax, YAML-Metadaten und Bibliografiedateien.
- CSL liefert standardisierte Stildefinitionen.
- Dieselbe Quelle kann fuer Autor-Jahr-, numerische und Fussnotenstile genutzt werden.
- DOCX und PDF koennen aus demselben Zitationsmodell erzeugt werden.

### Empfohlene Verarbeitungskette

#### Fall A: Paged PDF mit Literaturverzeichnis

`Markdown + YAML + Bibliografie -> Pandoc --citeproc -> HTML -> Paged/Chromium -> PDF`

Eigenschaften:

- fachlich korrekte Zitationsaufloesung
- druckechtes Layout ueber vorhandenen Paged-Modus
- Literaturverzeichnis an definierter Stelle moeglich
- konsistent fuer seitenorientierte PDF-Ausgabe

#### Fall B: DOCX-Export

`Markdown + YAML + Bibliografie -> Pandoc --citeproc -> DOCX`

Eigenschaften:

- fachlich korrekte Zitationsaufloesung
- Literaturverzeichnis direkt im DOCX
- spaetere Nutzung von `reference.docx` fuer Hochschulvorlagen moeglich

#### Fall C: Note-Style-Zitationen als echte Seitenfussnoten

Nicht ueber den aktuellen Paged-Chromium-Pfad absichern.

Stattdessen bevorzugt:

- LaTeX-basierter Pandoc-PDF-Export fuer echte Fussnotenstile (XeLaTeX ist bereits im Docker-Image enthalten, kein zusaetzlicher Installationsaufwand)
- alternativ spaetere gesonderte Evaluierung eines anderen HTML/PDF-Stacks mit belastbarer Footnote-Float-Unterstuetzung

## Datenmodell

Das Zitationsmodell besteht aus drei Teilen: dem Markdown-Dokument mit YAML-Frontmatter, den Bibliografiedateien und dem CSL-Stil. Diese Teile sind separate Ressourcen, die erst beim Export durch Pandoc/Citeproc zusammengefuehrt werden. Kein Teil enthaelt Formatierungslogik; die Darstellung wird ausschliesslich durch CSL bestimmt.

## Dokumentquelle

Die Dokumentquelle bleibt Markdown.
Fuer wissenschaftliche Dokumente wird echtes YAML-Frontmatter benoetigt.

Beispiel:

```yaml
---
title: Beispielarbeit
author:
  - Max Mustermann
lang: de-DE
bibliography:
  - refs.bib
csl: apa.csl
reference-section-title: Literaturverzeichnis
link-citations: true
link-bibliography: true
---
```

Danach folgt normales Markdown mit Pandoc-Zitationssyntax.

Beispiel:

```md
Der Befund ist seit laengerem beschrieben [@doe2020, S. 15-18].

::: {#refs}
:::
```

## Koexistenz von YAML-Frontmatter und Layout-Block

mdedit verwendet ` ```layout``` `-Bloecke am Dokumentende fuer Layout-Konfiguration. Wissenschaftliche Dokumente benoetigen zusaetzlich echtes YAML-Frontmatter am Dokumentanfang. Beide koennen in einem Dokument koexistieren:

- das `---`-Frontmatter steht ganz oben und wird serverseitig durch Pandoc gelesen
- der ` ```layout``` `-Block steht am Ende und wird clientseitig durch `document-layout.js` gelesen
- beide Parser arbeiten unabhaengig voneinander, es gibt keinen Konflikt

Konsequenz fuer die Implementierung: Editoroperationen wie Metadaten-Aktualisierung muessen den YAML-Frontmatter-Block erhalten und duerfen ihn nicht entfernen oder ueberschreiben. Der Dokumentdialog fuer wissenschaftliche Metadaten muss gezielt in den Frontmatter-Block schreiben, nicht in den Layout-Block.

## Bibliografische Quellen

Unterstuetzte Formate im Zielbild:

- BibTeX / BibLaTeX
- CSL JSON
- CSL YAML
- RIS

Empfehlung fuer den Start:

- primaer `.bib`
- optional spaeter CSL JSON fuer API-getriebene Quellenverwaltung

## Ablagevarianten

### Variante 1: Dokumentlokal

- jedes Dokument referenziert eigene Bibliografiedateien
- hohe Portabilitaet
- einfacher Start

### Variante 2: Projektweit zentral

- ein gemeinsames Literaturverzeichnis pro Projekt oder Workspace
- mehrere Dokumente koennen dieselbe Datenbasis nutzen
- besser fuer Abschlussarbeiten und laengere Manuskripte

### Empfehlung

Fuer MVP und erste Implementierung:

- eine zentrale Bibliografiedatei an einem festen Pfad im Server-Datenverzeichnis, referenziert im Dokument-Frontmatter

Hinweis: "projektweite Bibliografie" bezeichnet in mdedit eine Datei an einem vereinbarten Pfad relativ zum Server-Datenverzeichnis (z.B. `bibliography/references.bib`). Ein allgemeines Projektkonzept existiert in mdedit derzeit nicht und ist keine Voraussetzung fuer diese Stufe.

Beispiel:

```yaml
bibliography:
  - bibliography/references.bib
```

Das ist fachlich sinnvoll, einfach zu sichern und kompatibel mit Pandoc.

## Stilmodell

Die Darstellung darf nicht durch eigene Heuristiken im Frontend definiert werden.
Stattdessen steuert ausschliesslich CSL den Ausgabestil.

Relevante Stilklassen:

- Autor-Jahr mit Literaturverzeichnis
- numerisch mit Literaturverzeichnis
- Note Style mit Zitat-Fussnoten

Konsequenz:

- ein Wechsel des Zitationsstils darf ohne Aenderung des Markdown-Quelltexts moeglich sein
- manuelle Markdown-Fussnoten fuer Literaturzitate sind keine bevorzugte Dauerloesung

## Vorschaukonzept

Die Vorschau hat im Zitationsmodell eine andere Rolle als der Export. Der Export ist normativ: er erzeugt das wissenschaftlich korrekte Dokument. Die Vorschau ist pragmatisch: sie unterstuetzt den Schreibfluss, muss aber nicht in jeder Phase mit dem Export identisch sein.

## Phase 1: Export ist normativ, Vorschau ist pragmatisch

In der ersten Ausbaustufe ist nicht erforderlich, dass die Live-Vorschau alle Zitationen final formatiert.
Wichtig ist, dass die Exporte fachlich korrekt sind.

Zulaessige Zwischenloesungen:

- rohe Zitationssyntax in der normalen Vorschau
- optional eine vereinfachte Darstellung fuer Zitationsmarker

## Phase 2: Zitationsnahe Vorschau

Spaeter moegliche Varianten:

- serverseitige Vorschau ueber Pandoc+Citeproc auf HTML
- clientseitige Zitationsverarbeitung mit separatem Citation-Processor

Empfehlung:

- fuer wissenschaftliche Zuverlaessigkeit eher serverseitige Vorschau fuer den finalen Exportmodus

## Exportstrategie

## PDF-Strategie

### Standardfall fuer wissenschaftliche Arbeiten mit Literaturverzeichnis

Nutze:

- Pandoc `--citeproc` fuer die Zitationsaufloesung
- HTML als Zwischenformat
- danach Paged/Chromium fuer druckechte PDF-Erzeugung

Geeignet fuer:

- Autor-Jahr-Stile
- numerische Stile
- zentrales Literaturverzeichnis
- reproduzierbares Layout auf A4-Seiten

### Sonderfall echte Fussnotenstile

Wenn der Stil echte seitengebundene Zitat-Fussnoten verlangt, ist ein zweiter PDF-Pfad vorzusehen:

- Pandoc `--citeproc`
- PDF direkt ueber LaTeX-Engine

Begruendung:

- akademische Note-Styles verlangen oft echte Fussnoten am Seitenende
- dies ist mit dem aktuellen Paged-Chromium-Stack nicht ausreichend abgesichert

## DOCX-Strategie

Nutze:

- Pandoc `--citeproc`
- spaeter optional `--reference-doc` fuer instituts- oder hochschulspezifische Formatvorlagen

## Bedienkonzept

## Dokumentmetadaten

Erforderlich:

- Feld fuer Bibliografie-Datei(en)
- Feld fuer CSL-Stil
- Feld fuer Sprache / Locale
- optional Titel fuer das Literaturverzeichnis

Diese Daten sollten nicht in einem proprietaeren Layout-Block versteckt werden, sondern als echtes YAML-Frontmatter oder als gleichwertige Metadatenquelle vorliegen.

## Zitationshilfe im Editor

Sinnvolle Komfortfunktionen:

- Einfuegen eines Zitationsschluessels aus vorhandener Bibliografie
- Suche nach Quelle anhand Autor, Titel, Jahr
- Einfuegen von Lokatoren wie `p.`, `pp.`, `chap.`
- Einfuegen eines `refs`-Blocks fuer Literaturverzeichnisse

## Stilumschaltung

Die UI sollte eine Stilumschaltung erlauben, ohne das Dokument umzuschreiben.

Beispielhafte Modi:

- APA / Harvard / Chicago author-date
- IEEE / Vancouver numerisch
- Chicago Notes / vergleichbare Fussnotenstile

## Nicht-Ziele im ersten Schritt

- eigener Citation-Formatter im Frontend
- automatische Konvertierung freier Literaturangaben in strukturierte Datensaetze
- perfekte WYSIWYG-Vorschau fuer alle Zitationsstile
- echte Seitenfussnoten im Chromium-Paged-Export ohne separaten Spezialpfad

## Technische Konsequenzen fuer mdedit

## Noetige Aenderungen am Exportpfad

- Der Markdown-Fallback fuer wissenschaftliche Dokumente darf nicht auf `gfm` als Eingabeformat begrenzt bleiben.
- Fuer Zitationsdokumente muss ein Pandoc-faehiger Reader mit `citations` verwendet werden.
- Vor dem Paged-Chromium-PDF muss Citeproc auf Markdown und Bibliografie angewandt werden.
- Der HTML-Exportpfad fuer Paged-PDF wird damit semantisch aufgewertet: nicht nur gerendertes Preview-HTML, sondern citeproc-verarbeitetes Export-HTML.

## Noetige Aenderungen an der Dokumentstruktur

- echtes YAML-Frontmatter unterstuetzen
- Bibliografie- und CSL-Ressourcen im Exportpfad aufloesen
- Platzierung des Literaturverzeichnisses ueber `#refs` oder Dokumentende unterstuetzen

## Noetige Aenderungen fuer Fussnotenstile

- bei note-style CSL nicht automatisch denselben PDF-Pfad wie fuer Autor-Jahr verwenden
- stattdessen Stilklasse erkennen oder explizit vom Nutzer waehlbar machen:
  - `paged-html` fuer Literaturverzeichnis-orientierte Stile
  - `latex-footnotes` fuer echte Fussnotenstile

## Risiken

- Uneinheitliche Vorschau, wenn Export schon citeproc nutzt, die Live-Vorschau aber noch nicht
- Pfad- und Ressourcenprobleme bei externen `.bib`- oder `.csl`-Dateien
- Erwartungsbruch, wenn Nutzer bei note-style Zitationen echte Seitenfussnoten erwarten, aber nur Endnoten erhalten
- spaetere Komplexitaet bei Mehrdokument-Projekten mit gemeinsamer Bibliografie

## Empfehlung fuer die Umsetzung

## Phase 1

- echtes YAML-Frontmatter fuer wissenschaftliche Metadaten
- Bibliografie-Datei und CSL-Stil im Export unterstuetzen
- PDF-Pfad fuer `Markdown -> Pandoc citeproc -> HTML -> Paged/Chromium -> PDF`
- DOCX-Pfad fuer `Markdown -> Pandoc citeproc -> DOCX`
- Literaturverzeichnis ueber `#refs` oder Dokumentende

Ergebnis:

- wissenschaftlich brauchbare Arbeiten mit zentralem Literaturverzeichnis
- druckechte PDF-Ausgabe fuer die meisten Stile ohne Fussnotenpflicht

## Phase 2

- UI fuer Bibliografie-Auswahl und Zitationshilfe
- serverseitige exportnahe Zitationsvorschau
- projektweite Quellenverwaltung

## Phase 3

- separater PDF-Pfad fuer note-style Zitationen mit echten Seitenfussnoten
- optionale Hochschulvorlagen fuer DOCX und PDF

## Akzeptanzkriterien

- Ein Dokument mit Pandoc-Zitationssyntax und `.bib`-Datei erzeugt in PDF und DOCX korrekt formatierte Zitate.
- Ein `#refs`-Platzhalter fuehrt im Export zu einem Literaturverzeichnis an definierter Stelle.
- Derselbe Quelltext kann mit anderem CSL-Stil ohne manuelle Textaenderungen neu ausgegeben werden.
- Der Paged-Chromium-PDF-Pfad ist fuer Literaturverzeichnis-orientierte Stile belastbar.
- Note-Style-Zitationen werden nicht ueber denselben Pfad versprochen, solange echte Seitenfussnoten dort nicht abgesichert sind.

## Entscheidungsvorlage

Fuer mdedit ist die fachlich und technisch sauberste Richtung:

- Zitationslogik an Pandoc+Citeproc delegieren
- Paged/Chromium fuer druckechte PDF-Ausgabe mit zentralem Literaturverzeichnis verwenden
- echte Fussnotenstile ueber einen separaten PDF-Pfad behandeln

Damit wird keine proprietaere Zitationslogik aufgebaut, und die vorhandene Druckvisualisierung kann dort genutzt werden, wo sie belastbar ist.