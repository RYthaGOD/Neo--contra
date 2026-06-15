# NeoContra — Higgsfield Asset Prompts

Generate these in Higgsfield, then drop the PNG/JPG files into **`src/assets/bg/`** with
the **exact filenames** below. The game auto-detects them and falls back to the
procedural art for anything missing — so you can add them one at a time.

## Specs (apply to every image)
- **Aspect / size:** 16:9 landscape, as high-res as possible (≥1920×1080).
- **Format:** PNG or JPG. Save as the exact filename listed.
- **No text, no UI, no characters, no logos** — just the environment (we overlay
  the player, enemies, HUD, and title text ourselves).
- Used as a **static painted backdrop**; our procedural smokestacks, rain, neon
  signs and foliage drift on top for parallax depth, so it does NOT need to tile.

## Shared style suffix (paste at the end of every prompt)
> `, detailed 16-bit pixel art, retro run-and-gun side-scroller background, cyberpunk industrial neon aesthetic, dramatic atmospheric volumetric lighting, dark moody palette with vivid neon accents, deep parallax depth, highly detailed, no characters, no text, no watermark`

---

## Essential — level backdrops (5)

**`src/assets/bg/level1.png` — Neon Jungle (green/cyan)**
> A dense overgrown cyberpunk jungle wrapping a derelict energy plant, glowing emerald and cyan bioluminescent foliage, tangled cables and rusted pipes, distant smokestacks venting orange fire into a rainy night sky, neon hazard signage glow, "Sector 7" industrial decay

**`src/assets/bg/level2.png` — Blockchain Bridge (yellow/purple)**
> A colossal neon suspension bridge of glowing data conduits spanning a bottomless dark abyss, streams of golden light packets flowing along cables, distant server-tower skyline, electric purple storm clouds, vertigo-inducing scale

**`src/assets/bg/level3.png` — Liquidity Lake (teal/blue)**
> A vast underground cavern over luminescent teal liquid pools, reflective glowing water, dripping stalactites of crystal and pipework, submerged neon machinery, cold blue mist, eerie aquatic glow

**`src/assets/bg/level4.png` — Mining Mountain (red/orange)**
> A volcanic mountain peak crammed with towering crypto-mining GPU rigs, rivers of molten lava glowing orange, ash and embers falling, overheating server racks venting steam, ominous red sky, industrial heat haze

**`src/assets/bg/level5.png` — Genesis Citadel (white/purple/gold)**
> A monumental cyber-cathedral citadel at the source of the protocol, towering holographic golden and violet architecture, floating glyph monoliths, beams of divine neon light, vast ominous grandeur, the final stronghold

## Essential — title / key art (1)

**`src/assets/bg/title.png` — Title screen backdrop**
> A cinematic wide vista of a neon cyber-jungle megacity at night seen from a ruined overlook, towering factories and bioluminescent foliage, heavy rain, dramatic searchlights, epic mood (composition with open sky in the upper-center for the logo)

---

## Optional — boss intro portraits (5)
Square (1:1), centered subject on a **plain dark/black background** (we tint and
frame them). Filenames `src/assets/bg/boss1.png` … `boss5.png`.

1. **`boss1.png` — DeFi Destroyer Prime:** a massive magenta armored octagonal war-machine core with a glowing central eye
2. **`boss2.png` — Flash Loan Falcon:** a sleek predatory mechanical falcon drone, golden-yellow plating, glowing jet thrusters
3. **`boss3.png` — Rug Pull Reaper:** a spectral green cyber-reaper, tattered digital cloak, glitching scythe of light
4. **`boss4.png` — Hash Rate Hydra:** a multi-headed serpentine machine of red-hot mining rigs, cables for necks, molten maws
5. **`boss5.png` — Satoshi Sentinel:** a towering white-and-gold guardian construct, holographic halo, radiant protocol glyphs

---

### Notes
- Pixel-art style keeps it cohesive with the game; if you prefer a more painterly
  look, drop the style suffix — the integration handles either.
- After adding files, the game picks them up on next load (dev) / rebuild (prod).
