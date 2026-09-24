---
name: omni-mascot-animation
description: >-
  Omni Extractor brand mark, mascot character bible, and cycling space wallpapers.
  Prefer static header icon. Any new mascot art MUST match the canonical anatomy
  from logo.png (2 arms × 3 fingers, 2 gold-claw feet). Ambient wallpapers crossfade ~5s.
---

# Omni mascot (character bible + wallpaper + UI)

## Canonical reference (source of truth)

**Always match:** `extension/icons/logo.png` (and `wallpaper-mascot.png` / `wallpaper-scene-origin.png`).

When generating ANY image that includes the mascot or mini-mascots, attach those files as
`reference_image_paths` and paste the **Character lock** block below into the prompt.

### Character lock (paste into every image prompt)

```
CANONICAL OMNI MASCOT — do not redesign:
- Body: round beetle / scarab shell, glossy deep metallic indigo–purple
- Side shell: large translucent AMBER–orange glowing panel (internal crystal energy)
- Eyes: exactly TWO large almond solid glowing CYAN eyes (concentric rings OK, no black pupils)
- Forehead: polished GOLD ring / letter-O symbol centered above eyes
- Antennae: exactly TWO thin black stalks with small glowing gold bulb tips
- Arms: exactly TWO short dark articulated arms; each hand has exactly THREE fingers
- Feet: exactly TWO short legs ending in sharp GOLDEN claws / paws (not four legs, not six)
- Prop (default pose): translucent holographic tablet held with both three-fingered hands,
  faint gold corner dots on the panel
- Materials: metallic shell highlights, gold trim on shell seams, cyan eye glow, amber core glow
FORBIDDEN: extra arms/legs, cute cartoon redesign, humanoid hands with 5 fingers,
  different eye color/shape, missing gold O, missing amber side panel
```

### Limb count (hard rule)

| Part | Count | Detail |
| --- | --- | --- |
| Arms | **2** | Short, dark, jointed |
| Fingers per hand | **3** | Grasping hologram / objects |
| Legs / paws | **2** | Small; **golden claw** tips |
| Antennae | **2** | Black + gold tips |
| Eyes | **2** | Cyan almond glow |
| Gold O | **1** | Forehead |

Mini-mascots / crew = same anatomy, only smaller.

## Decision (product)

- **Header / toolbar icon:** static `logo.png` / `icon*.png` only.
- **Do not** put low-frame WebP on the brand mark.
- **Wallpapers:** story scenes in `extension/icons/wallpapers/`; user picks which enter the cycle.
- Metaphor: space = internet · planets = sites · ship = extension · mascot = captain · cyan cubes = data.

## Wallpaper files

Owned by product selection. Current candidates live under `extension/icons/wallpapers/`.
Cycle list: `WALLPAPER_SCENES` in `extension/sidepanel/app.js`.

## UI skin

Tokens in `styles.css`: indigo shell, cyan eye glow, gold O, amber glass, hologram panels.

## Checklist before shipping new mascot art

- [ ] Reference paths include `logo.png` (+ origin wallpaper when possible)
- [ ] Character lock block present in prompt
- [ ] Verified: 2 arms × 3 fingers, 2 gold-claw feet, 2 cyan eyes, gold O, amber side
- [ ] No accidental 4/6-leg insect redesign
- [ ] Crossfade respects `prefers-reduced-motion`
