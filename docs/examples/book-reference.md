---
preset: literature
header: true
footer: true
---

# mdedit.io Literature-Layout Referenztest — Buch

**Prüfziele für das Literature-Preset**

<!-- table:default -->

| Nr | Prüfziel | OK? |
|---:|---|:---:|
| 1 | Serifenschrift (Garamond/Georgia) im Fließtext | ☐ |
| 2 | Blocksatz mit Silbentrennung | ☐ |
| 3 | Kapiteltypografie: H1 groß, H2 etwas kleiner | ☐ |
| 4 | Größere Absatzabstände als Scientific-Preset | ☐ |
| 5 | Blockzitate mit Einrückung und Kursiv | ☐ |
| 6 | Fußnoten ohne Kollision | ☐ |
| 7 | Abbildungsverzeichnis vollständig | ☐ |
| 8 | Bildunterschriften erkannt (Abb. N:) | ☐ |
| 9 | Seitennummer sichtbar (Fußzeile) | ☐ |
| 10 | Tabellen dezent, ohne schwere Linien | ☐ |
| 11 | Horizontale Linie dezent | ☐ |
| 12 | Inline-Code lesbar | ☐ |
| 13 | Float-Bild mit Textumfluss korrekt | ☐ |
| 14 | Bildrahmen bei frame-Attribut sichtbar | ☐ |

[[toc]]

<!-- page-break -->

## Abbildungsverzeichnis

<!-- list-of-figures -->

<!-- page-break -->

# 1 Einleitung

Dieses Dokument testet das **Literature-Preset** von mdedit.io unter realen Druckbedingungen. Es ist als Buch oder wissenschaftliche Monografie mit Fließtext, Blockzitaten, Fußnoten und Abbildungen aufgebaut. Das Preset verwendet eine Serifenschrift, großzügigere Abstände und eine klassische Buchtypografie.

Der Literature-Preset ist für Texte geeignet, die längeres Lesen begünstigen sollen: Essays, Sachbücher, Dissertationen im geisteswissenschaftlichen Stil, Berichte mit viel Prosa. Tabellen sind möglich, spielen aber eine untergeordnete Rolle.

Dieser Einleitungsabsatz prüft gleichzeitig, ob der Blocksatz mit Silbentrennung aktiviert ist und ob Serifenschrift sauber gesetzt wird. Eine gute Buchtypografie zeichnet sich durch gleichmäßige Wortabstände und ruhige Grauwerte aus. Dieser Satz ist lang genug, um Blocksatz sinnvoll bewertbar zu machen.

# 2 Kapitelstruktur und Typografie

## 2.1 Überschriftenebenen

Das Preset prüft drei Überschriftenebenen. H1 markiert Kapitel, H2 Unterkapitel, H3 Abschnitte. Der Abstand zwischen Überschrift und Folgetext soll spürbar, aber nicht zu groß sein. Serifenschriften bei Überschriften sind optional — das Literature-Preset kann sie einsetzen oder mit einer modernen Sans-Serif kontrastieren.

### 2.1.1 Abschnitt auf dritter Ebene

Dieser Abschnitt prüft H3. Er soll kleiner als H2 sein und trotzdem noch klar als Strukturelement erkennbar bleiben. Ein Fließtextabsatz darunter prüft den Abstand zwischen Überschrift und normalem Text.

## 2.2 Lauftext mit langen Absätzen

Das Literature-Preset ist besonders für lange Absätze ausgelegt. Der folgende Absatz prüft, ob Zeilen sauber umbrechen, ob Wortabstände im Blocksatz gleichmäßig bleiben und ob Silbentrennung bei langen deutschen Komposita greift.

Informationssicherheitsanforderungskataloge gehören zu den anspruchsvollsten Dokumenten im behördlichen Schriftverkehr. Sie vereinen typografische Herausforderungen mit inhaltlicher Komplexität: Lange Komposita müssen silbengetrennt werden, Aufzählungen müssen konsistent eingerückt sein, und Tabellen müssen trotz ihrer Nüchternheit lesbar bleiben. Das Literature-Preset nimmt sich dieser Aufgabe mit klassischer Buchtypografie an.

