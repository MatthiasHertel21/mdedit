---
preset: compact
header: false
footer: false
---

# mdedit.io Compact-Layout Referenztest — Quickread

**Prüfziele für das Compact-Preset**

| Nr | Prüfziel | OK? |
|---:|---|:---:|
| 1 | Enge Zeilenabstände | ☐ |
| 2 | Kompakte Absatzabstände | ☐ |
| 3 | Tabellen mit Gitternetz | ☐ |
| 4 | Listen dicht gesetzt | ☐ |
| 5 | Kleines Float-Bild mit Textumfluss | ☐ |
| 6 | Zentriertes Bild | ☐ |
| 7 | Admonition-Boxen (info, warning) | ☐ |
| 8 | Inline-Code und Codeblock | ☐ |
| 9 | Horizontale Linie | ☐ |
| 10 | Seitennummern optional / nicht dominant | ☐ |
| 11 | Überschriften kompakt, keine großen Abstände | ☐ |
| 12 | Checkboxen in Tabellen | ☐ |

[[toc]]

<!-- page-break -->

# 1 Kurzübersicht

Das **Compact-Preset** ist für schnell zu lesende Dokumente gedacht: Handbücher, Checklisten, technische Referenzblätter, Meeting-Protokolle. Keine langen Prosaabsätze — stattdessen kurze Abschnitte, Listen und Tabellen.

**Leitsatz:** So dicht wie nötig, so lesbar wie möglich.

# 2 Listen und Aufzählungen

## 2.1 Ungeordnete Liste

- Punkt A: Kurze Aussage
- Punkt B: Weitere kurze Aussage
- Punkt C: `inline-code` im Listenelement
- Punkt D: **Fett** und *kursiv* kombiniert
- Punkt E: Sehr lange Aussage, die über mehr als eine Zeile laufen soll, um hängende Einrückung zu prüfen

## 2.2 Geordnete Liste

1. Ersten Schritt durchführen
2. Ergebnis prüfen
3. Ggf. korrigieren
4. Nächsten Schritt starten
5. Abschluss dokumentieren

## 2.3 Verschachtelte Liste

- Kategorie 1
  - Punkt 1.1
  - Punkt 1.2
    - Detail 1.2.1
- Kategorie 2
  - Punkt 2.1

# 3 Tabellen

## 3.1 Kompakttabelle mit Gitternetz

Diese Tabelle prüft das Compact-Preset: Gitternetz soll sichtbar sein, Schrift etwas kleiner, Padding eng.

<!-- table:compact -->

| Schritt | Beschreibung | Status |
|---:|---|:---:|
| 1 | Vorlage laden | ✓ |
| 2 | Inhalt einfügen | ✓ |
| 3 | Layout prüfen | ☐ |
| 4 | Export testen | ☐ |
| 5 | Freigeben | ☐ |

## 3.2 Checkliste als Tabelle

| Aufgabe | Priorität | Erledigt |
|---|:---:|:---:|
| Server-Konfiguration prüfen | Hoch | ☐ |
| Backup anlegen | Hoch | ✓ |
| Zugriffsrechte kontrollieren | Mittel | ☐ |
| Logs auswerten | Mittel | ☐ |
| Dokumentation aktualisieren | Niedrig | ☐ |
| Monitoring einschalten | Niedrig | ☐ |

## 3.3 Datentabelle mit vielen Zeilen

| ID | Parameter | Wert | Einheit | Notiz |
|---:|---|---:|---|---|
| 1 | Temperatur | 23,4 | °C | Normwert |
| 2 | Luftdruck | 1013 | hPa | Normwert |
| 3 | Luftfeuchte | 58 | % | Normwert |
| 4 | CO₂-Gehalt | 412 | ppm | Schwellenwert 800 |
| 5 | Beleuchtung | 520 | Lux | Mindest 300 |
| 6 | Lautstärke | 34 | dB | Grenzwert 55 |
| 7 | Latenz | 12 | ms | Zielwert <50 |
| 8 | Paketloss | 0,1 | % | Zielwert <1 |
| 9 | CPU-Last | 14 | % | Zielwert <80 |
| 10 | RAM-Nutzung | 62 | % | Zielwert <90 |

<!-- page-break -->

# 4 Abbildungen

## 4.1 Float-Abbildung rechts

Das Compact-Preset prüft, ob ein kleines Float-Bild (30 % Breite) den Text sauber umfließen lässt. Der Text soll direkt neben dem Bild laufen, ohne Überlappung.

