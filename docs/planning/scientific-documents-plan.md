# Scientific Documents Implementation Plan

Stand: 2026-05-06
Status: Ticket- und Sprintplan fuer die Umsetzung des wissenschaftlichen Dokumentmodus.

Bezug:

- `docs/concepts/citations-concept.md`
- `docs/concepts/citations-implementation-plan.md`

## Ziel

Dieser Plan uebersetzt das Konzept in umsetzbare Arbeitspakete.

Leitgedanke:

- zuerst die fachlichen Grundpfeiler absichern
- dann den semantischen Referenzkern aufbauen
- danach Komfort, Spezialfaelle und hochschulnahe Workflows erweitern

## Delivery-Prinzipien

- keine isolierten Teilfeatures fuer Captions, Nummerierung oder Referenzen
- Export bleibt fuer wissenschaftliche Dokumente normativ
- Preview darf stufenweise nachziehen
- bestehende Nicht-Zitationsdokumente duerfen funktional nicht regressieren

## Epics

### Epic A: Scientific Metadata Foundation

Ziel:

- YAML-Frontmatter offiziell unterstuetzen
- Frontmatter und `layout`-Block sauber koexistieren lassen
- wissenschaftliche Metadaten im Export nutzbar machen

### Epic B: Citation Export Pipeline

Ziel:

- Citeproc fuer PDF und DOCX produktiv machen
- Stilklassen sauber in Exportmodi trennen
- wissenschaftliche Markdown-Eingabe fuer Pandoc robust normalisieren
- Ressourcenpfade robust validieren

### Epic C: Semantic References Core

Ziel:

- Labels, Captions, Nummerierung und Cross-References als gemeinsames System aufbauen

### Epic D: Scientific Authoring UX

Ziel:

- Exportmodus-UI
- Frontmatter-/Metadatenkomfort
- Referenz- und Zitationshilfen

### Epic E: Advanced Scientific Output

Ziel:

- Appendix-Modus
- note-style-Fussnotenpfad
- exportnahe Vorschau

## Sprintplan

### Sprint 1: Frontmatter Foundation

Sprintziel:

- wissenschaftliche Metadaten offiziell in den Dokumentpfad integrieren, ohne bestehende Layoutfunktionen zu brechen

Tickets:

### SCI-001 Frontmatter parser for preview pipeline

- Typ: Engineering
- Beschreibung: Frontmatter am Dokumentanfang erkennen und vom normalen Preview-Inhalt trennen.
- Akzeptanzkriterien:
  - Dokumente mit YAML-Frontmatter rendern den Block nicht mehr als normalen Fliesstext.
  - Dokumente ohne Frontmatter verhalten sich unveraendert.

### SCI-002 Preserve frontmatter in editor operations

- Typ: Engineering
- Beschreibung: Editor- und Layoutoperationen duerfen vorhandenes Frontmatter nicht loeschen oder ueberschreiben.
- Akzeptanzkriterien:
  - `layout`-Aktualisierung erhaelt vorhandenes Frontmatter.
  - Speichern/Exportieren veraendert den Frontmatter-Block nicht implizit.

### SCI-003 Formalize scientific metadata fields

- Typ: Product/Engineering
- Beschreibung: Unterstuetzte Metadatenfelder fuer wissenschaftliche Dokumente definieren und validieren.
- Akzeptanzkriterien:
  - Felder fuer `title`, `author`, `lang`, `bibliography`, `csl`, `reference-section-title`, `nocite`, `link-citations`, `link-bibliography` sind dokumentiert.

### SCI-004 Concept alignment for frontmatter status

- Typ: Docs
- Beschreibung: Konzept- und Planungsdokumente auf konsistente Formulierungen zu Ist-Zustand und Zielbild bringen. Die externe FAQ ist internisiert; dieser Task bezieht sich auf die internen Konzeptdokumente.
- Akzeptanzkriterien:
  - citations-concept.md beschreibt Ist-Zustand und Zielbild konsistent.
  - citations-implementation-plan.md und scientific-documents-plan.md sind zueinander widerspruchsfrei.

### Sprint 2: Citeproc Export MVP

Sprintziel:

