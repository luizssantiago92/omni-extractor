# Omni Extractor

**Omni Extractor** is a Chrome extension (Manifest V3) that helps you pull structured data out of web pages — starting with lists — from a polished side panel that stays beside the page you’re browsing.

Think of it as a small extraction companion: pick what matters on the page, run an extraction, review the dataset, and export when you’re ready.

## What it does

- **List Extractor** — capture list-like content from the current tab
- **Modes**
  - **Blocks** (default) — tap **Select**, click one or more list regions on the page, then **Done** to lock the selection and extract. Tap **Select** again while picking to cancel.
  - **Full page** — detect the main list and keep loading more as the page grows
  - **Pages** — walk pagination (optional Next button pick) and save each page into a collection
  - **Filter** — keep items whose titles match words or letters (separate terms with `;`)
  - In Filter, Full page, and Pages no page picking is needed: the Select button turns into a **Ready** hint pointing to **Start extraction**
- **Focus** — spotlight the selected blocks on the page
- **Data** — review saved datasets/collections and open a full table view
- **Export** — CSV from the data table
- **Local-first** — datasets stay in your browser storage; no account required to extract

## Brand & UI

- Side panel with space-themed atmosphere and a beetle-robot mascot captain
- **Mascot tips** — a speech bubble types out tips next to the mascot:
  - shows up to 3 tips, then hides and leaves its reserved space empty (the layout never shifts)
  - click the mascot for another tip
  - tips follow what you're doing: Home, List Extractor mode (Blocks, Filter, Full page, Pages), Data, or Cloud
- **Header menus** — Notifications and Settings open under their own icon, over the page content, without moving other elements
- Cinematic wallpapers cycle in the ambient background (hologram, arrival, voyage, bridge)
- Mascot palette: indigo shell · cyan eyes · gold **O** · amber core. Character reference: `extension/icons/MASCOT_BIBLE.md`

## Load unpacked (Chrome)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select the `extension/` folder in this repository
4. Open Omni Extractor from the toolbar (pin it for quick access) to use the side panel

## Project layout

```text
extension/
  manifest.json          # MV3 extension manifest
  background.js          # Service worker (side panel + table opener)
  sidepanel/             # Side panel UI (HTML / CSS / JS)
  content/               # Page content script (picker + extract)
  data/                  # Full data table + CSV export
  icons/                 # Logos, tip art, wallpapers
  assets/fonts/          # Self-hosted UI fonts
```

## Development notes

- UI copy is English; keep product surfaces consistent
- Prefer loading the unpacked `extension/` folder while iterating
- After changing the content script, reload the extension and refresh the target tab
- Change governance lives in `.retornatus/` (Retornatus); agent skills live in `.cursor/skills/` and `.agents/skills/`

## Repository

https://github.com/luizssantiago92/omni-extractor
