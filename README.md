# blog-cover-skill

A Claude Code plugin for generating branded blog cover and OpenGraph images from a Markdown post or topic.

It reads brand settings from `DESIGN.md`, `BRAND.md`, a Tailwind config, or `:root` CSS variables. If it cannot find enough brand info, it asks for the missing details and writes a `DESIGN.md` for future runs.

Run it with:

```bash
/blog-cover path/to/post.md
```

The skill renders three HTML cover options, opens them in your image viewer, and saves the chosen one to `.blog-covers/`. A review pass then suggests fixes you can accept or skip.

---

## Install

From inside Claude Code:

```bash
/plugin marketplace add MohamedSherifNoureldin/blog-cover-skill
/plugin install blog-cover@blog-cover-skill
/reload-plugins
```

The first `/blog-cover` run prompts to install Puppeteer in the plugin directory (~300MB, one-time).

## Requirements

- **Node.js ≥ 18** (install from [nodejs.org](https://nodejs.org), `brew install node`, or `apt install nodejs`).
- **Network access** for the first Puppeteer install and for any cover that loads Google Fonts.
- **Optional**: the `codex` CLI for the `--codex` flag. If missing, the skill warns once and skips the Codex review; everything else still runs.
- **Optional**: `@google/design.md` CLI for the WCAG lint step, auto-fetched via `npx`.

## Usage

```
/blog-cover <markdown-path-or-free-text> [flags]
```

| Flag | Effect |
|---|---|
| `--codex` | Run a second review via the OpenAI Codex CLI and report overlapping findings. |
| `--interactive` | Skip brand auto-discovery and ask every brand question. |
| `--size WxH` | Override canvas size for this invocation (default `2240x1260`). |
| `--quick` | Skip all prompts. A subagent picks one of the three concepts, the review still runs, and any suggested fixes are skipped. Intended for batch runs. |
| `--archetype <name>` | Skip the 3-concept exploration and generate one concept in the named archetype. Valid: `centered-hero`, `two-pane-split`, `full-bleed-artifact`, `stacked-vertical`, `diagonal-asymmetric`, `grid-matrix`, `edge-anchored`. |

## Output

```
.blog-covers/
├── _shared.css         brand variables shared by all covers
├── my-post.html        editable HTML source
├── my-post.png         final cover
└── .concepts/          temporary concept files (added to .gitignore if you have one)
```

## DESIGN.md

The skill prefers a `DESIGN.md` written to the [Google Labs spec](https://github.com/google-labs-code/design.md). Minimal example:

```markdown
---
version: alpha
name: Acme Inc
colors:
  primary: "#0A2540"
  accent: "#00D924"
typography:
  display-xl:
    fontFamily: Inter
    fontSize: 96px
    fontWeight: 800
url: "acme.com/blog"
logo: "./public/acme-logo.svg"
---

## Overview
Brand personality, target audience, and the response the UI should evoke.
```

See the [Google spec](https://github.com/google-labs-code/design.md) for the full schema. Generate one with `npx @google/design.md init`, or write it by hand.

### Brand sources checked in order

1. `DESIGN.md` (Google spec, YAML front matter)
2. `DESIGN.md` (gstack legacy, prose only, produced by [gstack](https://github.com/garryslist/gstack)'s `/design-consultation`)
3. `BRAND.md` at the repo root, `docs/`, or `.blog-covers/`
4. `tailwind.config.{js,ts,mjs,cjs}` color tokens
5. `:root { --vars }` in `src/index.css` or `app/globals.css` (handles shadcn HSL triplets)
6. Interactive prompts, written back to a Google-spec `DESIGN.md`

### Frontmatter extras read by blog-cover

| Field | Default |
|---|---|
| `url` | asked interactively if missing |
| `logo` | asked interactively if missing |
| `canvas_size` | `2240x1260` |
| `output_dir` | `.blog-covers` |
| `consistency` | `neutral` (`consistent` / `varied` / `neutral`) |

`consistency` controls whether new covers visually align with prior covers, explicitly diverge, or have no constraint.

## Concept generation

The skill generates three concepts using different layout archetypes, renders them at full resolution, and opens them in your image viewer. Pick one, or ask for another round (max three rounds).

## Review

A separate review pass checks the selected cover and returns specific fix suggestions. With `--codex`, the skill also runs a Codex review and reports any findings both agree on. Fixes are never applied automatically.

## /frontend-design integration

If Anthropic's `/frontend-design` skill is installed, blog-cover offers it as an alternate generation path.

## Hand-tweaking

The HTML source stays in `.blog-covers/{slug}.html`. Edit it, then re-render with the plugin's `render.mjs` (the path is `~/.claude/plugins/cache/blog-cover-skill/<sha>/skills/blog-cover/scripts/render.mjs`; the skill prints the exact path in its final report):

```bash
node <plugin>/scripts/render.mjs .blog-covers/my-post.html .blog-covers/my-post.png 2240 1260
```

## Install from source

```bash
git clone https://github.com/MohamedSherifNoureldin/blog-cover-skill ~/Code/blog-cover-skill
cd ~/Code/blog-cover-skill
npm install
# Then add as a local marketplace:
#   /plugin marketplace add ~/Code/blog-cover-skill
#   /plugin install blog-cover@blog-cover-skill
```

## Repo layout

```
blog-cover-skill/
├── .claude-plugin/plugin.json    plugin metadata
├── .claude-plugin/marketplace.json   single-plugin marketplace
├── skills/blog-cover/
│   ├── SKILL.md                  orchestrator
│   ├── scripts/                  render, extract-brand, extract-palette, init-design
│   ├── references/               concept-generation, review prompts
│   ├── assets/                   DESIGN.md and _shared.css templates
│   └── evals/evals.json          test cases
├── examples/                     canonical reference brands
└── README.md, LICENSE, NOTICE, package.json
```

## License

Apache 2.0. See [LICENSE](./LICENSE) and [NOTICE](./NOTICE).
