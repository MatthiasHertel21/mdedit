# Stage Uebersicht

Stand: 2026-05-10

Diese Uebersicht trennt Quellrepo, lokale Laufzeit und oeffentliche Laufzeit. "Codestand" meint hier entweder den Git-Stand des Quellrepos oder, bei reinen Runtime-Verzeichnissen, den nachweisbaren Build- und Container-Stand.

| Stage | Rolle | Projektverzeichnis | Web-URL | Codestand |
| --- | --- | --- | --- | --- |
| Workspace / Source of truth | Aktives Quellrepo und Build-Quelle | `/home/ga/md` | kein eigener Public-Endpunkt | Git: `main` @ `64846dc`; Working tree aktuell dirty mit geaenderten und neuen Dateien. Schwerpunkte der laufenden Aenderungen: wissenschaftlicher Export, Layout-/Print-Pfad, Smoke-Tests und vendorte FontAwesome-Webfonts. |
| Local Docker runtime | Lokale Validierung und release-nahe Tests | `/home/ga/md` via `docker compose`, Service `md-tree`, Container `mdedit-io` | `http://127.0.0.1:3210` | Container ist healthy. Laufender Stand kommt direkt aus dem Workspace `/home/ga/md` und nutzt das lokale Image `md-md-tree`. Dieser Pfad ist die technische Vorstufe fuer Runtime-Checks, aber nicht der autoritative Browser-Endpunkt fuer Nutzerfreigaben. |
| Public runtime / authoritative stage | Oeffentlicher Validierungspfad fuer Browser- und Exportchecks | Build-Quelle: `/home/ga/md`; Runtime-Verzeichnis: `/home/ga/mdedit` via `docker compose`, Service `mdedit`, Container `mdedit-app` | `https://md.2b6.de` intern `http://127.0.0.1:3211` | Runtime-Verzeichnis ist kein Git-Checkout. Container ist healthy und nutzt `mdedit-app:latest`, zuletzt aus dem aktuellen Workspace neu gebaut und in `/home/ga/mdedit` neu erstellt. Der Live-Referenz-Smoke gegen `https://md.2b6.de` war in diesem Stand erfolgreich. |

## Kurzregeln

1. Code-Aenderungen passieren immer in `/home/ga/md`.
2. Der lokale Runtime-Check laeuft ueber `/home/ga/md` auf Port `3210`.
3. Der oeffentliche Stage-Stand wird aus `/home/ga/md` gebaut und nach `/home/ga/mdedit` ausgerollt.
4. `/home/ga/mdedit` ist ein Runtime-Verzeichnis, kein eigenes Quellrepo. Der dortige Codestand ist daher nur ueber den Build aus `/home/ga/md` und den laufenden Container nachvollziehbar.

## Wichtige Besonderheit auf diesem Host

`deploy-prod.sh` erwartet lokal Node 20+, waehrend die Host-Standardinstallation in dieser Session noch Node 18 war. Fuer den letzten Produktionsstand wurde daher der inhaltlich gleiche Docker-Build-und-Recreate-Pfad manuell ausgefuehrt: Image aus `/home/ga/md` bauen und die Runtime in `/home/ga/mdedit` per `docker compose up -d --force-recreate` aktualisieren.