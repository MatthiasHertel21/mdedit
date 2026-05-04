# Contributing

Thanks for contributing to mdedit.io.

This repository contains the self-hosted web application, not a publishable npm package. Contributions are welcome across product feedback, bug reports, docs, tests, and focused code changes.

## Before You Open An Issue

- use the issue forms in `.github/ISSUE_TEMPLATE/`
- include reproduction steps for bugs
- include screenshots, logs, or browser details when they matter
- check the docs index in `docs/README.md` for deployment and usage questions
- check `docs/operations/SECURITY.md` before proposing or reviewing security-related changes

## Before You Open A Pull Request

- keep the change focused on one problem
- explain the user-visible impact and any tradeoffs
- mention related issues or prior discussion when available
- avoid unrelated refactors in the same PR

For larger changes, open an issue first so the approach can be aligned before implementation.

## Local Development

Recommended path:

```bash
docker compose up -d
```

The app is then available at `http://localhost:3210`.

Alternative local start:

```bash
npm install
npm run dev
```

## Useful Checks

Run the release gate before public-facing or higher-risk changes:

```bash
npm run release:check
```

Other useful checks:

```bash
npm run i18n:validate
npm run audit:prod
docker compose exec -T md-tree env CHROMIUM_BIN=/usr/bin/chromium node scripts/visual-smoke.js
```

## Areas Where Good Reports Help Most

- editor and preview mismatches
- print layout and export regressions
- sharing and collaboration flows
- i18n and help text issues
- deployment and runtime problems in Docker or behind reverse proxies

## Style Expectations

- keep changes small and reviewable
- update docs when behavior, deployment, or public positioning changes
- prefer evidence from the current codebase over stale notes
- preserve existing product behavior unless the change explicitly targets it

If a change affects onboarding, deployment, or public trust signals, update `README.md`, `docs/README.md`, or `docs/operations/SECURITY.md` in the same PR.

## Licensing of Contributions

By contributing to this project, you agree that your contributions are licensed under the Apache License 2.0.