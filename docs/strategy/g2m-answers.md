# G2M Answers

Stand: 3. Mai 2026

Diese Antworten basieren auf dem aktuellen Repo, den UI-Texten, den Konzeptdokumenten und deinen nachgereichten GTM-Antworten. Wo sich Aussagen direkt aus Code oder Doku ableiten lassen, formuliere ich sie als belastbare Arbeitsantwort. Wo Produktstrategie, Branding oder Vermarktung nicht aus dem Repo hervorgehen, markiere ich das als offene Rueckfrage statt zu raten.

Wichtiger Hinweis: `mdedit.io` ist die finale Marke. Die zentralen Lizenz-, Domain- und Metadaten im Repo sind jetzt auf `mdedit.io` und Apache License 2.0 umgestellt.

## 1. Grundpositionierung

- Was ist mdedit.io in einem einzigen Satz: Ein browserbasierter Markdown-Editor mit Live-Vorschau, Outline/Tree-Ansicht, PDF- und DOCX-Export, lokalem Session-Modell und optionalem Teilen per Permalink.
- Fuer wen ist mdedit.io primaer gedacht: Am ehesten fuer Menschen, die laengere Markdown-Dokumente im Browser schreiben und dabei Vorschau, Strukturansicht und Export brauchen.
- Wer soll das Tool nicht verwenden: Nutzer, die heute schon zwingend Offline-first, Git-Workflows, vollwertige IDE-Funktionen, Plugins oder etablierte Team-Kollaboration auf Enterprise-Niveau brauchen.
- Welches konkrete Problem loest mdedit.io: Markdown schnell im Browser schreiben, strukturiert ueberblicken, sauber vorschauen und in druck- oder office-taugliche Formate exportieren, ohne Login und ohne lokale Desktop-Installation.
- Warum hast du mdedit.io gebaut: Das Repo selbst beantwortet das nicht direkt. Indirekt spricht viel fuer "ich brauchte den Editor selbst", weil im Backlog und About-Bereich genau diese Richtung anklingt.
- Was war an bestehenden Markdown-Editoren unbefriedigend: Nicht explizit dokumentiert. Aus dem Produktbild ableitbar sind Unzufriedenheit mit zu wenig Druck-/Export-Fokus, zu wenig Privatsphaere oder zu schwergewichtigen Workflows.
- Was ist der wichtigste Nutzen nach den ersten 30 Sekunden Nutzung: Sofort schreiben, sofort Vorschau sehen, sofort exportieren oder teilen, ohne Account.
- Was soll ein Nutzer nach dem ersten Besuch denken: "Das startet direkt im Editor, ist schnell, kann mehr als nur Plain Markdown und zwingt mich nicht erst in einen Account-Flow."
- Ist mdedit.io eher ein Tool fuer Entwickler, Autoren, Studierende, Blogger, Teams oder alle: Im aktuellen Stand am ehesten fuer Entwickler, technische Autoren, Studierende und Power-User von Markdown. "Alle" waere als Claim aktuell zu breit.
- Soll mdedit.io eher als einfach, maechtig, privat, schnell, minimalistisch, Open Source oder professionell wahrgenommen werden: Die am besten belegbaren Attribute sind schnell, direkt, privatheitsfreundlich, markdown-fokussiert, exportstark und klar als quelloffenes Projekt mit Apache License 2.0 strukturiert.

## 2. Zielgruppe

- Wer ist die wichtigste Nutzergruppe: Fuer den ersten Launch bewusst gemischt, mit starker Relevanz fuer Entwickler, technische Autoren, Studierende und kleine Teams.
- Welche drei Nutzergruppen waeren ebenfalls interessant: Studierende, Blogger/Content-Autoren, kleine Teams mit leichtgewichtigem Permalink-Sharing.
- Welche typischen Aufgaben erledigen diese Nutzer mit Markdown: READMEs, technische Notizen, Spezifikationen, Dokumentationen, wissenschaftsnahe Texte, Meeting- oder Projektunterlagen.
- Schreiben sie READMEs, Dokumentation, Blogposts, Notizen, technische Spezifikationen, wissenschaftliche Texte oder E-Mails: Aus dem Funktionsumfang klar belegt sind Dokumentation, Spezifikationen, Notizen und wissenschaftsnahe Dokumente. Blogposts sind plausibel, E-Mails sind kein fokussierter Use Case.
- Nutzen sie Markdown beruflich oder privat: Beides ist moeglich, aber der aktuelle Funktionsumfang wirkt eher beruflich/prosumer-orientiert als consumer-orientiert.
- Sind die Nutzer eher Anfaenger oder erfahrene Markdown-Nutzer: Eher leicht fortgeschritten bis erfahren. Die Hilfe senkt die Einstiegshuerde, aber Mermaid, Layout-Block, Druckansicht und Exportoptionen sprechen eher geuebte Nutzer an.
- Welche Sprache sprechen die Zielnutzer hauptsaechlich: Fuer den Launch sind Deutsch und Englisch die Hauptsprachen. Die App hat darueber hinaus Uebersetzungsdateien fuer zehn Sprachen.
- Soll die erste Vermarktung auf Deutsch, Englisch oder beides erfolgen: Beides. Das ist jetzt als GTM-Entscheidung gesetzt.
- Gibt es eine bestimmte Community, fuer die mdedit.io besonders gut passt: Besonders passend fuer Markdown-heavy Communities rund um Docs, Knowledge Work, Indie Hacking, akademische Texte und technische Inhalte.
- Gibt es bereits Beta-Nutzer oder Feedback von echten Nutzern: Nicht im Repo dokumentiert.

