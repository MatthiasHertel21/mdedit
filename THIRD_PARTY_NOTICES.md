# Third-Party Notices

Stand: 2026-05-04

Diese Datei dokumentiert die im Projekt explizit verwendeten Drittanbieter-Komponenten auf Basis von:

- `package.json`
- `package-lock.json`
- installierten `node_modules`-Metadaten
- direkt eingebundenen Browser-Assets und lokal vendorten Frontend-Abhaengigkeiten
- `Dockerfile`
- offiziellen Projektseiten fuer nicht-npm-Komponenten, soweit eindeutig verifizierbar

Hinweise:

- Wenn eine Lizenz nicht belastbar aus Projektmetadaten oder offizieller Quelle ermittelt werden konnte, ist sie als `UNKNOWN - needs review` markiert.
- `package-lock.json` wurde als Quelle fuer aufgeloeste Versionen im npm-Produktionsbaum geprueft. Der aktuelle Produktionsbaum umfasst 227 Eintraege. Diese Datei dokumentiert vor allem direkte, explizit geladene oder fuer Distribution relevante Komponenten statt jede transitive Hilfsbibliothek einzeln zu duplizieren.
- Diese Datei ist eine technische Bestandsaufnahme und keine Rechtsberatung.

## Direct npm Dependencies

| Component | Version | License | Source | Project usage | Scope |
|---|---|---|---|---|---|
| `fastify` | `5.8.5` | `MIT` | `https://fastify.dev/` | HTTP server and routing for the application backend | server runtime |
| `@fastify/cookie` | `11.0.2` | `MIT` | `https://github.com/fastify/fastify-cookie#readme` | Cookie parsing and session cookie handling | server runtime |
| `@fastify/helmet` | `13.0.2` | `MIT` | `https://github.com/fastify/fastify-helmet#readme` | Security headers and CSP integration | server runtime |
| `@fastify/rate-limit` | `10.3.0` | `MIT` | `https://github.com/fastify/fastify-rate-limit#readme` | Request throttling for API protection | server runtime |
| `@fastify/static` | `9.1.3` | `MIT` | `https://github.com/fastify/fastify-static` | Serving files from `public/` | server runtime |
| `@fastify/websocket` | `11.2.0` | `MIT` | `https://github.com/fastify/fastify-websocket#readme` | Collaboration and presence websocket endpoints | server runtime |
| `@google/generative-ai` | `0.24.1` | `Apache-2.0` | `https://github.com/google/generative-ai-js#readme` | Gemini provider client for AI-assisted features | server runtime / optional integration |
| `bcryptjs` | `3.0.3` | `BSD-3-Clause` | `https://github.com/dcodeIO/bcrypt.js.git` | Password hashing and verification for protected collaboration flows | server runtime |
| `better-sqlite3` | `9.6.0` | `MIT` | `http://github.com/WiseLibs/better-sqlite3` | SQLite persistence for documents, sessions and related data | server runtime |
| `puppeteer-core` | `24.37.3` | `Apache-2.0` | `https://github.com/puppeteer/puppeteer/tree/main/packages/puppeteer-core` | Chromium control for server-side rendering/export and smoke automation | server runtime / development |
| `pixelmatch` | `5.3.0` | `ISC` | `https://github.com/mapbox/pixelmatch#readme` | Visual diffing in the smoke test script | development |
| `pngjs` | `7.0.0` | `MIT` | `https://github.com/lukeapage/pngjs` | PNG parsing in visual smoke tests | development |

## Explicit Client-Side Components

The browser runtime now loads its explicit third-party dependencies from self-hosted assets under `public/vendor/` and `public/vendor/npm/`. References to public CDNs still exist inside vendored upstream documentation, examples and source maps, but no longer belong to the app's active browser runtime path.

