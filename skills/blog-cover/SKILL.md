---
name: blog-cover
description: Generate branded blog cover images, hero images, OpenGraph cards, social-share images, or any branded marketing artwork. Use this skill whenever the user mentions blog covers, post hero images, OG images, social-share graphics, LinkedIn link previews, Twitter cards, or wants visual artwork for a blog post / article / landing page — even if they don't explicitly say "blog cover". Auto-discovers brand from DESIGN.md (Google Labs official spec at github.com/google-labs-code/design.md), with fallback to gstack-legacy DESIGN.md prose format, BRAND.md, Tailwind config, or :root CSS variables, ending with interactive bootstrap. Generates 3 visually distinct concept HTMLs using different layout archetypes (centered hero, two-pane, full-bleed artifact, stacked vertical, diagonal asymmetric, grid matrix, edge-anchored), renders them at any size (default 2240x1260), opens them in the user's OS image viewer for visual comparison, lets the user pick one, then runs a fresh-eyes unbiased subagent review that lists every issue. Optional --codex flag adds an adversarial OpenAI Codex second-opinion review with cross-model agreement analysis.
---

# /blog-cover

You are running the `/blog-cover` skill. Generate a single branded blog cover image for the user's blog post or topic.

## Usage

```
/blog-cover <markdown-path-or-free-text> [--codex] [--interactive] [--size WxH] [--quick] [--archetype <name>]
```

Examples (the skill is brand-agnostic — these span domains intentionally):
- `/blog-cover blog-content/sourdough-hydration-guide.md`
- `/blog-cover "The five most expensive mistakes I made as a first-time founder" --codex`
- `/blog-cover content/posts/why-im-betting-on-passive-houses.md --interactive`
- `/blog-cover post.md --size 1200x630`
- `/blog-cover post.md --quick` — skip the picker, auto-promote the strongest concept
- `/blog-cover post.md --archetype centered-hero` — skip 3-concept exploration, generate just that archetype
- `/blog-cover post.md --quick --archetype grid-matrix` — fully unattended single-concept run (for batch backfilling)

## Flags

| Flag | Effect |
|---|---|
| `--codex` | After Claude subagent review, also run an adversarial Codex review |
| `--interactive` | Skip brand auto-discovery; ask the user every brand question |
| `--size WxH` | Override canvas size (default 2240x1260 or `canvas_size` from DESIGN.md) |
| `--quick` | Skip all user-prompt gates. Auto-pick the strongest concept after the review pass; auto-ship without applying fixes. Use for batch / scheduled runs. |
| `--archetype <name>` | Skip 3-concept exploration entirely. Generate exactly one concept using the named archetype. Valid names: `centered-hero`, `two-pane-split`, `full-bleed-artifact`, `stacked-vertical`, `diagonal-asymmetric`, `grid-matrix`, `edge-anchored`. |

---

## Step 0 — Setup

Confirm the runtime is ready before doing any work. The plugin's helper scripts live at `{skill_root}/scripts/` (where `{skill_root}` is the SKILL.md's directory). The plugin's `package.json` lives one level up at `{plugin_root}/package.json` (i.e., `{skill_root}/../../package.json` relative to SKILL.md, or `{plugin_root}/` if you can resolve it directly — Claude Code installs plugins under `~/.claude/plugins/cache/<marketplace-name>/<sha>/`).

### 0a. Detect Node ≥ 18

```bash
NODE_VERSION=$(node --version 2>/dev/null | sed 's/v//;s/\..*//')
if [ -z "$NODE_VERSION" ]; then
  echo "NODE_MISSING"
elif [ "$NODE_VERSION" -lt 18 ]; then
  echo "NODE_TOO_OLD: $NODE_VERSION (need >= 18)"
else
  echo "NODE_OK: $NODE_VERSION"
fi
```

If `NODE_MISSING` or `NODE_TOO_OLD`, stop and tell the user:
> blog-cover needs Node.js ≥ 18. Install from https://nodejs.org or via your package manager (`brew install node`, `apt install nodejs`, etc.), then retry.

