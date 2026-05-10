# Citations UX Concept

Stand: 2026-05-10
Status: Bedienkonzept, keine Implementierung in diesem Schritt.

Bezug: `citations-concept.md`, `citations-implementation-plan.md`

## Ziel

Die Zitationsfunktion soll wissenschaftlich belastbar sein, ohne die editorische Leichtigkeit von mdedit zu verlieren.

Die UX muss deshalb zwei Dinge gleichzeitig leisten:

- wissenschaftlich korrekte Struktur foerdern
- typische Fehlerquellen fuer Nutzer aktiv reduzieren

## Leitprinzipien

## 1. Quellen sind Daten, keine Formatierung

Nutzer sollen Quellen nicht als freiformatierten Text pflegen, sondern als strukturierte Referenzen.

Konsequenz:

- Eingabe und Auswahl von Quellen stehen im Vordergrund
- Stil und Ausgabeformat sind nachgelagert

## 2. Zitatstil darf den Quelltext nicht zerstoeren

Ein Stilwechsel darf ohne Umschreiben des Dokuments moeglich sein.

Konsequenz:

- Nutzer arbeiten mit Zitationsschluesseln und Lokatoren
- nicht mit manuell geschriebenen Literaturfussnoten

## 3. Export ist normativ

Die Live-Vorschau darf in Phase 1 einfacher sein als der Export.

Konsequenz:

- UX muss diesen Unterschied klar kommunizieren
- Nutzer sollen wissen, wann sie eine exportnahe Vorschau sehen und wann nicht

## Kern-Nutzerfaelle

### UC-1 Quelle hinterlegen

Als Autor moechte ich eine dokumentgebundene lokale Bibliothek anlegen oder spaeter eine Zotero-Bibliothek anbinden, damit ich ohne manuelle Dateipfade aus ihr zitieren kann.

### UC-2 Zitat einfuegen

Als Autor moechte ich ein Zitat aus vorhandenen Quellen suchen und an Cursorposition einfuegen, damit ich keine Schluessel manuell tippen muss.

### UC-3 Seitenangabe ergaenzen

Als Autor moechte ich Seiten, Kapitel oder andere Lokatoren direkt beim Einfuegen setzen koennen.

### UC-4 Stil wechseln

Als Autor moechte ich zwischen APA, Chicago, IEEE oder Fussnotenstilen wechseln, ohne den Text umzuschreiben.

### UC-5 Literaturverzeichnis platzieren

Als Autor moechte ich das Literaturverzeichnis an einer definierten Stelle einbauen oder automatisch am Ende erzeugen lassen.

### UC-6 Export sicher waehlen

Als Autor moechte ich wissen, ob mein Stil einen Paged-PDF-Export oder einen Fussnoten-PDF-Export braucht.

Designentscheidung: Wer klassifiziert den Exportmodus?

- Phase 1 / Citeproc Export MVP: Es ist noch keine sichtbare Exportmodus-UI noetig. Der Server behandelt bibliography-orientierte Exporte normativ und blockiert `PDF mit echten Fussnoten` bis SCI-023 mit klarem Fehler.
- Phase 2 / SCI-019: Der Nutzer waehlt explizit im Exportdialog (`Paged PDF` vs. `PDF mit echten Fussnoten`).
- Phase 3: Das System liest den gewaehlten CSL-Stil und berechnet eine Vorbelegung (note-style CSL → Fussnoten-PDF; alle anderen → Paged PDF). Der Nutzer kann die Vorbelegung jederzeit ueberschreiben.

Bis die automatische CSL-Klassifikation verlaesslich implementiert ist, bleibt die explizite Nutzerauswahl die sichere Variante, sobald SCI-019 verfuegbar ist.
Solange der LaTeX-Footnote-Pfad noch nicht produktiv ist, darf `PDF mit echten Fussnoten` im UI nur als noch nicht verfuegbar erscheinen oder mit klarer Fehlermeldung blockiert werden.

## Informationsarchitektur

## Drei Ebenen der Bedienung

### Ebene A: Dokumentmetadaten

Ort:

- Dokumentkopf bzw. wissenschaftlicher Dokumentdialog

Inhalte:

- Titel
- Autor
- Sprache
- Quellenmodus (`lokal im Dokument`, `Zotero`, spaeter `Hybrid-Snapshot`)
- Sichtbarkeit der eingebetteten Bibliothek im Markdown
- CSL-Stil
- Modus fuer Literaturverzeichnis / Fussnoten

### Ebene B: Quellen und Zitate

Ort:

- Zitationspanel oder Suchdialog

Inhalte:

- Quellensuche
- Quellenvorschau
- Zitat einfuegen
- Lokator setzen
- Autor im Text / Parenthesenzitat waehlen

### Ebene C: Export

Ort:

- Exportdialog fuer PDF und DOCX

Inhalte:

- Exportmodus
- Stilhinweis
- Validierung vor dem Export
- optional exportnahe Vorschau

## Empfohlene UI-Bausteine

## 1. Wissenschaftlicher Dokumentdialog

Zweck:

- zitationsrelevante Metadaten ohne manuelle YAML-Kenntnis pflegen

Felder:

- Dokumenttitel
- Autor(en)
- Sprache
- Quellenmodus
- lokale Bibliothek aktivieren
- eingebettete Bibliothek im Markdown anzeigen
- Zotero-Verbindung
- CSL-Stil
- Titel des Literaturverzeichnisses
- Schalter `Literaturverzeichnis automatisch am Ende`
- Schalter `Literaturverzeichnis hier platzieren`

Aktion:

- Metadaten in YAML-Frontmatter schreiben oder aktualisieren

## 2. Zitationsdialog

Zweck:

- Zitate schnell und korrekt einfuegen

Inhalte:

- Suchfeld fuer Autor, Titel, Jahr, Schluessel
- Trefferliste
- Detailvorschau der Quelle
- Eingabefeld fuer Lokator
- Auswahl:
  - normales Zitat
  - Autor im Satz
  - Autor unterdruecken

Aktionen:

- `Zitat einfuegen`
- `Quelle kopieren`
- spaeter optional `Quelle bearbeiten`

Beispielausgaben:

- `[@doe2020]`
- `[@doe2020, S. 17]`
- `-@doe2020`
- `@doe2020 [S. 17]`

## 3. Quellenpanel

Zweck:

- sichtbarer Projektkontext fuer wissenschaftliche Arbeit

Inhalte:

- aktive Bibliothek oder aktiver Snapshot
- Anzahl erkannter Quellen
- Suchfeld
- Liste zuletzt verwendeter Quellen
- Liste haeufig verwendeter Quellen

Aktionen:

- `Quelle anlegen`
- `BibTeX/RIS/CSL JSON importieren`
- `Zitat einfuegen`
- `Mit Zotero verbinden`
- `OpenAlex durchsuchen`
- `Literaturverzeichnis einfuegen`

## 4. Exportdialog fuer wissenschaftliche Dokumente

Zweck:

- Fehlbedienung vor dem Export vermeiden

Anzeigen:

- aktiver CSL-Stil
- erkannte Bibliothek oder aktiver Snapshot
- erkannter Exportmodus
- Validierungsstatus

Modi:

- `PDF (Paged, Literaturverzeichnis)`
- `PDF (echte Fussnoten)` (erst ab SCI-023 verfuegbar; bis dahin als nicht verfuegbar markiert oder mit klarer Fehlermeldung blockiert)
- `DOCX`

Warnungen:

- `Keine lokale Bibliothek oder kein Snapshot vorhanden`
- `CSL-Stil fehlt`
- `Zitationssyntax gefunden, aber keine Bibliothek aktiv`
- `Fussnotenstil braucht anderen PDF-Pfad`

## Dokumentfluss aus Nutzersicht

## Erstkonfiguration

1. Nutzer aktiviert den wissenschaftlichen Dokumentmodus.
2. Nutzer waehlt Quellenmodus und Stil.
3. Nutzer legt eine lokale Bibliothek an oder verbindet Zotero.
4. mdedit erzeugt oder aktualisiert YAML-Metadaten.
5. UI zeigt an, dass das Dokument zitierfaehig ist.

## Zitieren im Schreibfluss

1. Nutzer oeffnet den Zitationsdialog per Shortcut oder Toolbar.
2. Nutzer sucht nach Quelle.
3. Nutzer setzt optional Seiten- oder Kapitelangabe.
4. Nutzer waehlt Zitatart.
5. mdedit fuegt die passende Pandoc-Zitationssyntax ein.

## Literaturverzeichnis

Zwei gleichwertige UX-Wege:

- automatisch am Dokumentende
- explizit an Cursorposition als `refs`-Block

Empfehlung fuer die Bedienung:

- Schalter im Dokumentdialog fuer Standardverhalten
- zusaetzliche Aktion `Literaturverzeichnis hier einfuegen`

## Export

1. Nutzer oeffnet Exportdialog.
2. mdedit validiert Bibliografie und Stil.
3. UI empfiehlt den passenden Exportmodus.
4. Nutzer exportiert.

## Vorschaukonzept fuer Nutzer

## Phase 1

Die normale unpaged Vorschau bleibt editornah.
Fuer bibliography-orientierte wissenschaftliche Dokumente darf der paged Preview bereits exportnah sein und serverseitig finalisiertes Citeproc-HTML verwenden.
Ein deutlicher Hinweis ist noetig, welche Ansicht gerade aktiv ist und welche Verbindlichkeit sie hat.

Fuer Exportmodi gilt in Phase 1:

- `Paged PDF` ist verfuegbar
- `PDF mit echten Fussnoten` kann sichtbar sein, ist aber bis zum produktiven LaTeX-Footnote-Pfad als noch nicht verfuegbar markiert oder kontrolliert blockiert

Geeignete Formulierung:

- `Editor-Vorschau: Zitationsdarstellung kann vereinfacht sein.`
- `Paged Preview: Zitationsdarstellung wurde fuer den Export serverseitig vorbereitet.`

## Phase 2