<!-- img: align=right width=30% shadow -->

![Abbildung 1: Quadratisches Referenzdiagramm (Float-Test)](/assets/a2a9ae60-6e00-4d99-95a1-ef7f70ea01b7/9aeaae98.png)

Dieser Text umfließt das Bild. Er ist kurz, aber lang genug, um den Float sichtbar zu machen. Das `shadow`-Attribut prüft, ob ein dezenter Schatten gesetzt wird. Beim Compact-Preset soll der Schatten nicht zu dominant wirken.

Nach dem Float: Der Text läuft wieder über die volle Breite.

## 4.2 Zentriertes Bild

<!-- img: align=center width=60% -->

![Abbildung 2: Workflow-Diagramm — Datenfluss-Überblick](/assets/a2a9ae60-6e00-4d99-95a1-ef7f70ea01b7/c5bfdaad.png)

Das Bild nimmt 60 % der Breite ein und ist zentriert. Beim Compact-Preset sollen Bildabstände kleiner sein als beim Literature-Preset.

# 5 Admonitions

## 5.1 Info-Box

::: info
Diese Info-Box prüft Hintergrundfarbe und Padding im Compact-Preset. Der Hintergrund soll sichtbar, aber sehr dezent sein. Die Box darf nicht mehr Raum einnehmen als nötig.
:::

## 5.2 Warning-Box

::: warning
Diese Warning-Box prüft farbige Hintergründe im Compact-Kontext. Warnung muss sofort erkennbar sein, aber nicht wie ein Präsentationsslide wirken.
:::

## 5.3 Horizontale Linie nach Admonition

---

Der Text nach der Linie prüft den Abstand. Die Linie soll dezent sein.

# 6 Code

## 6.1 Inline-Code

Starte den Server mit `npm start` oder `node server.js --port 3210`. Konfigurationsdateien liegen unter `/etc/app/config.yml`.

## 6.2 Codeblock

```bash
# Server starten
node server.js

# Umgebungsvariablen prüfen
echo "PORT=$PORT"
echo "NODE_ENV=$NODE_ENV"

# Logs tail
tail -f /var/log/app/access.log | grep ERROR
```

```json
{
  "name": "mdedit-io",
  "version": "1.0.0",
  "preset": "compact",
  "footer": false
}
```

<!-- page-break -->

# 7 Seitenumbruch-Test

Dieser Abschnitt ist nach einem expliziten `<!-- page-break -->` gesetzt. Beim Compact-Preset soll kein unnötiger Leerraum nach dem Umbruch entstehen — der neue Abschnitt soll sofort oben auf der Seite beginnen.

## 7.1 Liste nach Seitenumbruch

- Die Liste beginnt direkt nach dem Seitenumbruch.
- Sie prüft, ob der Abstand zwischen Seitenanfang und erstem Listenpunkt stimmt.
- `code`, **fett**, *kursiv* in derselben Liste.
- Langes Wort: Konfigurationsmanagementsystem — prüft Silbentrennung in Listen.

## 7.2 Tabelle nach Umbruch

<!-- table:compact -->

| Prüfpunkt | Wert | OK? |
|---|---:|:---:|
| Seitenumbruch vorhanden | — | ☐ |
| Kein Leerraum nach Umbruch | — | ☐ |
| Liste korrekt eingerückt | — | ☐ |
| Tabelle kompakt gesetzt | — | ☐ |

# 8 Schlusskontrolle

| Prüffrage | OK? | Kommentar |
|---|:---:|---|
| Enge Zeilenabstände sichtbar | ☐ | |
| Überschriften kompakt | ☐ | |
| Compact-Tabelle mit Gitternetz | ☐ | |
| Float-Bild Textumfluss korrekt | ☐ | |
| Zentriertes Bild korrekt | ☐ | |
| Bildunterschriften erkannt | ☐ | |
| Admonitions drucktauglich | ☐ | |
| Info-Box dezenter Hintergrund | ☐ | |
| Warning-Box erkennbar | ☐ | |
| Inline-Code lesbar | ☐ | |
| Codeblock nicht überbreit | ☐ | |
| Horizontale Linie dezent | ☐ | |
| Seitenumbruch sauber | ☐ | |
| Kein MDLAYOUT-Token sichtbar | ☐ | |

## 8.1 Iterationsnotiz

Alle Korrekturen gehören ins globale Compact-Preset. Dieses Dokument ist ein Stresstest — keine lokalen Workarounds.
