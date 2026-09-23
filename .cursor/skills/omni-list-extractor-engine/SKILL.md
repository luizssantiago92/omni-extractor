---
name: omni-list-extractor-engine
description: Use when implementing Omni Extractor List Extractor engine (picker, detection, load-more, datasets).
---

# Omni List Extractor engine

## Specialization

Reliable **Manifest V3** list extraction: content-script injection, smart list detection, field harvest, Auto-Scroll / Pagination / Load More, progress messaging, local datasets.

## Related work

- Change: `C-0002`
- Action: `C-0002/A-001`

## RESEARCH

### Sources

| Source | URL | Accessed | Notes |
| --- | --- | --- | --- |
| chrome.scripting | https://developer.chrome.com/docs/extensions/reference/api/scripting | 2026-09-23 | On-demand inject into active tab |
| chrome.sidePanel | https://developer.chrome.com/docs/extensions/reference/api/sidePanel | 2026-09-23 | Panel ↔ tab messaging context |
| Ultimate List Extractor docs | https://ultimatewebscraper.com/docs/extension/list-extractor | 2026-09-22 | Smart detection ≥3 peers; three load-more methods; stream to table |

### Current best practices

- Inject content script via `chrome.scripting.executeScript` when `tabs.sendMessage` fails (cold tab).
- Guard with `window.__omni…` so re-inject is idempotent **and** listeners stay attached once.
- Smart detection: walk ancestors; parent with ≥3 visible children sharing tag+class signature.
- Extract per item: texts (dedupe), absolute links, img/srcset/lazy/CSS backgrounds; derive title/price/url/image.
- Load-more: Auto-Scroll until stable counts; Pagination/Load More prefer user-picked selector, else heuristic labels (multi-language).
- Progress: `runtime.sendMessage` progress events; Stop sets a flag checked in loops.
- Persist datasets in `chrome.storage.local` (cap retention); Data page reads `activeDatasetId`.
- Block `chrome://` / extension pages with a clear user error.

### Pitfalls

- Assuming content script is always present after navigation.
- Shadow DOM / cross-origin iframes (document limitation — surface in UI).
- Infinite scroll loops without stability counters.
- Storing huge image blobs instead of URLs.

## PROCEDURE

1. Ensure content script on active http(s) tab.
2. Start list picker → highlight + count → click stores `containerPath` + `itemSignature` + preview.
3. For pagination/load-more, optional button picker → `actionSelector`.
4. Run extract with chosen mode; stream progress; allow stop.
5. Save dataset; show completion; open Data table / CSV export.
6. Harden failures with user-visible messages (no silent fail).

## Checks before claiming done

- [ ] Works after tab reload (re-inject)
- [ ] Esc cancels picker
- [ ] Stop keeps partial rows
- [ ] CSV exports UTF-8 BOM

## Evolution log

| Version | Date | Change |
| --- | --- | --- |
| 1 | 2026-09-23 | Created DRAFT |
| 2 | 2026-09-23 | Filled RESEARCH + PROCEDURE |