Fuer wissenschaftliche Dokumente wird die exportnahe Vorschau ueber den paged Preview hinaus ausgebaut.

Moegliche UI:

- Toggle `Editor-Vorschau`
- Toggle `Export-Vorschau`
- Aktion `Paged Preview aktualisieren`

Damit wird die unterschiedliche Verbindlichkeit der Ansichten fuer Nutzer transparent.

## Fehlervermeidung

## Hauefige Risiken

- Nutzer schreibt manuelle Literaturfussnoten statt Zitationssyntax.
- Nutzer hat Zitationssyntax, aber keine Bibliografie gesetzt.
- Nutzer erwartet echte Fussnoten im Paged-PDF.
- Nutzer verwechselt Live-Vorschau mit exportnaher Darstellung.

## UX-Gegenmassnahmen

- Hinweistexte bei manuell erkannten Literatur-Fussnotenmustern
- Exportwarnung bei fehlender Bibliografie
- Modus-Hinweis `Dieser Stil wird als Literaturverzeichnis exportiert`
- Modus-Hinweis `Dieser Stil benoetigt spaeter PDF mit echten Fussnoten`; bis SCI-023 bleibt dieser Pfad blockiert oder als nicht verfuegbar markiert

## Tastatur- und Schnellzugriffe

Sinnvolle Shortcuts:

- `Ctrl/Cmd + Shift + K` fuer `Zitat einfuegen`
- `Ctrl/Cmd + Shift + B` fuer `Literaturverzeichnis einfuegen`
- `Ctrl/Cmd + Shift + E` fuer `wissenschaftlichen Exportdialog`

Hinweis: Die vorgeschlagenen Shortcuts muessen vor der Implementierung gegen die bestehende Tastaturbelegung in `app.js` und `editor.js` geprueft werden. Kollisionen mit vorhandenen Editor-Shortcuts sind moeglich.

## Zustandsmodell in der UI

## Dokumentstatus

Sichtbarer Statusindikator im Header oder Dokumentpanel:

- `Kein Zitationsmodus aktiv`
- `Zitationsmodus aktiv`
- `Bibliografie fehlt`
- `Export bereit`

## Quellenstatus

Im Quellenpanel sichtbar:

- `0 Quellen geladen`
- `42 Quellen geladen`
- `Stil: APA 7`

## Exportstatus

Im Exportdialog sichtbar:

- `Paged-PDF empfohlen`
- `Fussnoten-PDF empfohlen` (nur nach SCI-023 aktiv; vorher als noch nicht verfuegbar angezeigt)
- `DOCX bereit`

## MVP-Empfehlung

Fuer die erste thesis-taugliche Produktstufe reichen diese UI-Funktionen:

1. Dokumentdialog fuer Quellenmodus und Stil
2. lokales Quellen-Modal mit Anlegen, Bearbeiten und Import
3. einfacher Zitationsdialog mit Suche und Lokator
4. Aktion `Literaturverzeichnis einfuegen`
5. Exportdialog mit Moduswarnungen

Noch nicht noetig (entspricht Phase 3 des Implementierungsplans):

- bidirektionale Synchronisation mit Zotero
- mehrere gleichzeitige externe Bibliotheken im selben Dokument
- automatische Hintergrund-Anreicherung ueber OpenAlex ohne Nutzerbestaetigung
- vollstaendig exportnahe Live-Vorschau
- Hochschulvorlagen per `reference.docx`
- Verwaltung serverseitiger Dateipfad-Bibliografien im Produkt

## Akzeptanzkriterien

- Nutzer kann eine lokale Dokumentbibliothek anlegen, ohne YAML oder BibTeX manuell zu schreiben.
- Nutzer kann steuern, ob die eingebettete Bibliothek im Markdown sichtbar ist.
- Nutzer kann ein Zitat aus einer Quelle suchen und korrekt einfuegen.
- Nutzer kann ein Literaturverzeichnis an definierter Stelle einbauen.
- Der Exportdialog warnt vor fehlenden oder unpassenden Einstellungen.
- In Phase 1 (vor SCI-023): Die UI kennzeichnet `PDF mit echten Fussnoten` als noch nicht verfuegbar oder blockiert diesen Modus mit klarer Fehlermeldung.
- Ab Phase 3 (SCI-023): Die UI macht klar, wann ein Fussnotenstil den separaten LaTeX-PDF-Pfad benoetigt.

## Empfehlung

Die UX soll lokale Dokumentbibliotheken zum Regelfall machen und externe Dienste nur gezielt anbinden.
Fuer mdedit ist ein fokussierter Workflow sinnvoll:

- lokale Quellen im Dokument verwalten
- Zitate korrekt einfuegen
- optional Zotero anbinden
- OpenAlex fuer Recherche und Metadatenimport nutzen
- Export sicher steuern

Filesystem-basierte `.bib`-Dateipfade gehoeren nicht mehr zum empfohlenen oder unterstuetzten Autorenworkflow.
Damit bleibt das Produkt leichtgewichtig und wird trotzdem fuer wissenschaftliche Arbeiten praktisch nutzbar.