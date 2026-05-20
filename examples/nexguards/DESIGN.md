---
version: alpha
name: NexGuards
description: Cybersecurity platform delivering AI-powered phishing simulation and security awareness training for US fintech and SaaS companies.
colors:
  primary: "#00E676"
  accent: "#00E676"
  background: "#050706"
  warning: "#ff3b30"
  text: "#ffffff"
  muted: "rgba(255,255,255,0.40)"
typography:
  display-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 168px
    fontWeight: 800
    lineHeight: 0.92
    letterSpacing: "-0.045em"
  display-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 96px
    fontWeight: 700
    lineHeight: 1.0
    letterSpacing: "-0.03em"
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: 400
    lineHeight: 1.5
  label-sm:
    fontFamily: IBM Plex Mono
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.22em"
  source-cite:
    fontFamily: IBM Plex Mono
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.18em"
rounded:
  sm: 4px
  md: 8px
  lg: 14px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 32px
  xl: 64px
  2xl: 100px
components:
  cover-canvas:
    backgroundColor: "{colors.background}"
    width: 2240px
    height: 1260px
  brand-logo:
    color: "{colors.text}"
  brand-url:
    color: "{colors.muted}"
    fontFamily: "{typography.label-sm.fontFamily}"
url: "nexguards.com/blog"
logo: "./public/nexguards-logo.svg"
canvas_size: "2240x1260"
consistency: "varied"
output_dir: ".blog-covers"
---

## Overview

NexGuards is a B2B cybersecurity platform. Audience is CISOs and security leaders at US fintech and SaaS companies of 200-2,000 employees. The brand reads as enterprise-serious, source-cited, and unsentimental. Visual language is dark + neon green, evoking terminal/forensics rather than consumer-AI gloss.

Editorial voice is blunt. No marketing fluff. No em dashes. Never use AI vocabulary (delve, robust, comprehensive, nuanced, pivotal, landscape, tapestry, underscore, foster, showcase, intricate, vibrant, fundamental, significant). Customer references are anonymized. US audience only — no MENA or regional references.

## Colors

**Primary / Accent (#00E676):** The single neon-green accent. Used sparingly for emphasis, CTAs, and the single most arresting element on each cover. Should never carry an information-loss meaning (use warning red for that).

**Background (#050706):** Near-black canvas backdrop. Slightly warmer than pure black. Reads as "terminal" rather than "void".

**Warning (#ff3b30):** Used only for information-loss / breach / attack context. Never decorative.

**Text (#ffffff):** Pure white for primary text on the dark canvas.

**Muted (rgba(255,255,255,0.40)):** Captions, source citations, secondary information.

## Typography

**Plus Jakarta Sans** for all headlines, display copy, body text, and CTAs. Weights 300/400/600/700/800 loaded from Google Fonts. Display sizes range from 96px (eyebrow headlines) to 220px (hero numbers).

**IBM Plex Mono** for labels, source citations, kickers, and any technical/forensic copy. Always uppercase with letter-spacing 0.22em. Minimum size 14px for any user-facing caption (this is non-negotiable — anything smaller becomes illegible at LinkedIn-feed scale).

## Layout

Canvas is 2240x1260 (16:9 widescreen). Designed for Ghost CMS blog hero and LinkedIn / X link-preview rendering. All compositions should reserve the bottom 120px for the brand row (logo bottom-left, URL bottom-right). No content should overlap this safe area.

Cover compositions should pick one of 7 archetypes per blog-cover skill convention: centered hero, two-pane split, full-bleed artifact, stacked vertical, diagonal asymmetric, grid matrix, edge-anchored. No two covers in the published set should use the same archetype unless `consistency: consistent` is the explicit brand posture.

## Do's and Don'ts

**Do:**
- Use real artifacts as evidence (email mockups, terminal frames, chat UIs, org tree fragments, kill chains)
- Source every stat inline at minimum 16px mono
- Let one concrete visual carry the editorial point per cover
- Reserve neon green for the single most important element on the canvas

**Don't:**
- Stock 3D faces, generic radial gradients, cliché icon grids
- Bottom 3-stat-strip template (the "stat tic" that emerges from sequential cover generation)
- Unsourced precision numbers (e.g., "82% of attacks…" without a citation)
- Big-number-with-no-visual-idea hero treatments
- Use neon green to signify loss or breach (red is the only loss color)

---

<!--
This DESIGN.md follows Google Labs DESIGN.md specification (alpha):
https://github.com/google-labs-code/design.md
-->
