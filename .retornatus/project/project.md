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
3. **Instant preview:** immediately extract **currently visible** items and open **Data Table** (new tab) so the user validates the selection.
4. Choose **how to load more** (full tool only — not Quick List).
5. Optional **speed profile:** Slow / Normal / **Fast** (default).
6. **Start extraction** → **progress overlay** with live item count; rows **stream** into Data Table; **Stop** keeps partial results; no row/page cap locally.
7. **Completion screen** (side panel): “Extraction complete”, large **N ITEMS EXTRACTED**, thumbnail strip of captured images, primary CTA **View data & export CSV**, Done + bookmark.
8. Clean in Data Table → **Export** (also Download Images / Include Images on the table toolbar).

### Completion + Data Table (owner screenshots, romsfun 13 items)
- Side panel end-state is a summary, not only a toast — big count + image mosaic + jump to Data.
- Data Table: dataset named from page title; meta `#N`, Lists tag, date, row count; search; Download Images; Include Images; columns e.g. IMAGES, URL, DESCRIPTION, numeric fields (sometimes auto-named from DOM classes like INLINE-FLEX).

Important distinction (docs vs informal “só o que aparece”):
- **Visible-only grab** = Quick List *or* the instant preview step — not one of the three load-more cards.
- The **three load-more methods** are how a *full run* grows beyond the first paint:

| Method | Behavior | Stops when |
| --- | --- | --- |
| **Auto-Scroll** (default) | Scrolls page/container for infinite scroll; extracts as items appear | Bottom / no new items |
| **Pagination** | User picks Next once; extract → click Next → wait → repeat | No valid Next |
| **Load More** | User picks same-page “Load more” / similar; click repeatedly | Clicks add nothing new |

Pagination is **click-based** (no URL pattern generation). Load More is same-page button (labels vary by language/site).

### What gets captured (automatic)
Per item: visible text (deduped), absolute links, images (incl. lazy + CSS backgrounds + video posters), ARIA labels (e.g. ratings).  
Columns **auto-typed** (text, link, image, number, price, date, rating, time) and **auto-named**. Cannot pre-pick fields — extract all, trim in Data Table.

### Data / export (Ultimate)
- Local browser storage; Data Table tab with edit/clean/search.
- Export: CSV, Excel, JSON, Google Sheets, clipboard (+ Shopify CSV when relevant). Search filter applies before export.
- Ultimate gates some export volume/formats behind paid plans — **Omni: keep local exports free**.

### Ultimate limitations (respect or document)
- Items must be direct children of one container; ≥3 similar items for smart detection.
- No shadow DOM / cross-origin iframe.
- LinkedIn blocked.
- Instant preview = visible only; full run + load-more gets the rest.

---

## Omni V1 — List Extractor product stance

### Ship in V1
- Side panel shell (Omni brand UI) with **List Extractor** only in the tools menu.
- Select list (hover count + highlight) → instant preview into **Data**.
- Three load-more modes: Auto-Scroll / Pagination / Load More.
- Start → progress UI (live count; Stop keeps partial) + open **Data** (window or tab — TBD).
- Dataset stored locally; Export free: at least CSV + images-related download + text/JSON as we harden.
- Nav placeholders: **Data** (functional) + **Cloud** (visible, paid later / stub).

### Improve vs Ultimate (candidates)
- All core local export formats free (no Pro wall).
- Clearer Portuguese-friendly UX / multi-language “Load more” button heuristics.
- Naming: dataset-centric mental model (“seus datasets”).
- Skip cloning Rate Us / Roadmap chrome; cleaner first-run.
- Stronger empty/error states when detection fails (docs troubleshooting → in-product tips).

### Defer
- Recipes, Cloud runs, speed-profile deep tuning UI (can start with Fast defaults), full Ultimate tool grid.

### Still open / owner follow-ups
- Data surface: **window vs tab** (Ultimate uses dedicated Data Table window/tab).
- Final product name for Data nav if not “Data”.
- Optional: mid-run progress overlay screenshot (completion state already captured).

## Research status
- List Extractor docs + screenshots through completion (Extraction complete + Data Table) captured.
- Next: implementation plan + Retornatus Change for List Extractor V1 when owner says go.
