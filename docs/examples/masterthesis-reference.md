---
title: "Markdown als Schreib- und Produktionsumgebung für wissenschaftliche Arbeiten: Eine kriteriologische Bewertung von mdedit.io im Vergleich zu Word und LaTeX"
author:
  - Max Beispiel
date: 2026-05-10
lang: de-DE
number-sections: true
citation-source: embedded
reference-section-title: Literaturverzeichnis
link-citations: true
link-bibliography: true
nocite: '@*'
---

```mdedit-bibliography
[{"URL":"https://daringfireball.net/projects/markdown/","author":[{"family":"Gruber","given":"John"}],"id":"gruber2004markdown","issued":{"date-parts":[[2004]]},"note":"Accessed 2026-05-10","title":"Markdown","type":""},{"URL":"https://commonmark.org/","author":[{"literal":"CommonMark Contributors"}],"id":"commonmark2026","issued":{"date-parts":[[2026]]},"note":"Accessed 2026-05-10","title":"CommonMark","type":""},{"URL":"https://pandoc.org/","author":[{"family":"MacFarlane","given":"John"}],"id":"pandoc2025","issued":{"date-parts":[[2025]]},"note":"Accessed 2026-05-10","title":"Pandoc","type":""},{"URL":"https://www.latex-project.org/about/","author":[{"literal":"LaTeX Project"}],"id":"latexproject2026","issued":{"date-parts":[[2026]]},"note":"Accessed 2026-05-10","title":"An Introduction to LaTeX","type":""},{"URL":"https://support.microsoft.com/en-us/office/track-changes-in-word-197ba630-0f5f-4a8e-9a77-3712475e806a","author":[{"literal":"Microsoft Support"}],"id":"microsoftword2026","issued":{"date-parts":[[2026]]},"note":"Accessed 2026-05-10","title":"Track Changes in Word","type":""},{"author":[{"family":"Hertel","given":"Matthias"}],"id":"mdeditreadme2026","issued":{"date-parts":[[2026]]},"note":"Repository documentation, local source","title":"mdedit.io README","type":""},{"author":[{"family":"Hertel","given":"Matthias"}],"id":"mdeditcitations2026","issued":{"date-parts":[[2026]]},"note":"Repository concept document, local source","title":"Scientific Documents and Citations Concept","type":""},{"author":[{"family":"Hertel","given":"Matthias"}],"id":"mdeditplan2026","issued":{"date-parts":[[2026]]},"note":"Repository planning document, local source","title":"Scientific Documents Implementation Plan","type":""},{"author":[{"family":"Hertel","given":"Matthias"}],"id":"mdedithelp2026","issued":{"date-parts":[[2026]]},"note":"Repository help page, local source","title":"mdedit.io Help Page","type":""},{"author":[{"family":"Hertel","given":"Matthias"}],"id":"mdeditaiapi2026","issued":{"date-parts":[[2026]]},"note":"Repository operations documentation, local source","title":"AI Chat API Dokumentation","type":""},{"author":[{"family":"Hertel","given":"Matthias"}],"id":"mdeditserver2026","issued":{"date-parts":[[2026]]},"note":"Repository implementation in server.js, local source","title":"mdedit.io Scientific Citation and Export Implementation","type":""},{"author":[{"family":"Booth","given":"Wayne C."},{"family":"Colomb","given":"Gregory G."},{"family":"Williams","given":"Joseph M."},{"family":"Bizup","given":"Joseph"},{"family":"Fitzgerald","given":"William T."}],"edition":"4","id":"booth2016craft","issued":{"date-parts":[[2016]]},"publisher":"University of Chicago Press","publisher-place":"Chicago","title":"The Craft of Research","type":"book"},{"author":[{"family":"Swales","given":"John M."},{"family":"Feak","given":"Christine B."}],"edition":"3","id":"swalesfeak2012","issued":{"date-parts":[[2012]]},"publisher":"University of Michigan Press","publisher-place":"Ann Arbor","title":"Academic Writing for Graduate Students: Essential Tasks and Skills","title-short":"Academic Writing for Graduate Students","type":"book"},{"ISBN":"9781433832161","author":[{"literal":"American Psychological Association"}],"edition":"7","id":"apa2019manual","issued":{"date-parts":[[2019]]},"publisher":"American Psychological Association","title":"Publication Manual of the American Psychological Association","type":"book"},{"ISBN":"9781839542480","edition":"4","editor":[{"family":"Paver","given":"Chloe"},{"family":"Nelson","given":"Graham"},{"family":"Davies","given":"Simon F."}],"id":"mhra2024","issued":{"date-parts":[[2024]]},"publisher":"Modern Humanities Research Association","title":"MHRA Style Guide","type":"book"},{"ISBN":"9781350477261","author":[{"family":"Pears","given":"Richard"},{"family":"Shields","given":"Graham"}],"edition":"13","id":"pearsshields2025","issued":{"date-parts":[[2025]]},"title":"Cite Them Right: The Essential Referencing Guide","title-short":"Cite Them Right","type":"book"},{"URL":"https://libguides.reading.ac.uk/citing-references/referencingstyles","author":[{"literal":"University of Reading Library"}],"id":"readingstyles2026","issued":{"date-parts":[[2026]]},"note":"Accessed 2026-05-10","title":"Different Styles and Systems of Referencing","type":""},{"URL":"https://www.law.ox.ac.uk/oscola","author":[{"literal":"Faculty of Law, University of Oxford"}],"id":"oscola2026","issued":{"date-parts":[[2026]]},"note":"Accessed 2026-05-10","title":"The Oxford University Standard for Citation of Legal Authorities (OSCOLA), 5th Edition","type":""},{"author":[{"literal":"Department of Computer Science, ETH Zurich"}],"id":"eththesismemo2025","issued":{"date-parts":[[2025]]},"note":"Official department memo, accessed 2026-05-10","title":"Memo: Master’s Theses in Computer Science","title-short":"Memo","type":""},{"URL":"https://www.imperial.ac.uk/admin-services/library/learning-support/reference-management/vancouver-style/","author":[{"literal":"Imperial College London Library Services"}],"id":"imperialvancouver2026","issued":{"date-parts":[[2026]]},"note":"Accessed 2026-05-10","title":"Vancouver Style","type":""},{"author":[{"family":"Hevner","given":"Alan R."},{"family":"March","given":"Salvatore T."},{"family":"Park","given":"Jinsoo"},{"family":"Ram","given":"Sudha"}],"container-title":"MIS Quarterly","id":"hevner2004design","issue":"1","issued":{"date-parts":[[2004]]},"page":"75-105","title":"Design Science in Information Systems Research","type":"article-journal","volume":"28"},{"author":[{"family":"Wieringa","given":"Roel J."}],"id":"wieringa2014design","issued":{"date-parts":[[2014]]},"publisher":"Springer","publisher-place":"Berlin","title":"Design Science Methodology for Information Systems and Software Engineering","type":"book"}]
```

::: title-page

# Markdown als Schreib- und Produktionsumgebung für wissenschaftliche Arbeiten {.no-toc}

## Eine kriteriologische Bewertung von mdedit.io im Vergleich zu Word und LaTeX {.no-toc}

**Max Beispiel**  
Masterarbeit · Universität Beispiel · 2026-05-10

:::

## Abstract {.no-toc}

Die Erstellung wissenschaftlicher Arbeiten bewegt sich heute zwischen drei dominanten Logiken: der textverarbeitungsorientierten Logik von Microsoft Word, der satzorientierten Logik von LaTeX und der strukturorientierten Logik markdown-basierter Workflows. Diese Arbeit untersucht, unter welchen Bedingungen ein browserbasierter Markdown-Editor am Beispiel von mdedit.io als primäre Produktionsumgebung für wissenschaftliche Abschlussarbeiten dienen kann. Ausgangspunkt ist die Beobachtung, dass die Eignung von Schreibwerkzeugen in der akademischen Praxis häufig über Gewohnheiten, Fachkulturen oder Tool-Mythen beurteilt wird, während ein explizites Bewertungsmodell für Strukturtransparenz, Quellenarbeit, Exportstabilität und Betreuungskompatibilität oft fehlt.

Methodisch folgt die Arbeit einer kriteriengeleiteten Artefaktanalyse mit designorientierter Bewertungslogik. Auf Basis der Literatur zum wissenschaftlichen Arbeiten, zu Markdown und Pandoc sowie zu designwissenschaftlichen Bewertungsansätzen werden fünf Bewertungsdimensionen abgeleitet: Strukturtransparenz, Quellen- und Zitationssicherheit, Layout- und Exportstabilität, Review- und Betreuungskompatibilität sowie Governance und Betriebsfähigkeit [@booth2016craft; @swalesfeak2012; @hevner2004design; @wieringa2014design]. Diese Dimensionen werden zunächst auf Word, LaTeX und markdown-basierte Workflows bezogen ([@sec:vergleich]) und anschließend für mdedit.io anhand offizieller Dokumentation, institutioneller Vorgaben und eines reproduzierbaren Referenzartefakts bewertet ([@sec:bewertung]).

Die Ergebnisse zeigen, dass Markdown in Verbindung mit Spezifikation, Metadaten und Konvertern ein belastbares Zwischenformat für wissenschaftliche Langtexte sein kann [@gruber2004markdown; @commonmark2026; @pandoc2025]. Zugleich gewinnt Markdown im Kontext generativer KI eine besondere Rolle als strukturstabiles Arbeits- und Austauschformat: Überschriften, Listen, Tabellen, Codeblöcke und Zitationsmarker bleiben für Menschen lesbar und für Modelle gezielt bearbeitbar. Für mdedit.io ergibt sich dadurch eine starke Eignung in der Struktur- und Schreibphase, in der Navigation großer Dokumente über Outline und Tree View, in der KI-gestützten Dokumentarbeit, in der frühen Layoutkontrolle sowie in kontrollierten PDF- und DOCX-Exportpfaden [@mdeditreadme2026; @mdedithelp2026]. Zusätzlich ist relevant, dass der wissenschaftliche Exportpfad aktuelle mdedit-Erweiterungen für Bibliografie, Citeproc und Referenzsektionen integriert [@mdeditserver2026]. Grenzen bleiben bei note-style-Fußnoten, stark normierten Sondervorlagen und semantisch reichen Referenzsystemen. Die Arbeit leistet damit keinen empirischen Nutzernachweis, wohl aber ein kriteriologisches Entscheidungsmodell und ein prüfbares Referenzartefakt für die Bewertung thesis-tauglicher Markdown-Workflows.

