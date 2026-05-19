# Dogfood example: Drift Protocol attack cover

Generated end-to-end by `blog-cover-skill` v0.1.

## What this demonstrates

- **3-concept generation with archetype diversity**: round 1 generated
  3 concepts that all used "text-left / visual-right" two-pane layout
  (template tic). Round 2 — after the prompt was patched with the
  7-archetype rule — produced 3 genuinely distinct compositions:
  centered hero, stacked vertical, edge-anchored.

- **Picker UX**: each PNG displayed individually with archetype-named
  headers ("### Concept A — Centered hero: ...") so the user could
  evaluate layout AND content side-by-side.

- **Promote-step path rewrite**: the concept HTMLs reference
  `../_shared.css` (one level up). On promote, the path is rewritten
  to `_shared.css` so the CSS loads from the same directory. Skipping
  this ships a broken cover (no CSS → white default bg bleeds through).

## Final cover
- HTML source: `07-drift-protocol-attack-lessons.html`
- Rendered PNG: `07-drift-protocol-attack-lessons.png`
- Stylesheet: `_shared.css` (generated from DESIGN.md frontmatter)

## To regenerate from scratch
```bash
cd <repo-with-DESIGN.md>
/blog-cover blog-content/07-drift-protocol-attack-lessons.md
```
