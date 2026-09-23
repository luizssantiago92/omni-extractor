<!-- retornatus-meta
{
  "action_id": "C-0002/A-001",
  "change_id": "C-0002",
  "created_at": "2026-09-23T00:30:26.667302Z",
  "description": "Use when polishing Omni Extractor Chrome side-panel UI (visual system, typography, motion, buttons).",
  "id": "S-0001",
  "name": "omni-sidepanel-ui-polish",
  "relations": [
    {
      "note": null,
      "target_id": "C-0002",
      "type": "APPLIES_TO"
    },
    {
      "note": null,
      "target_id": "C-0002/A-001",
      "type": "APPLIES_TO"
    }
  ],
  "schema_version": 1,
  "source": "RESEARCHED",
  "specialization": "Professional Chrome extension side-panel UI for Omni Extractor",
  "status": "ACTIVE",
  "title": "Omni side-panel UI polish (green/gold)",
  "updated_at": "2026-09-23T00:31:41.816324Z",
  "version": 2
}
-->

# Omni side-panel UI polish (green/gold)

## Specialization

Professional Chrome MV3 **side panel** product UI for Omni Extractor: design tokens, typography, navigation, buttons, extraction stepper, completion, and Data surfaces — brand locked to **gold letter O + green tools**.

## Related work

- Change: `C-0002`
- Action: `C-0002/A-001`

## RESEARCH (agent must complete before ACTIVE)

### Research brief

Side panels are persistent companions beside the page. Chrome’s quality guidelines require complementary, low-distraction UI. Design for **narrow, variable width** (user can resize the panel). Prefer self-hosted fonts (extension CSP restricts remote assets).

### Sources

| Source | URL | Accessed | Notes |
| --- | --- | --- | --- |
| Chrome Side Panel API | https://developer.chrome.com/docs/extensions/reference/api/sidePanel | 2026-09-23 | Persistent companion; open via action; pin UX |
| Chrome UI catalog | https://developer.chrome.com/docs/extensions/develop/ui | 2026-09-23 | Side panel vs popup; single-purpose tools |
| Chrome Web Store quality guidelines | https://developer.chrome.com/docs/webstore/program-policies/quality-guidelines | 2026-09-23 | Companion UX; avoid distraction / hijack |
| Ultimate Web Scraper (reference product) | https://ultimatewebscraper.com/docs/extension | 2026-09-22 | Stepper, mode cards, completion mosaic — behavior reference, not visual clone |

### Current best practices (fill after research)

- Treat the side panel as a **dense product surface**, not a landing page: clear hierarchy (brand → nav → primary task → sticky action).
- **Fluid layout**: `width: 100%`, `container-type: inline-size`, `clamp()` for type/spacing — never hard-cap like a fixed phone mock.
- **Design tokens**: semantic colors (surface, border, text, accent-gold, accent-green), radii, elevation, motion durations — change skin by tokens only.
- **Typography**: self-host distinctive faces (e.g. Syne display + Instrument Sans UI). Avoid generic Inter/Roboto/Arial stacks for brand surfaces.
- **Buttons**: primary = solid gold gradient with press/hover/disabled; secondary = outline green/gold; mode tiles = selectable cards with icon + title + caption + selected ring.
- **Motion**: 150–220ms ease for hover/press; use `transform`/`opacity` only; respect `prefers-reduced-motion`.
- **Depth without kitsch**: 1px borders, soft inset highlights, soft ambient gradients — no neon glow spam, no purple AI aesthetic.
- **Extraction UX**: numbered stepper with connector; disabled steps visually quiet; completion = large metric + thumbnail mosaic + single primary CTA.
- **Accessibility**: visible focus rings (gold), contrast ≥ WCAG AA on dark surfaces, labels not icon-only for primary nav.

### Pitfalls / anti-patterns

- Flat gray boxes that look like a tutorial wireframe.
- Cloning Ultimate’s yellow/panda chrome.
- Remote Google Fonts without CSP/`font-src` (prefer local `assets/fonts`).
- Over-carding: every block in a bordered card — use cards only for interactive tools/modes.
- Sticky footer covering content without bottom padding on `main`.
- Tiny hit targets (< 40px) for primary actions in narrow panels.

## PROCEDURE (stable snapshot for Execution)

Step-by-step instructions the agent (and subagents) must follow:

1. Confirm brand tokens: `--gold`, `--green`, dark forest surfaces; O mark stays gold.
2. Load self-hosted fonts via `@font-face` in `sidepanel/styles.css` (and Data table CSS).
3. Rebuild shell: brand row + segmented nav + scrollable main + sticky foot for Start/progress.
4. Home: one elevated tool tile for List Extractor (others later as ghost slots optional).
5. List Extractor: premium stepper (1 select, 2 load-more tiles with SVG icons); action pick secondary when needed.
6. States: idle / picking / selected / running / complete — each with distinct, polished chrome.
7. Polish Data table page to the same token system.
8. Smoke in Chrome: load unpacked, resize panel narrow↔wide, keyboard focus, reduced-motion.
9. Commit/push when owner expects share; keep `*.pem`/`*.crx` out of git.

## Checks before claiming done

- [ ] Looks intentional at ~280px and ~420px panel widths
- [ ] Primary/secondary/mode controls have hover, active, disabled, focus
- [ ] No Ultimate clone; gold O + green tools readable
- [ ] Fonts load offline from extension package
- [ ] `prefers-reduced-motion` disables nonessential animation

## Evolution log

| Version | Date | Change |
| --- | --- | --- |
| 1 | 2026-09-23 | Created as DRAFT |
| 2 | 2026-09-23 | Filled RESEARCH + PROCEDURE from Chrome docs + brand constraints |