Do not proceed.

### 0b. Detect Puppeteer + auto-install if missing

Determine the plugin install root. The most reliable way is to resolve the directory containing this SKILL.md, go up two levels (`skills/blog-cover/SKILL.md` → `skills/` → plugin root):

```bash
SKILL_DIR=$(dirname "$(readlink -f "{path-to-this-SKILL.md}")")
PLUGIN_ROOT=$(cd "$SKILL_DIR/../.." && pwd)
echo "PLUGIN_ROOT: $PLUGIN_ROOT"
test -d "$PLUGIN_ROOT/node_modules/puppeteer" && echo "PUPPETEER_OK" || echo "PUPPETEER_MISSING"
```

If `PUPPETEER_OK`, proceed to Step 1.

If `PUPPETEER_MISSING`, do NOT silently install — npm-installing on a user's behalf is a trust-significant action. Use AskUserQuestion:

> blog-cover needs Puppeteer to render covers (it's a headless browser, downloads ~300MB on first install). Install it now into the plugin directory? This is a one-time setup.
>
> A) Yes — install Puppeteer now (~300MB download, ~2 min) (recommended)
> B) No — I'll run `cd {PLUGIN_ROOT} && npm install` myself
> C) Cancel this skill run

If A:
```bash
cd "$PLUGIN_ROOT" && npm install 2>&1 | tail -20
```
Surface any errors. If install fails (e.g., network, permission), tell the user the exact command to retry manually.

If B: stop the workflow and print:
> No problem. Run this in your terminal, then retry `/blog-cover`:
>
>   cd {PLUGIN_ROOT} && npm install

If C: stop silently.

### 0c. (Optional) Detect codex CLI for `--codex` flag

Only relevant if `--codex` was passed. If passed and codex is missing, warn the user once but do NOT block — the skill works fine without codex, the user just loses the adversarial second-opinion review:

```bash
which codex >/dev/null 2>&1 && echo "CODEX_OK" || echo "CODEX_MISSING"
```

If `--codex` AND `CODEX_MISSING`:
> --codex was requested but codex CLI is not installed. Skipping the adversarial review (Claude unbiased review still runs). Install with `npm install -g @openai/codex` to enable.

### 0d. (Optional) Detect `@google/design.md` CLI for WCAG lint

Only invoked in Step 2.5, and that step already uses `npx --yes @google/design.md@latest lint` which auto-fetches if missing. No pre-check needed here — the network call is the check.

---

## Step 1 — Detect input type

Parse the user's argument:
- If it's an existing file path with `.md`, `.mdx`, or `.markdown` extension → **markdown mode**
- Otherwise → **prompt mode**

If neither and no arg was passed, use AskUserQuestion to ask whether they want to point to a markdown file or describe a topic.

---

## Step 2 — Brand discovery

If `--interactive` was passed, jump straight to Step 2c. Otherwise:

### 2a. Waterfall via `extract-brand.mjs` and `extract-palette.mjs`

Step 1 — try the structured-source waterfall:
```bash
node {skill_root}/scripts/extract-brand.mjs "$(pwd)"
```

Parse the JSON. The `schema` and `source` fields tell you what was found:

| `schema` value | `source` value | Meaning |
|---|---|---|
| `google-labs` | `design.md (Google spec)` | Official Google Labs DESIGN.md spec at github.com/google-labs-code/design.md — YAML frontmatter + structured tokens. Preferred. |
| `gstack` | `design.md (gstack legacy)` | Older gstack-style prose DESIGN.md (no YAML frontmatter, free-form sections). Probably written by gstack's /design-consultation skill. Works fine. |
| `gstack` | `brand.md (gstack legacy)` | Same as above but in BRAND.md. |
| `unknown` | `design.md (unknown format)` | DESIGN.md exists but matches neither schema. Surface this to the user — they may have a typo or want to migrate. |
| `css-tokens` | `tailwind+css` | No DESIGN.md found; colors extracted from tailwind.config + :root CSS vars. |
| `null` | `none` | Nothing found. Fall through to interactive (Step 2c). |