| Component | Version | License | Source | Project usage | Scope |
|---|---|---|---|---|---|
| `CodeMirror` | `5.65.16` | `MIT` | `https://codemirror.net/5/` | In-browser Markdown editor, syntax mode, hints and fold gutter | client runtime |
| `markdown-it` | `14.1.0` | `MIT` | `https://github.com/markdown-it/markdown-it#readme` | Core Markdown parsing and rendering | client runtime |
| `markdown-it-task-lists` | `2.1.1` | `ISC` | `https://github.com/revin/markdown-it-task-lists#readme` | GitHub-style task list rendering | client runtime |
| `markdown-it-multimd-table` | `4.2.3` | `MIT` | `https://github.com/redbug312/markdown-it-multimd-table#readme` | Extended table support | client runtime |
| `markdown-it-footnote` | `3.0.3` | `MIT` | `https://github.com/markdown-it/markdown-it-footnote#readme` | Footnote syntax support | client runtime |
| `markdown-it-deflist` | `2.1.0` | `MIT` | `https://github.com/markdown-it/markdown-it-deflist#readme` | Definition list syntax support | client runtime |
| `markdown-it-container` | `3.0.0` | `MIT` | `https://github.com/markdown-it/markdown-it-container#readme` | Custom container blocks for layout and structure | client runtime |
| `markdown-it-katex` | `2.0.3` | `MIT` | `https://github.com/waylonflinn/markdown-it-katex#readme` | KaTeX-backed math rendering integration | client runtime |
| `KaTeX` | `0.16.9` | `MIT` | `https://katex.org` | Math CSS, fonts and formula presentation via self-hosted vendor files | client runtime |
| `highlight.js` | `11.11.1` | `BSD-3-Clause` | `https://github.com/highlightjs/highlight.js` | Syntax highlighting in the Markdown preview via self-hosted vendor files | client runtime |
| `mermaid` | `11.4.0` | `MIT` | `https://github.com/mermaid-js/mermaid#readme` | Diagram rendering in the main app | client runtime |
| `markmap-view` | `0.18.9` | `MIT` | `https://github.com/markmap/markmap/packages/markmap-view#readme` | Outline tree visualization | client runtime |
| `markdown-it-emoji` | `3.0.0` | `MIT` | `https://github.com/markdown-it/markdown-it-emoji#readme` | Emoji shortcode support | client runtime |
| `markdown-it-sub` | `2.0.0` | `MIT` | `https://github.com/markdown-it/markdown-it-sub#readme` | Subscript syntax support | client runtime |
| `markdown-it-sup` | `2.0.0` | `MIT` | `https://github.com/markdown-it/markdown-it-sup#readme` | Superscript syntax support | client runtime |
| `markdown-it-mark` | `3.0.1` | `MIT` | `https://github.com/markdown-it/markdown-it-mark#readme` | Highlight/mark syntax support | client runtime |
| `markdown-it-abbr` | `1.0.4` | `MIT` | `https://github.com/markdown-it/markdown-it-abbr` | Abbreviation syntax support | client runtime |
| `markdown-it-anchor` | `8.6.7` | `Unlicense` | `https://github.com/valeriangalliat/markdown-it-anchor#readme` | Heading anchors and permalink preparation | client runtime |
| `markdown-it-toc-done-right` | `4.2.0` | `MIT` | `https://github.com/nagaozen/markdown-it-toc-done-right#readme` | Table-of-contents generation | client runtime |
| `markdown-it-attrs` | `4.1.6` | `MIT` | `https://github.com/arve0/markdown-it-attrs` | Attribute syntax support on Markdown nodes | client runtime |
| `JSZip` | `3.10.1` | `(MIT OR GPL-3.0-or-later)` | `https://github.com/Stuk/jszip#readme` | ZIP export support via self-hosted browser asset | client runtime / review required |
| `js-yaml` | `4.1.0` | `MIT` | `https://github.com/nodeca/js-yaml#readme` | Parsing and serializing layout blocks in YAML-like syntax via self-hosted vendor file | client runtime |
| `Paged.js` | `0.4.3` | `MIT` | `https://pagedmedia.org` | Browser print preview and paged layout rendering via self-hosted vendor file | client runtime |
| `Font Awesome Free` | `6.5.1` | `(CC-BY-4.0 AND OFL-1.1 AND MIT)` | `https://fontawesome.com` | UI icons in the application shell via self-hosted CSS and webfonts | client runtime / review required |
| `PDF.js` | `3.11.174` | `Apache-2.0` | `https://mozilla.github.io/pdf.js/` | PDF rasterization and analysis inside the visual smoke test harness via self-hosted vendor files | development |

## Removed Remote Font Runtime Dependencies

| Component | Version | License | Source | Project usage | Scope |
|---|---|---|---|---|---|
| Main UI sans-serif stack | `system fonts` | `n/a` | local OS fonts | Replaces former Google Fonts dependency in the app shell | client runtime |
| Help/export sans-serif stack | `system fonts` | `n/a` | local OS fonts | Replaces former Google Fonts dependency in help and server-generated export HTML | client runtime / server-generated export |

