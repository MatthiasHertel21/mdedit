# mdedit.io Scientific-Layout Referenztest — Masterthesis

Version: Mai 2026  
Zweck: Diese Datei ergänzt den bisherigen Scientific-Layout-Referenztest um zusätzliche Anforderungen für eine Masterthesis-ähnliche PDF-Ausgabe.

**Wichtig:** Diese Datei enthält bewusst **kein dokumentlokales Layout**, **kein Custom CSS**, **kein YAML-Frontmatter** und **kein rohes HTML**.  
Die Gestaltung soll ausschließlich über das globale **Scientific-Layout** beziehungsweise den Layout-Editor in mdedit.io erfolgen.

## Prüfziele dieser erweiterten Datei

| Bereich | Ziel im PDF | Beobachtung |
|---|---|---|
| Kopfzeile | konsistente Kopfzeile ohne Kollision mit Text | ☐ |
| Fußzeile | konsistente Fußzeile mit Seitennummer | ☐ |
| Seitennummern | korrekt, lesbar, nicht doppelt | ☐ |
| Abbildungen | skalieren sauber im Satzspiegel | ☐ |
| Bildunterschriften | nummeriert, direkt bei der Abbildung | ☐ |
| Tabellenunterschriften | nummeriert, direkt bei der Tabelle | ☐ |
| Abbildungsverzeichnis | Einträge vollständig, optional mit Seitenzahlen | ☐ |
| Tabellenverzeichnis | Einträge vollständig, optional mit Seitenzahlen | ☐ |
| Fußnoten | mehrere Fußnoten, keine Kollision mit Footer | ☐ |
| Linien | Tabellenlinien, Trennlinien, Zitatlinien sauber | ☐ |
| Hintergrundfarben | Info-/Warning-Boxen dezent und druckbar | ☐ |
| Tabellen | wissenschaftlich, aber nicht „kaputt“ oder linienlos | ☐ |
| Seitenumbrüche | keine Überschrift allein am Seitenende | ☐ |
| breite Inhalte | Tabellen und Bilder bleiben im Satzspiegel | ☐ |
| Bildattribute | align, width, frame, shadow, filter funktionieren | ☐ |
| Abbildungsverzeichnis automatisch | alle Abb. mit Nummer und Text | ☐ |
| Tabellenverzeichnis automatisch | alle Tab. mit Nummer und Text | ☐ |

[[toc]]

<!-- page-break -->

# Abbildungsverzeichnis

<!-- list-of-figures -->

# Tabellenverzeichnis

<!-- list-of-tables -->

<!-- page-break -->

# 1 Kopfzeilen, Fußzeilen und Seitennummern

## 1.1 Kopfzeilenkontrolle

Dieser Abschnitt dient dazu, Kopfzeilen im PDF zu prüfen. In einer Masterthesis sollte die Kopfzeile typografisch zurückhaltend sein. Sie kann beispielsweise den Dokumenttitel, das aktuelle Kapitel oder eine kurze Abschnittsbezeichnung enthalten. Wichtig ist, dass die Kopfzeile nicht mit dem Fließtext kollidiert und nicht zu dominant wirkt.

Der folgende Absatz ist bewusst etwas länger, damit sichtbar wird, ob die Kopfzeile genügend Abstand zum Textblock hat. Wenn die erste Zeile des Absatzes zu nahe an der Kopfzeile steht, ist entweder der obere Seitenrand zu klein oder der Header-Abstand im PDF-Layout nicht sauber definiert.

## 1.2 Fußzeilen und Seitennummern

Dieser Abschnitt prüft die Fußzeile. Eine Fußzeile darf die Fußnoten nicht verdrängen und sollte mit Seitennummern harmonieren. Bei wissenschaftlichen Arbeiten ist eine schlichte Seitennummer außen oder mittig üblich. Wichtig ist, dass die Nummer nicht zu nah am Seitenrand sitzt und nicht mit Endnoten, Fußnoten oder Tabellen kollidiert.

Dieser Satz enthält eine erste Fußnote.[^fn-header] Dieser Satz enthält eine zweite Fußnote direkt im Anschluss an einen längeren Satz, damit geprüft werden kann, ob mehrere Fußnoten in einem Absatz stabil verarbeitet werden.[^fn-second]

