---
brand_name: "NexGuards"
url: "nexguards.com/blog"
logo: "./public/nexguards-logo.svg"
canvas_size: "2240x1260"
output_dir: ".blog-covers"
consistency: "varied"
---

## Palette

- primary_bg: #050706
- accent: #00E676
- warning: #ff3b30
- text: #ffffff
- muted: rgba(255,255,255,0.40)

## Typography

- display: "Plus Jakarta Sans", 300/400/600/700/800
- mono: "IBM Plex Mono", 400/500/600
- source: google_fonts

## Voice / editorial tone

B2B cybersecurity. Audience is CISOs and security leaders at US fintech / SaaS companies of 200-2,000 employees.

Voice is blunt, source-cited, no marketing fluff. No em dashes. Never use AI vocabulary: delve, robust, comprehensive, nuanced, pivotal, landscape, tapestry, underscore, foster, showcase, intricate, vibrant, fundamental, significant.

Customer references are anonymized. No mentions of specific competitors by name in cover copy (KnowBe4 is a fair exception in vendor comparison posts).

US audience only — no MENA / Arabic / regional references.

## Visual preferences

Avoid:
- Stock 3D faces, generic radial gradients, cliché icon grids
- Bottom 3-stat-strip template (the "stat tic" that emerges from sequential cover generation)
- Unsourced precision numbers (every stat needs a citation at ≥16px mono)
- Big-number-with-no-visual-idea hero treatments

Prefer:
- Real artifacts as evidence: email mockups, terminal frames, chat UIs, org tree fragments, kill chains
- One concrete visual that carries the editorial point
- Sourced data inline next to the stat, not in a tiny corner footnote
- Distinct metaphor per cover; no two covers in the set should feel like the same template

## Existing covers

Generated under `consistency: varied` posture. New covers must use a distinctly different metaphor than the 18 already in `.blog-covers/`.
