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

### As a Claude Code plugin

```bash
claude plugins install blog-cover
```

### From source

```bash
git clone https://github.com/mohamedsherif/blog-cover-skill ~/.claude/skills/blog-cover
cd ~/.claude/skills/blog-cover
npm install
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
/blog-cover blog-content/03-ai-phishing.md
```

First run prompts you for brand details and writes a `DESIGN.md` so you don't have to answer again. Subsequent runs use it automatically.

---

## DESIGN.md

The skill prefers a `DESIGN.md` at your repo root. Minimal example:

```markdown
---
brand_name: "Acme Inc"
url: "acme.com/blog"
logo: "./public/acme-logo.svg"
canvas_size: "2240x1260"
consistency: "neutral"
---

## Palette
- primary_bg: #050706
- accent: #00E676
- text: #ffffff
- muted: rgba(255,255,255,0.40)

## Typography
- display: "Plus Jakarta Sans", 300/700/800
- mono: "IBM Plex Mono", 400/500/600
- source: google_fonts

## Voice / editorial tone
B2B, blunt, no marketing fluff. No em dashes.
Target audience: technical decision-makers.

## Visual preferences
Avoid: stock 3D faces, generic radial gradients, cliché icon grids.
Prefer: real artifacts (mockups, terminal frames, chat UIs, diagrams that carry information).
```

A `BRAND.md` at the same locations also works (same schema).

If neither exists, the skill tries `tailwind.config.{js,ts}` and `:root { --vars }` in `src/index.css` / `app/globals.css`. Failing that, it goes interactive.

### Frontmatter fields

| Field | Required | Default |
|---|---|---|
| `brand_name` | yes | — |
| `url` | yes | — |
| `logo` | yes | — |
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
├── 03-ai-phishing.html          # source you can hand-tweak
├── 03-ai-phishing.png           # final cover
└── .concepts/                   # throwaway 3-concept exploration (gitignored)
```

The skill auto-appends `.blog-covers/.concepts/` to your `.gitignore` on first run.

---

## How concept generation works

The skill generates **three distinct concepts**, not three variations of the same idea. Each is a different visual metaphor:

- Artifact-as-evidence (real email mockup, terminal screenshot)
- Big-data-point hero (one giant number with supporting visual)
- Narrative diagram (timeline, kill chain, org tree, flow)
- Specimen comparison (before/after, A/B)
- Tool-of-the-trade (the attacker's instrument shown literally)

You see all three rendered at full resolution, pick one (A/B/C), or ask for 3 more (max 3 retry rounds).

---

## How review works

After you pick a concept, a **fresh subagent with no conversation context** reviews it. It rates 1-10 and lists every issue with a concrete fix. You decide which to apply.

With `--codex`, a second adversarial review runs via OpenAI Codex (different model, different perspective). Cross-model agreement is highlighted automatically.

The skill never auto-applies fixes. You ship what you want shipped.

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