Step 2 — if `source === "none"` AND the user provided a reference image path (via prompt or flag), run palette extraction as the 4th waterfall fallback:
```bash
node {skill_root}/scripts/extract-palette.mjs <image-path>
```

This returns dominant colors + a `suggested` block with `primary_bg / accent / text / muted`. Use these as starting values when you fall through to interactive bootstrap (Step 2c) — pre-populate the answers so the user only confirms/edits rather than typing from scratch.

### 2b. Decide whether the result is sufficient

Required-minimum fields: `brand_name`, `url`, `logo`, `colors` (with at least primary_bg + accent + text).

If all four are present, the brand spec is sufficient. Proceed to Step 2.5.

If `source === "tailwind+css"`, you have colors but probably nothing else. Surface to the user what you found and ask for the missing pieces in ONE AskUserQuestion batch.

If `source === "none"`, fall through to interactive bootstrap (2c).

### 2.5. WCAG validation via `@google/design.md` lint

If `schema === "google-labs"` AND the DESIGN.md was found (not bootstrapped this run), run the official Google Labs linter to validate brand-token accessibility before spending tokens on concept generation. The lint catches issues like "accent color has insufficient contrast against background" — issues that would otherwise surface as review-pass complaints AFTER an entire cover is rendered.

```bash
# Skip silently if the CLI isn't available; this is a quality nice-to-have, not a blocker
if command -v npx >/dev/null 2>&1; then
  npx --yes @google/design.md@latest lint <DESIGN.md path> 2>&1 || true
fi
```

Surface any WARNING/ERROR output to the user once, briefly. Continue regardless — the user may have intentionally non-compliant brand colors (e.g., a low-contrast accent reserved for decorative use only). Do NOT block the workflow.

If `--quick` is set, capture the lint output silently and only surface if there are blocking errors. Don't pause for warnings.

### 2c. Interactive bootstrap (`init-design.mjs`)

This writes a new `DESIGN.md` at the repo root so the user doesn't have to answer again on future invocations.

Use AskUserQuestion to gather:
1. Brand name
2. Site URL (e.g., `acme.com/blog`)
3. Logo path (SVG preferred; PNG fine; or "I'll paste the SVG" path)
4. Primary background color (hex)
5. Accent color (hex)
6. Display font family + weights
7. Mono/body font family + weights
8. (Optional) Editorial voice notes
9. (Optional) Visual preferences / things to avoid
10. (Optional) Consistency posture: `consistent` / `varied` / `neutral` (default neutral)

Write the answers to `./DESIGN.md` using the template at `{skill_root}/assets/DESIGN.md.template`. Tell the user the file was written so they can hand-edit later.

---

## Step 3 — Content extraction

### 3a. Markdown mode
Read the markdown file. Extract:
- **Title**: H1 or front-matter title
- **Slug**: filename without extension, or front-matter slug
- **Editorial angle**: first paragraph or front-matter description
- **Key data points**: numbered stats, currency values, percentage claims (grep for them) — list 3-5

Confirm the extracted info with the user via AskUserQuestion if anything is missing or ambiguous. If everything is clear, skip the confirmation.

### 3b. Prompt mode
The free-text arg IS the topic. Use AskUserQuestion to gather:
- Slug (kebab-case, used for filename)
- Editorial angle (1-2 sentences on what the post argues)
- (Optional) Key data points to feature

---

## Step 4 — Concept generation

### 4a. Optional: delegate to /frontend-design if installed

