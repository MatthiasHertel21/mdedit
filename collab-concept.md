# Collab Concept (MVP)

Stand: 2026-05-02
Status: Konzept freigegeben, keine Implementierung in diesem Schritt.

## Zielbild

Echtzeit-Multi-Edit wird nur fuer geteilte Dokumente (Permalink) aktiviert.
Jeder mit Permalink kann am gemeinsamen Dokument arbeiten, inklusive Presence, Cursor-Sprung und Chat.

## Scope und Grundregeln

- Collab gilt nur fuer Dokumente mit erzeugtem Permalink.
- Kein separates Read-/Write-Link-Modell (ein Link).
- Rechte werden ueber den Schluessel-Dialog verwaltet.
- Merge bei Reconnect: automatisch (CRDT/automerge, ohne manuelle Konflikt-UI).
- Offline-Bearbeitung: lokal weiterschreiben, spaeter automatisch mergen.

## Nutzeridentitaet und Presence

- Beim Join wird automatisch ein Fantasy-Name vergeben.
- Fantasy-Name bleibt fuer den Nutzer dauerhaft gespeichert.
- Presence-Avatare im Header: maximal 5 sichtbar, danach "+N".
- Presence-Timeout: 5 Minuten Inaktivitaet.
- Klick auf Avatar springt zur Position im Editor.
- Beim Sprung: Cursor + temporaeres Highlight (2s).
- Vorschau, Seitenansicht und Baumansicht sollen synchron folgen.

## Shared Chat

- Chat ist dokumentbezogen und fuer alle Link-Nutzer sichtbar.
- Modell: mehrere Threads mit Titel.
- Thread-Erstellung: jeder mit Link (Leser + Schreiber).
- KI im Shared Chat: nur Advisory (kein Auto-Apply).

## Historie und Snapshots

- Snapshots mindestens alle 30 Sekunden.
- Restore-Funktion ist verpflichtend.
- Retention: 7 Tage rollierendes Fenster.
- Daten fuer Kollab-Ereignisse kurzzeitig persistieren (Ziel: ca. 24h fuer fluechtige Events, Snapshots separat nach 7-Tage-Regel).

## Passwortschutz fuer Permalinks

### UX-Anforderung

- Schluessel-Icon im Header des Markdown-Fensters.
- Das Icon erscheint erst, nachdem mindestens einmal "Permalink erzeugen" ausgefuehrt wurde.
- Klick auf Schluessel-Icon oeffnet den Schluessel-Dialog.

### Berechtigungsmodell im Schluessel-Dialog

- Nutzer mit Link duerfen Lesen/Schreiben gemaess Dialog-Konfiguration.
- Kein zweiter Edit-Token; weiterhin ein Link.
- Das Modell bleibt einfach und zentral konfigurierbar pro Dokument.

### Passwort-Logik

- Passwort-Option ist optional (Dokument kann weiterhin ohne Passwort geteilt sein).
- Wenn Passwort aktiv ist, ist es fuer das Oeffnen des Permalinks erforderlich.
- Ein einzelnes Passwort fuer das Dokument (kein separates Read-/Write-Passwort).
- Passwort kann spaeter ueber den Schluessel-Dialog geaendert oder entfernt werden.
- Serverseitige Speicherung ausschliesslich als bcrypt-Hash.

## Dialog-Inhalte (MVP)

Der Schluessel-Dialog soll mindestens enthalten:

- Schalter: "Passwortschutz aktiv" (ja/nein)
- Eingabe: "Passwort festlegen" (nur wenn aktiv)
- Rechteblock: "Nutzer mit Link duerfen lesen/schreiben"
- Aktion: "Speichern"
- Aktion: "Passwort entfernen" (wenn bereits gesetzt)

## Nicht-Ziele im MVP

- Keine getrennten Links fuer Lesen und Schreiben.
- Keine manuelle Konfliktaufloesung im ersten Schritt.
- Kein Auto-Apply von KI-Antworten in Shared-Chats.

## Akzeptanzkriterien (fachlich)

- Nach erstmaligem Erzeugen eines Permalinks wird das Schluessel-Icon sichtbar.
- Aktivierter Passwortschutz blockiert den Zugriff auf den Permalink ohne korrektes Passwort.
- Mit korrektem Passwort ist Dokumentzugriff gemaess gesetzten Rechten moeglich.
- Password-Change und Password-Remove funktionieren ohne Link-Wechsel.
- Presence, Cursor-Sprung, Chat, Snapshot/Restore arbeiten im gemeinsamen Dokument konsistent.

## Offene Punkte fuer technische Umsetzung (naechster Schritt)

- Exaktes CRDT-Format und Event-Protokoll (WebSocket-Nachrichten).
- DB-Schema fuer Passwort-Metadaten, Rechte und Snapshot-Storage.
- Verhalten bei parallelen Rechteaenderungen im Schluessel-Dialog.
- UI-Text-Feinschliff und i18n fuer neue Dialogelemente.
