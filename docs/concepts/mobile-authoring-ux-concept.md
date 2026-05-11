# Lean Mobile Authoring UX Concept

Stand: 2026-05-11
Status: Bedienkonzept fuer die mobile Arbeitsoberflaeche, keine Implementierung in diesem Schritt.

Bezug: internes Produktdachkonzept fuer ernsthafte Dokumente (lokal gefuehrt, nicht Teil der oeffentlichen Repo-Doku)

## Ziel

Die mobile Arbeitsoberflaeche von mdedit soll Schreiben, Lesen und schnelles Pruefen auf kleinen Screens klar und effizient machen.

Der mobile Kern ist nicht Verwaltung, Werkzeugdichte oder Desktop-Paritaet, sondern Dokumentfokus.

## Produktentscheidung

Fuer die mobile Arbeitsoberflaeche gelten drei feste Leitplanken:

- Folder und Historie sind kein primaerer mobiler Arbeitsweg.
- Der verfuegbare Bildschirm wird fuer Dokumentinhalt priorisiert.
- Die UI bleibt lean und ruhig: keine dekorativen Karten, Schatten oder Rahmen ohne funktionalen Mehrwert.

## Verifizierter Ist-Zustand

Der aktuelle mobile Zustand folgt noch zu stark der Desktop-Logik.

Beobachtete Probleme:

- Die Topbar priorisiert heute Folder-/Spaces-Navigation und ein Overflow-Menue, waehrend der eigentliche Arbeitsmodus erst im Menue gewechselt wird.
- Die kombinierte mobile Standardansicht teilt die vertikale Flaeche zwischen Editor und Preview, obwohl Mobile meist einen klaren Fokus braucht.
- Editor und Preview liegen in kartenaehnlichen Sections mit Border, Radius und Shadow.
- Zusaetzliches Content-Padding, Bereichs-Header und umrahmte Toolbars reduzieren die nutzbare Flaeche.
- Sekundaeraktionen bleiben sichtbar, obwohl sie fuer den mobilen Kernworkflow nicht prioritaer sind.
- Begriffe sind inkonsistent. Im Produkt wird teils noch `Spaces` gezeigt, obwohl der Arbeitsbegriff `Folder` sein soll.
- Onboarding- und Hilfeflaechen erscheinen als dominante Modals und ueberlagern den eigentlichen Arbeitskontext.

## Leitthese

Mobile mdedit wird gut, wenn die Oberflaeche nicht die Desktop-Struktur verkleinert, sondern die Dokumentarbeit konsequent neu priorisiert.

## Leitprinzipien

### 1. Dokument vor Navigation

Die mobile Oberflaeche startet im Dokument, nicht in Verwaltung.

Konsequenz:

- Folder und Historie sind nicht Teil der primaeren mobilen Topbar.
- Falls sie erhalten bleiben, leben sie in einer klar sekundaren Ebene und nicht im Hauptarbeitsweg.

### 2. Ein Fokus pro Zustand

Ein kleiner Screen soll in einem Moment genau einen klaren Arbeitsmodus tragen.

Konsequenz:

- Standard ist genau ein Hauptmodus: `Editor` oder `Preview`.
- Die kombinierte Ansicht ist hoechstens eine optionale Sekundaerfunktion, nicht der Default.
- Der sichtbare Moduswechsel muss ohne Overflow erreichbar sein.

### 3. Flaeche ist Funktion

Jeder Pixel, der nicht dem Dokument oder einer direkt relevanten Aktion dient, ist auf Mobile verdichtungsbeduerftig.

Konsequenz:

- Inhalte laufen nahezu edge-to-edge.
- Aussenpadding wird stark reduziert.
- Bereichsheader bleiben nur dort, wo sie eine echte Aktion oder Orientierung liefern.
- Editor und Preview fuellen die verbleibende Hoehe voll aus.

### 4. Sichtbare Primaraktionen, versteckte Sekundaeraktionen

Die mobile Oberflaeche zeigt nur, was im jeweiligen Kontext haeufig gebraucht wird.

Konsequenz:

- Der Arbeitsmodus bleibt sichtbar.
- Pro Bereich bleiben hoechstens ein bis zwei sichtbare Kernaktionen.
- Layout-Editor, Baum, KI, Seitenansicht und weitere Spezialfunktionen wandern in eine sekundare Aktionsflaeche.

### 5. Lean statt Karten-UI

Mobile braucht keine Sammlung dekorativer Container, sondern eine ruhige Flaeche mit klaren Trennlinien.

Konsequenz:

- Keine Default-Kombination aus Border, Radius und Shadow fuer Editor- und Preview-Container.
- Separatoren statt Kartenrahmen.
- Keine visuelle Stapelung von Flaechen ohne funktionalen Mehrwert.

### 6. Begriffliche Klarheit

Mobile darf keine zweite Produktsprache erzeugen.

Konsequenz:

- Der Begriff ist `Folder`, nicht `Spaces`.
- Mobile Menues, Modals und Hilfetexte verwenden dieselbe Sprache wie der restliche Produktkontext.

## Zielbild der mobilen Arbeitsoberflaeche

### Topbar

Die Topbar ist ein schlanker Steuerbalken, kein Navigationscontainer.

Sie enthaelt:

- einen sichtbaren Modus-Schalter fuer `Editor` und `Preview`
- optional eine einzige `Mehr`-Aktion fuer seltene Werkzeuge

Sie enthaelt nicht:

- primaere Folder-Navigation
- Historie
- breite Marken- oder Kartenflaechen

### Layoutmodell

Die mobile Flaeche ist standardmaessig einspaltig und inhaltszentriert.

Zielzustand:

- Inhalt beginnt direkt unter der Topbar.
- Kein Kartenrahmen um Editor oder Preview.
- Kein gestapelter Default mit zwei halben Arbeitsflaechen.
- Nur minimale Safe-Area- und Inhaltsabstaende.

### Editor-Modus

Der Editor-Modus ist der Schreibmodus und bekommt maximalen Platz.

Zielzustand:

- Schreibflaeche fuellt den Screen unterhalb der Topbar.
- Zeilennummern sind mobil standardmaessig aus oder stark reduziert.
- Sichtbar bleiben nur die wichtigsten Aktionen, zum Beispiel `Neu` und `Teilen`, sofern sie wirklich haeufig gebraucht werden.

### Preview-Modus

Die Preview ist ein Lese- und Pruefmodus, kein Werkzeugregal.

Zielzustand:

- Die Preview nutzt die volle Hoehe.
- Der sichtbare Header ist deutlich reduziert.
- Presets bleiben nur sichtbar, wenn sie im mobilen Hauptworkflow relevant sind.
- Weitere Aktionen liegen in einer sekundaren Aktionsflaeche statt als Reihe kleiner Buttons.

### Hilfe und Onboarding

Mobile Hilfe darf den Arbeitsbeginn nicht dominieren.

Zielzustand:

- Kein grosses blockierendes Startup-Modal als Standard.
- Kurze, ausblendbare Hinweise oder kontextuelle Hilfe statt vollflaechiger Ueberlagerung.

## Informationsarchitektur

Die mobile IA folgt drei Ebenen:

1. Dokumentarbeit
2. kontextuelle Werkzeuge
3. seltene Verwaltung

Das bedeutet:

- Ebene 1 ist immer sichtbar.
- Ebene 2 ist mit einem Schritt erreichbar.
- Ebene 3 ist bewusst ausgelagert und nicht Teil der Standard-Chrome.

## Nicht-Ziele

- keine mobile Miniatur des Desktop-Layouts
- keine permanente Sidebar-Logik fuer den Hauptworkflow
- keine sichtbare Sammlung seltener Spezialwerkzeuge in jeder Ansicht
- keine dekorative Kartenoptik als Default fuer Arbeitsflaechen

## Bewertungs- und Akzeptanzkriterien

Das Konzept ist erreicht, wenn die mobile Oberflaeche folgende Eigenschaften hat:

- Der Arbeitsmodus ist ohne Overflow sichtbar umschaltbar.
- Die Default-Ansicht zeigt genau einen primaeren Arbeitsbereich.
- Folder und Historie sind nicht Teil der primaeren mobilen Topbar.
- Editor und Preview sind nicht von dekorativen Kartenrahmen, Schatten und grossen Aussenabstaenden umgeben.
- Der groesste Teil der vertikalen Flaeche gehoert dem Dokumentinhalt.
- Sekundaerfunktionen erscheinen nur bei Bedarf.
- Die Produktsprache ist konsistent und verwendet `Folder` statt `Spaces`.

## Umsetzungshinweise fuer den naechsten Schritt

Fuer eine spaetere Umsetzung ist die Reihenfolge klar:

1. mobile Topbar und Moduswechsel neu priorisieren
2. gestapelten Default entfernen und Single-Pane als Standard setzen
3. Kartenoptik und ueberfluessige Rahmen aus Editor und Preview entfernen
4. Toolbars pro Modus radikal reduzieren
5. Folder-/Historienzugriffe aus der primaeren Mobile-Chrome entfernen oder in eine Sekundaerebene verlagern