## Schlagwörter {.no-toc}

Markdown, wissenschaftliche Abschlussarbeit, mdedit.io, Design Science, LaTeX, Microsoft Word, Pandoc, KI-Anwendungen, Schreibwerkzeuge, Exportworkflow

[[toc]]

## Abbildungsverzeichnis

<!-- list-of-figures -->

## Tabellenverzeichnis

<!-- list-of-tables -->

## 1. Einleitung {#sec:einleitung}

Wissenschaftliche Arbeiten sind heute nicht mehr nur Textprodukte, sondern organisierte Schreib- und Überarbeitungsprozesse. Eine Masterthesis entsteht über Wochen oder Monate hinweg in einem Wechselspiel aus Materialsammlung, Strukturierung, Rohfassung, Rückmeldung, sprachlicher Revision, formaler Kontrolle und finalem Export. Die Qualität des eingesetzten Werkzeugs entscheidet dabei nicht über die wissenschaftliche Güte der Argumentation, wohl aber über Reibungsverluste, Sichtbarkeit der Struktur und die Stabilität des Produktionsprozesses. Genau deshalb ist die Frage nach geeigneten Schreibumgebungen kein Nebenaspekt, sondern Teil akademischer Arbeitsorganisation.

In der Praxis dominieren weiterhin Microsoft Word und LaTeX. Word ist institutionell weit verbreitet, für Reviewprozesse eingespielt und durch Vorlagenkulturen fest in Hochschulabläufe eingebunden. LaTeX wiederum ist in mathematik-, informatik- und naturwissenschaftsnahen Milieus der Referenzpunkt für typografisch anspruchsvolle, formal stark geregelte Dokumente [@latexproject2026]. Markdown-basierte Workflows werden dagegen häufig noch als informell, technisch oder blognah wahrgenommen. Diese Einschätzung greift jedoch zu kurz, weil moderne Markdown-Ökosysteme durch Spezifikationen wie CommonMark, Konverter wie Pandoc und darauf aufbauende Editoren deutlich mehr leisten als reine Notiz- oder Web-Authoring-Szenarien [@commonmark2026; @pandoc2025].

Zusätzlich verändert der Aufstieg generativer KI die Bewertung von Markdown noch einmal. Viele KI-Applikationen arbeiten nicht auf der Ebene sichtbarer Seitenformatierung, sondern mit linearem, segmentierbarem Text. Genau hier ist Markdown stark: Überschriften, Listen, Tabellen, Codeblöcke und Metadaten bleiben im Chat-Kontext explizit, kopierbar und transformierbar. Für wissenschaftliche Schreibumgebungen ist das relevant, weil KI-Unterstützung dann nicht an Screenshots oder lokaler Sichtformatierung ansetzt, sondern am dokumentierten Strukturkern.

Vor diesem Hintergrund untersucht die vorliegende Arbeit, welche Rolle Markdown und speziell mdedit.io für wissenschaftliche Arbeiten spielen können. Im Zentrum steht nicht die Behauptung, ein einzelnes Werkzeug könne alle konkurrierenden Produktionslogiken ersetzen. Gefragt wird vielmehr, für welche Anforderungsprofile wissenschaftlicher Abschlussarbeiten ein browserbasierter Markdown-Workflow methodisch vertretbar, technisch stabil und institutionell anschlussfähig ist. Zusätzlich führt die Arbeit ein reproduzierbares Referenzartefakt mit, das die für wissenschaftliche Langtexte relevanten Satz- und Exportelemente praktisch prüfbar macht.

### 1.1 Forschungsfrage {#sec:forschungsfrage}

Die leitende Forschungsfrage lautet: Unter welchen Bedingungen kann ein browserbasierter Markdown-Editor am Beispiel von mdedit.io als primäre Produktionsumgebung für wissenschaftliche Abschlussarbeiten dienen, und unter welchen formalen Randbedingungen bleiben Word oder LaTeX vorzugswürdig?

Zur Beantwortung werden drei Teilfragen verfolgt:

1. Welche Anforderungen sind für wissenschaftliche Abschlussarbeiten konstitutiv und damit für die Werkzeugwahl entscheidend?
2. Welche Produktionslogiken unterscheiden Word, LaTeX und markdown-basierte Workflows in Bezug auf diese Anforderungen?
3. An welcher Stelle erweist sich mdedit.io als tragfähiger Primärworkflow, und wo beginnen Ausschlusskriterien oder institutionelle Sonderfälle?

### 1.2 Arbeitsthesen {#sec:arbeitsthesen}

Die Arbeit basiert auf vier Arbeitsthesen:

1. Markdown ist nicht mehr nur eine einfache Web-Syntax, sondern ein ernstzunehmendes Zwischenformat für strukturierte Langtexte, sofern Spezifikation, Metadaten und Exportwerkzeuge zusammenwirken. Dieselbe Eigenschaft macht es zugleich zu einem besonders anschlussfähigen Arbeitsformat für KI-gestützte Redaktions- und Transformationsprozesse [@gruber2004markdown; @commonmark2026; @pandoc2025].
2. Die Eignung eines Werkzeugs für Masterarbeiten entscheidet sich weniger an isolierter Typografie als an Strukturtransparenz, Quellenintegrität, Reviewfähigkeit und reproduzierbaren Exportpfaden.
3. mdedit.io ist besonders dort stark, wo Longform-Struktur, frühe Layoutkontrolle, kontrollierter Multi-Export, dokumentnahe KI-Unterstützung und browserbasierte Zusammenarbeit im Vordergrund stehen [@mdeditreadme2026].
4. mdedit.io bleibt dort begrenzt, wo semantisch reiche Referenzsysteme, note-style-Fußnoten oder starre Hochschulvorlagen produktiv zwingend sind [@mdeditcitations2026; @mdeditplan2026].

### 1.3 Methodisches Vorgehen {#sec:methodik}

Methodisch folgt die Arbeit einer kriteriengeleiteten Artefaktanalyse im Sinne designorientierter Forschung [@hevner2004design; @wieringa2014design]. Im ersten Schritt wird aus der Literatur zum wissenschaftlichen Arbeiten und aus institutionellen Zitiervorgaben ein Anforderungskatalog für wissenschaftliche Abschlussarbeiten rekonstruiert [@booth2016craft; @swalesfeak2012; @readingstyles2026]. Im zweiten Schritt werden die drei dominanten Werkzeuglogiken Word, LaTeX und Markdown vergleichend auf diese Anforderungen bezogen. Im dritten Schritt erfolgt für mdedit.io eine vertiefte Fallanalyse anhand offizieller Produktdokumentation, wissenschaftsnaher Projektkonzepte und des in dieser Arbeit mitgeführten Referenzartefakts [@mdeditreadme2026; @mdeditcitations2026; @mdeditplan2026].

Die Bewertung erfolgt entlang fünf Dimensionen: Strukturtransparenz, Quellen- und Zitationssicherheit, Layout- und Exportstabilität, Review- und Betreuungskompatibilität sowie Governance und Betriebsfähigkeit. Ein Werkzeug gilt in dieser Logik dann als thesis-tauglich, wenn es die Produktionskette einer Abschlussarbeit in diesen Dimensionen ohne methodisch kritische Brüche tragen kann. Die Arbeit beansprucht keine Verallgemeinerung aus Nutzerzahlen oder Experimentdaten, sondern eine analytisch nachvollziehbare Eignungsprüfung.

### 1.4 Aufbau der Arbeit

Kapitel 2 rekonstruiert Ursprung und Entwicklung von Markdown als wissenschaftlich relevantes Zwischenformat und ergänzt diese Perspektive um seine besondere Rolle in KI-Applikationen. Kapitel 3 leitet aus der Literatur und aus institutionellen Vorgaben das Bewertungsraster für wissenschaftliche Schreibwerkzeuge ab und positioniert Word, LaTeX und Markdown vergleichend. Kapitel 4 bestimmt mdedit.io als Untersuchungsfall. Kapitel 5 führt die kriteriologische Bewertung durch und spiegelt den Befund an drei anspruchsvollen Hochschulprofilen. Kapitel 6 betrachtet Governance-, Rechts- und Betriebsaspekte. Kapitel 7 diskutiert Beitrag und Grenzen der Untersuchung, bevor Kapitel 8 die Forschungsfrage beantwortet. Der Anhang fungiert als reproduzierbares Referenzartefakt für layout- und exportkritische Dokumentelemente.

## 2. Markdown: Begriff, Ursprung und Entwicklung

### 2.1 Was Markdown ist und warum es entstand

Markdown wurde 2004 von John Gruber als Text-zu-HTML-Werkzeug eingeführt. Der Kern des Ansatzes besteht darin, dass ein Dokument bereits als Rohtext gut lesbar sein soll und erst im zweiten Schritt in strukturell valides HTML umgewandelt wird [@gruber2004markdown]. Diese doppelte Logik ist bis heute entscheidend: Markdown ist zugleich Syntax und Konvertierungsidee. Sein ursprünglicher Zweck war nicht wissenschaftliches Publizieren, sondern lesbares Schreiben für das Web. Gerade darin liegt jedoch eine bleibende Stärke. Markdown trennt Inhalt, Struktur und spätere Darstellung stärker voneinander als klassische WYSIWYG-Textverarbeitung.