[^fn-header]: Erste Fußnote zur Prüfung der Fußnotenposition im Zusammenspiel mit Kopf- und Fußzeile.
[^fn-second]: Zweite Fußnote zur Prüfung der Abstände, Nummerierung und Lesbarkeit.

## 1.3 Mehrere Fußnoten auf einer Seite

In diesem Abschnitt folgen mehrere Fußnoten in kurzer Folge. Die Fußnoten sollen entweder sauber am Seitenende oder konsistent als Endnoten erscheinen. Entscheidend ist, dass sie nicht mit der Fußzeile kollidieren, nicht in Tabellen hineinlaufen und nicht den Seitenumbruch destabilisieren.[^fn-a] Eine weitere Fußnote steht hier.[^fn-b] Eine dritte Fußnote prüft, ob die Nummerierung stabil bleibt.[^fn-c]

[^fn-a]: Fußnote A mit normaler Länge.
[^fn-b]: Fußnote B mit etwas längerem Text, der über mehr als eine Zeile laufen kann, ohne zu eng oder zu groß gesetzt zu werden.
[^fn-c]: Fußnote C als zusätzliche Nummerierungsprüfung.

<!-- page-break -->

# 2 Abbildungen und Bildunterschriften

## 2.1 Standardabbildung im Satzspiegel

Die folgende Abbildung prüft, ob ein breites Diagramm sauber in den Satzspiegel eingepasst wird. Der Bildmarker steuert Ausrichtung und Breite; die Caption im Alt-Text erzeugt automatisch einen Eintrag im Abbildungsverzeichnis.

<!-- img: align=center width=100% -->
![Abbildung 1: Systemübersicht mit Messpunkten und Datenpipeline](/assets/a2a9ae60-6e00-4d99-95a1-ef7f70ea01b7/fa83ac9d.png)

Der Absatz nach der Abbildung prüft, ob die Bildunterschrift korrekt darunter gesetzt wird und kein übermäßiger Abstand entsteht.

## 2.2 Workflow-Abbildung mit Rahmen

Die nächste Abbildung prüft, ob Linien, Pfeilspitzen und Text im PDF scharf bleiben. Sie wird mit einem dezenten Rahmen versehen (`frame`).

<!-- img: align=center width=85% frame -->
![Abbildung 2: Workflow-Diagramm mit Ablaufpfeilen und Entscheidungsknoten](/assets/a2a9ae60-6e00-4d99-95a1-ef7f70ea01b7/c5bfdaad.png)

## 2.3 Kleine Abbildung rechtsbündig mit Schatten

Die nächste Abbildung prüft, ob ein quadratisches Diagramm mit `align=right` rechtsbündig in den Text integriert werden kann. Der Fließtext läuft links davon.

<!-- img: align=right width=42% shadow -->
![Abbildung 3: Quadratisches Messdiagramm im Float-Layout mit Schlagschatten](/assets/a2a9ae60-6e00-4d99-95a1-ef7f70ea01b7/9aeaae98.png)

Dieser Absatz prüft, ob der Text links neben der rechtsbündigen Abbildung läuft und nicht darunter gesetzt wird. Bei korrektem Float-Layout sollten mehrere Textzeilen nebeneinander erscheinen. Die Abbildung sollte dabei sauber am rechten Rand anliegen und den Satzspiegel nicht verlassen.



<!-- page-break -->

# 3 Tabellen, Tabellenunterschriften und Linien

## 3.1 Wissenschaftliche Tabelle mit Caption

Die folgende Tabelle soll wie eine wissenschaftliche Tabelle wirken. Erwartet wird ein klares Linienkonzept: üblicherweise eine obere Linie, eine Linie unter der Kopfzeile und eine untere Linie. Vertikale Linien sind in wissenschaftlichen Tabellen meist nicht nötig.

**Tabelle 1: Vergleich mehrerer Layoutbereiche und ihrer erwarteten Wirkung.**

<!-- table:scientific -->

| Bereich | Erwartung | Kritische Prüfung | Status |
|---|---|---|---|
| Kopfzeile | zurückhaltend | Abstand zum Text | ☐ |
| Fußzeile | lesbar | Kollision mit Fußnoten | ☐ |
| Seitennummer | eindeutig | keine doppelte Nummerierung | ☐ |
| Abbildung | skaliert | bleibt im Satzspiegel | ☐ |
| Tabellenlinie | booktabs-artig | obere und untere Linie sichtbar | ☐ |

