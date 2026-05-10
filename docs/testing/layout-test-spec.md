# Layout Unit Tests — Testspezifikation

Diese Datei steuert und dokumentiert die Testsuite `scripts/layout-unit-test.js`.

## Ausführung

```bash
# Alle Tests
CHROMIUM_BIN=/snap/chromium/3423/usr/lib/chromium-browser/chrome node scripts/layout-unit-test.js

# Nur eine Suite
CHROMIUM_BIN=... node scripts/layout-unit-test.js --filter reference-docs
CHROMIUM_BIN=... node scripts/layout-unit-test.js --filter figures
CHROMIUM_BIN=... node scripts/layout-unit-test.js --filter tables
```

Der Testläufer startet einen Headless-Chromium gegen den Dev-Server auf `http://127.0.0.1:3210`.
Vor der Ausführung muss der Dev-Server laufen (`docker compose up` oder `node server.js`).

---

## Konfigurierbare Tests: `reference-docs`

Der folgende `test-config`-Block definiert, welche Referenzdokumente getestet werden und welche
Werte erwartet werden. Jede `expect`-Eigenschaft erzeugt automatisch genau einen Test.
Eigenschaft entfernen → Test entfällt. Neue Eigenschaft hinzufügen → neuer Test wird erzeugt.

**Verfügbare `expect`-Schlüssel:**

| Schlüssel | Typ | Prüft |
|---|---|---|
| `figureCount` | Zahl | Anzahl `<figure>`-Elemente im gerenderten HTML |
| `firstFigureLabel` | String | HTML enthält diesen String (z. B. `"Abb.&nbsp;1:"`) |
| `captionCount` | Zahl | Anzahl `<caption>`-Elemente (Tabellenunterschriften) |
| `firstCaptionLabel` | String | HTML enthält diesen String (z. B. `"Tab.&nbsp;1:"`) |
| `listOfFiguresEntries` | Zahl | Anzahl Einträge in `.list-of-figures a` |
| `listOfTablesEntries` | Zahl | Anzahl Einträge in `.list-of-tables a` |
| `dataLayouts` | Objekt `{ name: Zahl }` | Anzahl `<table data-layout="name">`-Elemente pro Typ |
| `floatFigure` | `"right"` oder `"left"` | HTML enthält `md-figure--right` bzw. `md-figure--left` |
| `figureShadow` | `true` | HTML enthält `md-figure--shadow` |
| `figureFrame` | `true` | HTML enthält `md-figure--frame` |
| `noResidualTokens` | `true` | Kein `[[MDLAYOUT:`-Token im HTML-Output |

```test-config
{
  "referenceDocs": [
    {
      "id": "masterthesis",
      "label": "masterthesis-reference.md (scientific)",
      "file": "docs/examples/masterthesis-reference.md",
      "expect": {
        "figureCount": 1,
        "firstFigureLabel": "Abb.&nbsp;1:",
        "captionCount": 5,
        "listOfFiguresEntries": 1,
        "listOfTablesEntries": 5,
        "dataLayouts": { "scientific": 3, "compact": 2 }
      }
    },
    {
      "id": "book",
      "label": "book-reference.md (literature)",
      "file": "docs/examples/book-reference.md",
      "expect": {
        "figureCount": 2,
        "floatFigure": "right",
        "listOfFiguresEntries": 2,
        "captionCount": 1,
        "firstCaptionLabel": "Tab.&nbsp;1:"
      }
    },
    {
      "id": "quickread",
      "label": "quickread-reference.md (compact)",
      "file": "docs/examples/quickread-reference.md",
      "expect": {
        "figureCount": 2,
        "floatFigure": "right",
        "figureShadow": true,
        "dataLayouts": { "compact": 2 },
        "noResidualTokens": true
      }
    }
  ]
}
```

---

## Fest kodierte Tests (JavaScript)

Diese Tests sind in `scripts/layout-unit-test.js` hardcodiert und werden hier nur dokumentiert.
Änderungen an der Testlogik erfordern Bearbeitung der JS-Datei direkt.

---

### `figures` — Abbildungsverarbeitung (FIG-01 – FIG-10)

| ID | Beschreibung | Prüft |
|---|---|---|
| FIG-01 | Bild mit Prefix „Abbildung N:" wird zu `<figure>` | `<figure>`, `<figcaption>`, Label `Abb.&nbsp;N:` |
| FIG-02 | Bild mit Prefix „Figure N:" (EN) wird zu `<figure>` | Gleiche Ausgabe; Counter wird pro Test zurückgesetzt |
| FIG-03 | Bild ohne Caption-Prefix bleibt unverändert | Kein `<figure>` erzeugt |
| FIG-04 | `<!-- img: align=right width=40% -->` vor Bild | Float-Klasse `md-figure--right`, `width:40%` auf `<figure>` |
| FIG-05 | `<!-- img: frame -->` vor Bild | Klasse `md-figure--frame` |
| FIG-06 | `<!-- img: shadow -->` vor Bild | Klasse `md-figure--shadow` |
| FIG-07 | `<!-- img: filter=grayscale -->` vor Bild | Klasse `md-figure--filter-grayscale` |
| FIG-08 | `align=center width=80%` setzt Breite auf `<img>`, nicht `<figure>` | `width:80%` im `<img>`-Style |
| FIG-09 | Zwei Abbildungen füllen `figureRegistry` mit 2 Einträgen | `figureRegistry.length === 2` |
| FIG-10 | `<!-- img: -->` Marker erscheint nicht im gerenderten Output | Kein `MDLAYOUT`-Token im HTML |

