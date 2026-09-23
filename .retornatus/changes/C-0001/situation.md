<!-- retornatus-meta
{
  "change_id": "C-0001",
  "schema_version": 1
}
-->

# Situation

## Demand

Ship Omni Extractor Chrome extension UI shell for List Extractor first slice

## Project context

# Project — Omni Extractor

## Intent
Build a **Google Chrome extension** for no-code / point-and-click extraction of structured data from web pages.

## Delivery approach
- Local “Load unpacked” first; Chrome Web Store later when owner decides.
- Build **by layers** — V1 ships with **List Extractor only**; add tools one by one.
- Own UI (do not clone Ultimate’s chrome). Ultimate docs = **source of truth for behavior** when informal descriptions differ.
- Match or beat Ultimate behavior; freer local exports; improve where it makes sense.

## Monetization
- **Free:** local extraction, local datasets, table UI, local download/export (CSV / Excel / JSON / images / text, etc.).
- **Paid later:** cloud save / cloud dataset workspace (details TBD); billable **AI agents / AI credits**.

## Omni tool roadmap (order)
| # | Tool | Notes |
| --- | --- | --- |
| 1 | **List Extractor** | V1 focus |
| 2 | **Text Extractor** | Page text |
| 3 | **Image Extractor** | Page images |
| 4 | **Google Maps Extractor** | Last of the four |

## Naming (working recommendation)
| UI | Meaning |
| --- | --- |
| **Data** | Nav / surface for local stored extractions (Ultimate’s “DATA”) |
| **dataset** | One extraction result set (rows + columns) inside Data |
| **Cloud** | Paid later — remote datasets |

Alternatives considered: Coleta, Coleções. Prefer **Data** + **dataset** for clarity and bilingual familiarity; owner may rename.

---

## List Extractor — how Ultimate actually works (docs)

Source: https://ultimatewebscraper.com/docs/extension/list-extractor · quickstart · scrape-any-list guide · exporting-data

### End-to-end flow
1. Open List Extractor (or Quick List yellow cursor — Omni may skip that shortcut).
2. **Click to Select List** → page picker: hover highlights list + count (“List with N items — Smart detection”); click to confirm.
3. **Instant preview:** immediately extract **currently visible** items and open **Data Table** (new tab) so the user validates the

…(truncated)

## Repo signals (inferred)

- architecture: AGENTS.md
- Retornatus already initialized

## Known facts

- Demand stated: Ship Omni Extractor Chrome extension UI shell for List Extractor first slice
- Repo: architecture: AGENTS.md
- Repo: Retornatus already initialized
- Local “Load unpacked” first; Chrome Web Store later when owner decides.
- Build **by layers** — V1 ships with **List Extractor only**; add tools one by one.
- Own UI (do not clone Ultimate’s chrome). Ultimate docs = **source of truth for behavior** when informal descriptions differ.
- Match or beat Ultimate behavior; freer local exports; improve where it makes sense.
- **Free:** local extraction, local datasets, table UI, local download/export (CSV / Excel / JSON / images / text, etc.).
- **Paid later:** cloud save / cloud dataset workspace (details TBD); billable **AI agents / AI credits**.
- Proposed WHAT: MV3 side panel: Omni-branded home with List Extractor only; List Extractor UI steps (select list CTA, Auto-Scroll/Pagination/Load More cards, Start extraction stub); Data and Cloud nav placeholders. Out of scope: settings, notifications, info/favorite/refresh/close tool chrome, real DOM extraction, Data Table window, Cloud backend.
- DONE criterion: Extension loads unpacked in Chrome; side panel shows home and List Extractor screens; load-more mode selection works in UI; Start stays disabled until list selected (selection can be stubbed); no settings/notifications chrome; repo pushed to github.com/luizssantiago92/omni-extractor

## Constraints

- (none)

## Assumptions

- Situation placeholder used — treat as unanalyzed unless Demand is trivial

## Ambiguities

- (none)

## Missing decisions

- (none)

## Contract readiness

- Sufficient: **yes**
- Rationale: Demand, WHAT, and DONE are sufficiently clear; repo/kickoff signals incorporated; no material requirements ambiguity detected