## 3.2 Tabelle mit vielen Spalten

Diese Tabelle prüft, ob breite Tabellen noch lesbar bleiben, ohne harte Einzelbuchstaben-Trennungen zu erzeugen.

**Tabelle 2: Breite Prüftabelle mit kurzen und langen Zellinhalten.**

<!-- table:scientific -->

| Phase | Layoutobjekt | Eingabe | Verarbeitung | Ausgabe | Risiko | Gegenmaßnahme |
|---|---|---|---|---|---|---|
| Analyse | Kopfzeile | Kapiteltitel | automatische Platzierung | ruhige Kopfzeile | zu dominant | kleinere Schrift |
| Analyse | Fußzeile | Seitennummer | automatische Nummerierung | klare Orientierung | Kollision | größerer Footer-Abstand |
| Layout | Tabelle | Pipe-Tabelle | Scientific-Preset | saubere Matrix | harte Trennung | bessere Spaltenbreiten |
| Layout | Abbildung | SVG-Datei | PDF-Rendering | scharfe Grafik | Überbreite | maximale Bildbreite |
| Layout | Caption | Alt-Text | Caption-Erkennung | nummerierte Beschriftung | falsche Position | Caption-Regeln |

## 3.3 Compact-Tabelle mit Gitternetz

Die folgende Tabelle soll bewusst kompakter und technischer wirken. Hier sind Zellrahmen akzeptabel, aber sie dürfen nicht zu dunkel oder zu dick sein.

**Tabelle 3: Compact-Tabelle zur Prüfung von Zellrahmen und Hintergrundflächen.**

<!-- table:compact -->

| Nr. | Testobjekt | Soll-Verhalten | OK? |
|---:|---|---|:---:|
| 1 | Header-Zeile | dezenter Hintergrund | ☐ |
| 2 | Zellrahmen | dünn, nicht dominant | ☐ |
| 3 | Padding | kompakt, aber lesbar | ☐ |
| 4 | Checkbox | nicht abgeschnitten | ☐ |
| 5 | Zahlen | rechtsbündig möglich | ☐ |

## 3.4 Tabellenlinien: Sollbild

Diese Tabelle prüft ausdrücklich die Frage, ob oben und unten Linien sichtbar sind.

**Tabelle 4: Linienkontrolle für Scientific-Tabellen.**

<!-- table:scientific -->

| Linie | Erwartung | Bewertung |
|---|---|---|
| obere Tabellenlinie | sichtbar, aber nicht schwer | ☐ |
| Linie unter Kopfzeile | sichtbar | ☐ |
| Zeilenlinien im Körper | optional oder sehr dezent | ☐ |
| untere Tabellenlinie | sichtbar | ☐ |
| vertikale Linien | normalerweise nicht sichtbar | ☐ |

<!-- page-break -->

# 4 Hintergrundfarben, Linien und Admonitions

## 4.1 Info-Box

::: info
Diese Info-Box prüft Hintergrundfarbe, Rahmen, Innenabstand und Drucktauglichkeit. Der Hintergrund sollte sichtbar, aber sehr dezent sein. Der Rahmen sollte nicht schwerer wirken als Tabellenlinien.
:::

## 4.2 Warning-Box

::: warning
Diese Warning-Box prüft, ob farbige oder graue Hintergründe bei wissenschaftlichen PDFs nicht zu plakativ wirken. Die Box darf auffallen, sollte aber nicht wie ein Präsentationsslide aussehen.
:::

## 4.3 Linien und Trenner

Der folgende horizontale Trenner prüft Linienbreite und Abstand.

---

Nach dem Trenner sollte der Text wieder ruhig weiterlaufen. Die Linie darf nicht wie ein Kapitelabschluss wirken, sondern nur als dezente visuelle Trennung.

## 4.4 Blockzitat mit Linie

> Dieses Blockzitat prüft die Stärke der Zitatlinie. Eine gute Zitatlinie ist sichtbar, aber zurückhaltend. Sie sollte weder wie eine Tabellenlinie noch wie ein farbiger Balken wirken.
>
> Der zweite Absatz prüft den Innenabstand und den Abstand nach dem Zitat.

<!-- page-break -->

# 5 Seitenumbrüche und Keep-with-next

## 5.1 Überschrift mit Folgetabelle