## 3. Kernfeatures

- Welche Features sind bereits fertig: Live-Preview, Zwei-Spalten-Editor, Outline/Tree-Ansicht, GFM-nahe Markdown-Erweiterungen, Mermaid, KaTeX, Fussnoten, Tabellen, Aufgabenlisten, Auto-Save, Session-basierte Historie, Permalink-Sharing, PDF/DOCX/Markdown-Download, Bilder per Paste/Drag-and-Drop, Layout-Presets, Druckansicht, Hilfe/Tipps, i18n, KI-Assistenz.
- Welche Features sind noch geplant: Versionshistorie mit Diff, globale Suche/Ersetzen, Templates/Snippets, Offline plus Sync, weitere Exportformate wie HTML/EPUB/MDX, Zitationen/Referenzen, Rechtschreibpruefung, Link-Checker, Plugin-System.
- Was sind die drei staerksten Features: Direkt nutzbarer Browser-Editor ohne Account, starker Export-/Print-Fokus, erweiterter Markdown-Renderer mit Mermaid/KaTeX/Layout.
- Gibt es Live Preview: Ja.
- Gibt es Split View: Ja, Editor links und rechte Pane fuer Preview/Tree/AI.
- Gibt es Syntax Highlighting: Ja, der Editor kann im Markdown-Modus mit Syntax Highlighting laufen.
- Gibt es GitHub-Flavored Markdown: Ja, inklusive Task Lists, Tabellen, Strikethrough und Autolinks.
- Gibt es Tabellenunterstuetzung: Ja, inklusive MultiMarkdown-Tabellenplugin.
- Gibt es Mermaid-Diagramme: Ja.
- Gibt es mathematische Formeln/LaTeX: Ja, ueber KaTeX.
- Gibt es Frontmatter-Unterstuetzung: Teilweise. Fuer wissenschaftliche Zitationsplaene ist YAML-Frontmatter vorgesehen; fuer Layout nutzt das Produkt aktuell einen separaten `layout`-Block.
- Gibt es Emojis: Ja.
- Gibt es Task Lists: Ja.
- Gibt es Fussnoten: Ja.
- Gibt es Code Highlighting: Fuer den Editor ja; fuer gerenderte Codebloecke ist im Repo kein dediziertes Syntax-Highlighting-Plugin fuer Preview-Codebloecke sichtbar.
- Gibt es Shortcuts: Ja, unter anderem F1, F2, Alt+Space, Ctrl+Shift+L, Ctrl+Arrow, Ctrl+0 und Ctrl+Space fuer Mermaid.
- Gibt es Auto-Save: Ja, per debounced Save ins Backend.
- Gibt es Dark Mode: Im Hilfe-/Tippsystem und in Settings-Strings ja, im aktuellen `app.js` ist das UI-Theme aber effektiv auf den twentyone-Stil fixiert. Das ist eher "teilweise/inkonsistent" als sauber fertig.
- Gibt es mobile Unterstuetzung: Responsive CSS ist vorhanden. "Mobil vollwertig" ist aber nicht explizit verifiziert.
- Gibt es eine PWA-/Offline-Funktion: Nein, im aktuellen Stand nicht.
- Gibt es Importfunktionen: Kein allgemeiner Markdown-Dateiimport ist im aktuellen Stand belegt.
- Gibt es Exportfunktionen: Ja.
- Welche Exportformate werden unterstuetzt: Markdown, PDF und DOCX. Zusaetzlich Rich-Text/Word-Kopieren in die Zwischenablage sowie ZIP-Export mehrerer Dokumente.
- Kann man Markdown als HTML exportieren: Kein nutzerseitiger HTML-Export ist belegt. HTML wird intern fuer den PDF-Export erzeugt.
- Kann man Markdown als PDF exportieren: Ja.
- Kann man Dateien lokal oeffnen und speichern: Lokal speichern als Download ja. Lokales Oeffnen via Dateiauswahl ist nicht belegt.
- Gibt es Drag & Drop: Ja, fuer Bilder sowie fuer Dokument-/Ordner-Reihenfolge in der UI.
- Gibt es Templates: Noch nicht als fertige Endnutzerfunktion.
- Gibt es eine Markdown-Cheat-Sheet-Funktion: Ja, `help.html` und Tipps.
- Gibt es eine Vorschau wie GitHub README: Nicht als expliziten GitHub-Skin, aber es gibt GFM-nahe Darstellung und Live-Preview.