## Container and System Components

| Component | Version | License | Source | Project usage | Scope |
|---|---|---|---|---|---|
| `node:20-slim` Docker base image | `20-slim` | `UNKNOWN - needs review` | `https://hub.docker.com/_/node` | Base runtime image for containerized deployment | build-time / runtime |
| `Chromium` | `UNKNOWN - apt package version not pinned` | `BSD` | `https://www.chromium.org/Home/` | Browser engine for PDF rendering and smoke automation | server runtime / development / review notices |
| `Pandoc` | `UNKNOWN - apt package version not pinned` | `GPL` | `https://pandoc.org/` | DOCX export and PDF/export conversion paths | server runtime / review required |
| `wkhtmltopdf` | `UNKNOWN - apt package version not pinned` | `LGPLv3` | `https://wkhtmltopdf.org/` | Alternate HTML-to-PDF export path | server runtime / review required |
| `TeX Live stack` (`texlive-latex-base`, `texlive-latex-recommended`, `texlive-latex-extra`, `texlive-xetex`, `texlive-fonts-recommended`) | `UNKNOWN - apt package versions not pinned` | `UNKNOWN - needs review` | `https://www.tug.org/texlive/` | LaTeX-backed PDF generation in Pandoc flows | server runtime / review required |
| `lmodern`, `fonts-dejavu`, `fonts-liberation`, `fonts-noto`, `fonts-noto-cjk` | `UNKNOWN - apt package versions not pinned` | `UNKNOWN - needs review` | `https://packages.debian.org/` | Font availability for export and rendering in containerized environments | server runtime / review required |
| `librsvg2-bin` | `UNKNOWN - apt package version not pinned` | `UNKNOWN - needs review` | `https://packages.debian.org/` | SVG rasterization/conversion support during export paths | server runtime / review required |
| `poppler-utils` | `UNKNOWN - apt package version not pinned` | `UNKNOWN - needs review` | `https://packages.debian.org/` | PDF page conversion utilities used by visual smoke tests | development / review required |

## NOTICE Files Observed

| Component | Version | License | Source | Project usage | Scope |
|---|---|---|---|---|---|
| `bare-path` | `3.0.0` | `Apache-2.0` | `https://github.com/holepunchto/bare-path#readme` | Transitive npm dependency in the resolved production tree; package contains a `NOTICE` file | transitive production dependency |

At review time, no additional standalone `NOTICE` files were observed among the directly declared npm dependencies. The discovered `bare-path` notice should be re-checked if any part of that package is ever vendored or redistributed outside normal npm consumption.

## package-lock Review Summary

- `package.json` defines separate runtime `dependencies` and browser/vendoring-oriented `devDependencies`.
- The lockfile was used to confirm concrete resolved versions for direct npm dependencies and the vendored browser packages mirrored into `public/vendor/`.
- No exhaustive per-transitive reproduction is included here, because that would mostly duplicate lockfile data without adding reliable component-specific usage descriptions.

## Apache 2.0 Compatibility Review Summary

Appears broadly compatible with an Apache-2.0-licensed project from a package-license perspective:

- `Apache-2.0`, `MIT`, `BSD-3-Clause`, `ISC`, `Unlicense`

Review required because of copyleft, multi-license, attribution-heavy, asset-specific or unresolved cases:

- `JSZip` because npm metadata advertises `(MIT OR GPL-3.0-or-later)`
- `Font Awesome Free` because the package mixes `CC-BY-4.0`, `OFL-1.1` and `MIT`
- `Pandoc` because the official site states `GPL`
- `wkhtmltopdf` because the official site states `LGPLv3`
- `Chromium` because BSD redistribution typically carries notice obligations
- Debian/apt packages and the Docker base image where license data was not exhaustively verified from package metadata

Praktische Einordnung:

- Der ueberwiegende Teil der direkt eingebundenen JavaScript-Bibliotheken ist permissiv lizenziert.
- Die groessten Pruefpunkte liegen im Export-Stack, bei Mehrfachlizenzen wie `JSZip` und `Font Awesome` sowie bei den Debian-/Container-Paketen, nicht mehr bei entfernten Browser-CDN-Lieferpfaden.
- Vor einer formalen oeffentlichen Distribution sollte insbesondere fuer `Pandoc`, `wkhtmltopdf`, `JSZip`, `Font Awesome` und die Debian-Systempakete eine abschliessende juristische bzw. release-orientierte Pruefung erfolgen.