Diese Überschrift darf nicht allein am Seitenende stehen. Die folgende Tabelle sollte möglichst zusammen mit dieser Einleitung auf einer Seite bleiben.

**Tabelle 5: Keep-with-next-Test für Überschrift, Absatz und Tabelle.**

<!-- table:compact -->

| Schritt | Beschreibung | Ergebnis |
|---:|---|---|
| 1 | Überschrift wird gesetzt | darf nicht allein stehen |
| 2 | Einleitender Absatz folgt | sollte nicht getrennt werden |
| 3 | Tabelle folgt | sollte nicht komplett auf Folgeseite rutschen |

## 5.2 Überschrift mit Folgeabbildung

Diese Überschrift prüft denselben Effekt mit einer Abbildung. Der Graustufen-Filter (`filter=grayscale`) testet Drucktauglichkeit.

<!-- img: align=center width=80% filter=grayscale -->
![Abbildung 4: Workflow-Abbildung im Graustufen-Drucktest](/assets/a2a9ae60-6e00-4d99-95a1-ef7f70ea01b7/c5bfdaad.png)

## 5.3 Lange Liste vor Seitenende

Die folgende Liste prüft, ob Listen am Seitenende sinnvoll umbrechen:

- Erster Prüfpunkt mit normalem Text.
- Zweiter Prüfpunkt mit längerem Text, der über mehrere Zeilen laufen darf und dennoch eine saubere hängende Einrückung behalten soll.
- Dritter Prüfpunkt mit `Inline-Code`, **Fettdruck** und *Kursivschrift*.
- Vierter Prüfpunkt mit langem zusammengesetztem Wort: Informationssicherheitsanforderungskatalog.
- Fünfter Prüfpunkt mit Abschlussbemerkung.

<!-- page-break -->

# 6 Formeln und Code im erweiterten Test

## 6.1 Formelblock

Die folgende Formel prüft Display-Math.

$$
Score = \sum_{i = 1}^{n} w_i \cdot x_i
$$

Eine Inline-Formel wie $x'_i = (x_i - \min(x)) / (\max(x) - \min(x))$ sollte im Fließtext stehen.

## 6.2 Mehrzeilige Formel

Die folgende Formel prüft mehrzeiliges Rendering.

$$
\begin{aligned}
z_i &= \frac{x_i - \mu}{\sigma} \\
R &= \alpha \cdot T + \beta \cdot Q - \gamma \cdot C
\end{aligned}
$$

## 6.3 Codeblock mit längerer Zeile

```python
def calculate_weighted_score(values, weights, minimum_allowed_value=0.0, maximum_allowed_value=1.0):
    """Berechnet einen gewichteten Score und begrenzt ihn auf einen definierten Wertebereich."""
    raw_score = sum(value * weight for value, weight in zip(values, weights))
    return max(minimum_allowed_value, min(maximum_allowed_value, raw_score))
```

# 7 Schlusskontrolle

## 7.1 Prüftabelle

| Prüffrage | OK? | Kommentar |
|---|:---:|---|
| Kopfzeile sichtbar und dezent | ☐ | |
| Fußzeile sichtbar und dezent | ☐ | |
| Seitennummer korrekt | ☐ | |
| Abbildungen im Satzspiegel | ☐ | |
| Bildunterschriften erkannt | ☐ | |
| Tabellenunterschriften erkannt | ☐ | |
| Abbildungsverzeichnis erzeugt | ☐ | |
| Tabellenverzeichnis erzeugt | ☐ | |
| Scientific-Tabelle mit Top-/Bottom-Rule | ☐ | |
| Compact-Tabelle mit dezentem Raster | ☐ | |
| Fußnoten ohne Kollision | ☐ | |
| Admonitions drucktauglich | ☐ | |
| Formeln korrekt | ☐ | |
| Codeblock nicht überbreit | ☐ | |
| Bildattribute (align, frame, shadow, filter) | ☐ | |
| Float-Bild mit Textumfluss | ☐ | |
| Abbildungsverzeichnis vollständig | ☐ | |
| Tabellenverzeichnis vollständig | ☐ | |

## 7.2 Notiz für die nächste Iteration

Dieses Dokument dient als komplexerer Stresstest. Es soll nicht dokumentlokal repariert werden. Alle Verbesserungen gehören in das globale Scientific-Layout beziehungsweise in den Layout-Editor von mdedit.io.