**Hinweise:**
- Das Blank-Line-Requirement: Zwischen `<!-- img: ... -->` und `![...]` muss eine Leerzeile stehen, damit Marker und Bild als getrennte Block-Elemente geparst werden.
- `evalPreprocessor(page, html)` verarbeitet fertiges HTML. `evalPreprocessorMd(page, md)` verarbeitet Markdown (inkl. `process()` + `buildMarkdownIt`).

---

### `tables` — Tabellenverarbeitung (TAB-01 – TAB-06)

| ID | Beschreibung | Prüft |
|---|---|---|
| TAB-01 | „Tabelle N: Text" vor Tabelle erzeugt `<caption>` | Element `<caption>`, Label `Tab.&nbsp;N:` |
| TAB-02 | „Table N: Text" (EN) vor Tabelle erzeugt `<caption>` | Gleiche Ausgabe |
| TAB-03 | `<!-- table:scientific -->` zwischen Caption und Tabelle blockiert `<caption>` nicht | `<caption>` vorhanden |
| TAB-04 | Zwei Tabellen füllen `tableRegistry` mit 2 Einträgen | `tableRegistry.length === 2` |
| TAB-05 | Tabelle ohne Caption-Prefix erhält keine `<caption>` | Kein `<caption>`-Element |
| TAB-06 | Kurzlabel hat keinen Leerraum vor dem Doppelpunkt | Kein `Tab.&nbsp;1 :` im HTML |

**Hinweise:**
- Caption-Prefix muss als eigenständiger `<p>`-Block vor der Tabelle stehen.
- Akzeptierte Formate: `Tabelle N:`, `Table N:`, `**Tabelle N:**` (fett), auch mit Zeilenabstand.

---

### `directories` — Verzeichnisse (DIR-01 – DIR-05)

| ID | Beschreibung | Prüft |
|---|---|---|
| DIR-01 | `<!-- list-of-figures -->` erzeugt `<nav class="list-of-figures">` | Klasse `list-of-figures` |
| DIR-02 | `<!-- list-of-tables -->` erzeugt `<nav class="list-of-tables">` | Klasse `list-of-tables` |
| DIR-03 | Abbildungsverzeichnis enthält alle registrierten Abbildungen | `Abb.&nbsp;1:` und `Abb.&nbsp;2:` im Nav |
| DIR-04 | Tabellenverzeichnis enthält alle registrierten Tabellen | `Tab.&nbsp;1:` und `Tab.&nbsp;2:` im Nav |
| DIR-05 | Keine `MDLAYOUT`-Token im finalen Output | `MDLAYOUT` kommt nicht vor |

---

### `images` — Bildverarbeitung Sonderfälle (IMG-01 – IMG-05)

| ID | Beschreibung | Prüft |
|---|---|---|
| IMG-01 | Eingefügtes Bild mit Auto-Alt wird nicht zu `<figure>` | Kein `<figure>` für `paste-*`-Alt-Text |
| IMG-02 | Marker-Token erscheint nicht im gerenderten Text | Kein `image-layout-marker`, kein `MDLAYOUT` |
| IMG-03 | Drei Bilder werden unabhängig nummeriert | `id="figure-1"`, `id="figure-2"`, `id="figure-3"` |
| IMG-04 | `resetCounters()` leert `figureRegistry` und `tableRegistry` | Beide Registries leer nach Reset |
| IMG-05 | Bilder in Codeblöcken werden nicht verarbeitet | Kein `<figure>` aus Bild in ` ``` ` |

---

### `page-breaks` — Seitenumbrüche (PBR-01 – PBR-02)

| ID | Beschreibung | Prüft |
|---|---|---|
| PBR-01 | `<!-- page-break -->` setzt `data-break-before="page"` am nächsten Element | Attribut vorhanden |
| PBR-02 | `<!-- column-break -->` verursacht keinen Fehler und hinterlässt keinen Token | Kein `MDLAYOUT`-Token |

---

### `layout-css` — CSS-Generierung (CSS-01 – CSS-05)

| ID | Beschreibung | Prüft |
|---|---|---|
| CSS-01 | Footer ist im Standard-Layout aktiviert | `footer.enabled === true` |
| CSS-02 | Generiertes CSS enthält `@bottom-center` mit `counter(page)` | Seitenzahl-CSS vorhanden |
| CSS-03 | Scientific-Tabellen-CSS enthält Booktabs-Linie oben | `thead tr:first-child th` mit Border-Regel |
| CSS-04 | Scientific-Tabellen-CSS enthält Booktabs-Linie unten | `tbody tr:last-child td` mit Border-Regel |
| CSS-05 | Caption-CSS enthält `break-after: avoid` | Kein Seitenumbruch zwischen Caption und Tabelle |