Check whether the user has the `/frontend-design` skill installed (it's an official Anthropic skill specialized in distinctive, production-grade UI design — strictly better at exotic visual treatments than a general prompt).

Detect via:
```bash
# Search common skill install paths
test -d ~/.claude/skills/frontend-design && echo "FRONTEND_DESIGN_OK" || \
find ~/.claude/plugins/cache -maxdepth 6 -name "frontend-design" -type d 2>/dev/null | head -1
```

If `/frontend-design` IS available, you have two options:
1. **Delegate (recommended for visually-distinctive brands)**: Invoke `/frontend-design` 3 times with the concept-generation brief as context, requesting one distinct archetype each time. Each invocation must specify a different layout archetype from the 7 listed in `references/concept-generation.md`. This generally produces higher-fidelity, more distinctive concepts than the default in-skill path.
2. **Use the in-skill path (default)**: skip delegation, proceed to 4b. This is what runs when `/frontend-design` is absent OR when the brand wants tightly-constrained corporate-feeling designs (delegation produces wilder design choices that may not fit conservative brands).

Surface this choice to the user via AskUserQuestion ONLY if the brand's `consistency` field is `varied` or `neutral`. If `consistency: consistent`, default to the in-skill path without asking — the user has signaled they want predictable output.

### 4b. In-skill concept generation

**If `--archetype <name>` is set**, you generate ONE concept using that specific archetype instead of 3 distinct ones. Skip the "3 different archetypes" rule and proceed to single-concept generation. The picker step (Step 6) is also skipped because there's nothing to pick — fast-forward to Step 7 (promote winner) immediately after rendering.

Read `{skill_root}/references/concept-generation.md` as your template. Fill in:
- All brand fields from Step 2
- Topic, angle, key data from Step 3
- Canvas size (default 2240x1260 or from `--size` / `canvas_size`)
- Slug
- Prior cover thumbnails: list every PNG in `.blog-covers/*.png` (excluding `.concepts/`)
- Consistency posture from DESIGN.md (default `neutral`)

Ensure `.blog-covers/` and `.blog-covers/.concepts/` exist. If `.gitignore` exists, append `.blog-covers/.concepts/` to it (once).

Also ensure `.blog-covers/_shared.css` exists. If absent, write it now with the brand variables wired in:
```css
:root {
  --bg: <primary_bg>;
  --accent: <accent>;
  --text: <text>;
  --muted: <muted-or-rgba-text-40>;
  --display: '<display_font>', system-ui, sans-serif;
  --mono: '<mono_font>', ui-monospace, monospace;
}
html, body { margin: 0; padding: 0; width: 100%; height: 100%; }
body { background: var(--bg); color: var(--text); font-family: var(--display);
  width: <canvas_width>px; height: <canvas_height>px; overflow: hidden; position: relative; }
@import url('https://fonts.googleapis.com/css2?family=<display>:wght@<weights>&family=<mono>:wght@<weights>&display=swap');
/* + brand-logo + brand-url base styles */
```

Generate three distinct concept HTMLs:
- `.blog-covers/.concepts/{slug}-a.html`
- `.blog-covers/.concepts/{slug}-b.html`
- `.blog-covers/.concepts/{slug}-c.html`

Each must follow the rules in `concept-generation.md`: distinct metaphor (not three variations of the same idea), readable type at feed scale, sourced or removed stats, no overlapping elements, brand row at bottom.

---

## Step 5 — Render concepts

```bash
node {skill_root}/scripts/render.mjs --batch .blog-covers/.concepts {canvas_width} {canvas_height}
```

Verify all three PNGs exist. If any failed, fix the offending HTML and re-render only the failures.

---

## Step 6 — Picker UI

**Skip this entire step** if either `--archetype <name>` (there's only one concept to pick) OR `--quick` (the auto-pick rule below replaces user choice). For `--quick`, auto-pick logic:
- If `--archetype` is also set: trivially pick the one concept generated
- Otherwise: spawn a lightweight subagent with the 3 PNGs and ask it to pick the strongest one given the brand's `consistency` posture and the post topic. The subagent returns "A", "B", or "C" and a 1-sentence reason. Log the auto-pick decision in the final report so the user can see what was chosen and why.

Otherwise (no `--quick`, no `--archetype`):

**Critical: the user must actually SEE the PNGs in their OS image viewer.** The Read tool displays images to YOU (the assistant) but not necessarily to the user — depending on their UI it may or may not render inline, and even when it does they can't manipulate, zoom, or save them. You MUST open the files in the user's native image viewer.

Do this exactly:

### 6a. Open all 3 PNGs in the user's OS viewer

Detect platform and use the appropriate open command:

```bash
case "$(uname -s)" in
  Darwin)  OPEN=open ;;
  Linux)   OPEN=xdg-open ;;
  MINGW*|MSYS*|CYGWIN*) OPEN=start ;;
  *)       OPEN=open ;;
esac

$OPEN .blog-covers/.concepts/{slug}-a.png
$OPEN .blog-covers/.concepts/{slug}-b.png
$OPEN .blog-covers/.concepts/{slug}-c.png
```

On macOS, this pops all three open in Preview at full resolution. On Linux/Windows, the default image viewer. The user can see them, zoom, switch between, take their time.

### 6b. Also tell the user the absolute paths

Even with `open` succeeding, print the absolute paths so the user can re-open later, share, or inspect:

```
Concepts open in Preview. Paths:
  A: /absolute/path/.blog-covers/.concepts/{slug}-a.png  (archetype: centered hero)
  B: /absolute/path/.blog-covers/.concepts/{slug}-b.png  (archetype: stacked vertical)
  C: /absolute/path/.blog-covers/.concepts/{slug}-c.png  (archetype: edge-anchored)
```

### 6c. Also do `Read` on each for your own reference

After opening for the user, call Read on each PNG so you can also see them and write accurate one-line descriptions for the picker labels. The Read is for YOU; the `open` is for the USER. Do not skip either.

### 6d. AskUserQuestion to pick

```
Which concept do you want to refine?
A) {archetype}: {one-line description}
B) {archetype}: {one-line description}
C) {archetype}: {one-line description}
D) None — generate 3 new concepts
```

The label MUST name the archetype so the user picks based on layout AND content.

### 6e. If user picks D

Regenerate 3 fresh concepts (cap at 3 total retry rounds). Each retry must explicitly diverge from prior rejected concepts: pass both the rejected thumbnails AND a list of rejected archetypes to the prompt as "do not repeat these archetypes or these visual approaches". After regenerating, repeat 6a–6d (open them in viewer, Read, ask).

---

## Step 7 — Promote winner

When the user picks A/B/C:
1. Copy the winning HTML to `.blog-covers/{slug}.html`
2. **CRITICAL: rewrite the stylesheet path.** The concept HTMLs in `.concepts/` reference `../_shared.css` (one level up). The promoted HTML at `.blog-covers/{slug}.html` is in the same directory as `_shared.css`, so the path must become `_shared.css`. Use:
   ```bash
   sed -i '' 's|href="../_shared.css"|href="_shared.css"|' .blog-covers/{slug}.html
   ```
   (or the equivalent on non-macOS: `sed -i 's|href="../_shared.css"|href="_shared.css"|' ...`)
   
   Skipping this step ships a cover with no CSS loaded — browser default white background bleeds through and the design breaks. This bug doesn't appear in the concept previews (where the relative path resolves correctly) and only manifests after promote.
3. Delete the other two concepts from `.blog-covers/.concepts/`
4. Re-render the final PNG:
   ```bash
   node {skill_root}/scripts/render.mjs .blog-covers/{slug}.html .blog-covers/{slug}.png {w} {h}
   ```
5. Open the final PNG in the user's OS viewer using the same platform-detection logic from Step 6a:
   ```bash
   case "$(uname -s)" in Darwin) OPEN=open;; Linux) OPEN=xdg-open;; *) OPEN=start;; esac
   $OPEN .blog-covers/{slug}.png
   ```
   Also call Read on the PNG so you can verify it for the user. **Verify the brand colors actually rendered** — if you see the wrong background color, the CSS path rewrite (step 2 above) was missed.

---

## Step 8 — Review

### 8a. Claude unbiased subagent (always runs)

Spawn an Agent with `subagent_type: general-purpose`. The prompt is the contents of `{skill_root}/references/review.md` with the placeholders filled in. The subagent has no prior conversation context — it's a fresh perspective.

The subagent must:
- Rate the cover 1-10
- List **ALL** issues, numbered, with what/why/fix per item
- Surface cross-cutting patterns
- Name the single highest-impact fix

### 8b. Codex adversarial review (only if `--codex` flag set)

Check the Codex CLI is installed:
```bash
CODEX_BIN=$(which codex 2>/dev/null || echo "")
```

If missing, warn the user "Codex CLI not installed — skipping adversarial review (install with `npm install -g @openai/codex` to enable)." Continue without it.

If present, run:
```bash
codex exec "<the same review prompt, with adversarial framing prepended>" \
  -C "$(pwd)" -s read-only \
  -c 'model_reasoning_effort="high"' \
  < /dev/null 2>/dev/null
```

Adversarial framing prefix:
> Be adversarial. Try to break this cover. Flag marketing fluff, fake-precision stats, visual clichés, type collisions, unclear hierarchy, illegible captions. List ALL issues, not just top ones.

### 8c. Present findings

Show both reviews verbatim. If Codex also ran, add a brief cross-model agreement summary:

```
CROSS-MODEL AGREEMENT
  Both flagged: [issues both raised]
  Only Claude: [Claude-unique]
  Only Codex: [Codex-unique]
```

---

## Step 9 — Apply fixes (user-gated)

**Skip this step entirely if `--quick` is set.** Auto-choose option C (skip fixes, ship as-is) and proceed to Step 10. Log in the final report that fixes were skipped due to `--quick` along with a one-line summary of the review verdict so the user can re-run without `--quick` later if they want to apply fixes.

Otherwise, DO NOT auto-apply fixes. Use AskUserQuestion:

```
Apply review fixes?
A) Apply all consensus fixes (issues both reviewers flagged)
B) Apply specific fixes — I'll pick from the list
C) Skip fixes — ship as-is
D) Discard this cover and start over
```

If A or B: edit `.blog-covers/{slug}.html`, re-render, show the new PNG. Loop back to Step 8 if user wants another review pass (max 3 total review rounds per cover — flag if exceeded).

If C: report final paths to user.

If D: delete `.blog-covers/{slug}.{html,png}`, return to Step 4.

---

## Step 10 — Done

Open the final PNG one more time in the user's OS viewer (in case they closed it during the review loop):
```bash
case "$(uname -s)" in Darwin) OPEN=open;; Linux) OPEN=xdg-open;; *) OPEN=start;; esac
$OPEN .blog-covers/{slug}.png
```

Report final artifacts with absolute paths the user can click:

```
Cover ready and open in your default viewer.

  PNG:  /absolute/path/.blog-covers/{slug}.png
  HTML: /absolute/path/.blog-covers/{slug}.html (kept for hand-tweaking — re-run `node {skill_root}/scripts/render.mjs ...` if you edit it)

Final rating: N/10 (from review pass)
```

Do not commit to git — the user controls their git state.

---

## Notes

- **Loop protection**: cap at 3 retry rounds in Step 6 and 3 review rounds in Step 8. If exceeded, stop and tell the user the skill can't satisfy the constraint set — manual intervention needed.
- **No auto-fix**: every fix is gated by user choice. The skill surfaces; the user decides.
- **No git side effects**: the skill never runs `git add`, `git commit`, or `git push`. It writes files; the user commits.
- **Brand respect**: do not override user brand choices. If DESIGN.md says `consistency: consistent`, do not generate wildly varied concepts. If it says `varied`, explicitly diverge from prior covers.
- **AI vocabulary ban applies to ALL generated content**: cover text, concept descriptions presented to user, review prompts. No "delve / robust / comprehensive / nuanced / pivotal / landscape / tapestry / underscore / foster / showcase / intricate / vibrant / fundamental / significant". No em dashes.