## 4. Differenzierung gegenueber Alternativen

- Warum sollte jemand mdedit.io statt StackEdit verwenden: Weil der Fokus staerker auf direktem Editor-Einstieg, Session-Privatsphaere, Export und Drucklayout liegt als auf Account-/Sync-Modellen.
- Warum statt Dillinger: Weil mdedit.io deutlich mehr Dokument- und Druckfeatures hat, darunter Mermaid, KaTeX, Layout-Presets, Druckansicht und DOCX/PDF-Exportpfade.
- Warum statt HackMD: Weil der Einstieg ohne Kollaborationskonto moeglich ist und der Single-User-/Private-First-Flow klarer ist.
- Warum statt Obsidian: Weil mdedit.io sofort im Browser laeuft, keine Installation braucht und auf schnell teilbare/exportsichere Dokumente zielt.
- Warum statt Typora: Weil es webbasiert ist und Sharing plus servergestuetzte Exportpfade mitbringt.
- Warum statt VS Code: Weil es viel fokussierter ist, keinen Projekt-/IDE-Overhead hat und direkt mit Preview, Tree, Druckansicht und Export startet.
- Warum statt GitHub direkt: Weil Schreiben, Layout-Pruefung, PDF/DOCX-Export und Mermaid/KaTeX-Komfort dort nicht in dieser Kombination gegeben sind.
- Ist mdedit.io einfacher als diese Alternativen: Einfacher als VS Code und viele Desktop-Setups ja. Gegenueber sehr reduzierten Web-Editoren ist es funktionsreicher und damit nicht automatisch einfacher.
- Ist mdedit.io privater: Privatheitsfreundlicher als accountzentrierte Tools ja, aber nicht rein lokal, da Inhalte serverseitig in SQLite plus lokal im Browser gespeichert werden.
- Ist mdedit.io schneller: Der Einstieg ist sehr schnell, weil die App direkt im Editor landet.
- Ist mdedit.io schoener: Wertungssache. Das aktuelle UI wirkt funktional und bewusst editor-zentriert, nicht marketing-poliert.
- Ist mdedit.io besser fuer Einsteiger: Teilweise. Tipps und Hilfe helfen, aber der Funktionsumfang ist eher prosumer-orientiert.
- Ist mdedit.io besser fuer erfahrene Nutzer: Ja, besonders fuer Nutzer mit Bedarf an erweitertem Markdown und Export.
- Gibt es ein Feature, das andere Tools nicht oder schlechter haben: Die Kombination aus Browser-Editor, Layout-Block, drucknaher Seitenansicht, Mermaid/KaTeX und PDF/DOCX-Export ist ein starkes Differenzierungsbuendel.
- Was ist der staerkste Vergleichssatz: "Im Gegensatz zu HackMD und StackEdit startet mdedit.io ohne Account direkt im Editor und kombiniert private Session-Workflows mit Layout-, Print- und Export-Fokus."

## 5. Datenschutz und Vertrauen

- Braucht man einen Account: Nein.
- Werden Dokumente auf deinem Server gespeichert: Ja, serverseitig in SQLite.
- Werden Dokumente nur lokal im Browser gespeichert: Nein. Es gibt zusaetzlich lokale Speicherung fuer UI-/App-Zustand, aber Dokumente liegen auch serverseitig.
- Gibt es Cloud-Sync: Nein.
- Gibt es Tracking: Im Repo ist kein Analytics-/Tracking-Dienst belegt.
- Welche Analytics werden verwendet: Keine gefunden.
- Werden externe Dienste geladen: Ja, mehrere CDN-Ressourcen und Google Fonts, ausserdem optionale AI-Provider.
- Werden Inhalte an Dritte uebertragen: Laut Privacy-Text nicht standardmaessig. Technisch werden aber externe Assets von Drittanbietern geladen. Bei Nutzung von KI-Funktionen ist eine Uebertragung an den jeweils konfigurierten AI-Dienst naheliegend.
- Gibt es eine Datenschutzerklaerung: Es gibt einen Datenschutz-Abschnitt im About-/Impressum-Tab, aber keine eigenstaendige Datenschutzseite.
- Gibt es ein Impressum: Ja, im About-/Impressum-Tab.
- Ist das Tool DSGVO-konform gedacht: Der Datenschutztext und die deutsche Betreiberadresse deuten in diese Richtung, aber das ist keine belastbare juristische Aussage.
- Ist mdedit.io fuer vertrauliche Texte geeignet: Nur mit Einschraenkung. Kein Tracking ist gut, aber Texte werden serverseitig gespeichert und externe Assets werden geladen. Fuer hochsensible Inhalte wuerde ich das ohne weitere Härtung nicht offensiv versprechen.
- Kann man mdedit.io offline verwenden: Nein, nicht belastbar.
- Koennen Nutzer ihre Daten jederzeit exportieren: Ja, Markdown/PDF/DOCX sowie ZIP fuer mehrere Dokumente.
- Gibt es eine Loeschfunktion fuer gespeicherte Inhalte: Ja, Dokumente koennen geloescht werden; ausserdem gibt es Reset-/Clear-Pfade fuer lokale Daten in den Einstellungen.

