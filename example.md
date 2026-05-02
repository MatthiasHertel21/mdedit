# Beispiel: Alle unterstützten Markdown-Erweiterungen

## GFM (Tabellen, Aufgabenlisten, Autolinks, Durchstreichung)

- [x] Aufgabe erledigt
- [ ] Aufgabe offen

Autolink: https://example.com

Durchstreichung: ~~veraltet~~

| Spalte A | Spalte B |
| --- | --- |
| 1 | 2 |
| 3 | 4 |

## Mermaid (Diagramme)

```mermaid
flowchart TD
  A[Start] --> B{Entscheidung}
  B -->|Ja| C[Weiter]
  B -->|Nein| D[Stop]
```

## Mermaid (komplexes Gesamtbeispiel)

```mermaid
sequenceDiagram
  participant U as User
  participant A as App
  participant S as Server
  U->>A: Öffnet Dokument
  A->>S: Lade Daten
  S-->>A: OK (JSON)
  A-->>U: Render Vorschau
```

```mermaid
classDiagram
  class Document {
    +id: string
    +title: string
    +save()
  }
  class Section
  Document "1" --> "*" Section
```

```mermaid
stateDiagram-v2
  [*] --> Draft
  Draft --> Review
  Review --> Published
  Review --> Draft: Änderungen
  Published --> Archived
```

```mermaid
erDiagram
  USER ||--o{ DOCUMENT : owns
  DOCUMENT ||--|{ SECTION : contains
```

```mermaid
gantt
  title Release Plan
  dateFormat  YYYY-MM-DD
  section MVP
  Planung :a1, 2026-02-01, 7d
  Umsetzung :a2, after a1, 10d
```

```mermaid
pie title Verteilung
  "Markdown" : 45
  "Diagramme" : 25
  "Export" : 30
```

```mermaid
journey
  title Nutzerreise
  section Start
    Öffnen: 5: User
    Schreiben: 4: User
  section Nutzung
    Export: 3: User
```

```mermaid
mindmap
  root((Markdown))
    Syntax
      GFM
      Mathe
    Layout
      Spalten
      Umbrüche
```

```mermaid
timeline
  title Projektverlauf
  2025 : Idee
  2026 : Umsetzung
```

```mermaid
quadrantChart
  title Priorisierung
  x-axis Niedriger Wert --> Hoher Wert
  y-axis Niedrige Kosten --> Hohe Kosten
  quadrant-1 Quick Wins
  quadrant-2 Strategisch
  quadrant-3 Später
  quadrant-4 Teuer
  IdeeA: [0.8, 0.2]
  IdeeB: [0.6, 0.7]
```

```mermaid
gitGraph
  commit
  branch feature
  checkout feature
  commit
  checkout main
  merge feature
```

```mermaid
flowchart LR
  %% EPK (Ereignisgesteuerte Prozesskette)
  E0((Bedarf erkannt)) --> F1[Anfrage erstellen]
  F1 --> E1((Anfrage liegt vor))
  E1 --> G1{XOR}
  G1 --> F2[Prüfung automatisiert]
  G1 --> F3[Prüfung manuell]
  F2 --> E2((Prüfung ok))
  F3 --> E2
  E2 --> G2{AND}
  G2 --> F4[Bestellung auslösen]
  G2 --> F5[Lieferant informieren]
  F4 --> E3((Bestellung gesendet))
  F5 --> E4((Lieferant informiert))
  E3 --> G3{AND}
  E4 --> G3
  G3 --> F6[Wareneingang prüfen]
  F6 --> E5((Ware geprüft))
  E5 --> G4{XOR}
  G4 --> F7[Rechnung freigeben]
  G4 --> F8[Reklamation erfassen]
  F7 --> E6((Rechnung freigegeben))
  F8 --> E7((Reklamation erfasst))
  E6 --> F9[Zahlung ausführen]
  F9 --> E8((Zahlung erfolgt))
  E7 --> F10[Lieferant kontaktieren]
  F10 --> E9((Klärung gestartet))

## KaTeX/MathJax (Formeln)

Inline: $E=mc^2$

Block:

$$
\int_0^\infty e^{-x^2} \, dx = \frac{\sqrt{\pi}}{2}
$$

## Fußnoten

Dies ist ein Satz mit Fußnote.[^1]

[^1]: Das ist die Fußnote.

## Definition Lists

Begriff A
: Eine kurze Definition.

Begriff B
: Noch eine Definition.

## Admonitions (Hinweis/Info/Warning)

::: info
Das ist ein Info-Hinweis.
:::

::: warning
Das ist eine Warnung.
:::

::: tip
Das ist ein Hinweis/Tipp.
:::

## Emoji

Ich :heart: Markdown :rocket:

## Subscript / Superscript

H~2~O und x^2^

## Mark/Highlight

==Wichtiger Text==

## Abkürzungen

*[HTML]: HyperText Markup Language

HTML ist eine Auszeichnungssprache.

## Inhaltsverzeichnis (TOC)

[[toc]]

## Attribute (IDs/Klassen)

### Überschrift {#meine-id}

Ein Absatz mit Klasse {.highlight}

## Typografische Anführungszeichen

"Gerade" werden zu „typografisch“

## Layout: Spalten

::: columns
::: column
Spalte 1
:::

::: column
Spalte 2
:::
:::

## Layout: Umbrüche

Zeilenumbruch:

::: linebreak
:::

Spaltenumbruch:

::: columnbreak
:::

Abschnittsumbruch:

::: sectionbreak
:::

Seitenumbruch:

::: pagebreak
:::
