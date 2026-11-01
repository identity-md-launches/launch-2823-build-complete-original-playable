# SQUEEKFOREST: SEEDKEEPER design system

## Overview

A playable positioning game for the Squeekchain community. The visual reference is @AhoteSpirit's dark pixel forest: emerald trees, moonlight and small fireflies. The game keeps the board as the central object, with a mission to the left and a seed satchel to the right on desktop. Mobile brings the objective, board and seeds into one column without a marketing hero.

The artwork is newly drawn in `src/components/Forest.tsx` and `src/components/Pixel.tsx`. Pixel silhouettes supply the identity; the surrounding interface stays quiet and readable. The forest canvas is decorative behind the interface, with a separate brighter forest illustration on the memory view. Game data remains HTML, not inaccessible canvas text.

## Colors

Canonical semantic tokens are in `src/styles.css:1`.

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#0b1716` | Page and dark forest veil |
| `--surface` | `#12221e` | Satchel options, feedback, dialog, memory note |
| `--surface-raised` | `#1b3027` | Reserved surface level |
| `--surface-hover` | `#263e31` | Hover treatment |
| `--text` | `#e5ecd9` | Primary text |
| `--muted` | `#a1b7a4` | Secondary text, dates, captions |
| `--accent` | `#c4dfa0` | Chosen seed, active tab, success and filled continuation action |
| `--accent-ink` | `#16291d` | Text on the light action |
| `--line` | `#3c5744` | Structural borders and separators |
| `--focus` | `#f4e8ab` | Keyboard outline |
| `--warning` | `#e6c68e` | Practice, stale and error text |
| `--water` | `#9bc8cb` | Reserved water role |

Board art uses its own small environment palette: soil `#2a472d` / `#2d4a30`, board surround `#15271d`, boundary `#4b6749`, pond `#234c4e`, and illuminated soil `#475c31`. Water/shade markers use `#b7e3e0` / `#e0d6b8`. These are art/environment categories rather than additional call-to-action colors.

The canvas veil is `#0b1716cc` (80% opacity) through 65% of the scene, fading into the solid page background. It prevents bright firefly pixels from competing with text. The rendered static background sampling result is in `artifacts/contrast-results.json`; it is limited to the measured reduced-motion frame, not every possible animation frame. The automated probe's solid-background contrast checks pass, with its image/canvas exclusions documented in validation.

## Typography

- Wordmark and h1: locally bundled **Silkscreen 400**, imported in `src/main.tsx`. Latin WOFF2 and WOFF assets are delivered. `document.fonts.check('16px Silkscreen')` returned true in the final browser inspection.
- Interface and prose: `'Trebuchet MS', Arial, sans-serif`; weights 400 and 700. Availability of the body font depends on the platform's fallback stack.
- One five-step scale: `--size-small` 13px, `--size-body` 16px, `--size-title` 20px, `--size-large` 28px, `--size-display` 40px at the default 16px root.
- H1: 40px desktop and 28px mobile, weight 400, tracking `-.035em`. Wordmark: 20px desktop and 16px mobile. H2: 20px, or 16px for the compact mobile grove title. Body UI: 13px/16px.
- Default line height 1.5; headings 1.3; buttons 1.4. Counts use tabular numerals. Headings balance, descriptions wrap naturally, and long hashes use `overflow-wrap: anywhere`.

Use the existing type tokens instead of adding a new size. Pixel lettering belongs to identity, not long instructions. The intentionally compact 13px game labels leave the board and seed controls visible on a phone; long documentation in this repository is ordinary Markdown.

## Layout

`src/styles.css` owns all composition. The shell is at most 1,256px, with 32px side padding on desktop. Main columns use `.game-layout`: `minmax(170px,.82fr) minmax(320px,1.75fr) minmax(200px,1fr)` with a 32px gap.

Spacing is predominantly 4/8/12/16/20/24/32px. Within a control, icon/text gaps are 8–12px; independent regions use 20–32px. Labels align to shared board and shell edges. All controls remain in normal document flow.