## 6. Open Source / freie Software

- Ist mdedit.io Open Source: Ja, der Quellcode ist jetzt unter der Apache License 2.0 freigegeben.
- Wo liegt das Repository: https://github.com/MatthiasHertel21/mdedit
- Unter welcher Lizenz steht der Code: Apache License 2.0.
- Ist die Lizenz wirklich eine freie/Open-Source-Lizenz: Ja, Apache License 2.0 ist eine freie Open-Source-Lizenz.
- Kann man mdedit.io selbst hosten: Ja, Docker und Node-Start sind dokumentiert.
- Gibt es eine Installationsanleitung: Ja.
- Gibt es Docker-Unterstuetzung: Ja.
- Gibt es eine CONTRIBUTING.md: Nein.
- Gibt es eine Roadmap: Nicht als eigene Datei. Das Backlog und diverse Konzeptdokumente uebernehmen teilweise diese Rolle.
- Gibt es Issues fuer Anfaenger: Nicht im Repo sichtbar.
- Sind Pull Requests erwuenscht: Vermutlich ja, sobald Lizenz und OSS-Positionierung final geklaert sind. Formal ist das aktuell noch nicht sauber festgelegt.
- Gibt es Tests: Ja, mindestens Visual-Smoke-Tests fuer Layout/Export.
- Gibt es CI/CD: Keine `.github`-Workflows oder andere CI-Konfiguration gefunden.
- Gibt es einen Security-Kontakt: `SECURITY.md` existiert, aber ein dedizierter Security-Kontakt als eigener Kanal ist nicht klar dokumentiert.
- Gibt es einen Changelog: Nein.
- Gibt es Releases: Nicht im Repo belegbar.
- Gibt es GitHub Topics: Nicht aus dem Repo ableitbar.
- Gibt es Badges im README: Nein.
- Gibt es Screenshots im README: Nein.
- Gibt es eine Demo-Verlinkung im README: Indirekt ueber die genannte URL, aber nicht als ausgebaute Demo-Sektion.

## 7. Monetarisierung und Fairness

- Ist mdedit.io dauerhaft kostenlos: Im aktuellen Repo gibt es keinen Pricing- oder Paywall-Hinweis.
- Wird es kostenpflichtige Features geben: Nicht dokumentiert.
- Wird es Werbung geben: Nicht dokumentiert, im aktuellen Stand nein.
- Wird es Spenden geben: Nicht dokumentiert.
- Wird es Sponsoring geben: Nicht dokumentiert.
- Gibt es GitHub Sponsors, Open Collective, Ko-fi oder Patreon: Nicht dokumentiert.
- Gibt es eine kommerzielle Roadmap: Nicht dokumentiert.
- Gibt es Einschraenkungen fuer kostenlose Nutzer: Keine belegt.
- Ist das Tool fuer kommerzielle Nutzung erlaubt: Ja, fuer den Quellcode im Rahmen der Apache License 2.0. Marken- und Brand-Assets sind davon ausgenommen.
- Wie willst du langfristig Hosting und Pflege finanzieren: Nicht aus dem Repo ableitbar.

## 8. Produktreife

- Ist mdedit.io bereits oeffentlich nutzbar: Ja, als laufende Web-App angelegt.
- Ist es stabil genug fuer fremde Nutzer: Fuer einen oeffentlichen Testbetrieb wahrscheinlich ja. Fuer einen breiten Launch sollte Browser-Support, Rechtslage, Lizenz und Positionierung noch geschaerft werden.
- Welche bekannten Bugs gibt es: `SECURITY.md` nennt noch offene Themen wie DOM-Sanitization und CSRF. Ausserdem gibt es funktionale Grenzen bei wissenschaftlichen Zitat-Fussnoten und bei einigen geplanten Layout-Features.
- Welche Features fehlen noch bewusst: Offline, Templates, Versionshistorie/Diff, globale Suche/Ersetzen, weitere Exporte, ausgereifte Zitationspipeline, Plugin-System.
- Welche Browser werden unterstuetzt: Explizit belastbar ist Chrome/Chromium, weil Visual-Smoke und PDF-Pfade darauf aufbauen. Fuer Firefox, Safari und Edge fehlt mir eine offizielle Zusage im Repo.
- Funktioniert es auf Safari: Nicht belegt.
- Funktioniert es auf Firefox: Nicht belegt.
- Funktioniert es auf Chrome/Chromium: Ja, klar belegt.
- Funktioniert es auf Edge: Plausibel, aber nicht explizit belegt.
- Funktioniert es auf iOS: Nicht belegt.
- Funktioniert es auf Android: Nicht belegt.
- Gibt es Performance-Grenzen bei langen Dokumenten: Nicht explizit dokumentiert, aber ein 1-MB-Markdown-Limit ist serverseitig gesetzt.
- Gibt es Dateigroessenlimits: Ja, 1 MB fuer Markdown; Bildlimits 10 MB pro Bild und 50 MB pro Dokument.
- Gibt es Barrierefreiheit: Teilweise, es gibt viele `aria`-Attribute und Tastaturkuerzel. Eine systematische A11y-Dokumentation fehlt.
- Gibt es Tastaturnavigation: Ja, in relevanten Teilen.
- Gibt es Screenreader-Unterstuetzung: Nicht explizit belegt.
- Ist die UI responsive: Ja, responsive CSS-Regeln sind vorhanden.
- Ist die App schnell genug fuer Demo-Posts: Ja, nach dem Repo-Eindruck eindeutig.
- Gibt es leere Zustaende, Beispieltexte oder Onboarding: Hilfe und Startup-Tipps ja; ein echter Starter-Text oder gefuehrtes Onboarding ist nicht belegt.
- Was passiert beim ersten Oeffnen der Seite: Man landet direkt im Editor und kann sofort schreiben; zusaetzlich sind Hilfe/Tipps vorhanden.