Die normative Pointe liegt im Gestaltungsziel der Lesbarkeit. Während HTML-Tags den Rohtext visuell überfrachten können, sollte ein Markdown-Dokument auch ohne Renderung als strukturierter Text begreifbar bleiben [@gruber2004markdown]. Diese Eigenschaft macht Markdown für wissenschaftliche Prozesse interessant, weil akademisches Schreiben gerade in frühen Phasen weniger von perfekter Formatierung als von orientierbarer Gliederung lebt.

### 2.2 Warum Markdown nicht bei seinem Ursprung stehenblieb

Die Offenheit der frühen Markdown-Beschreibung war zugleich Erfolg und Problem. Weil die Syntax ursprünglich nicht unmissverständlich spezifiziert war, entwickelten sich zahlreiche Implementierungen mit voneinander abweichendem Verhalten. CommonMark beschreibt diese historische Lage explizit als Problem divergierender Parser und fehlender Testsuiten [@commonmark2026]. Für wissenschaftliche Dokumente ist genau diese Divergenz kritisch, weil Reproduzierbarkeit und Portabilität zentrale Anforderungen sind.

Mit CommonMark wurde Markdown deshalb in Richtung einer formaleren, testbaren und interoperablen Spezifikation weiterentwickelt [@commonmark2026]. Die Entwicklung von Markdown lässt sich damit als Verschiebung von einer pragmatischen Web-Schreibpraxis zu einem standardisierbaren Format für strukturierte Dokumente lesen. Dieser Schritt ist für wissenschaftliches Arbeiten zentral, weil er die Voraussetzung für verlässliche Konverter und stabile Renderpfade schafft.

### 2.3 Markdown im erweiterten Ökosystem: Pandoc als Brücke

Pandoc markiert die zweite entscheidende Entwicklungsstufe. Während Grubers Markdown vor allem auf HTML zielte, macht Pandoc aus Markdown ein universelles Zwischenformat. Nach eigener Beschreibung konvertiert Pandoc zwischen zahlreichen Markup-, Dokument- und Office-Formaten, darunter Markdown, DOCX, LaTeX und verschiedene PDF-Pfade [@pandoc2025]. Zugleich unterstützt Pandoc Metadaten, Tabellen, Fußnoten, Mathematik sowie automatische Zitationen und Bibliografien [@pandoc2025].

Für wissenschaftliche Arbeiten ist das von erheblicher Bedeutung. Erst die Verbindung aus spezifizierter Syntax, Metadaten und Konverter ermöglicht einen Workflow, in dem Rohtext, wissenschaftliche Struktur und Ausgabemedien systematisch miteinander gekoppelt werden. Damit wird Markdown nicht automatisch zum besten Werkzeug für jede Thesis. Es wird aber zu einer belastbaren Alternative für Autorinnen und Autoren, die Struktur und Portabilität höher gewichten als permanente Sichtformatierung.

### 2.4 Markdown als Arbeitsformat in KI-Applikationen

Generative KI-Anwendungen operieren im Kern nicht mit Seitengeometrie, sondern mit tokenisiertem Text, semantischen Segmenten und expliziten Strukturmarkern. Genau deshalb hat Markdown in KI-Applikationen eine besondere Rolle: Überschriften, Listen, Tabellen, Zitatblöcke, Code-Fences und YAML-artige Metadaten bleiben für Menschen lesbar und für Modelle zugleich vergleichsweise gut adressierbar. Während visuelle Office-Formatierung oft implizit oder binär gebunden ist, stellt Markdown Struktur in einer linearen, kopierbaren und promptfähigen Form bereit.

Für KI-gestützte Schreibumgebungen ist das mehr als eine Komfortfrage. Ein Modell kann auf einem Markdown-Dokument nicht nur stilistisch antworten, sondern Abschnitte gezielt umstellen, Tabellen ergänzen, Listen konsolidieren, Frontmatter anpassen oder Zitationsmarker unverändert erhalten. Markdown fungiert damit zugleich als Darstellungsformat, Transformationsformat und Austauschformat zwischen Autorenschaft, Chat-Oberfläche, Agentenlogik und nachgelagerten Konvertern.

Tabelle 2: Häufig genutzte KI-unterstützte Chats und ihre typischen Arbeitsformate.

::: table{layout=scientific}
| System | Primäre Interaktion | Typische Arbeitsformate | Rolle von Markdown |
| --- | --- | --- | --- |
| ChatGPT | Dialogischer Chat mit Datei- und Bildkontext | Freitext, Markdown, PDF, Office-Dateien, Tabellen, Bilder, Code | Markdown eignet sich als robustes Zwischenformat für strukturierte Prompts, Listen, Tabellen und formatstabile Antworten |
| Claude | Dokumentzentrierter Chat mit langem Kontext | Freitext, Markdown, PDF, DOCX, Bilder, Code | Markdown unterstützt lange Abschnitte, Revisionen und klare Abschnittsreferenzen |
| Gemini | Such- und workspace-naher Chat | Freitext, Markdown, PDF, Workspace- und Office-Dokumente, Tabellen, Bilder | Markdown erleichtert den Wechsel zwischen Chat, Dokument und Export ohne versteckte Layoutlogik |
| Perplexity | Suchorientierter Recherche-Chat | Freitext, Markdown, Webquellen, PDF, Bilder | Markdown ist nützlich für strukturierte Synthesen, Listen und zitiernahe Notizen |
| mdedit.io KI-Chat | Dokumentgebundener Editor-Chat | Markdown-Dokumente, Frontmatter, Zitationsmarker, Layout-Kommandos | Markdown ist hier Primärformat des Arbeitsdokuments und nicht nur ein Nebenformat |
:::

Gerade im wissenschaftlichen Kontext ist dieser Unterschied relevant. Wer mit KI auf einem Markdown-Kern arbeitet, bearbeitet nicht lediglich Textoberflächen, sondern explizite Dokumentstruktur. Dadurch sinkt das Risiko, dass Revisionen semantische Gliederung, Zitationsmarker oder Exportpfade unbeabsichtigt zerstören. Für wissenschaftliche Langtexte ist Markdown deshalb nicht nur ein schlankes Schreibformat, sondern zunehmend auch das geeignetere Interfaceformat für KI-gestützte Redaktionsprozesse.

## 3. Optionen für die Erstellung wissenschaftlicher Arbeiten

### 3.1 Besondere Anforderungen wissenschaftlicher Dokumente {#sec:anforderungen}

Wissenschaftliche Arbeiten unterscheiden sich von Alltagsdokumenten durch eine Reihe spezifischer Anforderungen. Dazu gehören mindestens eine stabile Kapitelhierarchie, konsistente Zitation, sauber geführte Literaturverzeichnisse, reproduzierbare Tabellen- und Abbildungsintegration, kontrollierbare Exportpfade, Rückmeldeschleifen mit Betreuenden und formale Anschlussfähigkeit an Hochschulvorgaben. Hinzu kommen praktische Anforderungen wie Versionssicherheit, Reviewfähigkeit, Datensparsamkeit und langfristige Lesbarkeit. In der einschlägigen Literatur zum wissenschaftlichen Arbeiten wird diese Verbindung aus Erkenntnislogik, Strukturierung, Zitierdisziplin und redaktioneller Konsistenz seit langem als Kern wissenschaftlicher Textproduktion beschrieben [@booth2016craft; @swalesfeak2012].

Diese Anforderungen machen deutlich, dass kein Werkzeug allein aufgrund schöner Typografie oder schneller Bedienbarkeit ausreicht. Entscheidend ist vielmehr, wie gut ein Werkzeug das Wechselspiel von Schreiben, Strukturieren, Kommentieren, Exportieren und formaler Kontrolle organisiert. Hinzu kommt, dass Zitier- und Referenzsysteme disziplinär variieren: APA, Chicago, MHRA, OSCOLA und Vancouver sind keine äquivalenten Geschmackssachen, sondern fachkulturell unterschiedliche Regime mit jeweils eigenen Erwartungen an In-Text-Zitate, Fußnoten, Literaturverzeichnis und Quellenapparat [@readingstyles2026; @apa2019manual; @mhra2024; @oscola2026; @imperialvancouver2026].

Aus diesen Anforderungen leitet die Arbeit ein fünfdimensionales Bewertungsraster ab: (1) Strukturtransparenz, (2) Quellen- und Zitationssicherheit, (3) Layout- und Exportstabilität, (4) Review- und Betreuungskompatibilität sowie (5) Governance und Betriebsfähigkeit. Dieses Raster dient im weiteren Verlauf als Vergleichs- und Bewertungsinstrument für die drei Werkzeuglogiken und für den Fall mdedit.io.

### 3.2 Microsoft Word

Microsoft Word ist an Hochschulen weithin etabliert. Ein wesentlicher Vorteil liegt in seiner institutionellen Anschlussfähigkeit: Viele Betreuende arbeiten mit Word-Kommentaren, Vorlagen und Korrekturmodi. Besonders der Reviewbereich mit Track Changes, verschiedenen Darstellungsmodi, reviewerbezogener Filterung und Reviewing Pane ist für klassische Betreuungs- und Korrekturprozesse stark ausgebaut [@microsoftword2026].

Seine Schwäche liegt jedoch oft in der engen Kopplung von Inhalt und unmittelbarer Formatierung. Zwar bietet Word Formatvorlagen und professionelle Layoutfunktionen, in der Praxis werden lange Dokumente jedoch häufig durch lokale Formatkorrekturen, inkonsistente Styles und schwer nachvollziehbare Umbrüche instabil. Gerade bei stark überarbeiteten Masterarbeiten führt das nicht selten zu Formatdrift, also zu einem schleichenden Verlust an struktureller Disziplin.

### 3.3 LaTeX

