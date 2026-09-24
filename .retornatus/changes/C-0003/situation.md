<!-- retornatus-meta
{
  "change_id": "C-0003",
  "schema_version": 1
}
-->

# Situation

## Demand

Four list-extraction paradigms

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

- Demand stated: Four list-extraction paradigms
- Repo: architecture: AGENTS.md
- Repo: Retornatus already initialized
- Local “Load unpacked” first; Chrome Web Store later when owner decides.
- Build **by layers** — V1 ships with **List Extractor only**; add tools one by one.
- Own UI (do not clone Ultimate’s chrome). Ultimate docs = **source of truth for behavior** when informal descriptions differ.
- Match or beat Ultimate behavior; freer local exports; improve where it makes sense.
- **Free:** local extraction, local datasets, table UI, local download/export (CSV / Excel / JSON / images / text, etc.).
- **Paid later:** cloud save / cloud dataset workspace (details TBD); billable **AI agents / AI credits**.
- Proposed WHAT: Replace load-more triad with 4 paradigms: (1) block select default (2) all items currently on page (3) page + load-more expansion (4) pagination with page limit or all, one dataset per page saved as a collection.
- DONE criterion: UI exposes 4 paradigms; block is default; whole-page extracts all loaded matching items; load-more auto-discovers and expands; pagination respects page count/all and writes one dataset per page plus a collection

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

## Reopened Situation

UX redesign: paradigm first, merge page+load-more, multi-block in Blocks mode.

## Reopened Situation

UX polish + i18n English-only.

## Reopened Situation

User: filter by nintendo-like keywords on lists.
