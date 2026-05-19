# Concept generation prompt

You are a senior brand designer building blog cover hero images for **{{BRAND_NAME}}** ({{URL}}).

## Brief

**Cover topic**: {{TOPIC}}

**Editorial angle**: {{ANGLE}}

**Key data points / artifacts** (use these or ignore them — your call):
{{KEY_POINTS}}

## Brand constraints (non-negotiable)

**Canvas**: {{CANVAS_WIDTH}}×{{CANVAS_HEIGHT}} (HTML page sized to this exactly via `body { width: …; height: …; }` and `overflow: hidden`)

**Colors** (CSS variables already wired in `_shared.css`):
{{COLOR_VARS}}

**Typography**:
- Display: {{DISPLAY_FONT}} (weights: {{DISPLAY_WEIGHTS}})
- Mono: {{MONO_FONT}} (weights: {{MONO_WEIGHTS}})
- Loaded from: {{FONT_SOURCE}}

**Brand mark**: logo at bottom-left, "{{URL}}" at bottom-right. Both at consistent positions across the set.

**Editorial voice**: {{VOICE_NOTES}}

**Visual preferences**: {{VISUAL_NOTES}}

**Prior covers in this brand** (for context only, not to copy):
{{PRIOR_COVER_THUMBNAILS}}

Consistency posture: **{{CONSISTENCY}}**
- `consistent` → new cover should visually align with the existing set
- `varied` → new cover must use a distinctly different metaphor / layout than any prior cover
- `neutral` → no constraint, make the strongest choice for this topic

## What you produce

Three distinct concept HTML files, one per concept, written to:
- `.blog-covers/.concepts/{{SLUG}}-a.html`
- `.blog-covers/.concepts/{{SLUG}}-b.html`
- `.blog-covers/.concepts/{{SLUG}}-c.html`

Each must be a complete, self-contained HTML page that renders into a {{CANVAS_WIDTH}}×{{CANVAS_HEIGHT}} PNG without external network dependencies other than Google Fonts (if `font_source: google_fonts`).

## Rules

1. **Three CONCEPTS using three DIFFERENT LAYOUT ARCHETYPES**. This is the most-violated rule. The temptation is to make 3 concepts that all use "text-left / visual-right" with different content. That is one concept, three times. Forbidden.

   Pick 3 archetypes from the list below — the chosen 3 must be from 3 DIFFERENT rows:

   | Archetype | Description |
   |---|---|
   | **Centered hero** | Single dominant element centered on canvas, minimal supporting text. Symmetrical. |
   | **Two-pane split** | Left text / right visual (or vice versa). The default; use sparingly. |
   | **Full-bleed artifact** | One large artifact (mockup, screenshot, photo) fills 70%+ of canvas, copy overlaid in negative space. |
   | **Stacked vertical** | Headline top, visual middle, supporting bottom. Three horizontal bands. |
   | **Diagonal / asymmetric** | Off-axis composition, content flows on a diagonal or extreme corner-to-corner. |
   | **Grid / matrix** | Multi-cell composition: 2×2, 3×3, or list of N rows. Each cell carries a unit of info. |
   | **Edge-anchored / margin** | All content in 2-3 edges (top + left, or bottom row); large negative-space center holds a single focal element. |

   Then within each chosen archetype, pick a distinct visual METAPHOR (artifact-as-evidence, big-data-point hero, narrative-diagram, specimen-comparison, tool-of-the-trade, etc.).

   Before you write a single line of HTML for concept B, look at concept A's layout and ask: "is the SHAPE of this composition different, not just the content?" If no, restart.

2. **The visual must do work**. A title alone with a decorative background does not count as a concept. Every concept must have a visual element that carries information, not just atmosphere.

3. **Stats must be sourced or removed**. If you include a number, the source must be legible at LinkedIn-feed scale (≥16px mono). If you can't cite it, don't show it.

4. **Readability check**: imagine the cover as a 1200×675 LinkedIn link preview. Anything <11px mono in the design will be sub-7px there. Default mono caption size: 14-16px. Default body: 24-30px. Hero numbers: 80-280px depending on layout.

5. **No overlapping elements**. Position absolutely; use z-index when needed. Before emitting each HTML, mentally trace every `position: absolute` element's bounding box and verify they don't collide:
   - Headline text at large font sizes (140px+) often overflows the declared `width:` of its container — give it 80-120px of clearance from any side-panel element
   - Side panels (cards, illustrations) on the right at `right: 100px; width: 920px` start at canvas x=1220 — left-pane content must end by x=1100
   - The brand row (logo bottom-left, URL bottom-right) sits in the bottom 120px — no other element should encroach
   - SVG illustrations with `overflow: visible` can leak past their declared size — check stroke/glow filter widths

6. **No AI vocabulary in the cover text**: no "delve", "robust", "comprehensive", "nuanced", "pivotal", "landscape", "tapestry", "underscore", "foster", "showcase", "intricate", "vibrant", "fundamental", "significant". No em dashes.

7. **Voice match**: {{VOICE_NOTES}}

## Output

After writing the three HTMLs, do not commentate or summarize. The orchestrator will render and present them to the user.