## 9. Branding und Sprache

- Wofuer steht der Name mdedit.io: Nicht erklaert.
- Gibt es einen Untertitel/Slogan: Noch kein belastbarer finaler Claim. Der naechstliegende Arbeitsclaim aus dem Repo waere: "Markdown editor with live preview, outline and export."
- Soll der Name `mdedit`, `MDEdit`, `MD Edit` oder `mdedit.io` geschrieben werden: Fuer Produkt, Domain und offizielle Kommunikation ist `mdedit.io` jetzt der konsistente Hauptname.
- Gibt es ein Logo: Ein Favicon/SVG-Icon gibt es.
- Gibt es ein App-Icon: Ja, `favicon.svg`.
- Gibt es Screenshots: Im Repo nicht als Marketing-Assets.
- Gibt es ein Farbschema: Ja, ein definiertes UI-Theme, aktuell auf den twentyone-Stil fokussiert.
- Gibt es eine Designrichtung: Ja, editor-zentriert, funktional, minimal, leicht technisch.
- Soll die Kommunikation sachlich, technisch, freundlich, minimalistisch oder aktivistisch-frei-software-orientiert sein: Das Produktmaterial legt sachlich, technisch, direkt und minimalistisch nahe.
- Welche Begriffe sollen vermieden werden: "offline" ohne Offline-Modus, "private by default" nur mit Zusatz, dass serverseitig gespeichert wird, "for everyone" waere ebenfalls zu breit.
- Gibt es eine deutsche Beschreibung: Ja.
- Gibt es eine englische Beschreibung: Ja, zumindest in UI-Strings und den englischen Hilfetexten.
- Gibt es eine sehr kurze Tagline: Arbeitsvorschlag: "Fast browser-based Markdown editing with preview, outline and export."
- Gibt es eine laengere Produktbeschreibung: Arbeitsvorschlag: "mdedit.io is a browser-based Markdown editor for writing, previewing, structuring and exporting documents without account friction. It combines live preview, outline/tree navigation, print-oriented layout tools, Mermaid and KaTeX support, and PDF/DOCX export in one focused interface."
- Gibt es ein Press-Kit: Nein.

## 10. Website und Conversion

- Was sieht ein Nutzer zuerst auf mdedit.io: Direkt den Editor.
- Gibt es eine Landingpage oder startet direkt der Editor: Es startet direkt der Editor.
- Gibt es einen klaren Call-to-Action: Der implizite CTA ist sofort losschreiben. Ein klassischer Hero-CTA existiert nicht.
- Was ist der wichtigste Button: Praktisch `Neu`, Share/Export und der Editor selbst. Marketing-seitig gibt es keinen klaren CTA-Button.
- Gibt es eine Demo ohne Anmeldung: Ja, die App selbst ist die Demo.
- Gibt es Beispielinhalte: Hilfe/Tipps ja, aber kein ausgepraegtes Beispiel-Dokument als Hero-Demo.
- Gibt es eine Feature-Seite: Nein.
- Gibt es eine FAQ: Nein.
- Gibt es eine Datenschutzseite: Nein, nur den Datenschutz-Abschnitt im About-Bereich.
- Gibt es eine Open-Source-Seite: Nein.
- Gibt es eine Roadmap-Seite: Nein.
- Gibt es einen Blog: Nein.
- Gibt es Changelog-Seiten: Nein.
- Gibt es indexierbare SEO-Seiten: Sehr begrenzt. Im Wesentlichen Startseite, Hilfe und Impressum.
- Gibt es OpenGraph-Metadaten fuer Social Shares: Ja, vorhanden und jetzt auf `mdedit.io` bezogen, aber weiterhin eher minimal.
- Gibt es gute Meta-Titles und Meta-Descriptions: Vorhanden und knapp; die Marke ist jetzt auf `mdedit.io` umgestellt.
- Gibt es ein Favicon: Ja.
- Sieht ein geteilter Link auf X, Mastodon, Reddit, Discord und LinkedIn gut aus: Grundsaetzlich ja, aber ohne Vorschaubild nur begrenzt stark.
- Gibt es strukturierte Daten: Ja, `SoftwareApplication` per JSON-LD.
- Gibt es eine Sitemap: Ja.
- Ist die Seite schnell genug: Nach Repo-Struktur ja.
- Ist sie mobil gut benutzbar: Wahrscheinlich brauchbar, aber nicht explizit qualitaetsgesichert.
- Ist sie ohne JavaScript verstaendlich genug indexierbar: Eher nein, weil es eine App-first-Seite ist.
- Gibt es eine 404-Seite: Kein eigener 404-Content ist belegt.
- Gibt es eine Kontaktmoeglichkeit: Ja, E-Mail im Impressum.