- fachlich korrekte Zitationsaufloesung fuer PDF und DOCX produktiv machen

Tickets:

### SCI-005 Detect citation documents in export pipeline

- Typ: Engineering
- Beschreibung: Exportpfad erkennt Zitationssyntax und/oder wissenschaftliche Metadaten.
- Akzeptanzkriterien:
  - Nicht-wissenschaftliche Dokumente laufen unveraendert weiter.
  - wissenschaftliche Dokumente schalten in den Citeproc-Pfad.

### SCI-005a Normalize scientific markdown for Pandoc reader

- Typ: Engineering
- Beschreibung: Vor dem Pandoc-Lauf wird definiert und implementiert, welche mdedit-Syntax fuer wissenschaftliche Exporte direkt kompatibel ist und welche vor dem Reader-Aufruf normalisiert oder ausgeschlossen werden muss.
- Akzeptanzkriterien:
  - Es gibt eine dokumentierte wissenschaftliche Markdown-Teilmenge fuer den Export.
  - YAML-Frontmatter, Zitationssyntax und Ressourcenpfade werden ohne Verlust an Pandoc uebergeben.
  - mdedit-spezifische Syntax fuehrt nicht zu stillen Fehlinterpretationen im Citeproc-Pfad.

### SCI-006 Render citeproc HTML for paged PDF

- Typ: Engineering
- Beschreibung: Server erzeugt fuer Paged-PDF citeproc-verarbeitetes HTML.
- Akzeptanzkriterien:
  - rohe Pandoc-Zitationssyntax erscheint im PDF nicht mehr unverarbeitet.
  - Literaturverzeichnis wird an `#refs` oder Dokumentende erzeugt.

### SCI-006a Server-side citation export routing

- Typ: Engineering
- Beschreibung: Der Server trifft die verbindliche Exportentscheidung fuer bibliography-orientierte Citations-Pfade und validiert Client-Vorgaben gegen Dokumentmetadaten. Der footnote-orientierte LaTeX-Pfad wird erst mit SCI-023 implementiert; bis dahin wird ein Request auf diesen Modus mit einem klaren Fehler abgelehnt statt implizit auf einen anderen Pfad zu fallen.
- Akzeptanzkriterien:
  - PDF-Requests werden serverseitig deterministisch auf den Paged-Citeproc-Pfad geroutet.
  - Requests fuer den LaTeX-Footnote-Modus geben einen klaren Fehler zurueck, solange SCI-023 nicht implementiert ist.
  - Client-Vorgaben fuer den Exportmodus koennen validiert und explizit ueberschrieben werden.
  - Fehlkonfigurationen fuehren zu klaren Exportfehlern statt zu impliziten Fallbacks.

### SCI-007 Enable citeproc DOCX export

- Typ: Engineering
- Beschreibung: DOCX-Export fuehrt fuer wissenschaftliche Dokumente Pandoc `--citeproc` aus.
- Akzeptanzkriterien:
  - DOCX enthaelt aufgeloeste Zitate und Literaturverzeichnis.

### SCI-008 Validate bibliography and CSL paths

- Typ: Engineering/Security
- Beschreibung: Pfadvalidierung fuer `.bib`- und `.csl`-Dateien.
- Akzeptanzkriterien:
  - Path Traversal wird verhindert.
  - klare Exportfehler fuer fehlende Ressourcen.

### SCI-009 Export fixtures for citation regression tests

- Typ: QA
- Beschreibung: Testfixtures fuer Paged-PDF und DOCX mit Zitationen.
- Akzeptanzkriterien:
  - visuelle und inhaltliche Regressionstests decken mindestens Autor-Jahr und numerische Stile ab.

### Sprint 3: Semantic References Core I

Sprintziel:

- referenzierbare Sections und Heading-Nummerierung etablieren

Tickets:

### SCI-010 Section identifier model

- Typ: Engineering
- Beschreibung: IDs/Labels fuer Kapitel und Abschnittsziele definieren.
- Akzeptanzkriterien:
  - Sections koennen stabile Zielanker erhalten.

### SCI-011 Heading numbering engine

