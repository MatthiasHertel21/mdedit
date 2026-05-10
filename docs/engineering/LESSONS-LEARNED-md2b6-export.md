# Lessons Learned: md.2b6.de Export Debugging

Status: active session document
Scope: use this document before any further export fix claims in this session

## Authoritative validation path

- The user validates against md.2b6.de.
- A local audit against `http://127.0.0.1:3210` is not authoritative, even when it uses `SOURCE_BASE_URL=https://md.2b6.de`.
- Do not claim a fix from local audit score, DOM order, extracted PDF text, or local screenshots alone.
- A change is only "fixed" when it matches the user's md.2b6.de manual export result.

## Failures repeated in this session

1. I treated proxy signals as proof.
   Local audit score, DOM order, CSS inspection, and PDF text extraction were repeatedly used as if they proved the real user-visible result. They did not.

2. I validated the wrong path.
   I repeatedly checked the local export engine while the user checked md.2b6.de. That created false success reports.

3. I widened scope too early.
   Instead of isolating one defect, I changed adjacent pagination, margin, table, and math behavior while the active blocker was still unresolved.

4. I accepted regressions in exchange for one apparent improvement.
   The session repeatedly traded one visible issue for new failures in pagination, tables, or math.

5. I trusted text order over visual order.
   The columns bug showed that PDF text extraction can look correct while the rendered page is still visually wrong.

6. I changed validation criteria to recover a score.
   Any audit adjustment that makes a score look better without proving user-visible behavior is not acceptable evidence.

## Rules for the rest of this session

1. Before any new export claim, restate which path is being validated.
   Allowed wording: local proxy path, or user path on md.2b6.de.

2. Do not say "fixed", "resolved", or equivalent unless the md.2b6.de path is explicitly confirmed.

3. Work one export defect at a time.
   Current priority order only if the user agrees:
   - columns flow
   - pagination compactness
   - table word breaking
   - display math layout

4. Preserve already-good behavior.
   Unless explicitly requested, do not touch:
   - margins / Satzspiegel
   - list flow
   - code indentation

5. After every code change, perform exactly one narrow validation tied to the touched defect before touching anything else.

6. If the validation is only local, report it only as local evidence, never as user-visible success.

7. If production-path equivalence is uncertain, say so directly.

## Practical debugging checklist

- Ask first: is this the md.2b6.de path or the local proxy path?
- Check whether the exported payload is actually the paged preview or a fallback export path.
- For ordering bugs, inspect rendered page images, not only DOM or extracted text.
- For pagination changes, compare total page count and the exact affected pages.
- When a fix helps one issue but regresses another, stop and record the regression before continuing.

## Concrete reminders from this session

- `UndisplayedFilter` and inline `display` findings were real, but not sufficient proof of a user-visible fix.
- Server-side Chromium CSS overrides were repeatedly treated as solved before user confirmation.
- The columns issue demonstrated that local images can look correct while the user still sees the production path fail.
- Manual md.2b6.de export is the controlling check.
- One concrete root cause was the PDF export path itself: when scientific PDF export runs without an already rendered print preview, the frontend can fall back to raw HTML instead of serialized `.pagedjs_pages`, which bypasses server-side fixes aimed at paged output.

## Update protocol

- Append a short note here whenever a new false-positive pattern appears.
- Append a short note here whenever a regression is introduced by an attempted fix.
- Read this file before the next export-related edit or success claim in this session.