## 11. Community und Feedback

- Wie sollen Nutzer Feedback geben: Aktuell am plausibelsten per E-Mail oder ueber das noch nicht verlinkte Repo.
- Gibt es GitHub Issues: Nicht aus dem Repo ableitbar.
- Gibt es GitHub Discussions: Nicht aus dem Repo ableitbar.
- Gibt es eine E-Mail-Adresse: Ja, im Impressum.
- Gibt es ein Kontaktformular: Nein.
- Gibt es Discord, Matrix, Slack oder Mastodon: Nicht dokumentiert.
- Wer beantwortet Feedback: Wahrscheinlich der Betreiber selbst.
- Wie schnell kannst du auf Bugs reagieren: Nicht aus dem Repo ableitbar.
- Welche Art Feedback suchst du konkret: Aus dem Produktbild sinnvoll waeren Feedback zu Editor-Flow, Exportqualitaet, Browser-Support und Sharing/Kollaboration.
- Welche Fragen willst du Nutzern nach der ersten Nutzung stellen: Arbeitsvorschlag: "Konntest du sofort losschreiben?", "War der Export brauchbar?", "Was hat dir im Vergleich zu deinem bisherigen Markdown-Tool gefehlt?"
- Willst du Nutzerbeitraege aktiv foerdern: Nicht dokumentiert.
- Gibt es Labels wie `good first issue`: Nicht belegt.
- Gibt es eine oeffentliche Roadmap: Nicht als oeffentliche Seite.
- Gibt es Release Notes: Nein.
- Gibt es einen Newsletter oder RSS-Feed: Nein.

## 12. Launch-Kanaele

- Welche Kanaele moechtest du nutzen: Prioritaet haben Hacker News, Reddit, Product Hunt, Mastodon und dev.to/Hashnode.
- Moechtest du auf Hacker News posten: Ja, priorisiert.
- Moechtest du auf Product Hunt launchen: Ja, priorisiert, aber dafuer fehlen aktuell noch Landing-/Marketing-Materialien.
- Moechtest du Reddit nutzen: Ja, priorisiert fuer Markdown-, selfhosted-, productivity- und writing-nahe Subreddits.
- Moechtest du dev.to oder Hashnode nutzen: Ja, priorisiert, ideal als Build-/Workflow-Post.
- Moechtest du LinkedIn nutzen: Nur sinnvoll, wenn du eher auf Docs/Productivity/Writer-Use-Cases gehst.
- Moechtest du Mastodon nutzen: Ja, priorisiert.
- Moechtest du X/Twitter nutzen: Moeglich, aber dafuer sollten kurze Demo-Clips vorbereitet sein.
- Moechtest du YouTube Shorts oder GIF-Demos nutzen: Sehr sinnvoll, weil der direkte Editor-Flow visuell verstaendlich ist.
- Moechtest du deutsche Communities ansprechen: Ja, das Produkt ist deutlich deutsch gepraegt.
- Moechtest du internationale Communities ansprechen: Ebenfalls ja, aber dafuer muss das Branding erst konsistent englischfaehig sein.
- Gibt es persoenliche Netzwerke, die du aktivieren kannst: Nicht aus dem Repo ableitbar.
- Gibt es bestehende Open-Source-Projekte, fuer die mdedit.io nuetzlich ist: Generisch ja, aber nichts Spezifisches ist dokumentiert.
- Gibt es Newsletter, denen du das Tool vorschlagen kannst: Nicht aus dem Repo ableitbar.
- Gibt es Blogger, YouTuber oder Podcaster im Developer-/Markdown-Bereich: Nicht aus dem Repo ableitbar.

## 13. Launch-Material