- Typ: Engineering
- Beschreibung: Nummerierungslogik fuer Kapitel und Unterkapitel aufbauen.
- Akzeptanzkriterien:
  - H1/H2/H3 koennen reproduzierbar nummeriert werden.
  - Nummerierung ist fuer Export und spaeter TOC nutzbar.

### SCI-012 Section cross-reference syntax

- Typ: Engineering
- Beschreibung: `@sec:...` im semantischen Modell und Export aufloesen.
- Akzeptanzkriterien:
  - Referenzen auf Kapitel koennen in nummerierte Ziele umgeschrieben werden.

### SCI-013 TOC integration with numbering groundwork

- Typ: Engineering
- Beschreibung: TOC auf kuenftige Nummerierungsdaten vorbereiten.
- Akzeptanzkriterien:
  - keine Regression fuer `[[toc]]`
  - Erweiterungspfad fuer nummerierte TOC-Eintraege dokumentiert

### Sprint 4: Semantic References Core II

Sprintziel:

- Bilder, Tabellen und Mermaid als referenzierbare wissenschaftliche Objekte behandeln

Tickets:

### SCI-014 Figure caption syntax MVP

- Typ: Engineering/Product
- Beschreibung: MVP-Syntax fuer Bild-Captions und Labels definieren und implementieren.
- Akzeptanzkriterien:
  - Bilder koennen Caption und ID erhalten.

### SCI-015 Table caption and ID support

- Typ: Engineering
- Beschreibung: Tabellen-Captions, IDs und Grundmetadaten unterstuetzen.
- Akzeptanzkriterien:
  - Tabellen koennen Caption und ID erhalten.

### SCI-016 Mermaid caption and ID support

- Typ: Engineering
- Beschreibung: Mermaid-Codebloecke koennen Caption und ID erhalten.
- Akzeptanzkriterien:
  - Mermaid-Diagramme sind als Figuren referenzierbar.

### SCI-017 Figure and table numbering engine

- Typ: Engineering
- Beschreibung: automatische Nummerierung fuer Abbildungen und Tabellen.
- Akzeptanzkriterien:
  - Bild-, Tabellen- und Mermaid-Captions werden konsistent nummeriert.

### SCI-018 Cross-reference resolver for fig/tbl

- Typ: Engineering
- Beschreibung: `@fig:...` und `@tbl:...` aufloesen.
- Akzeptanzkriterien:
  - Export erzeugt referenzierte Nummern statt Rohmarker.

### Sprint 5: Scientific Export Modes & UX

Sprintziel:

- wissenschaftliche Exportmodi fuer Nutzer sichtbar machen und auf die bereits vorhandene serverseitige Exportentscheidung aufsetzen

Tickets:

### SCI-019 Export mode selector

- Typ: Engineering/UI
- Beschreibung: Exportmodi `Paged PDF (Literaturverzeichnis)` und `PDF mit echten Fussnoten` als UI fuer die bereits vorhandene serverseitige Exportentscheidung einfuehren.
- Akzeptanzkriterien:
  - Nutzer koennen den Exportmodus explizit steuern.
  - Die UI mappt eindeutig auf die serverseitigen Exportpfade.
  - Solange SCI-023 nicht implementiert ist, wird `PDF mit echten Fussnoten` als noch nicht verfuegbar markiert oder kontrolliert blockiert.

### SCI-020 Scientific metadata editor UX

- Typ: UX/Engineering
- Beschreibung: Frontmatter-relevante Felder in einer UI pflegen, ohne YAML manuell schreiben zu muessen.
- Akzeptanzkriterien:
  - UI schreibt kontrolliert in den Frontmatter-Block.

### SCI-021 Citation assistance MVP

- Typ: UX/Engineering
- Beschreibung: einfache Zitationshilfe fuer vorhandene Bibliografiequellen.
- Akzeptanzkriterien:
  - Einfuegen von Zitationskeys aus vorhandenen Quellen ist moeglich.

### SCI-022 Scientific document status indicators

- Typ: UX
- Beschreibung: Dokument erkennbar als wissenschaftlich markieren, wenn Frontmatter/Bibliografie aktiv sind.
- Akzeptanzkriterien:
  - Nutzer sehen, welcher Exportpfad fuer das Dokument relevant ist.

### Sprint 6: Advanced Scientific Output

