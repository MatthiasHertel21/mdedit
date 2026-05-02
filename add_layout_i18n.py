#!/usr/bin/env python3
"""
Script to add data-i18n attributes to layout modal content
"""

mappings = [
    # Page Tab - Headings and Labels
    ('<h3>Seiteneinstellungen</h3>', '<h3 data-i18n="layoutPageSettings">Seiteneinstellungen</h3>'),
    ('<label>Papierformat</label>', '<label data-i18n="layoutPaperFormat">Papierformat</label>'),
    ('<label>Orientierung</label>', '<label data-i18n="layoutOrientation">Orientierung</label>'),
    ('<option value="portrait">Hochformat</option>', '<option value="portrait" data-i18n="layoutPortrait">Hochformat</option>'),
    ('<option value="landscape">Querformat</option>', '<option value="landscape" data-i18n="layoutLandscape">Querformat</option>'),
    ('<h4>Seitenränder</h4>', '<h4 data-i18n="layoutMargins">Seitenränder</h4>'),
    ('                  <label>Oben</label>', '                  <label data-i18n="layoutMarginTop">Oben</label>'),
    ('                  <label>Rechts</label>', '                  <label data-i18n="layoutMarginRight">Rechts</label>'),
    ('                  <label>Unten</label>', '                  <label data-i18n="layoutMarginBottom">Unten</label>'),
    ('                  <label>Links</label>', '                  <label data-i18n="layoutMarginLeft">Links</label>'),
    ('<label>Erste Seite oben</label>', '<label data-i18n="layoutMarginFirstTop">Erste Seite oben</label>'),
    ('<h4>Erweitert</h4>', '<h4 data-i18n="layoutAdvanced">Erweitert</h4>'),
    ('                  Spiegelränder (für Buchdruck)', '                  <span data-i18n="layoutMirrorMargins">Spiegelränder (für Buchdruck)</span>'),
    ('<label>Binderand</label>', '<label data-i18n="layoutBindingOffset">Binderand</label>'),
    ('<h4>Globale Spalten</h4>', '<h4 data-i18n="layoutGlobalColumns">Globale Spalten</h4>'),
    ('                  Mehrspalten-Layout aktivieren', '                  <span data-i18n="layoutColumnsEnable">Mehrspalten-Layout aktivieren</span>'),
    ('<label>Anzahl Spalten</label>', '<label data-i18n="layoutColumnsCount">Anzahl Spalten</label>'),
    ('<label>Spaltenabstand</label>', '<label data-i18n="layoutColumnsGap">Spaltenabstand</label>'),
    ('                  Trennlinie zwischen Spalten', '                  <span data-i18n="layoutColumnsRule">Trennlinie zwischen Spalten</span>'),
    
    # Title Page Tab
    ('<h3>Titelseite</h3>', '<h3 data-i18n="layoutTitlePage">Titelseite</h3>'),
    ('                Titelseite erstellen', '                <span data-i18n="layoutTitlePageCreate">Titelseite erstellen</span>'),
    ('              <label>Titel</label>', '              <label data-i18n="layoutTitle">Titel</label>'),
    ('              <label>Untertitel</label>', '              <label data-i18n="layoutSubtitle">Untertitel</label>'),
    ('              <label>Autor</label>', '              <label data-i18n="layoutAuthor">Autor</label>'),
    ('              <label>Datum</label>', '              <label data-i18n="layoutDate">Datum</label>'),
    ('              <label>Institution</label>', '              <label data-i18n="layoutInstitution">Institution</label>'),
    ('                Seitenumbruch nach Titelseite', '                <span data-i18n="layoutTitlePageBreak">Seitenumbruch nach Titelseite</span>'),
    ('placeholder="Dokumenttitel"', 'placeholder="Dokumenttitel" data-i18n-placeholder="layoutPlaceholderTitle"'),
    ('placeholder="Untertitel (optional)"', 'placeholder="Untertitel (optional)" data-i18n-placeholder="layoutPlaceholderSubtitle"'),
    ('placeholder="Autor Name"', 'placeholder="Autor Name" data-i18n-placeholder="layoutPlaceholderAuthor"'),
    ('placeholder="{today} oder manuell"', 'placeholder="{today} oder manuell" data-i18n-placeholder="layoutPlaceholderDate"'),
    ('placeholder="Organisation (optional)"', 'placeholder="Organisation (optional)" data-i18n-placeholder="layoutPlaceholderInstitution"'),
    
    # Indexes Tab
    ('<h3>Verzeichnisse & Nummerierung</h3>', '<h3 data-i18n="layoutIndexesNumbering">Verzeichnisse & Nummerierung</h3>'),
    ('<h4>Inhaltsverzeichnis</h4>', '<h4 data-i18n="layoutTOC">Inhaltsverzeichnis</h4>'),
    ('                  Inhaltsverzeichnis erstellen', '                  <span data-i18n="layoutTOCCreate">Inhaltsverzeichnis erstellen</span>'),
    ('              <label>Tiefe (H1-H...)</label>', '              <label data-i18n="layoutTOCDepth">Tiefe (H1-H...)</label>'),
    ('                  Seitenumbruch nach Verzeichnis', '                  <span data-i18n="layoutTOCPageBreak">Seitenumbruch nach Verzeichnis</span>'),
    ('<h4>Abbildungsverzeichnis</h4>', '<h4 data-i18n="layoutLOF">Abbildungsverzeichnis</h4>'),
    ('                  Abbildungsverzeichnis erstellen', '                  <span data-i18n="layoutLOFCreate">Abbildungsverzeichnis erstellen</span>'),
    ('<h4>Tabellenverzeichnis</h4>', '<h4 data-i18n="layoutLOT">Tabellenverzeichnis</h4>'),
    ('                  Tabellenverzeichnis erstellen', '                  <span data-i18n="layoutLOTCreate">Tabellenverzeichnis erstellen</span>'),
    ('<h4>Nummerierung</h4>', '<h4 data-i18n="layoutNumbering">Nummerierung</h4>'),
    ('                  Automatische Nummerierung aktivieren', '                  <span data-i18n="layoutNumberingEnable">Automatische Nummerierung aktivieren</span>'),
    ('                  Pro Kapitel (H1) zurücksetzen', '                  <span data-i18n="layoutNumberingReset">Pro Kapitel (H1) zurücksetzen</span>'),
    ('<h5>Überschriften</h5>', '<h5 data-i18n="layoutHeadings">Überschriften</h5>'),
    ('                  Überschriften nummerieren', '                  <span data-i18n="layoutHeadingNumbering">Überschriften nummerieren</span>'),
    ('                  <label>Tiefe</label>', '                  <label data-i18n="layoutHeadingDepth">Tiefe</label>'),
    ('                  <label>Präfix für H1</label>', '                  <label data-i18n="layoutHeadingPrefix">Präfix für H1</label>'),
    
    # Headers/Footers Tab
    ('<h3>Kopf- und Fußzeilen</h3>', '<h3 data-i18n="layoutHeaderFooter">Kopf- und Fußzeilen</h3>'),
    ('<h4>Kopfzeile</h4>', '<h4 data-i18n="layoutHeader">Kopfzeile</h4>'),
    ('                  Kopfzeile aktivieren', '                  <span data-i18n="layoutHeaderEnable">Kopfzeile aktivieren</span>'),
    ('                  <label>Schriftgröße</label>', '                  <label data-i18n="layoutFontSize">Schriftgröße</label>'),
    ('                  <label>Farbe</label>', '                  <label data-i18n="layoutColor">Farbe</label>'),
    ('                  Auf erster Seite ausblenden', '                  <span data-i18n="layoutHeaderHideFirst">Auf erster Seite ausblenden</span>'),
    ('<h4>Fußzeile</h4>', '<h4 data-i18n="layoutFooter">Fußzeile</h4>'),
    ('                  Fußzeile aktivieren', '                  <span data-i18n="layoutFooterEnable">Fußzeile aktivieren</span>'),
    ('placeholder="Text oder {doc-title}"', 'placeholder="Text oder {doc-title}" data-i18n-placeholder="layoutPlaceholderHeaderLeft"'),
    ('placeholder="{section}"', 'placeholder="{section}" data-i18n-placeholder="layoutPlaceholderHeaderRight"'),
    ('placeholder="{page} / {pages}"', 'placeholder="{page} / {pages}" data-i18n-placeholder="layoutPlaceholderFooterCenter"'),
    ('<strong>Verfügbare Platzhalter:</strong>', '<strong data-i18n="layoutPlaceholders">Verfügbare Platzhalter:</strong>'),
    
    # Typography Tab
    ('<h3>Typografie</h3>', '<h3 data-i18n="layoutTypography">Typografie</h3>'),
    ('<h4>Fließtext</h4>', '<h4 data-i18n="layoutBodyText">Fließtext</h4>'),
    ('<label>Schriftfamilie</label>', '<label data-i18n="layoutFontFamily">Schriftfamilie</label>'),
    ('                  <label>Zeilenhöhe</label>', '                  <label data-i18n="layoutLineHeight">Zeilenhöhe</label>'),
    ('<label>Textausrichtung</label>', '<label data-i18n="layoutTextAlign">Textausrichtung</label>'),
    ('<option value="left">Linksbündig</option>', '<option value="left" data-i18n="layoutAlignLeft">Linksbündig</option>'),
    ('<option value="justify">Blocksatz</option>', '<option value="justify" data-i18n="layoutAlignJustify">Blocksatz</option>'),
    ('<option value="center">Zentriert</option>', '<option value="center" data-i18n="layoutAlignCenter">Zentriert</option>'),
    ('<option value="right">Rechtsbündig</option>', '<option value="right" data-i18n="layoutAlignRight">Rechtsbündig</option>'),
    ('                  Silbentrennung', '                  <span data-i18n="layoutHyphenation">Silbentrennung</span>'),
    ('                  <label>Absatzeinzug (erste Zeile)</label>', '                  <label data-i18n="layoutParagraphIndent">Absatzeinzug (erste Zeile)</label>'),
    ('                  <label>Absatzabstand</label>', '                  <label data-i18n="layoutParagraphSpacing">Absatzabstand</label>'),
    ('<h4>Code</h4>', '<h4 data-i18n="layoutCode">Code</h4>'),
    ('                  <label>Inline-Code</label>', '                  <label data-i18n="layoutInlineCode">Inline-Code</label>'),
    ('                  <label>Code-Block</label>', '                  <label data-i18n="layoutCodeBlock">Code-Block</label>'),
    ('                  <label>Zeilenhöhe Block</label>', '                  <label data-i18n="layoutCodeLineHeight">Zeilenhöhe Block</label>'),
    ('<h4>Links & Zitate</h4>', '<h4 data-i18n="layoutLinksQuotes">Links & Zitate</h4>'),
    ('                  <label>Link-Farbe</label>', '                  <label data-i18n="layoutLinkColor">Link-Farbe</label>'),
    ('                    URLs im Druck anzeigen', '                    <span data-i18n="layoutShowUrls">URLs im Druck anzeigen</span>'),
    ('<label>Blockquote Textfarbe</label>', '<label data-i18n="layoutBlockquoteColor">Blockquote Textfarbe</label>'),
    
    # Tables Tab
    ('<h3>Tabellenlayouts</h3>', '<h3 data-i18n="layoutTableLayouts">Tabellenlayouts</h3>'),
    ('<i class="fa-solid fa-plus"></i> Neues Layout', '<i class="fa-solid fa-plus"></i> <span data-i18n="layoutTableNew">Neues Layout</span>'),
    ('<i class="fa-solid fa-trash"></i> Löschen', '<i class="fa-solid fa-trash"></i> <span data-i18n="layoutTableDelete">Löschen</span>'),
    ('<strong>Layout zuweisen:</strong>', '<strong data-i18n="layoutTableAssign">Layout zuweisen:</strong>'),
    
    # Images Tab
    ('<h3>Bilder & Abbildungen</h3>', '<h3 data-i18n="layoutImages">Bilder & Abbildungen</h3>'),
    ('<label>Maximale Breite</label>', '<label data-i18n="layoutImageMaxWidth">Maximale Breite</label>'),
    ('<label>Ausrichtung</label>', '<label data-i18n="layoutImageAlign">Ausrichtung</label>'),
    ('              <label>Abstand oben</label>', '              <label data-i18n="layoutImageMarginTop">Abstand oben</label>'),
    ('              <label>Abstand unten</label>', '              <label data-i18n="layoutImageMarginBottom">Abstand unten</label>'),
    ('<h4>Bildunterschriften</h4>', '<h4 data-i18n="layoutImageCaptions">Bildunterschriften</h4>'),
    ('                Bildunterschriften aktivieren', '                <span data-i18n="layoutImageCaptionsEnable">Bildunterschriften aktivieren</span>'),
    ('              <label>Position</label>', '              <label data-i18n="layoutImageCaptionPosition">Position</label>'),
    ('<option value="top">Oben</option>', '<option value="top" data-i18n="layoutImageCaptionTop">Oben</option>'),
    ('<option value="bottom">Unten</option>', '<option value="bottom" data-i18n="layoutImageCaptionBottom">Unten</option>'),
    ('                  Kursiv', '                  <span data-i18n="layoutImageCaptionItalic">Kursiv</span>'),
    
    # Spacing Tab
    ('<h3>Abstände & Listen</h3>', '<h3 data-i18n="layoutSpacingLists">Abstände & Listen</h3>'),
    ('<h4>Elementabstände</h4>', '<h4 data-i18n="layoutSpacingElements">Elementabstände</h4>'),
    ('                  <label>Absatz</label>', '                  <label data-i18n="layoutSpacingParagraph">Absatz</label>'),
    ('                  <label>Liste</label>', '                  <label data-i18n="layoutSpacingList">Liste</label>'),
    ('                  <label>Blockquote</label>', '                  <label data-i18n="layoutSpacingBlockquote">Blockquote</label>'),
    ('                  <label>Code-Block</label>', '                  <label data-i18n="layoutSpacingCode">Code-Block</label>'),
    ('                  <label>Horizontale Linie</label>', '                  <label data-i18n="layoutSpacingHR">Horizontale Linie</label>'),
    ('                  <label>Formel</label>', '                  <label data-i18n="layoutSpacingFormula">Formel</label>'),
    ('<h4>Listen</h4>', '<h4 data-i18n="layoutLists">Listen</h4>'),
    ('<label>Listeneinzug</label>', '<label data-i18n="layoutListIndent">Listeneinzug</label>'),
    ('                  <label>Aufzählungszeichen</label>', '                  <label data-i18n="layoutListMarker">Aufzählungszeichen</label>'),
    ('<option value="•">• Punkt</option>', '<option value="•" data-i18n="layoutListMarkerDot">• Punkt</option>'),
    ('<option value="-">- Minus</option>', '<option value="-" data-i18n="layoutListMarkerMinus">- Minus</option>'),
    ('<option value="*">* Stern</option>', '<option value="*" data-i18n="layoutListMarkerStar">* Stern</option>'),
    ('<option value="›">› Pfeil</option>', '<option value="›" data-i18n="layoutListMarkerArrow">› Pfeil</option>'),
    ('                  <label>Nummerierung Stil</label>', '                  <label data-i18n="layoutListNumberStyle">Nummerierung Stil</label>'),
    ('<option value="decimal">1, 2, 3...</option>', '<option value="decimal" data-i18n="layoutListDecimal">1, 2, 3...</option>'),
    ('<option value="lower-alpha">a, b, c...</option>', '<option value="lower-alpha" data-i18n="layoutListLowerAlpha">a, b, c...</option>'),
    ('<option value="upper-alpha">A, B, C...</option>', '<option value="upper-alpha" data-i18n="layoutListUpperAlpha">A, B, C...</option>'),
    ('<option value="lower-roman">i, ii, iii...</option>', '<option value="lower-roman" data-i18n="layoutListLowerRoman">i, ii, iii...</option>'),
    ('<option value="upper-roman">I, II, III...</option>', '<option value="upper-roman" data-i18n="layoutListUpperRoman">I, II, III...</option>'),
]

# Read the file
with open('/home/ga/md/public/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Apply replacements
for old, new in mappings:
    content = content.replace(old, new)

# Write back
with open('/home/ga/md/public/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"✓ Applied {len(mappings)} i18n attribute mappings to index.html")