- Gibt es eine Launch-Story: Noch nicht in ausformulierter Form.
- Gibt es Screenshots in hoher Qualitaet: Nicht im Repo.
- Gibt es ein kurzes Demo-GIF: Nicht im Repo.
- Gibt es ein kurzes Demo-Video: Nicht im Repo.
- Gibt es Beispiel-Dokumente: Es gibt Hilfetexte und Test-Fixtures, aber kein kuratiertes Marketing-Beispielset.
- Gibt es Vergleichsbilder vorher/nachher: Nein.
- Gibt es eine Produkt-Roadmap: Nur implizit ueber Backlog und Konzepte.
- Gibt es eine Liste bekannter Einschraenkungen: Nicht als eigene Seite, aber aus Security- und Konzeptdokumenten ableitbar.
- Gibt es eine FAQ fuer Kritikpunkte: Nein.
- Gibt es kurze Antworten auf "Warum noch ein Markdown-Editor?": Noch nicht vorbereitet.
- Gibt es eine Liste der wichtigsten Links: Noch nicht als Launch-Paket.
- Gibt es vorbereitete Social-Posts: Nein.
- Gibt es vorbereitete Reddit-Varianten: Nein.
- Gibt es einen Show-HN-Text: Nein.
- Gibt es einen Product-Hunt-Maker-Kommentar: Nein.
- Gibt es deutsche und englische Pressetexte: Nein.

## 14. SEO und Content

- Fuer welche Suchbegriffe soll mdedit.io gefunden werden: Naheliegende Keywords waeren `markdown editor online`, `markdown editor with preview`, `markdown to pdf`, `markdown to docx`, `mermaid markdown editor`, `privacy-friendly markdown editor`.
- Soll `markdown editor online` ein Hauptkeyword sein: Ja, sehr wahrscheinlich.
- Gibt es Seiten fuer `Markdown Preview`, `Markdown to HTML`, `Markdown to PDF`: Nein, noch nicht als eigene SEO-Landingpages.
- Gibt es eine Markdown-Cheat-Sheet-Seite: `help.html` kommt dem nahe.
- Gibt es Tutorials: Nein.
- Gibt es `How to write a README`-Content: Nein.
- Gibt es `Markdown table editor`-Content: Nein.
- Gibt es `GitHub flavored Markdown editor`-Content: Noch nicht als SEO-Seite.
- Gibt es `privacy-friendly Markdown editor`-Content: Noch nicht als dedizierte Positionierungsseite.
- Gibt es deutschsprachige SEO-Seiten: Praktisch nur Start, Hilfe und Impressum.
- Gibt es englischsprachige SEO-Seiten: Nicht als eigenstaendige Seiten.
- Gibt es Beispiel-Templates fuer README, Blogpost, Meeting Notes, Changelog: Nein.
- Gibt es interne Verlinkung zwischen App, Docs und Blog: Nein, da es keinen Blog oder Docs-Bereich gibt.
- Gibt es eine Strategie fuer langfristige Inhalte: Nicht dokumentiert.

## 15. Erfolgsmessung

- Was ist ein erfolgreicher Launch: Strategisch offen. Sinnvolle fruehe Ziele waeren qualifiziertes Feedback, wiederkehrende Nutzung und klare Aktivierungsdaten.
- Wie viele Nutzer waeren gut: Nicht aus dem Repo ableitbar.
- Wie viele wiederkehrende Nutzer waeren gut: Nicht aus dem Repo ableitbar.
- Wie viele GitHub-Stars waeren gut: Nicht aus dem Repo ableitbar.
- Wie viele Issues/Feedbacks waeren gut: Nicht aus dem Repo ableitbar.
- Was ist die wichtigste Aktion im Tool: Dokument schreiben und erfolgreich exportieren oder teilen.
- Welche Events sollen gemessen werden: Sinnvoll waeren `document_created`, `document_saved`, `export_pdf`, `export_docx`, `share_enabled`, `help_opened`, `tip_viewed`, `collab_joined`.
- Wird gemessen, ob Nutzer ein Dokument schreiben: Aktuell nein.
- Wird gemessen, ob Nutzer exportieren: Aktuell nein.
- Wird gemessen, ob Nutzer wiederkommen: Aktuell nein.
- Wie wird datenschutzfreundlich gemessen: Aktuell gar nicht; falls spaeter, dann moeglichst self-hosted und ohne Inhaltsuebertragung.
- Welche Kanaele sollen per UTM unterschieden werden: HN, Product Hunt, Reddit, Mastodon, LinkedIn, X, dev.to, direkte Empfehlungen.
- Gibt es ein Dashboard: Nein.
- Wie entscheidest du nach dem Launch, was verbessert wird: Aktuell am besten ueber qualitatives Feedback plus beobachtete Kernaktionen, weil Analytics noch nicht existieren.

## 16. Risiken und Einwaende