Sprintziel:

- Spezialfaelle absichern, die fuer Thesis-Dokumente wichtig sind, aber nicht den MVP blockieren

Tickets:

### SCI-023 LaTeX footnote PDF path

- Typ: Engineering
- Beschreibung: separaten PDF-Pfad fuer note-style CSL mit echten Fussnoten produktiv machen.
- Akzeptanzkriterien:
  - note-style Dokumente koennen ueber LaTeX-basierten PDF-Pfad exportiert werden.

### SCI-024 Appendix mode

- Typ: Engineering/Product
- Beschreibung: offizieller Appendix-Start und Nummerierungswechsel A/B/C.
- Akzeptanzkriterien:
  - Anhangsueberschriften koennen als A, B, C nummeriert werden.

### SCI-025 Server-side scientific preview

- Typ: Engineering
- Beschreibung: exportnahe serverseitige Vorschau fuer wissenschaftliche Dokumente.
- Akzeptanzkriterien:
  - wissenschaftliche Preview kann citeproc-verarbeitetes HTML anzeigen.

### SCI-026 Scientific containers

- Typ: Engineering
- Beschreibung: `definition`, `theorem`, `example`, `research-question` als offizielle Container.
- Akzeptanzkriterien:
  - Container funktionieren konsistent in Preview und Export.

### SCI-027 Author comments syntax

- Typ: Engineering/Product
- Beschreibung: offizielle Syntax fuer unsichtbare Autorenkommentare.
- Akzeptanzkriterien:
  - Kommentare erscheinen weder in Preview noch im Export.
  - Syntax kollidiert nicht mit bestehenden Layout-HTML-Kommentaren.
  - Syntax kollidiert nicht mit Mermaid-Kommentaren auf `%%`-Basis innerhalb von Code-Fences.

## Ticket-Reihenfolge nach Abhaengigkeiten

Zwingende Reihenfolge:

- SCI-001 bis SCI-004 vor SCI-006/SCI-020
- SCI-005 bis SCI-009 inklusive SCI-005a und SCI-006a vor wissenschaftlichem Export-MVP
- SCI-010 bis SCI-013 vor SCI-018
- SCI-011 vor SCI-012 (Sektionsnummern muessen erzeugt sein, bevor sie referenziert werden koennen)
- SCI-014 bis SCI-017 vor SCI-018
- SCI-019 vor produktiver Freigabe des Fussnotenpfads
- SCI-023 nach stabilem Citeproc-Export-MVP

## Definition of Done fuer den Citeproc Export MVP

Der Citeproc Export MVP ist erreicht, wenn folgende Punkte gleichzeitig erfuellt sind:

- YAML-Frontmatter ist offiziell und verlustfrei integriert.
- Eine wissenschaftliche Markdown-Teilmenge fuer Pandoc ist dokumentiert und serverseitig robust verarbeitbar.
- PDF- und DOCX-Export loesen BibTeX/CSL-basierte Zitationen korrekt auf.
- `#refs` oder Dokumentende erzeugt ein Literaturverzeichnis.
- bibliography- und footnote-orientierte Exportpfade werden serverseitig korrekt unterschieden.
- nicht-wissenschaftliche Dokumente verhalten sich unveraendert.

## Definition of Done fuer den Scientific Documents MVP

Der Scientific Documents MVP ist erreicht, wenn folgende Punkte gleichzeitig erfuellt sind:

- Kapitel, Bilder, Tabellen und Mermaid koennen IDs/Captions/Nummern erhalten.
- `@sec:...`, `@fig:...` und `@tbl:...` koennen im Export korrekt aufgeloest werden.
- Citeproc Export MVP ist abgeschlossen.
- nicht-wissenschaftliche Dokumente verhalten sich unveraendert.

## Metriken / Erfolgsindikatoren

- ein definierter Thesis-Fixture-Export passiert PDF und DOCX ohne manuelle Nacharbeit
- keine Rohmarker wie `[@doe2020]`, `@fig:architektur` oder Frontmatter im finalen Export
- keine Regression in bestehendem Paged-PDF fuer normale Dokumente
- klarer, dokumentierter Nutzerpfad fuer wissenschaftliche Dokumente