LaTeX versteht sich selbst nicht als Textverarbeitung, sondern als Dokumentvorbereitungssystem für hochwertige Typografie, insbesondere in wissenschaftlichen und technischen Kontexten [@latexproject2026]. Das System ist für große Dokumente, Querverweise, Tabellen, Formeln, Bibliografien und Register ausgelegt und entlastet Autorinnen und Autoren von vielen direkten Designentscheidungen [@latexproject2026].

Genau darin liegt die klassische Stärke von LaTeX: saubere Trennung von Inhalt und Satz, starke mathematische und typografische Kompetenz sowie hohe Stabilität bei großen Dokumenten. Die Kehrseite ist die höhere Einstiegshürde. Wer LaTeX nicht bereits beherrscht, investiert signifikant Zeit in Toolchain, Fehlersuche, Paketlogik und Vorlagensysteme. Für viele Studierende ist LaTeX deshalb eher dann attraktiv, wenn Fachkultur, Vorwissen oder formale Komplexität diese Investition rechtfertigen.

### 3.4 Markdown-basierte Workflows

Markdown-basierte Workflows besetzen die Zwischenzone zwischen Word und LaTeX. Sie bieten weniger unmittelbare Layoutsteuerung als Word und weniger typografische Tiefenkontrolle als LaTeX, können aber Struktur, Lesbarkeit im Rohtext und Portabilität besonders gut verbinden. In Verbindung mit Pandoc kommen Metadaten, Zitationen, Bibliografien sowie DOCX- und PDF-Exporte hinzu [@pandoc2025].

Markdown ist damit kein Ersatz für jede Fachkultur und jede Hochschulvorgabe. Seine besondere Stärke liegt dort, wo das Schreiben selbst, die Sicht auf Struktur und ein kontrollierter Multi-Export wichtiger sind als pixelgenaue Formatarbeit während der Rohfassung. Im Kontext KI-gestützter Schreibarbeit kommt hinzu, dass Markdown seine Struktur explizit mitführt und dadurch besser für Transformation, Revision und Weiterverarbeitung geeignet ist als rein visuell orientierte Formate.

### 3.5 Vergleich von Word, LaTeX und Markdown {#sec:vergleich}

Die Werkzeugklassen unterscheiden sich weniger entlang einer simplen Rangordnung als entlang ihrer Produktionslogik. Word ist review- und institutionenfreundlich, LaTeX ist satz- und formalstark, Markdown ist struktur- und portabilitätsorientiert.

Tabelle 1: Vergleich zentraler Werkzeuglogiken für wissenschaftliche Arbeiten.

::: table{layout=scientific}
| Kriterium | Word | LaTeX | Markdown-basierter Workflow |
| --- | --- | --- | --- |
| Einstieg | Niedrig bis mittel | Mittel bis hoch | Niedrig bis mittel |
| Review mit Betreuenden | Sehr stark | Oft indirekt oder PDF-basiert | Stark, wenn Editor Sharing und Kommentare unterstützt |
| Typografische Kontrolle | Mittel bis hoch | Sehr hoch | Mittel |
| Rohtext-Lesbarkeit | Niedrig | Mittel | Hoch |
| Portabilität | Mittel | Hoch | Hoch |
| Zitationsreife | Hoch | Sehr hoch | Hoch mit Pandoc-Citeproc |
| Gefahr lokaler Formatdrift | Hoch | Niedrig | Niedrig |
| Eignung für spontane Überarbeitung | Hoch | Mittel | Hoch |
:::

Aus dieser Gegenüberstellung folgt kein pauschaler Sieger. Vielmehr hängt die Eignung vom Profil der Arbeit ab. Die Anforderungen an wissenschaftliche Dokumente wurden in [@sec:anforderungen] hergeleitet; die Konsequenzen für mdedit.io werden in [@sec:bewertung] im Detail durchgeführt. Wo eine Hochschule starre Word-Vorlagen erzwingt, bleibt Word faktisch dominant. Wo mathematische Satzqualität und komplexe Referenzsysteme im Zentrum stehen, bleibt LaTeX stark. Wo jedoch Strukturtransparenz, editorische Leichtigkeit, Portabilität, Web-Review und frühe Exportkontrolle im Vordergrund stehen, gewinnt Markdown erheblich an Attraktivität.

## 4. mdedit.io als Untersuchungsfall

### 4.1 Markdown als wissenschaftliches Zwischenformat

Markdown verbindet drei Vorteile, die für wissenschaftliche Langtexte besonders relevant sind. Erstens erzwingt es eine strukturorientierte Schreibweise. Zweitens bleibt der Rohtext dauerhaft lesbar und portabel. Drittens lässt es sich über Konverter wie Pandoc in etablierte Zielformate überführen [@gruber2004markdown; @pandoc2025]. Genau diese Eigenschaften reduzieren die Gefahr, dass eine Arbeit in lokalen Formatkorrekturen versinkt, bevor die Argumentation stabil ist.

Markdown ist besonders dann plausibel, wenn Schreiben als Denken in Strukturen verstanden wird. Die Frage lautet dann nicht mehr, welche Schrift die Zwischenüberschrift aktuell hat, sondern ob der Abschnitt überhaupt eine klare Funktion im Argumentationsgang besitzt. Das ist für wissenschaftliche Texte keine Nebensache, sondern oft der Unterschied zwischen editorischer Aktivität und wissenschaftlicher Stringenz. Dieselbe Strukturorientierung erklärt zugleich seine wachsende Bedeutung in KI-Applikationen: Wenn Modelle an expliziten Textsegmenten statt an versteckter Layoutsemantik arbeiten, wird Markdown zum effizienteren Interfaceformat.

### 4.2 Funktionsprofil des Untersuchungsfalls

Nach der Projektdokumentation ist mdedit.io ein browserbasierter Markdown-Editor für Longform-Schreiben, strukturierte Dokumente und exportierbare Entwürfe. Die Anwendung kombiniert Live-Preview, dokumentbasierte Outline-Navigation, Kollaboration, KI-Assistenz und Export nach Markdown, DOCX und PDF in einer selbst gehosteten Webanwendung [@mdeditreadme2026]. Die Hilfeoberfläche beschreibt den rechten Arbeitsbereich explizit als Kombination aus Vorschau, Baumansicht und KI-Chat; außerdem nennt sie einen Layout-Editor sowie drucknahe Paged-Preview als eigene Arbeitsmodi [@mdedithelp2026]. Für die vorliegende Untersuchung ist daran vor allem relevant, dass mdedit.io nicht nur Textbearbeitung, sondern die Kopplung von Schreibprozess, Dokumentstruktur und Ausgabeformat adressiert.

Der Fall eignet sich deshalb als Untersuchungsobjekt, weil hier mehrere für Abschlussarbeiten zentrale Anforderungen gleichzeitig berührt werden: Sichtbarkeit der Kapitelstruktur, frühe Vorschau des Satzbilds, browserbasierter Zugang ohne lokale Desktop-Installation und die Möglichkeit, einen Markdown-Kern in unterschiedliche Abgabe- und Reviewformate zu überführen [@mdeditreadme2026]. Hinzu kommt ein weiterer Punkt: Der KI-Chat arbeitet nicht an einem fremden, binär formatierten Dokument, sondern am expliziten Markdown-Quelltext. Damit wird mdedit.io zu einem Fall, in dem Markdown nicht nur Exportbasis, sondern unmittelbares Bearbeitungsmedium für menschliche und KI-gestützte Redaktion ist.

### 4.3 Vorläufige Einordnung im Bewertungsraster

Aus theoretischer Sicht ist mdedit.io vor allem dort relevant, wo wissenschaftliche Arbeit nicht primär als Layoutproduktion, sondern als strukturierte Dokumententwicklung verstanden wird. Die Outline reduziert den Abstand zwischen Gliederung und Rohtext, die Vorschau verkürzt den Weg zur drucknahen Kontrolle, und der Multi-Export macht denselben Dokumentkern für unterschiedliche institutionelle Situationen verwendbar [@mdeditreadme2026].

Damit positioniert sich mdedit.io zwischen der review- und institutionsnahen Logik von Word und der satz- und formalstärkeren Logik von LaTeX. Diese Zwischenposition ist gerade für Abschlussarbeiten interessant, weil viele Projekte weder reine Office-Routine noch voll entwickelte TeX-Workflows voraussetzen, wohl aber eine stabile, nachvollziehbare Produktionsumgebung benötigen.

### 4.4 Absehbare Grenzen des Untersuchungsfalls {#sec:grenzen}

Die eigene wissenschaftliche Konzeptdokumentation von mdedit.io benennt zugleich klare Grenzen. Der Hauptengpass liegt weniger im Seitenlayout als in semantischen Dokumentfunktionen wie YAML-Frontmatter, Labels, Nummerierung, Cross-References und belastbaren Zitationspfaden [@mdeditcitations2026]. Ebenfalls werden echte seitengebundene Fußnoten für note-style-Zitierstile nicht als gesichert im aktuellen HTML- und Paged-Stack versprochen [@mdeditcitations2026].

Die sachliche Schlussfolgerung lautet daher: mdedit.io ist für wissenschaftliche Langtexte ein ernstzunehmender Untersuchungsfall, aber kein universell vollständiges System. Seine Eignung steigt dort, wo Autorinnen und Autoren bewusst mit Struktur, Frontmatter, Citeproc-Export und Layoutregeln arbeiten. Die konkreten Grenzfälle werden in [@sec:ausschluss] und [@sec:grenzen] benannt. Sie sinkt dort, wo absolute Kompatibilität mit sehr spezifischen Vorlagensystemen oder LaTeX-zentrierten Fußnotenstilen gefordert ist.

## 5. Kriteriengeleitete Bewertung von mdedit.io {#sec:bewertung}

### 5.1 Bewertungslogik und Untersuchungsartefakt {#sec:bewertungslogik}