- **At 1,050px and below:** 24px side padding, 20px column gaps, more compact side panels and seed options.
- **At 760px and below:** a centered shell at most 580px wide, 20px side padding, one column, compact objective above the board, three seed buttons in a row below it. The wide mission sidebar is replaced by the compact objective and mobile Hint button. Board width is capped at 440px. The data section follows the game.
- **At 360px and below:** 16px side padding, tighter seed controls, and the field-guide control uses its book icon. Its accessible name is retained by an explicit `aria-label="Field guide"`. Pause remains available.
- At 390×844, the full seed row is at y≈703–769px in the first screen. The board and product identity are above it. Browser validation checked 320, 390, 760 and 1440; secondary views and expanded evidence also checked at 320, 390 and 1440.

The memory summary goes from three columns to two; its grove count spans a second row on mobile. Journal entries wrap their action below the description when narrow. Tables wrap headings without forcing horizontal scrolling. Hashes are fully readable and never ellipsized.

## Elevation & Depth

The interface uses tonal separation and structural borders, with no elevated card-shadow system. The only `box-shadow` is tiny decorative soil pixel specks. The forest adds scene depth behind the content; it is not a hierarchy of nested cards.

The native dialog's dark backdrop separates it from the inert page. Its maximum height is `calc(100dvh - 48px)` and its content scrolls. No fixed action covers the board or text.

## Shapes

- General controls/surfaces use `--radius: 6px`.
- Board surround: 4px radius, 2px border; tiles: 2px radius, 1px border.
- Dialog: 10px radius with 20px mobile / 28px desktop content padding.
- Sprite art uses 24×24 SVG coordinates, crisp edges and square pixels. Canvas is rendered at 640×280 and scaled with `image-rendering: pixelated`.

Do not soften the board into large rounded cards. Keep selection/focus visible as structure rather than relying on glow alone.

## Components

| Pattern/component | Source | Behavior |
| --- | --- | --- |
| `Pixel` / `Icon` | `src/components/Pixel.tsx` | Decorative SVG sprites and one currentColor outline icon set; callers provide text/accessible control names |
| `Forest` | `src/components/Forest.tsx` | `trees`, `paused`, `small`; draws current-grove growth saplings and decorative forest; stops animation for reduced motion or pause |
| Board / `.tile` | `src/App.tsx`, `src/styles.css` | Native tile buttons; coordinate/environment names; roving tab stop and arrows; available `+`, illumination and static plant sprites |
| `.seed-option` | `src/App.tsx:173` | Three native choices with `aria-pressed`, sprite, stock count and selected border; available on all widths |
| `.board-actions` | `src/App.tsx:169` | Undo, restart and mobile hint; unavailable undo/restart are disabled; best scores survive reset |
| `.game-message` | `src/App.tsx` | Persistent polite status area; instructions, invalid placement, exhaustion and victory with a point breakdown |
| `.status` / `.data-bar` | `src/App.tsx` | Text plus square marker for LIVE/STALE/OFFLINE/PRACTICE; manual refresh, timestamps and expandable full evidence; stable error live region |
| `.tabs` | `src/App.tsx` | Single-page view buttons with active underline and `aria-current`; no server routing required |
| `.visit-note` / snapshot table | `src/App.tsx:185` | Exact observed deltas or a first-visit/incomparable explanation; JSON download |
| Native `dialog` | `src/App.tsx:201` | Field guide; Escape/backdrop/close, native focus containment and focus restoration |

Every ordinary button targets 44px minimum height. Dense data controls/checkboxes use the probe's 24px-or-spacing baseline. Focus is a 2px `--focus` outline at 4px offset (2px offset on tiles), with system Highlight in forced colors. Hover is gated to hover-capable devices. Transitions name color/border properties and run 120ms. The optional press scale is `.96` and only runs with no reduced-motion preference. Canvas animation also listens for reduced-motion changes.

## Do's and don'ts

- Start a new view inside the existing shell and main region; reuse `.view-title`, text tokens and normal-flow actions.
- Keep the board and satchel ahead of explanatory content on a phone. Keep both Hint and animation pause reachable.
- Add a seed through the shared game rules and `Pixel` sprite model; expose its placement rule in ordinary text and accessible tile names.
- Keep the filled light action for a useful continuation or recovery; selected seeds use their own clear border/state rather than another filled call to action.
- Preserve separate practice/verified provenance and local-score language in every new state. Never add fictitious historical growth or shared scores.
- Do not add a font, unrelated accent, gradient text, hidden hash truncation or animation required to understand an outcome.

The six-domain review, findings, fixes and unperformed checks are recorded in `artifacts/validation.md`. This document describes the final implementation, not proposed future styling.
