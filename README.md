# blog-cover-skill

A Claude Code skill that generates branded blog cover images.

You point it at a markdown post (or describe a topic), and it:

1. Auto-discovers your brand (DESIGN.md → BRAND.md → Tailwind/CSS → interactive)
2. Generates 3 distinct concept covers at 2240×1260 (or your size)
3. Lets you pick one (or ask for 3 more)
4. Runs a fresh unbiased subagent review listing every issue
5. Optionally runs an adversarial Codex review for a second opinion
6. Surfaces fixes — you decide which to apply

No auto-commit. No magic. You stay in the loop.

---

## Install

### Quick install (3 steps, ~2 min on first run)

From inside Claude Code:

```bash
/plugin marketplace add MohamedSherifNoureldin/blog-cover-skill
/plugin install blog-cover@blog-cover-skill
/reload-plugins
```

On your first `/blog-cover` invocation, the skill detects that Puppeteer isn't installed yet and asks permission to run `npm install` in the plugin directory (~300MB download, one-time). Approve once and you're done.

### Requirements

- **Node.js ≥ 18** — install from [nodejs.org](https://nodejs.org) or `brew install node` / `apt install nodejs`. The skill checks at startup and tells you if you need to upgrade.
- **Network for first run** — Puppeteer download + Google Fonts CDN.
- **Optional: `codex` CLI** — for the `--codex` flag (adversarial second-opinion review). Install with `npm install -g @openai/codex`. The skill works fine without it; you just lose the codex review pass.
- **Optional: `@google/design.md` CLI** — auto-fetched via `npx` for the WCAG lint step. No manual install needed.

### Install from source (alternative — for hacking on the skill itself)

```bash
git clone https://github.com/MohamedSherifNoureldin/blog-cover-skill ~/Code/blog-cover-skill
cd ~/Code/blog-cover-skill
npm install
# Then add as a local marketplace:
#   /plugin marketplace add ~/Code/blog-cover-skill
#   /plugin install blog-cover@blog-cover-skill
```

The repo follows the official Claude plugin layout:
```
blog-cover-skill/
├── .claude-plugin/plugin.json    ← plugin metadata
├── skills/blog-cover/
│   ├── SKILL.md                  ← orchestrator
│   ├── scripts/                  ← render.mjs, extract-brand, extract-palette, init-design
│   ├── references/               ← concept-generation, review prompts
│   ├── assets/                   ← DESIGN.md.template, _shared.css.template
│   └── evals/evals.json          ← test cases
├── examples/                     ← canonical reference brands
├── README.md / LICENSE / package.json
```

You also need Puppeteer in any repo where you'll use the skill:

```bash
cd <your-repo>
npm install --save-dev puppeteer
```

---

## Quick start

In any repo, type:

```
/blog-cover blog-content/why-i-stopped-using-chatgpt-for-recipes.md
```

First run prompts you for brand details and writes a `DESIGN.md` so you don't have to answer again. Subsequent runs use it automatically.

---

## DESIGN.md (Google Labs spec)

The skill reads a `DESIGN.md` at your repo root using the official [Google Labs DESIGN.md specification](https://github.com/google-labs-code/design.md) (open-sourced April 21, 2026, Apache 2.0). Generate one with the official CLI: `npx @google/design.md init`, or by hand:

```markdown
---
version: alpha
name: Acme Inc
description: B2B SaaS for fleet operators
colors:
  primary: "#0A2540"
  accent: "#00D924"
  background: "#FFFFFF"
  text: "#0A2540"
typography:
  display-xl:
    fontFamily: Inter
    fontSize: 96px
    fontWeight: 800
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: 500
rounded:
  sm: 4px
  md: 8px
url: "acme.com/blog"
logo: "./public/acme-logo.svg"
canvas_size: "2240x1260"
consistency: "neutral"
---

## Overview
Brand personality, target audience, emotional response the UI should evoke.

## Colors
Palette descriptions with semantic roles.

## Typography
Font strategy and usage levels.

## Layout / Elevation & Depth / Shapes / Components / Do's and Don'ts
(All sections optional but should follow this order if present.)
```

### Fallback waterfall

If no Google-spec `DESIGN.md` is present, the skill walks this waterfall:

1. **gstack legacy DESIGN.md** (prose-only `## Color` + `## Typography` sections, no YAML frontmatter) — produced by [gstack's](https://github.com/garryslist/gstack) `/design-consultation` skill
2. **BRAND.md** at repo root, docs/, or .blog-covers/ (treated as gstack-style)
3. **tailwind.config.{js,ts,mjs,cjs}** color tokens
4. **`:root { --vars }`** in src/index.css, app/globals.css, etc. (handles shadcn-style bare HSL triplets)
5. **Interactive bootstrap** — prompts the user, writes a Google-spec DESIGN.md so future invocations are zero-config

### blog-cover-specific frontmatter extras

Top-level Google spec fields are the standard. blog-cover also reads these supplementary fields if present in the frontmatter:

| Field | Required | Default |
|---|---|---|
| `url` | recommended | — (asked interactively if missing) |
| `logo` | recommended | — (asked interactively if missing) |
| `canvas_size` | no | `2240x1260` |
| `output_dir` | no | `.blog-covers` |
| `consistency` | no | `neutral` |

### Consistency posture

| Value | Behavior |
|---|---|
| `consistent` | New covers visually align with the existing set |
| `varied` | New covers explicitly avoid repeating prior layouts |
| `neutral` | No enforcement; pick the strongest design for the topic |

---

## Flags

| Flag | Effect |
|---|---|
| `--codex` | Run Codex adversarial review after Claude subagent review |
| `--interactive` | Skip brand auto-discovery; ask every brand question |
| `--size WxH` | Override canvas size for this invocation |

---

## Output

Covers land in `.blog-covers/` at your repo root:

```
.blog-covers/
├── _shared.css                  # brand variables for all covers
├── my-blog-post.html            # source you can hand-tweak
├── my-blog-post.png             # final cover
└── .concepts/                   # throwaway 3-concept exploration (gitignored)
```

The skill auto-appends `.blog-covers/.concepts/` to your `.gitignore` on first run.

---

## How concept generation works

The skill generates **three distinct concepts**, not three variations of the same idea. Each must use a different layout archetype AND a metaphor that fits your actual topic. The skill is brand-agnostic — it works as well for a sourdough blog as for a fintech blog as for a fashion blog.

Metaphor families (the prompt picks one per concept based on what fits your post):

- **Artifact-as-evidence** — the actual thing the post is about, rendered as a real artifact: a recipe card, a chart, a photo, a screenshot, a letter, a journal page
- **Big-data-point hero** — one number does the work: "67%" / "$1.2M" / "12 years" / "3 ingredients"
- **Narrative diagram** — timeline, flow, hierarchy, journey, map, lineage
- **Specimen comparison** — before/after, A/B, then/now, two side-by-side examples
- **Subject-rendered-literally** — the topic itself shown plainly: a guitar for a music post, a tomato for gardening, a building for architecture
- **Quote-as-hero** — one short quote typeset as the entire composition

You see all three rendered at full resolution in your OS image viewer, pick one (A/B/C), or ask for 3 more (max 3 retry rounds).

---

## How review works

After you pick a concept, a **fresh subagent with no conversation context** reviews it. It rates 1-10 and lists EVERY issue with a concrete fix (not just top 3). You decide which to apply.

With `--codex`, a second adversarial review runs via OpenAI Codex (different model, different perspective). Cross-model agreement is highlighted automatically.

The skill never auto-applies fixes. You ship what you want shipped.

## Optional: /frontend-design delegation

If you have Anthropic's `/frontend-design` skill installed, blog-cover detects it at runtime and offers to delegate concept generation to that specialist for higher-fidelity designs. You can decline and use the in-skill prompt at any time. The in-skill prompt works perfectly without `/frontend-design`.

---

## Hand-tweaking

The HTML source stays in `.blog-covers/{slug}.html`. Edit it however you want, then re-render:

```bash
node ~/.claude/skills/blog-cover/scripts/render.mjs \
  .blog-covers/my-post.html .blog-covers/my-post.png
```

---

## Requirements

- Node ≥18
- Puppeteer (installed in your repo or globally)
- (Optional) `codex` CLI for `--codex` flag: `npm install -g @openai/codex`

---

## License

MIT
