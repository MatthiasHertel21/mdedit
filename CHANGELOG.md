# Changelog

All notable changes to mdedit.io are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) — versions follow [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added
- `/demo` vanity routes for academic paper showcase
- Direct download URLs for shared pastes (`/:id/raw`, `/:id/pdf`, `/:id/docx`)
- Link-copy buttons in share menu
- Sample PDF output linked from README

### Fixed
- List spacing and hanging indent in Paged.js output
- Page-break before chapter 1 in scientific layout
- Title page footer suppression
- Code block styling in paged styledHTML and live preview
- Footnote `break-inside`, backlink removal, superscript styling
- TOC "Inhaltsverzeichnis" heading localisation
- `pagedjs-margin-content` pseudo-element leaking into PDF output
- `div.sourceCode` and `.footnotes` break rules in Paged.js polisher
- Fastify v5 redirect signature for `/demo` routes

---

## [0.2.2] — 2026-05-10

### Added
- Citation authoring UI with BibTeX / CSL support
- Bibliography panel in mobile menu
- Block placeholders as tooltip chips
- Layout block placeholder
- Reference demo documents: master thesis (scientific), book (literature), quickread (compact)
- Demo loader in welcome screen
- Localized citation UI across all supported languages

### Fixed
- Scientific PDF export: `@page` strip, column breaks, math rendering, layout CSS
- Duplicate page numbers, lof/lot typography, orphan placeholder text
- Title page numbering and index page numbering
- Missing `previewCitationLoading` DOM element and i18n key
- AI chat provider fallback hardening
- Mobile topbar controls overflow

---

## [0.2.1] — 2026-05-04

### Added
- First-run intro/tips screen redesign
- SEO metadata and sitemap improvements
- Crawler session bypass for public entry pages

### Fixed
- Mobile header layout
- UTF-8 HTML content types
- Stats page mobile overflow

---

## [0.2.0] — 2026-05-03

Initial public release.

### Features
- Markdown editor with live preview and outline/tree navigation
- Structured PDF export via Paged.js + Chromium (title page, TOC, page numbers)
- DOCX export via Pandoc
- Layout presets: scientific, literature, compact
- Mermaid diagram rendering
- KaTeX math rendering
- BibTeX / CSL citation support
- AI assistance (bring your own key: OpenAI, Anthropic, Google, Mistral, Groq)
- Real-time collaboration via shared permalinks
- Session-based storage, no account required
- Self-hostable with Docker, Apache 2.0 license
- Localised UI: de, en, es, fr, it, nl, pl, ru, tr, zh