Die Bewertung folgt nicht der Frage, ob mdedit.io jedes Einzelmerkmal von Word oder LaTeX repliziert. Entscheidend ist vielmehr, ob das Werkzeug die wissenschaftliche Produktionskette einer Abschlussarbeit ohne methodisch kritische Brüche tragen kann. Als kritisch gelten in dieser Arbeit Brüche, wenn sie zu Strukturverlust, inkonsistenter Zitation, nicht kontrollierbaren Exporten, betreuungspraktischen Reibungen oder institutionell problematischem Betrieb führen.

Tabelle 3: Bewertungsdimensionen der Analyse.

::: table{layout=scientific}
| Dimension | Leitfrage | Beobachtbare Indikatoren |
| --- | --- | --- |
| Strukturtransparenz | Bleibt der Argumentationsgang im Arbeitsprozess sichtbar und stabil? | Gliederung, Rohtext-Lesbarkeit, Umstrukturierbarkeit |
| Quellenapparat | Können Zitationen datenbasiert, konsistent und stiladaptiv verarbeitet werden? | Bibliografiepfad, Citeproc, Referenzsektion, Stilwechsel |
| Layout und Export | Lassen sich drucknahe Ausgaben früh und reproduzierbar kontrollieren? | Seitenansicht, PDF, DOCX, Listen, Caption-Verhalten |
| Review und Betreuung | Ist der Workflow mit Feedback- und Abgabekulturen vereinbar? | Teilen, Kommentierbarkeit, Export in Review-Formate |
| Governance und Betrieb | Ist das Werkzeug rechtlich und technisch für längere akademische Nutzung tragfähig? | Lizenz, Self-Hosting, Portabilität, Abhängigkeiten |
:::

Die Analyse stützt sich nicht nur auf Funktionsbeschreibungen, sondern auch auf das im Anhang dokumentierte Referenzartefakt. Dieses Artefakt enthält bewusst Abbildungen, Tabellen, Mathematik, Fußnoten, Spalten und Seitenumbrüche, weil gerade diese Elemente in wissenschaftlichen Abschlussarbeiten typische Fehlerquellen des Exportpfads markieren.

### 5.2 Strukturtransparenz und Schreibprozess

Im Kriterium Strukturtransparenz erzielt mdedit.io eine hohe Eignung. Die Kombination aus Plain-Text-Basis, Kapitelhierarchie und Outline-Navigation erleichtert es, Argumentationssegmente früh zu verschieben, Lücken sichtbar zu machen und Rohfassungen ohne Formatballast zu überarbeiten [@mdeditreadme2026]. Gegenüber Word reduziert dies die Versuchung lokaler Formatkorrekturen; gegenüber LaTeX sinkt die initiale Toolchain-Komplexität.

Für Masterarbeiten ist dieser Punkt nicht trivial, weil Abschlussarbeiten typischerweise mehrfach restrukturiert werden. Ein Werkzeug, das Gliederungsstabilität unter Überarbeitung trägt, besitzt daher einen echten methodischen Mehrwert. In dieser Dimension ist mdedit.io nicht nur benutzbar, sondern für viele Schreibsituationen dem klassischen WYSIWYG-Paradigma sogar analytisch überlegen.

#### 5.2.1 Navigation in großen Dokumenten und Tree View

Für umfangreiche wissenschaftliche Dokumente reicht eine lineare Editoransicht jedoch nicht aus. mdedit.io adressiert dieses Problem über eine heading-basierte Outline und eine Baumansicht, die laut Produktdokumentation ausschließlich auf Überschriftenebenen H1 bis H6 basiert [@mdeditreadme2026]. Die Hilfe bezeichnet die Baumansicht dabei nicht als dekorativen Zusatz, sondern als eigene Arbeitsfläche für Vorschau, Baum und KI-Chat [@mdedithelp2026]. Gerade in langen Theoriekapiteln, Methodenabschnitten und Anhängen wird dadurch sichtbar, ob Kapitelgewicht, Unterkapitelstruktur und argumentative Hierarchie noch tragfähig sind.

Methodisch ist das mehr als Komfort. Eine Masterthesis scheitert häufig nicht an fehlenden Einzelsätzen, sondern an schlechter Makrostruktur. Ein Tree View, der Abschnittstiefe, Reihenfolge und Schwerpunktsetzung sofort sichtbar macht, verkürzt den Weg zwischen Gliederungsentscheidung und Textrevision. Seine Grenze liegt allerdings ebenfalls offen: Wenn die Baumansicht ausschließlich headings-basiert ist, bildet sie semantische Referenzobjekte wie Abbildungen, Tabellen, Listings oder bibliografische Knoten nicht mit eigener Logik ab. Damit bleibt sie ein starkes Strukturwerkzeug, aber kein vollständiges semantisches Navigationssystem.

#### 5.2.2 KI-Integration für die Inhaltsbearbeitung

mdedit.io integriert KI nicht nur als externen Prompt-Kanal, sondern als eingebettetes Arbeitsmittel für Dokumentbearbeitung. Die README spricht von AI-assisted editing, die Hilfe von einem integrierten KI-Panel [@mdeditreadme2026; @mdedithelp2026]. Die API-Dokumentation zeigt zudem, dass der Bearbeitungspfad nicht auf reine Chat-Antworten beschränkt ist, sondern strukturierte Aktionen wie `REPLACE`, `INSERT`, `APPEND`, `PREPEND` und `ADVICE` vorsieht [@mdeditaiapi2026]. Für die Arbeit an einer Masterthesis ist das vor allem dort relevant, wo Einleitungen gestrafft, Übergänge umformuliert, Zusammenfassungen verdichtet oder alternative Gliederungsvarianten schnell erzeugt werden sollen.

Der methodisch entscheidende Punkt liegt jedoch tiefer: Die KI arbeitet in mdedit.io auf einem kanonischen Markdown-Kern. Dadurch bleiben Überschriftenhierarchie, Listen, Tabellen, Zitationsmarker und Frontmatter nicht nur sichtbar, sondern direkt bearbeitbar. Im Unterschied zu visuell dominierten Dokumentformaten muss die KI die Struktur also nicht erst aus impliziter Formatierung rekonstruieren. Gerade für wissenschaftliche Texte ist das relevant, weil die Bearbeitung dadurch näher am semantischen Dokumentzustand als an einer bloßen Oberflächenumformulierung bleibt.

Die Eignung dieser Integration ist gleichwohl konditional. Für wissenschaftlich legitime Nutzung eignet sich KI zur sprachlichen Revision, zur Verdichtung, zur Erzeugung von Zwischenüberschriften, zur Umstellung von Argumentationsfolgen und zur Explikation stillschweigender Strukturannahmen. Sie eignet sich nicht als Quelle eigener empirischer Aussagen, nicht für unbelegte Literaturbehauptungen und nicht für die Simulation fachlicher Evidenz. Die in mdedit.io sinnvolle Rolle der KI ist deshalb editorisch und heuristisch, nicht epistemisch.

#### 5.2.3 KI-Integration für die Layoutbearbeitung

Die KI-Integration von mdedit.io ist nach dem aktuellen Intent-Modell nicht auf Fließtext beschränkt. Im Server werden auch layoutbezogene Bearbeitungsanliegen wie `layout`, `seitenrand`, `typografie`, `spalten`, `header`, `footer` und `inhaltsverzeichnis` explizit als Edit-Intent erkannt [@mdeditserver2026]. Zusammen mit dem Layout-Editor, den drucknahen Preview-Presets und dem Paged-Workflow entsteht damit ein integrierter Bearbeitungspfad, in dem Layoutregeln nicht nur manuell gesetzt, sondern auch durch KI-gestützte Formulierungs- oder Anpassungsanfragen vorbereitet werden können [@mdedithelp2026].

Gerade für Masterarbeiten ist diese Kopplung interessant, weil Layoutfragen selten isoliert auftreten. Wer etwa die Abbildungsdichte in einem Ergebniskapitel erhöht, muss oft zugleich Spalten, Caption-Stile, Seitenumbrüche oder Inhaltsverzeichnis-Tiefe anpassen. Die relevante Einschränkung besteht darin, dass diese KI-Integration kein Garant für typografische Richtigkeit ist. Sie kann Layoutarbeit beschleunigen, aber sie ersetzt nicht die Sichtprüfung in der Seitenansicht und nicht die formale Endkontrolle gegen institutionelle Vorgaben.

### 5.3 Quellenapparat und wissenschaftliche Integrität

Im Bereich Quellenapparat ist mdedit.io nur dann thesis-tauglich, wenn Zitate konsequent datenbasiert und nicht als manuell formatierter Text behandelt werden. Die vorliegende Referenzdatei operationalisiert diese Logik bereits über YAML-Frontmatter, `citation-source: embedded`, einen dokumentgebundenen `mdedit-bibliography`-Block, verlinkte Zitationen und die explizite Referenzsektion. In Verbindung mit Pandoc und Citeproc ist dies für autor-jahr- und numerische Workflows tragfähig [@pandoc2025; @mdeditcitations2026; @mdeditserver2026].

#### 5.3.1 Integration von Literaturverzeichnissen und Bib-Standards

Gerade mit Blick auf die aktuellen mdedit-Erweiterungen ist festzuhalten, dass der wissenschaftliche Quellenpfad inzwischen über klassisches Plain-Text-Markdown hinausgeht. Der Server wertet in wissenschaftlichen Dokumenten vor allem YAML-Felder wie `citation-source`, `csl` und `reference-section-title` aus und erkennt zusätzlich `link-citations`, `link-bibliography` sowie `nocite` als relevante Metadaten für den Export [@mdeditserver2026]. Der normative lokale Quellenpfad ist dabei ein `mdedit-bibliography`-Block mit eingebettetem CSL-JSON, während der Export selbst über Pandoc mit `--citeproc` aufgebaut wird [@pandoc2025; @mdeditserver2026]. Dateibasierte `bibliography:`-Pfade werden in der aktuellen Serverlogik zwar noch erkannt, aber bewusst nur noch für klare Migrationsfehler ausgewertet und nicht mehr als gültiger Exportworkflow akzeptiert [@mdeditserver2026; @mdeditplan2026].