- Warum braucht die Welt noch einen Markdown-Editor: Weil viele existierende Tools entweder zu schwer, zu kollaborationszentriert, zu IDE-lastig oder zu schwach bei Export und Drucklayout sind.
- Was ist der groesste Nachteil von mdedit.io aktuell: Vor allem das weiterhin ausbaufähige GTM-Material und der noch nicht sauber abgesicherte Offline-/Browser-Support-Claim.
- Was kann mdedit.io noch nicht: Offline-Sync, Templates, Versionsdiffs, allgemeine Import-Workflows, weitere Exportformate, voll ausgebaute wissenschaftliche Zitation.
- Welche Kritik erwartest du: "Noch ein Markdown-Editor", "Warum nicht VS Code/Obsidian?", "Online-Editoren sind unsicher", "Ist das wirklich Open Source?", "Wo ist Offline?"
- Ist der Name verstaendlich: `mdedit.io` ja.
- Ist die Domain vertrauenswuerdig: `mdedit.io` klingt produkthaft und klar als Tool-Marke.
- Gibt es Bedenken wegen Datenschutz: Ja, weil Inhalte serverseitig gespeichert werden und externe Assets geladen werden.
- Gibt es Bedenken wegen Vendor Lock-in: Eher gering, weil Markdown exportierbar ist.
- Gibt es Bedenken wegen Projektpflege: Ja, solange Repo, Lizenz, Roadmap und Releaseprozess nicht oeffentlich klar sind.
- Gibt es Bedenken wegen Browser-Speicherung: Fuer manche Nutzer ja, aber die Exportfaehigkeit reduziert Lock-in-Angst.
- Gibt es Bedenken wegen fehlender Kollaboration: Weniger relevant, weil Kollaboration laut GTM-Entscheidung bereits als Launch-Feature auftauchen soll. Der Reifegrad muss dafuer aber kommunikativ sauber eingeordnet werden.
- Wie antwortest du auf `Das kann VS Code doch schon`: VS Code kann vieles, ist aber eine IDE. mdedit.io fokussiert den reinen Schreib-, Vorschau-, Share- und Export-Flow im Browser ohne Setup.
- Wie antwortest du auf `Das gibt es doch schon als Obsidian/Typora/StackEdit`: Stimmt, aber mdedit.io kombiniert no-account Browser-Einstieg mit Live-Preview, Layout, Print/PDF, DOCX und Permalink-Sharing in einem deutlich fokussierten Tool.
- Wie antwortest du auf `Online-Editoren sind unsicher`: Inhalte gehen nicht standardmaessig an Analytics-Dritte, aber sie werden serverseitig gespeichert. Fuer hochsensible Inhalte sollte man selbst hosten oder den Einsatz abwaegen.
- Wie antwortest du auf `Open Source, aber hosted — wie vertrauenswuerdig ist das?`: Repo, Lizenzstruktur und Self-Hosting-Doku sind jetzt sauber trennbar; Vertrauen entsteht dann ueber transparente Weiterentwicklung und klare Kommunikation zu Hosting und Datenschutz.

## 17. Rechtliches und Betrieb

- Wer betreibt mdedit.io: Laut Impressum Matthias Hertel, Dresden, Deutschland.
- Gibt es ein Impressum: Ja.
- Gibt es eine Datenschutzerklaerung: Nur als kurzer Datenschutz-Abschnitt, nicht als eigenstaendige vollstaendige Seite.
- Gibt es Nutzungsbedingungen: Nicht gefunden.
- Gibt es eine Lizenz fuer Website-Inhalte: Nicht gefunden.
- Gibt es eine Lizenz fuer Beispieltexte: Nicht gefunden.
- Gibt es Cookie-/Tracking-Hinweise: Keine separate Cookie-Hinweisseite gefunden.
- Werden Fonts lokal oder extern geladen: Extern, ueber Google Fonts.
- Werden CDN-Ressourcen verwendet: Ja, mehrere.
- Gibt es einen Abuse-/Security-Kontakt: `SECURITY.md` existiert, aber kein klar benannter dedizierter Kontakt im Frontend.
- Gibt es Backups, falls serverseitig Daten gespeichert werden: In `DOCKER.md` gibt es Backup-Hinweise fuer SQLite.
- Gibt es Rate Limits: Ja.
- Gibt es eine Uptime-/Status-Seite: Nein.
- Gibt es eine Support-Adresse: Es gibt die Impressum-E-Mail.

## 18. Prioritaet fuer die naechste GTM-Runde

Wenn du nicht alles sofort ausarbeiten willst, wuerde ich diese Fragen zuerst final beantworten, weil sie die komplette Positionierung steuern:

- Wie offensiv der Privacy-Claim sein soll
- Ob du die Story eher als Produkt-Demo, als persoenliches Tooling-Projekt oder als Open-Source-Release erzaehlen willst
- Welche Unterzielgruppe innerhalb des gemischten Launches in den ersten Texten im Vordergrund stehen soll

## Konkrete Rueckfragen an dich

Diese Punkte sind nach deinen Antworten noch offen oder nur teilweise geklaert:

1. Gibt es bereits echte Nutzer, Beta-Feedback oder Zahlen, die man nennen darf?
2. Willst du aktuell mit "privacy-friendly" werben, obwohl Dokumente serverseitig gespeichert werden?
3. Gibt es eine Monetarisierungsrichtung, oder bleibt das Produkt auf absehbare Zeit kostenlos?
4. Welche Unterzielgruppe soll in den ersten Launch-Texten vorne stehen: eher Entwickler, eher technische Autoren, eher Studierende oder eher Teams?