Ein weiterer langer Absatz, um Blocksatz über mehrere Zeilen zu testen. Der Text soll ruhig und gleichmäßig gesetzt wirken. Kein Wortabstand soll auffällig groß sein. Silbentrennung greift idealerweise bei Wörtern wie Abbildungsverzeichnis, Tabellenverzeichnis, Druckvorschau und Seitenumbruch. Die Linienlänge im Literature-Preset ist etwas schmaler als bei modernen Web-Reports, was die Lesbarkeit von Fließtext verbessert.

# 3 Abbildungen im Literature-Preset

## 3.1 Zentrierte Abbildung mit Unterschrift

Die folgende Abbildung ist zentriert gesetzt und nimmt 85 % der Breite ein. Das Literature-Preset prüft hier, ob Bildunterschriften korrekt erkannt werden und ob das Label „Abb. 1:" mit engem Leerzeichen und ohne Leerzeichenfehler vor dem Doppelpunkt gesetzt wird.

<!-- img: align=center width=85% -->
![Abbildung 1: Systemübersicht — Messstellen und Datenfluss](/assets/a2a9ae60-6e00-4d99-95a1-ef7f70ea01b7/fa83ac9d.png)

Der Text nach der Abbildung prüft den Abstand zwischen Figcaption und nächstem Absatz. Beim Literature-Preset sollte dieser Abstand etwas größer sein als beim Scientific-Preset, um die visuelle Ruhe des Buches nicht zu stören.

## 3.2 Float-Abbildung mit Textumfluss

Ein Float-Bild rechts vom Text ist ein klassisches Mittel in Büchern. Das folgende Bild nimmt 38 % der Breite ein und wird vom Text umflossen. Der Textumfluss prüft, ob Zeilen sauber am Float-Rand umbrechen und ob kein Text mit dem Bild überlappt.

<!-- img: align=right width=38% frame -->

![Abbildung 2: Quadratisches Messdiagramm mit Referenzwerten](/assets/a2a9ae60-6e00-4d99-95a1-ef7f70ea01b7/9aeaae98.png)

Der Fließtext umläuft das Bild. Dieser Absatz ist absichtlich länger, damit der Umfluss über mehrere Zeilen sichtbar wird. Beim Literature-Preset soll der Umfluss besonders sauber wirken, weil er in Büchern häufig vorkommt. Der Abstand zwischen Text und Bild (margin) soll ausreichend sein, damit Text und Bild nicht zu dicht nebeneinander stehen.

Ein zweiter Absatz innerhalb des Float-Bereichs: Dieser prüft, ob der Textumfluss korrekt endet, sobald das Bild zu Ende ist. Danach soll der Text wieder über die volle Spaltenbreite laufen. Außerdem prüft der `frame`-Parameter, ob ein dezenter Rahmen um das Bild gesetzt wird.

# 4 Blockzitate und Fußnoten

## 4.1 Einfaches Blockzitat

> Das Lesen ist der beste Weg, um die eigene Sprache zu formen. Wer viel liest, lernt nicht nur Inhalte, sondern auch Rhythmus, Struktur und den Klang von Sätzen.
>
> Gute Typografie unterstützt diesen Prozess, indem sie den Blick führt, ohne aufzufallen. Ein Blockzitat im Literature-Preset soll eingerückt, kursiv und mit einem dezenten linken Rand gesetzt werden.

## 4.2 Verschachteltes Blockzitat

> Erste Ebene: Das äußere Zitat rahmt den Kontext.
>
> > Zweite Ebene: Das innere Zitat ist die eigentliche Quelle. Es soll deutlich stärker eingerückt wirken und sich visuell von der äußeren Ebene abheben.
>
> Zurück zur ersten Ebene: Der Kommentar folgt dem Zitat.

## 4.3 Fußnoten

Der folgende Satz enthält eine Fußnote.[^1] Sie prüft, ob Fußnoten im Literature-Preset korrekt gesetzt werden. Ein zweiter Satz mit einer weiteren Fußnote[^2] prüft, ob mehrere Fußnoten auf derselben Seite kollisionsfrei gesetzt werden.

[^1]: Erste Fußnote: Das Literature-Preset setzt Fußnoten am Seitenende mit einem dezenten Trennstrich. Fußnotentext soll kleiner als der Fließtext sein und trotzdem gut lesbar bleiben.