Für die vorliegende Referenzdatei ist besonders wichtig, dass sie diesen eingebetteten Pfad nun selbst verwendet. Das Dokument enthält die Bibliothek als lokalen Snapshot im Quelltext und testet damit nicht nur Zitationssyntax, sondern den kompletten dokumentgebundenen Quellenmodus. Zusätzlich bleibt der aktuelle mdedit-Marker `#refs` bewusst erhalten. Dieser Marker ist im Quelltext nicht als sichtbare Endfassung gedacht, sondern Teil der gegenwärtigen Scientific-Schnittstelle: Im Exportpfad wird er serverseitig in eine echte Literaturverzeichnis-Sektion mit Referenzanker normalisiert [@mdeditserver2026]. Genau deshalb ist `#refs` hier keine editorische Nachlässigkeit, sondern ein End-to-End-Test der aktuellen Bibliografieintegration.

Die Import- und Exportperspektive bleibt davon zu unterscheiden. In der Produktplanung sind Adapter für BibTeX, RIS und CSL JSON auf dem lokalen Dokumentkern vorgesehen, damit bestehende Literaturbestände in die eingebettete Bibliothek übernommen und aus ihr wieder exportiert werden können [@mdeditplan2026]. Damit wird das integrierte mdedit-Format nicht als Abschottung gegen bestehende Standards gedacht, sondern als reproduzierbarer Dokumentkern, an den Standardimporte und -exporte anschließen.

#### 5.3.2 Optionen zur Einbindung externer Online-Verzeichnisse

Die Planung für wissenschaftliche Dokumente unterscheidet den dokumentgebundenen Quellenmodus `embedded` sowie die späteren Modi `zotero` und `hybrid` [@mdeditplan2026]. Daraus folgt eine für Abschlussarbeiten wichtige Architekturentscheidung: Externe Online-Verzeichnisse sollen Recherche, Auswahl und Metadatenanreicherung unterstützen, aber nicht die einzig normative Exportquelle der eingereichten Arbeit sein.

Als erster externer Connector ist ein read-only-Zotero-Pfad vorgesehen. Quellen sollen dort gesucht und anschließend in die lokale Bibliothek oder in dokumentgebundene Snapshots übernommen werden können, ohne dass der Export oder das Teilen des Dokuments zur Laufzeit von einer Live-Zotero-Verbindung abhängt [@mdeditplan2026]. Parallel dazu ist OpenAlex als offener Lookup für Titel-, DOI- oder Autorensuche geplant; auch hier sollen Treffer in die lokale Bibliothek übernommen werden, während OpenAlex selbst nicht die normative Exportquelle des Dokuments bleibt [@mdeditplan2026].

Für thesis-taugliche Workflows ist genau diese Snapshot-Logik zentral. Wer externe Online-Verzeichnisse einbindet, sollte sie als vorgelagerte Recherche- und Importebene behandeln, nicht als einzige Speicherstelle der abgaberelevanten Bibliografie. Reproduzierbar wird der Workflow erst dann, wenn der für die Abgabe maßgebliche Quellenstand als eingebettete mdedit-Bibliothek oder als kontrollierter Hybrid-Snapshot im Dokumentkontext fixiert bleibt [@mdeditplan2026; @mdeditcitations2026].

Die Grenze verläuft dort, wo note-style-Fußnoten, komplexe Cross-References oder hochschulspezifische Sonderlogiken produktiv vorausgesetzt werden. Für solche Regime reicht die gegenwärtige Sicherheit des HTML- und Paged-Stacks nach den eigenen Projektquellen noch nicht aus [@mdeditcitations2026]. Das Urteil fällt daher bewusst konditional aus: hoch anschlussfähig für datenbasierte Standardworkflows, eingeschränkt für juristisch oder vorlagentechnisch stark normierte Spezialfälle.

### 5.4 Layout-, Satz- und Exportstabilität

Im Kriterium Layout und Export befindet sich mdedit.io in einer starken, aber nicht universellen Position. Scientific-Preset, Seitenansicht und PDF- sowie DOCX-Export erlauben eine frühe Kontrolle von Umbrüchen, Tabellen, Abbildungen und Verzeichnissen [@mdeditreadme2026]. Für die vorliegende Referenzdatei ist bewusst kein lokaler `layout`-Block gesetzt; damit wird geprüft, wie tragfähig bereits der globale wissenschaftliche Preset-Pfad ist.

Der methodische Vorteil dieser Entscheidung liegt darin, dass kein institutionsspezifischer Spezialfall verdeckt wird. Wenn das Dokument unter dem globalen Scientific-Preset stabil bleibt, spricht das für eine robuste Basistauglichkeit. Wenn Sonderfälle erst mit lokalen Layout-Overrides auflösbar sind, müssen sie als profilgebundene Zusatzanforderungen ausgewiesen werden und dürfen nicht als allgemeine Thesis-Tauglichkeit missverstanden werden.

### 5.5 Review-, Betreuungs- und Kollaborationsfähigkeit

Für eine reale Masterarbeit reicht technische Satzfähigkeit allein nicht aus; ebenso wichtig ist die Anschlussfähigkeit an Betreuung. Hier bleibt Word durch Track Changes, kommentierbare DOCX-Workflows und institutionelle Routine stark [@microsoftword2026]. mdedit.io setzt stattdessen auf browserbasiertes Teilen, direkte Verfügbarkeit und Multi-Export [@mdeditreadme2026]. Das ist für digitale Betreuungsszenarien plausibel, aber nicht voll äquivalent zu etablierten Word-Markup-Routinen.

Die Bewertung lautet deshalb nicht, mdedit.io sei generell besser als Word, sondern dass es unter anderen Betreuungsbedingungen tragfähig ist. Sobald Betreuende zwingend .docx-Kommentarworkflows erwarten, muss der Exportpfad Teil des methodischen Arbeitsplans werden. Unter dieser Bedingung ist mdedit.io kompatibel; ohne sie kann es zu sozial-organisatorischen und nicht zu technischen Brüchen kommen.

### 5.6 Ausschlusskriterien und Grenzfälle {#sec:ausschluss}

Aus der Analyse ergeben sich klare Grenzfälle, in denen mdedit.io gegenwärtig nicht als primäre Umgebung empfohlen werden sollte: erstens bei strikt vorgeschriebenen Word-Schablonen mit fragiler Formatsemantik, zweitens bei juristischen note-style-Zitierregimen und drittens bei Projekten, die semantisch reichhaltige Cross-References und automatische Referenzobjekte zwingend voraussetzen [@mdeditcitations2026; @mdeditplan2026].

Umgekehrt ist mdedit.io besonders geeignet für textzentrierte, argumentativ strukturierte und exportorientierte Arbeiten in Geistes-, Sozial-, Wirtschafts- und Teilen der Informatik- oder Lebenswissenschaften, sofern die formale Zielarchitektur mit autor-jahr- oder numerischen Zitationen sowie einem kontrollierten PDF- oder DOCX-Pfad kompatibel ist.

Tabelle 4: Zusammenfassende Bewertung von mdedit.io im Anforderungsraster.

::: table{layout=compact}
| Bewertungsdimension | Urteil | Begründung |
| --- | --- | --- |
| Strukturtransparenz | hoch | Outline, Rohtext-Lesbarkeit und geringer Formatballast stabilisieren die Schreibphase |
| Quellenapparat | mittel bis hoch | stark für datenbasierte Standardworkflows, eingeschränkt bei note-style und Speziallogiken |
| Layout und Export | hoch | frühe Seitenkontrolle und Multi-Export, aber Sonderfälle bleiben profilabhängig |
| Review und Betreuung | mittel | stark bei Teilen und Browserzugang, eingeschränkt gegenüber institutionellen Word-Routinen |
| Governance und Betrieb | hoch | Self-Hosting, Lizenzklarheit und portable Dokumentbasis sprechen für institutionelle Tragfähigkeit |
:::

### 5.7 Belastungsprobe an anspruchsvollen Hochschulprofilen

Um die Basistauglichkeit nicht nur generisch zu behaupten, wird mdedit.io gegen drei anspruchsvolle Hochschulprofile gespiegelt. Diese Profile stehen exemplarisch für juristische, informatische und lebenswissenschaftliche Randbedingungen und markieren damit unterschiedliche Belastungspunkte des Systems.

#### 5.7.1 University of Oxford, Law

Das Oxford-Law-Profil ist der fachlich strengste Kandidat für juristische Arbeiten. OSCOLA ist explizit für die präzise Zitation von Rechtsprechung, Gesetzgebung und juristischen Sekundärquellen konzipiert und wird von der Oxford Law Faculty herausgegeben [@oscola2026]. Schon die offizielle Quick-Reference zeigt, dass sich das Regime deutlich von klassischen Autor-Jahr-Systemen unterscheidet: Fälle, Gesetze, Kommentare, Aufsätze und Reports folgen unterschiedlichen, formal stark normierten Mustern [@oscola2026].

Für mdedit.io folgt daraus: Das Scientific-Preset eignet sich für Grundtypografie, Randruhe und Tabellenlayout, aber ein echtes Oxford-Law-Profil bräuchte zusätzlich note-style-Fußnoten, juristische Kurzformen, saubere Quellenabkürzungen und einen legal-spezifischen Exportpfad. Genau deshalb markiert Oxford Law kein generisches Erfolgsszenario, sondern ein bewusstes Ausschluss- oder Entwicklungsprofil.

#### 5.7.2 ETH Zurich, Computer Science

