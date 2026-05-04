# Citations UX Concept

Stand: 2026-05-03
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

Als Autor moechte ich eine Bibliografie-Datei oder zentrale Projektbibliografie hinterlegen, damit ich aus ihr zitieren kann.

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

- MVP: Der Nutzer waehlt explizit im Exportdialog (`Paged PDF` vs. `PDF mit echten Fussnoten`).
- Phase 2: Das System liest den gewaehlten CSL-Stil und berechnet eine Vorbelegung (note-style CSL → Fussnoten-PDF; alle anderen → Paged PDF). Der Nutzer kann die Vorbelegung jederzeit ueberschreiben.

Bis die automatische CSL-Klassifikation verlaesslich implementiert ist, bleibt die explizite Nutzerauswahl die sichere Variante.

## Informationsarchitektur

## Drei Ebenen der Bedienung

### Ebene A: Dokumentmetadaten

Ort:

- Dokumentkopf bzw. wissenschaftlicher Dokumentdialog

Inhalte:

- Titel
- Autor
- Sprache
- Bibliografie-Datei
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
- Bibliografie
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

- aktive Bibliografie-Datei
- Anzahl erkannter Quellen
- Suchfeld
- Liste zuletzt verwendeter Quellen
- Liste haeufig verwendeter Quellen

Aktionen:

- `Zitat einfuegen`
- `Bibliografie wechseln`
- `Literaturverzeichnis einfuegen`

## 4. Exportdialog fuer wissenschaftliche Dokumente

Zweck:

- Fehlbedienung vor dem Export vermeiden

Anzeigen:

- aktiver CSL-Stil
- erkannte Bibliografie
- erkannter Exportmodus
- Validierungsstatus

Modi:

- `PDF (Paged, Literaturverzeichnis)`
- `PDF (echte Fussnoten)`
- `DOCX`

Warnungen:

- `Bibliografie-Datei fehlt`
- `CSL-Stil fehlt`
- `Zitationssyntax gefunden, aber keine Bibliografie gesetzt`
- `Fussnotenstil braucht anderen PDF-Pfad`

## Dokumentfluss aus Nutzersicht

## Erstkonfiguration

1. Nutzer aktiviert den wissenschaftlichen Dokumentmodus.
2. Nutzer hinterlegt Bibliografie und Stil.
3. mdedit erzeugt oder aktualisiert YAML-Metadaten.
4. UI zeigt an, dass das Dokument zitierfaehig ist.

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

Die normale Vorschau bleibt editornah.
Ein deutlicher Hinweis ist noetig, dass die finale Zitationsdarstellung im Export verbindlich ist.

Geeignete Formulierung:

- `Zitationsdarstellung wird fuer wissenschaftliche Exporte serverseitig finalisiert.`

## Phase 2

Fuer wissenschaftliche Dokumente kommt eine exportnahe Vorschau hinzu.

Moegliche UI:

- Toggle `Editor-Vorschau`
- Toggle `Export-Vorschau`

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
- Modus-Hinweis `Dieser Stil benoetigt PDF mit echten Fussnoten`

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
- `Fussnoten-PDF empfohlen`
- `DOCX bereit`

## MVP-Empfehlung

Fuer die erste Produktstufe reichen diese UI-Funktionen:

1. Dokumentdialog fuer Bibliografie und Stil
2. einfacher Zitationsdialog mit Suche und Lokator
3. Aktion `Literaturverzeichnis einfuegen`
4. Exportdialog mit Moduswarnungen

Noch nicht noetig (entspricht Phase 3 des Implementierungsplans):

- komplette Quellenverwaltung in der App
- Bearbeitung einzelner BibTeX-Eintraege im Produkt
- komplexe Mehrbibliografie-Workflows
- vollstaendig exportnahe Live-Vorschau
- Hochschulvorlagen per `reference.docx`
- Projektbibliografie-Verwaltung im Produkt

## Akzeptanzkriterien

- Nutzer kann Bibliografie und CSL-Stil setzen, ohne YAML manuell zu schreiben.
- Nutzer kann ein Zitat aus einer Quelle suchen und korrekt einfuegen.
- Nutzer kann ein Literaturverzeichnis an definierter Stelle einbauen.
- Der Exportdialog warnt vor fehlenden oder unpassenden Einstellungen.
- Die UI macht klar, wann ein Fussnotenstil einen anderen PDF-Pfad benoetigt.

## Empfehlung

Die UX sollte nicht versuchen, klassische Literaturverwaltungsprogramme zu ersetzen.
Fuer mdedit ist ein fokussierter Workflow sinnvoll:

- Quellen anbinden
- Zitate korrekt einfuegen
- Export sicher steuern

Damit bleibt das Produkt leichtgewichtig und wird trotzdem fuer wissenschaftliche Arbeiten praktisch nutzbar.