[^2]: Zweite Fußnote: Mehrere Fußnoten pro Seite sind häufig in geisteswissenschaftlichen Texten. Sie dürfen nicht in den Satzspiegel einbrechen und nicht den Footer mit der Seitennummer überlagern.

Ein weiterer Absatz nach den Fußnotenmarkierungen, um zu prüfen, ob der Fließtext nach dem Fußnoteneinsatz ohne Unterbrechung weiterläuft.

<!-- page-break -->

# 5 Listen und Hervorhebungen

## 5.1 Ungeordnete Liste

- Erster Punkt mit normalem Fließtext, der über mehrere Zeilen laufen kann und korrekte hängende Einrückung behalten soll.
- Zweiter Punkt mit **Fettdruck** und *Kursivschrift* im selben Satz — ein häufiges Muster in geisteswissenschaftlichen Texten.
- Dritter Punkt mit `Inline-Code`, der im Literature-Preset lesbar sein soll, ohne zu dominant zu wirken.
- Vierter Punkt mit einem langen deutschen Kompositum: Kulturwissenschaftlichkeitsanforderung — prüft Silbentrennung in Listen.
- Fünfter Punkt mit abschließender Bemerkung.

## 5.2 Geordnete Liste

1. Erster Schritt: Vorlage wählen.
2. Zweiter Schritt: Inhalt einfügen.
3. Dritter Schritt: Layout prüfen.
4. Vierter Schritt: PDF exportieren.
5. Fünfter Schritt: Druckkontrolle durchführen.

## 5.3 Verschachtelte Liste

- Hauptpunkt A
  - Unterpunkt A.1 mit Text
  - Unterpunkt A.2 mit Text
    - Unterunterpunkt A.2.1
- Hauptpunkt B
  - Unterpunkt B.1
  - Unterpunkt B.2

## 5.4 Horizontale Linie

Der folgende Trenner prüft Linienbreite und Abstände im Literature-Preset. Die Linie soll dezent und nicht dominanter wirken als eine Tabellengrenze.

---

Text nach dem Trenner. Das Literature-Preset soll die Linie ruhig in den Textsatz einbetten, ohne einen optischen Bruch zu erzeugen.

# 6 Tabelle im Literature-Preset

Das Literature-Preset verwendet standardmäßig eine dezente Tabelle ohne schwere Linien. Die folgende Tabelle prüft Lesbarkeit und Abstände.

Tabelle 1: Übersicht der Kapitel und ihrer Prüfschwerpunkte.

| Kapitel | Titel | Prüfschwerpunkt |
|---:|---|---|
| 1 | Einleitung | Serifenschrift, Blocksatz |
| 2 | Typografie | Überschriften, Absätze |
| 3 | Abbildungen | Float, Bildunterschrift |
| 4 | Zitate + Fußnoten | Blockzitat, Fußnotenabstand |
| 5 | Listen + Linien | Einrückung, Linienstärke |
| 6 | Tabellen | Dezenz, Lesbarkeit |
| 7 | Schlusskontrolle | Gesamtbild |

<!-- page-break -->

# 7 Schlusskontrolle

## 7.1 Prüftabelle

| Prüffrage | OK? | Kommentar |
|---|:---:|---|
| Serifenschrift im Fließtext sichtbar | ☐ | |
| Blocksatz gleichmäßig | ☐ | |
| Silbentrennung greift | ☐ | |
| H1 deutlich größer als H2 | ☐ | |
| Blockzitat eingerückt und kursiv | ☐ | |
| Fußnoten am Seitenende | ☐ | |
| Fußnoten kollisionsfrei | ☐ | |
| Abbildung 1 zentriert | ☐ | |
| Abbildung 2 mit Float-Textumfluss | ☐ | |
| Bildunterschriften erkannt (Abb. N:) | ☐ | |
| Abbildungsverzeichnis vollständig | ☐ | |
| Tabelle dezent, ohne schwere Linien | ☐ | |
| Seitennummer in Fußzeile sichtbar | ☐ | |
| Inline-Code lesbar | ☐ | |
| Horizontale Linie dezent | ☐ | |

## 7.2 Iterationsnotiz

Alle Korrekturen gehören in das globale Literature-Preset von mdedit.io, nicht in die lokale Dokumentkonfiguration. Ziel ist ein Preset, das ohne Anpassungen druckfertige Bücher und Monografien erzeugt.