Das ETH-Profil ist für Informatik besonders interessant, weil die offizielle D-INFK-Memo die Masterarbeit als eigenständige wissenschaftliche Forschung oder konstruktive Entwicklungsarbeit mit schriftlichem Bericht und mündlicher Präsentation definiert [@eththesismemo2025]. Die Memo benennt zudem klare Rahmenbedingungen wie die 28-wöchige Vollzeitdauer und die verpflichtende elektronische Einreichung eines PDF inklusive unterschriebener Eigenständigkeitserklärung bis spätestens 23:59 Uhr am Enddatum [@eththesismemo2025].

Für mdedit.io ist dieses Profil vergleichsweise gut anschlussfähig. Es verlangt weniger exotische Zitationslogik als Oxford Law, dafür aber einen stabilen wissenschaftlichen Produktionsablauf mit Titelblatt, Abstract, Declaration, Inhaltsverzeichnis, Abbildungs- und Tabellenlogik, Codeanhängen und belastbarer PDF-Abgabe. Als Belastungsprobe zeigt ETH damit ein realistisches Hochanspruchsprofil, das mit einem wissenschaftlich disziplinierten Markdown-Workflow grundsätzlich erreichbar ist.

#### 5.7.3 Imperial College London, Medicine and Life Sciences

Das Imperial-Profil repräsentiert einen natur- und lebenswissenschaftlichen Kontext mit numerischer Zitation. Die offizielle Vancouver-Guidance beschreibt ein nummeriertes Zitiersystem, in dem Verweise im Text numerisch erscheinen und die Referenzliste am Ende in numerischer Reihenfolge geführt wird; nicht zitierte, aber konsultierte Quellen können optional als alphabetische Bibliografie separat erscheinen [@imperialvancouver2026]. Für längere Zitate wird zudem ein eigener eingerückter Absatz gefordert [@imperialvancouver2026].

Technisch ist dies das am leichtesten produktivisierbare Profil für mdedit.io. Vancouver lässt sich über Citeproc und CSL gut auf ein Scientific-Preset aufsetzen. Ein Imperial-nahes Profil wäre damit kein Spezialexperiment, sondern ein realistischer Zielzustand für numerische, exportorientierte und figuresensible Abschlussarbeiten.

### 5.8 Gestaltungsimplikationen für institutionelle Profile

Aus der Belastungsprobe ergibt sich, dass sich Hochschulprofile seltener in der eigentlichen Seitengeometrie unterscheiden als in Zitation, Pflichtsektionen, Validierungsregeln und Exportanforderungen. Genau daraus folgt eine konkrete Gestaltungsimplikation für mdedit.io: Institutionelle Thesis-Profile sollten nicht primär als hart verdrahtete Layout-Sonderfälle modelliert werden, sondern als auf dem Scientific-Preset aufsetzende Profilpakete [@mdeditplan2026].

Ein belastbares Modell wäre fünfstufig:

1. `base=scientific`: Das globale Scientific-Preset bleibt die typografische Grundschicht für alle wissenschaftlichen Profile.
2. Zitationspaket: CSL, Zitiermodus, Bibliografie-Regeln und optional note-style-Exportlogik werden pro Profil gebündelt.
3. Metadatenpaket: Titelblattfelder, Eigenständigkeitserklärung, Abstract-Sprachen, Appendix-Regeln und Pflichtsektionen werden als Profilvorgaben geliefert.
4. Validierungspaket: Ein Profil prüft, ob etwa OSCOLA-Fußnoten, Vancouver-Nummern, ETH-Declaration oder fakultätsspezifische Abschnittsreihenfolgen erfüllt sind.
5. Distributionspaket: Profile werden als herunterladbare Manifeste oder kleine Pakete ausgeliefert, damit Hochschulen, Lehrstühle oder Communities sie versionieren und teilen können.

Ein mögliches Manifest könnte konzeptionell so aussehen:

```yaml
id: ethz-dinfk-masterthesis
base: scientific
citationStyle: author-date
bibliographyMode: reference-list
requiredSections:
  - title-page
  - abstract
  - declaration-of-originality
  - references
validators:
  - declaration-required
  - figures-and-tables-numbered
  - bibliography-present
exports:
  pdf: required
  docx: optional
```

Der entscheidende Punkt ist dabei: Nicht jedes Profil braucht ein eigenes Dokument-Layout. Viele Institutionen unterscheiden sich stärker in Zitation, Frontmatter, Pflichtsektionen und Validierung als in der eigentlichen Seitengeometrie. Genau deshalb ist die vorliegende Referenzdatei absichtlich layout-block-frei und eignet sich als Basisszenario für ein späteres institutionelles Profilsystem.

### 5.9 Gründe gegen mdedit.io als Werkzeug der Wahl für die eigene Masterthesis

Auch nach einer wohlwollenden kriteriologischen Bewertung bleibt eine lange Liste legitimer Gründe, mdedit.io gerade nicht als primäres Werkzeug für die eigene Masterthesis zu wählen. Die wichtigsten Gegenargumente lauten:

1. Die Hochschule schreibt eine starre Word-Vorlage vor, die nicht nur formal, sondern technisch bindend ist.
2. Die Betreuung arbeitet verbindlich mit `Track Changes`, Kommentarspalten und reviewerbezogenen DOCX-Routinen, sodass ein nachgelagerter Export nicht nur bequem, sondern zentral für den Prozess ist [@microsoftword2026].
3. Das Zitationsregime verlangt echte note-style-Fußnoten, juristische Kurzformen oder OSCOLA-ähnliche Nachweise, die im gegenwärtigen mdedit-Stack nicht hinreichend abgesichert sind [@oscola2026; @mdeditcitations2026].
4. Die Arbeit benötigt semantisch reiche Cross-References zwischen Abbildungen, Tabellen, Formeln, Listings und Anhängen, die nicht auf manuelle Querverweise reduziert werden sollen [@mdeditcitations2026].
5. Das Fach verlangt typografische Tiefenkontrolle, spezielle LaTeX-Pakete oder mathematische Satzqualität, die über einen Markdown-Pandoc-Pfad hinausgeht [@latexproject2026].
6. Die wissenschaftliche Infrastruktur des Lehrstuhls basiert bereits stabil auf Overleaf, LaTeX-Klassen oder institutionell gepflegten Templates, sodass ein Werkzeugwechsel mehr Risiko als Erkenntnisgewinn erzeugen würde.
7. Das Projekt ist stark code-, listing- oder tabellenlastig und verlangt ein semantisch reiches, technisch ausgereiftes Publishing-System statt eines strukturorientierten Zwischensystems.
8. Die Autorin oder der Autor möchte während des gesamten Schreibprozesses maximale Sichtformatierung und unmittelbare WYSIWYG-Kontrolle statt einer Markdown-zentrierten Produktionslogik.
9. Die Betreuungs- oder Prüfungsumgebung ist organisatorisch konservativ und bewertet ungewohnte Exportpfade skeptisch, selbst wenn das Ergebnis formal korrekt ist.
10. Es steht keine verlässliche Self-Hosting- oder Betriebsumgebung zur Verfügung, sodass Datenschutz, Verfügbarkeit oder Langzeitstabilität nicht institutionell kontrolliert werden können [@mdeditreadme2026].
11. Der Arbeitsprozess soll bewusst ohne KI-Nähe, ohne Browser-Artefakte und ohne editorische Mehrsystemlogik gehalten werden.
12. Das Projekt ist gegenüber Exportdrift oder Preview-Diskrepanzen extrem risikosensibel und will ausschließlich auf maximal etablierte, langjährig erprobte Abschlussarbeits-Workflows setzen.
13. Die eigene Schreibpraxis ist bereits tief in Zotero-Word- oder TeX-Bibliografie-Workflows integriert, sodass mdedit keinen realen Produktivitätsvorteil mehr bietet.
14. Die Stabilisierungsarbeit am wissenschaftlichen Sonderfall würde mehr Zeit kosten als die Thesis selbst an Erkenntnisgewinn bringt.

Aus dieser Liste folgt kein generelles Urteil gegen mdedit.io. Sie zeigt jedoch, dass die Entscheidung für oder gegen ein Werkzeug der Wahl immer als Passungsentscheidung zwischen Fachkultur, Prüfungslogik, Betreuungspraxis und individueller Arbeitsweise gelesen werden muss.

## 6. Governance, Rechte und Betriebsfähigkeit

### 6.1 Lizenzierung und Rechte

Nach der Projektdokumentation ist der Quellcode von mdedit.io unter Apache License 2.0 lizenziert; ausgenommen sind gesondert gekennzeichnete Brand-Assets und Markenbestandteile [@mdeditreadme2026]. Das ist für wissenschaftliche Nutzung relevant, weil es Transparenz über die rechtliche Basis schafft und die Anwendung nicht als proprietäre Black Box behandelt werden muss. Für Hochschulen, Arbeitsgruppen oder Einzelpersonen, die auf nachvollziehbare und selbst betreibbare Werkzeuge Wert legen, ist dies ein substantieller Vorteil.

### 6.2 Nutzungszugang und praktische Nutzbarkeit

Die Nutzbarkeit von mdedit.io ergibt sich vor allem aus vier Faktoren: browserbasierter Zugang, keine verpflichtende Kontoanlage, private Dokumente per Session-Modell und eine Funktionsoberfläche, die sich stark am Schreibprozess orientiert [@mdeditreadme2026]. Gerade für Studierende ist dies relevant, weil der Einstieg ohne lokale Desktop-Installation möglich ist und der Arbeitskontext zwischen verschiedenen Geräten leichter beweglich wird.

### 6.3 Verfügbarkeit und Betrieb

mdedit.io ist als selbst gehostete Webanwendung dokumentiert. Die README beschreibt sowohl einen Docker-basierten Standardpfad als auch einen direkten Node.js-Start für lokale Entwicklung [@mdeditreadme2026]. Zudem werden Browser-Abhängigkeiten lokal gebündelt, sodass der aktive Laufzeitpfad nicht auf externe Browser-CDNs angewiesen ist [@mdeditreadme2026]. Diese Verfügbarkeitslogik ist für datensensible oder institutionell kontrollierte Umgebungen von Bedeutung, weil Betrieb, Update und Datenhaltung nicht zwangsläufig in fremde SaaS-Infrastrukturen ausgelagert werden müssen.

