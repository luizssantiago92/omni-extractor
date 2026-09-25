# Omni Extractor

<p align="center">
  <img src="extension/icons/mascot.png" alt="Omni, the beetle-robot captain of Omni Extractor" width="260" />
</p>

<p align="center">
  <strong>Turn any web list into a clean dataset — right from Chrome's side panel.</strong><br />
  <em>Pick it. Extract it. Ship it.</em>
</p>

<p align="center">
  <a href="#1-install"><strong>Install →</strong></a>
  ·
  <a href="#3-run-your-first-extraction">First extraction</a>
  ·
  <a href="#how-it-works">How it works</a>
  ·
  <a href="https://github.com/luizssantiago92/omni-extractor">GitHub</a>
</p>

[![Chrome MV3](https://img.shields.io/badge/chrome-manifest%20v3-f5b301?style=flat)](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
[![Version](https://img.shields.io/badge/version-0.9.10-2fbf71?style=flat)](extension/manifest.json)
[![Local-first](https://img.shields.io/badge/data-local--first-19a974?style=flat)](#local-first--your-data-stays-with-you)

**Side-panel data extractor** for Chrome (Manifest V3).

Copying rows out of product grids, search results, or directories by hand is slow and error-prone, and most scrapers want a script, a cloud account, or both. Omni Extractor lives in the side panel next to the page you're browsing: point at the list, choose how to walk it, and get a dataset you can review and export as CSV. No account and no server; everything stays in your browser.

Omni reads the page. **You decide what gets extracted and where it goes.**

| Without Omni Extractor | With Omni Extractor |
| --- | --- |
| Copy-paste row by row into a spreadsheet | Pick the list once; every item becomes a row |
| "Load more" and pagination break manual copying | Full page and Pages modes keep loading or walk to the next page |
| Scripts and selectors for every site | Visual picking with Blocks; no code |
| Data sent to a third-party cloud | Datasets stored locally in the Ship until you export |
| Guessing what a tool expects next | Omni, the mascot, gives tips for the step you're on |

[What it is](#what-it-is) · [Install](#1-install) · [Verify](#2-verify-it-loaded) · [First extraction](#3-run-your-first-extraction) · [Checklist](#getting-started-checklist) · [How it works](#how-it-works) · [What you get](#what-you-get--and-why-it-helps) · [Interface map](#interface-map) · [Project layout](#project-layout) · [Development](#development)

---

## What it is

A **Chrome extension for structured page extraction**. It is not a hosted scraping service, a crawler farm, or a browser automation framework.

The side panel is organized into three areas:

**Extractors** (pick a tool and a mode) → **Ship** (the cargo hold where datasets live) → **Cloud** (optional sync, coming later)

You choose what to extract. The content script reads the page you're on, and results are saved in the browser's local storage.

---

## 1. Install

You need **Google Chrome** (or another Chromium browser that supports Manifest V3 side panels).

```text
1. Clone or download this repository
2. Open chrome://extensions
3. Turn on Developer mode (top-right toggle)
4. Click "Load unpacked" and select the extension/ folder
5. Pin Omni Extractor from the puzzle-piece menu
```

| Step | What it does |
| --- | --- |
| **Developer mode** | Allows loading an extension from a local folder |
| **Load unpacked** | Installs `extension/` directly; edits apply after a reload |
| **Pin** | Keeps the Omni icon in the toolbar; click it to open the side panel |

---

## 2. Verify it loaded

You're ready when:

- Omni Extractor appears in `chrome://extensions` with no errors
- Clicking the toolbar icon opens the side panel beside the current tab
- The header shows the mascot plus the **Account**, **Notifications**, and **Settings** icons
- The nav shows **Extractors**, **Ship**, and **Cloud**

If the panel doesn't react on a page that was open before installing, refresh that tab so the content script is injected.

---

## 3. Run your first extraction

Open a page with a list (search results, a product grid, a table) and:

| Step | You do | Omni does |
| --- | --- | --- |
| 1 | Open **Extractors** → **List Extractor** | Shows the four modes, with **Blocks** selected by default |
| 2 | Tap **Select**, then click one or more list regions on the page | Highlights candidate blocks; tap **Select** again to cancel |
| 3 | Tap **Done** | Locks the selection and shows **Start extraction** |
| 4 | Tap **Start extraction** | Extracts every item into a dataset |
| 5 | Open **Ship** | Lists your datasets; open the full table and **export CSV** |

In **Filter**, **Full page**, and **Pages**, there's nothing to pick. The Select button shows a **Ready** hint, and you go straight to **Start extraction**.

---

## Getting started checklist

- [ ] Loaded `extension/` via **Load unpacked** in `chrome://extensions`
- [ ] Pinned Omni Extractor and opened the side panel
- [ ] Ran one extraction in **Blocks** mode
- [ ] Opened the dataset in **Ship** and exported a CSV
- [ ] Clicked the mascot for a tip when unsure what to do next

---

## How it works

One tool, four ways to read a list. You pick the mode, and Omni handles the page:

```text
Pick           →  Extract            →  Store             →  Export
Extractors        content script        Ship (local)         CSV
(tool + mode)     (reads the page)      (datasets, sets)     (data table)
```

| Mode | Use it when | What happens |
| --- | --- | --- |
| **Blocks** (default) | You want exactly the regions you point at | Select → click list blocks → Done → extract |
| **Full page** | The list grows with "load more" or infinite scroll | Detects the main list and keeps loading as the page grows |
| **Pages** | Results are split across numbered pages | Walks pagination (optionally pick the Next button) and saves each page into a collection |
| **Filter** | You only want items whose titles match some terms | Keeps items matching words or letters; separate terms with `;` |

**Focus** spotlights the selected blocks on the page so you can confirm the selection before extracting.

---

## What you get — and why it helps

### Visual picking — no selectors

**Without it:** every site means inspecting the DOM and writing selectors.

**With Blocks:** click the regions you care about. Omni groups repeated items into rows, and **Select** toggles to cancel if you change your mind.

### Local-first — your data stays with you

Datasets and collections are saved in browser storage inside the **Ship** (the cargo hold). Nothing leaves your machine until you export. No account is required to extract.

### A guide that follows you

Omni, the beetle-robot captain, types short tips in a speech bubble next to the header:

- up to three tips at a time, then the bubble steps aside (its space stays reserved, so the layout never shifts)
- click the mascot for another tip
- tips follow what you're doing: Extractors, each List Extractor mode, Ship, or Cloud

### A stable, game-style HUD

A cyberpunk-style HUD skin (chamfered panels, corner brackets, scanlines, mono type) on a green-and-gold brand palette. Header menus open under their own icon, above the content, and close when you click the icon again, click outside, or press Escape. **Start extraction**, **Ship**, and **Cloud** in the footer appear only once there's something to extract.

---

## Interface map

| Area | Where | What it's for |
| --- | --- | --- |
| **Account** | Header, left of Notifications | Placeholder; Google sign-in in Chrome is planned |
| **Notifications** | Header | Product notices; mark as read or clear |
| **Settings** | Header | Panel preferences |
| **Extractors** | Nav tab | Choose a tool (List Extractor) and its mode |
| **Ship** | Nav tab / footer | Cargo hold for datasets and collections; open the table and export CSV |
| **Cloud** | Nav tab / footer | Optional sync and remote dataset tools (coming later, paid plan) |
| **Mascot** | Header | Click for context-aware tips |

---

## Project layout

```text
extension/
  manifest.json          # MV3 extension manifest
  background.js          # Service worker (side panel + table opener)
  sidepanel/             # Side panel UI
    index.html           #   structure (header, nav, views, footer)
    styles.css           #   base visual system
    skin-cyber.css       #   cyberpunk HUD skin layered on top
    app.js               #   state, modes, tips, menus
  content/               # Page content script (picker + extract)
  data/                  # Full data table + CSV export
  icons/                 # Logo, mascot, tip art, wallpapers
  assets/fonts/          # Self-hosted UI fonts
```

---

## Development

| Intent | How |
| --- | --- |
| Iterate on the side panel | Edit `extension/sidepanel/*`, then close and reopen the panel |
| Change the content script | Reload the extension in `chrome://extensions` **and** refresh the target tab |
| Preview the panel in a browser | `python -m http.server 8765 --directory extension`, then open `http://localhost:8765/sidepanel/index.html` (UI only; extension APIs aren't available there) |
| Syntax-check scripts | `node --check extension/sidepanel/app.js` |

Conventions:

- UI copy is **English**; keep labels consistent across surfaces (Extractors / Ship / Cloud)
- The UI structure is fixed: new states must not shift the layout
- Mascot anatomy is locked; see `extension/icons/MASCOT_BIBLE.md` before adding art
- Change governance lives in `.retornatus/` ([Retornatus](https://github.com/luizssantiago92/retornatus)); agent skills live in `.cursor/skills/` and `.agents/skills/`
- Work on `cursor/*` branches and open a PR to `master`; never push to `master` directly

---

## Roadmap

- **Account**: Google sign-in in Chrome
- **Cloud**: optional sync and remote dataset tools
- More extractors beyond lists
- MIT license at the first stable release

---

## Credits

Brand, mascot, and product design by the Omni Extractor team. Governance workflow by [Retornatus](https://github.com/luizssantiago92/retornatus).

## License

The project is in its early releases and no license has been published yet. It will be released under the **MIT** license once it reaches a stable version.
