#!/usr/bin/env node
/**
 * Brand auto-discovery waterfall.
 *
 * Walks the repo in priority order:
 *   1. DESIGN.md      (project root, then docs/, then .blog-covers/)
 *   2. BRAND.md       (same locations)
 *   3. tailwind.config.{js,ts,mjs,cjs} + src/index.css / app/globals.css
 *
 * Emits JSON to stdout describing what was found. The SKILL.md orchestrator
 * decides whether the result is sufficient or whether to fall through to
 * interactive mode.
 *
 * Usage:
 *   node extract-brand.mjs [repo-root]
 *
 * Output: JSON to stdout, ALWAYS valid even if nothing found.
 */

import { existsSync, readFileSync, statSync } from "fs";
import { resolve, join } from "path";

const DESIGN_LOCATIONS = [
  "DESIGN.md",
  "docs/DESIGN.md",
  ".blog-covers/DESIGN.md",
];
const BRAND_LOCATIONS = [
  "BRAND.md",
  "docs/BRAND.md",
  ".blog-covers/BRAND.md",
];

function findFirst(root, paths) {
  for (const p of paths) {
    const abs = join(root, p);
    if (existsSync(abs) && statSync(abs).isFile()) return abs;
  }
  return null;
}

function parseFrontMatter(md) {
  const m = md.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!m) return {};
  const body = m[1];
  const out = {};
  for (const line of body.split("\n")) {
    const kv = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.+?)\s*$/);
    if (!kv) continue;
    let val = kv[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[kv[1]] = val;
  }
  return out;
}

function parseSection(md, heading) {
  const re = new RegExp(`##\\s+${heading}[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, "i");
  const m = md.match(re);
  return m ? m[1].trim() : null;
}

function parseKVList(section) {
  if (!section) return {};
  const out = {};
  for (const line of section.split("\n")) {
    const kv = line.match(/^\s*-\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.+?)\s*$/);
    if (!kv) continue;
    let val = kv[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[kv[1]] = val;
  }
  return out;
}

function parseFontLine(val) {
  if (!val) return null;
  const m = val.match(/^"([^"]+)"\s*,?\s*(.*)$/);
  if (m) return { family: m[1], weights: m[2].trim() || null };
  return { family: val, weights: null };
}

function parseMarkdownBrand(absPath, sourceLabel) {
  const md = readFileSync(absPath, "utf8");
  const fm = parseFrontMatter(md);
  const palette = parseKVList(parseSection(md, "Palette"));
  const type = parseKVList(parseSection(md, "Typography"));
  const voice = parseSection(md, "Voice") || parseSection(md, "Voice / editorial tone");
  const visual = parseSection(md, "Visual preferences") || parseSection(md, "Visual");

  return {
    source: sourceLabel,
    path: absPath,
    brand_name: fm.brand_name || null,
    url: fm.url || null,
    logo: fm.logo || null,
    colors: Object.keys(palette).length ? palette : null,
    fonts: {
      display: type.display ? parseFontLine(type.display) : null,
      mono: type.mono ? parseFontLine(type.mono) : null,
      source: type.source || null,
    },
    voice_notes: voice,
    visual_notes: visual,
    canvas_size: fm.canvas_size || null,
    consistency: fm.consistency || null,
    output_dir: fm.output_dir || null,
    raw_excerpts: {},
  };
}

function tryReadFile(p) {
  try {
    return existsSync(p) ? readFileSync(p, "utf8") : null;
  } catch {
    return null;
  }
}

function extractTailwindColors(root) {
  const candidates = [
    "tailwind.config.ts",
    "tailwind.config.js",
    "tailwind.config.mjs",
    "tailwind.config.cjs",
  ];
  for (const c of candidates) {
    const abs = join(root, c);
    const src = tryReadFile(abs);
    if (!src) continue;
    const colors = {};
    const colorBlock = src.match(/colors\s*:\s*{([\s\S]*?)\n\s*}/);
    if (colorBlock) {
      const hexes = colorBlock[1].matchAll(
        /['"]?([a-zA-Z_][a-zA-Z0-9_]*)['"]?\s*:\s*['"](#[0-9a-fA-F]{3,8})['"]/g
      );
      for (const m of hexes) colors[m[1]] = m[2];
    }
    return Object.keys(colors).length ? { path: abs, colors } : null;
  }
  return null;
}

function hslTripletToHex(triplet) {
  // "158 100% 45%" → "#00e676"
  const m = triplet.match(
    /^\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*$/
  );
  if (!m) return null;
  const h = parseFloat(m[1]) / 360;
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h * 12) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function extractRootCssVars(root) {
  const candidates = [
    "src/index.css",
    "src/app.css",
    "app/globals.css",
    "src/styles/globals.css",
    "styles/globals.css",
  ];
  for (const c of candidates) {
    const abs = join(root, c);
    const src = tryReadFile(abs);
    if (!src) continue;
    const colors = {};
    const rootBlock = src.match(/:root\s*{([\s\S]*?)}/);
    if (rootBlock) {
      // 1. Direct hex / rgb() / hsl() function values
      const direct = rootBlock[1].matchAll(
        /--([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(#[0-9a-fA-F]{3,8}|rgb[a]?\([^)]+\)|hsl[a]?\([^)]+\))/g
      );
      for (const m of direct) colors[m[1]] = m[2];

      // 2. Bare HSL triplets (shadcn/ui pattern):
      //    --primary: 158 100% 45%;
      const bareHsl = rootBlock[1].matchAll(
        /--([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*([\d.]+\s+[\d.]+%\s+[\d.]+%)\s*;/g
      );
      for (const m of bareHsl) {
        if (colors[m[1]]) continue; // direct value wins
        const hex = hslTripletToHex(m[2]);
        if (hex) colors[m[1]] = hex;
      }
    }
    return Object.keys(colors).length ? { path: abs, colors } : null;
  }
  return null;
}

function discover(root) {
  const designPath = findFirst(root, DESIGN_LOCATIONS);
  if (designPath) return parseMarkdownBrand(designPath, "design.md");

  const brandPath = findFirst(root, BRAND_LOCATIONS);
  if (brandPath) return parseMarkdownBrand(brandPath, "brand.md");

  const tw = extractTailwindColors(root);
  const css = extractRootCssVars(root);
  if (tw || css) {
    const merged = { ...(tw?.colors || {}), ...(css?.colors || {}) };
    return {
      source: "tailwind+css",
      path: tw?.path || css?.path || null,
      brand_name: null,
      url: null,
      logo: null,
      colors: merged,
      fonts: null,
      voice_notes: null,
      visual_notes: null,
      canvas_size: null,
      consistency: null,
      output_dir: null,
      raw_excerpts: {
        tailwind_path: tw?.path || null,
        css_path: css?.path || null,
      },
    };
  }

  return {
    source: "none",
    path: null,
    brand_name: null,
    url: null,
    logo: null,
    colors: null,
    fonts: null,
    voice_notes: null,
    visual_notes: null,
    canvas_size: null,
    consistency: null,
    output_dir: null,
    raw_excerpts: {},
  };
}

const root = resolve(process.argv[2] || process.cwd());
console.log(JSON.stringify(discover(root), null, 2));