## 7. Diskussion

Die Arbeit beantwortet die Forschungsfrage differenziert. Ein browserbasierter Markdown-Editor kann als primäre Produktionsumgebung für wissenschaftliche Abschlussarbeiten dienen, wenn das Anforderungsprofil der Arbeit durch strukturorientiertes Schreiben, datenbasierte Zitation, kontrollierten Multi-Export und digital anschlussfähige Betreuung gekennzeichnet ist. Unter diesen Bedingungen ist mdedit.io nicht nur ein bequemes Schreibwerkzeug, sondern ein tragfähiges wissenschaftliches Artefakt.

Der wissenschaftliche Beitrag der Arbeit liegt weniger in der Behauptung universeller Überlegenheit als in einem expliziten Bewertungsmodell. Die übliche Debatte über Word, LaTeX und Markdown wird oft normativ oder identitär geführt; die vorliegende Untersuchung übersetzt sie in prüfbare Kriterien und zeigt, dass die Eignung eines Werkzeugs von der Kopplung zwischen Dokumenttyp, Zitationsregime, Betreuungspraxis und Exportarchitektur abhängt. In dieser Perspektive erscheint mdedit.io nicht als vollständiger Ersatz, wohl aber als belastbare Lösung für ein klar umrissenes Segment wissenschaftlicher Abschlussarbeiten.

Die Ergebnisse bleiben gleichwohl begrenzt. Es wurde keine Nutzerstudie, kein Zeitvergleich realer Schreibprozesse und kein breit angelegter Template-Benchmark mit institutionellen Vorlagen durchgeführt. Die Befunde sind daher als analytische Eignungsprüfung und nicht als empirischer Wirksamkeitsnachweis zu lesen. Genau daraus ergibt sich der nächste Forschungsschritt: kontrollierte Fallstudien, Exportparitätstests und institutionelle Profilpakete auf Basis realer Abgabeanforderungen.

## 8. Fazit

Die Forschungsfrage kann wie folgt beantwortet werden: mdedit.io kann dann als primäre Produktionsumgebung für wissenschaftliche Abschlussarbeiten dienen, wenn die Arbeit ein strukturorientiertes, datenbasiertes und exportkontrolliertes Authoring erfordert und keine zwingenden note-style- oder Template-Sonderfälle vorliegen. Unter diesen Bedingungen ist ein browserbasierter Markdown-Workflow methodisch vertretbar, technisch belastbar und institutionell anschlussfähig.

Markdown erweist sich dabei nicht als pauschaler Ersatz für Word oder LaTeX, sondern als eigenständige Produktionslogik für wissenschaftliche Langtexte [@gruber2004markdown; @commonmark2026; @pandoc2025]. Word bleibt dort stark, wo institutionelle Review-Routinen dominieren; LaTeX bleibt dort überlegen, wo typografische und referenztechnische Tiefenkontrolle entscheidend ist. mdedit.io besetzt die Zone dazwischen: stark in Strukturtransparenz, heading-basierter Tree-Navigation, KI-gestützter Dokumentarbeit, frontmatter- und citeproc-basierter Bibliografieintegration, früher Layoutkontrolle und kontrolliertem Multi-Export, begrenzt bei stark normierten Sonderfällen [@mdeditreadme2026; @mdedithelp2026; @mdeditserver2026; @mdeditcitations2026].

Der Mehrwert der Arbeit liegt deshalb in einer begründeten Entscheidungshilfe. Sie zeigt nicht nur, dass mdedit.io für bestimmte Masterarbeiten tragfähig ist, sondern auch, unter welchen Bedingungen dies nicht gilt. Gerade diese konditionale Antwort ist für wissenschaftliche Praxis wertvoller als ein pauschales Ja oder Nein.

#refs

<div class="page-break"></div>
<div class="chapter-marker"></div>

## Anhang A. Reproduzierbares Referenzartefakt zur Layout- und Funktionsprüfung

Der folgende Anhang ist kein dekorativer Zusatz, sondern Teil des Untersuchungsdesigns. Er bündelt jene Elemente, die im wissenschaftlichen Exportpfad typischerweise fehleranfällig sind, und dient damit als reproduzierbares Prüfartefakt der Arbeit.

### A.1 Abbildungsprobe

![Abbildung 1: Neutrales Bildartefakt für Caption-, Listen- und Printtests](/static/brand/mdedit-logo.png)

### A.2 Wissenschaftliche Tabelle

Tabelle 5: Kriterienset für die Endprüfung einer wissenschaftlichen Arbeit in mdedit.io.

::: table{layout=scientific}
| Kriterium | Erwartung | Zweck |
| --- | --- | --- |
| Kapitelstruktur | Vollständig und logisch | Argumentationsführung prüfen |
| Zitation | Konsistent und datenbasiert | Quellenintegrität sichern |
| Export | PDF und DOCX kontrolliert | Abgabe- und Reviewpfade absichern |
| Layout | Seiten, Tabellen, Bilder stabil | Formale Belastbarkeit prüfen |
:::

### A.3 Kompakte Tabelle

Tabelle 6: Typische Aufgaben vor der Abgabe.

::: table{layout=compact}
| Aufgabe | Status |
| --- | --- |
| Forschungsfrage schärfen | offen |
| Literaturverzeichnis prüfen | offen |
| PDF-Endkontrolle durchführen | offen |
| DOCX für Betreuung exportieren | optional |
:::

### A.4 Mathematik- und Anmerkungsprobe

Die Formel $E = mc^2$ dient als Inline-Test. Für einen Blocktest eignet sich folgende Darstellung:

$$
\int_0^\infty e^{-x^2} \, dx = \frac{\sqrt{\pi}}{2}
$$

Zusätzlich bleibt eine Anmerkung als Satz- und Exportprobe erhalten. Die Anmerkung prüft, ob Lauftext und Zusatzhinweis in der Ausgabe stabil lesbar bleiben.

### A.5 Mehrspaltenprobe

Wissenschaftliche Haupttexte brauchen selten Spalten; Anhänge und Sonderseiten können jedoch von einem zweispaltigen Layout profitieren. Die Referenzdatei enthält deshalb hier einen echten Spaltenblock mit bewusstem Spaltenwechsel.

<!-- columns:2 gap:18pt rule:true -->
Die linke Spalte prüft, ob längerer Fließtext in einem wissenschaftlichen Dokument stabil in ein zweispaltiges Layout überführt wird, ohne dass Abstände, Absatztrennung oder Wortumbrüche kollabieren. Gleichzeitig bleibt der Text bewusst sachlich genug, um als realistische Anhangs- oder Beiblattprobe zu fungieren.

<!-- column-break -->

Die rechte Spalte prüft denselben Pfad nach einem expliziten Spaltenwechsel. Damit lässt sich im Preview und im PDF unterscheiden, ob automatische Verteilung und manuell gesetzte Spaltenumbrüche gleichermaßen stabil funktionieren. Für Thesis-Workflows ist das vor allem bei Anhängen, Listen oder verdichteten Zusatzinformationen relevant.

<!-- /columns -->

### A.6 Unicode-, Querverweis- und Listingprobe

Die neuen semantischen Querverweise verknüpfen Abschnitte direkt im Text. Wie in [@sec:methodik] beschrieben, folgt die Analyse einer kriteriengeleiteten Artefaktprüfung. Die Forschungsfrage aus [@sec:forschungsfrage] wurde in [@sec:bewertungslogik] operationalisiert; die Grenzen des Untersuchungsfalls sind in [@sec:grenzen] und [@sec:ausschluss] dokumentiert. Diese `[@sec:...]`-Syntax ist ein Merkmal von SPR-03: Der Editor löst die Referenzen im Preview zu verlinkten Abschnittsnummern auf; Pandoc übernimmt sie beim Export über den `header_attributes`-Reader nativ.

Die deutsche Typografieprobe enthält absichtlich echtes Unicode: für, äußere, Einführung, „deutsche Anführungszeichen“, Gedankenstrich – und § 1 Abs. 2. Damit lässt sich prüfen, ob Kopierbarkeit, Suchbarkeit und Zeichendarstellung im Export stabil bleiben.

Listing 1: Beispielhafte Profilkonfiguration für ein institutionelles Thesis-Paket.

```yaml
id: example-masterthesis
base: scientific
citationStyle: author-date
requiredSections:
  - abstract
  - references
```

Zusätzlich dient eine lange URL als Umbruchprobe im Lauftext:
https://example.org/ein/sehr/langer/pfad/mit/vielen/segmenten/und-parametern?alpha=123&beta=456&gamma=789

### A.7 Abbildungs- und Tabellen-Querverweise (SPR-04)

Dieser Abschnitt prüft die neuen semantischen Objekt-IDs und Querverweise auf Abbildungen und Tabellen. Die Architekturübersicht in [@fig:architektur] zeigt den Exportpfad; die Werkzeuggegenüberstellung ist in [@tbl:werkzeuge] dokumentiert.

<!-- img: #fig:architektur align=center width=80% frame -->
![Exportpfad von Markdown zu PDF und DOCX über den mdedit-Konverter](/static/brand/mdedit-logo.png)

<!-- tbl: #tbl:werkzeuge -->
Tabelle 7: Werkzeuggegenüberstellung für den wissenschaftlichen Exportpfad (Querverweistest).

| Werkzeug | Pfad | Funktion |
| --- | --- | --- |
| Pandoc | Markdown → DOCX | Dokumentstruktur und Zitation |
| Chromium | Paged HTML → PDF | Drucknahe Seitengeometrie |
| citeproc | BibTeX → Bibliografie | Quellenauflösung nach CSL |