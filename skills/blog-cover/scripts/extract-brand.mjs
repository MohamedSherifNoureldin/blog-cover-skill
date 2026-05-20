#!/usr/bin/env node
/**
 * Brand auto-discovery waterfall.
 *
 * Priority order:
 *   1. DESIGN.md (Google Labs official spec — YAML frontmatter + structured tokens)
 *      https://github.com/google-labs-code/design.md
 *   2. DESIGN.md (gstack legacy format — prose-only, no YAML frontmatter)
 *      https://github.com/garryslist/gstack
 *   3. BRAND.md (treated as gstack-style)
 *   4. tailwind.config.{js,ts,mjs,cjs} + src/index.css / app/globals.css :root vars
 *
 * Emits a normalized JSON object to stdout. The SKILL.md orchestrator
 * decides whether the result is sufficient or whether to fall through
 * to interactive bootstrap.
 *
 * Usage: node extract-brand.mjs [repo-root]
 */

import { existsSync, readFileSync, statSync } from "fs";
import { resolve, join } from "path";
import { parse as parseYaml } from "yaml";

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

function tryReadFile(p) {
  try {
    return existsSync(p) ? readFileSync(p, "utf8") : null;
  } catch {
    return null;
  }
}

/**
 * Parser 1: Google Labs official DESIGN.md spec.
 * https://github.com/google-labs-code/design.md/blob/main/docs/spec.md
 *
 * Required fields: name + colors.primary.
 */
function parseGoogleDesignMd(md, absPath) {
  const fmMatch = md.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!fmMatch) return null;

  let fm;
  try {
    fm = parseYaml(fmMatch[1]);
  } catch {
    return null;
  }

  if (
    !fm ||
    typeof fm.name !== "string" ||
    !fm.colors ||
    typeof fm.colors.primary !== "string"
  ) {
    return null;
  }

  const body = fmMatch[2];
  const sections = {};
  for (const sec of [
    "Overview",
    "Colors",
    "Typography",
    "Layout",
    "Elevation & Depth",
    "Shapes",
    "Components",
    "Do's and Don'ts",
  ]) {
    const safe = sec.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`##\\s+${safe}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, "i");
    const m = body.match(re);
    if (m) sections[sec] = m[1].trim();
  }

  // Normalize typography tokens to display/mono picks for downstream consumers.
  // Largest fontSize → display. First family containing mono/code/courier → mono.
  let displayFont = null;
  let monoFont = null;
  if (fm.typography) {
    let maxSize = 0;
    for (const [, def] of Object.entries(fm.typography)) {
      if (!def) continue;
      const sizePx = parseFloat(String(def.fontSize || "0"));
      if (sizePx > maxSize) {
        maxSize = sizePx;
        displayFont = {
          family: def.fontFamily,
          weights: def.fontWeight ? String(def.fontWeight) : null,
        };
      }
      const fam = String(def.fontFamily || "").toLowerCase();
      if (
        !monoFont &&
        (fam.includes("mono") || fam.includes("code") || fam.includes("courier"))
      ) {
        monoFont = {
          family: def.fontFamily,
          weights: def.fontWeight ? String(def.fontWeight) : null,
        };
      }
    }
  }

  return {
    source: "design.md (Google spec)",
    schema: "google-labs",
    path: absPath,
    brand_name: fm.name,
    url: null,
    logo: null,
    colors: fm.colors,
    typography_tokens: fm.typography || null,
    rounded: fm.rounded || null,
    spacing: fm.spacing || null,
    components: fm.components || null,
    fonts: { display: displayFont, mono: monoFont, source: null },
    voice_notes: sections["Overview"] || null,
    visual_notes:
      [sections["Do's and Don'ts"], sections["Components"]]
        .filter(Boolean)
        .join("\n\n") || null,
    sections,
    canvas_size: null,
    consistency: null,
    output_dir: null,
    raw_excerpts: {
      version: fm.version || null,
      description: fm.description || null,
    },
  };
}

/**
 * Parser 2: gstack legacy DESIGN.md format (prose-only, no YAML frontmatter).
 * Sections we expect: ## Color / ## Typography / ## Layout / etc.
 * Note: gstack uses ## Color (singular); Google uses ## Colors (plural).
 */
function parseGstackDesignMd(md, absPath) {
  const sections = {};
  for (const sec of [
    "Product Context",
    "Aesthetic Direction",
    "Typography",
    "Color",
    "Spacing",
    "Layout",
    "Motion",
    "Decisions Log",
  ]) {
    const safe = sec.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`##\\s+${safe}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, "i");
    const m = md.match(re);
    if (m) sections[sec] = m[1].trim();
  }
  if (Object.keys(sections).length === 0) return null;

  const titleMatch = md.match(/^#\s+(.+)$/m);
  const brandName = titleMatch
    ? titleMatch[1].replace(/^Design System\s*[—-]\s*/i, "").trim()
    : null;

  const colors = {};
  if (sections["Color"]) {
    const hexes = sections["Color"].matchAll(
      /\*\*([A-Za-z][A-Za-z0-9_-]*):?\*\*\s*\[?(#[0-9a-fA-F]{3,8})/g
    );
    for (const m of hexes) colors[m[1].toLowerCase()] = m[2];
  }

  return {
    source: "design.md (gstack legacy)",
    schema: "gstack",
    path: absPath,
    brand_name: brandName,
    url: null,
    logo: null,
    colors: Object.keys(colors).length ? colors : null,
    typography_tokens: null,
    rounded: null,
    spacing: null,
    components: null,
    fonts: null,
    voice_notes:
      [sections["Product Context"], sections["Aesthetic Direction"]]
        .filter(Boolean)
        .join("\n\n") || null,
    visual_notes:
      [sections["Aesthetic Direction"], sections["Motion"]]
        .filter(Boolean)
        .join("\n\n") || null,
    sections,
    canvas_size: null,
    consistency: null,
    output_dir: null,
    raw_excerpts: {},
  };
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
  const m = triplet.match(/^\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*$/);
  if (!m) return null;
  const h = parseFloat(m[1]) / 360;
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h * 12) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c).toString(16).padStart(2, "0");
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
      const direct = rootBlock[1].matchAll(
        /--([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(#[0-9a-fA-F]{3,8}|rgb[a]?\([^)]+\)|hsl[a]?\([^)]+\))/g
      );
      for (const m of direct) colors[m[1]] = m[2];
      const bareHsl = rootBlock[1].matchAll(
        /--([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*([\d.]+\s+[\d.]+%\s+[\d.]+%)\s*;/g
      );
      for (const m of bareHsl) {
        if (colors[m[1]]) continue;
        const hex = hslTripletToHex(m[2]);
        if (hex) colors[m[1]] = hex;
      }
    }
    return Object.keys(colors).length ? { path: abs, colors } : null;
  }
  return null;
}

function discover(root) {
  // DESIGN.md (try Google spec first, then gstack legacy)
  const designPath = findFirst(root, DESIGN_LOCATIONS);
  if (designPath) {
    const md = readFileSync(designPath, "utf8");
    const google = parseGoogleDesignMd(md, designPath);
    if (google) return google;
    const gstack = parseGstackDesignMd(md, designPath);
    if (gstack) return gstack;
    return {
      source: "design.md (unknown format)",
      schema: "unknown",
      path: designPath,
      brand_name: null,
      url: null,
      logo: null,
      colors: null,
      fonts: null,
      voice_notes: null,
      visual_notes: null,
      sections: {},
      canvas_size: null,
      consistency: null,
      output_dir: null,
      raw_excerpts: {
        note: "DESIGN.md exists but matches neither Google's official spec nor gstack's legacy format.",
      },
    };
  }

  // BRAND.md (gstack-style legacy)
  const brandPath = findFirst(root, BRAND_LOCATIONS);
  if (brandPath) {
    const md = readFileSync(brandPath, "utf8");
    const gstack = parseGstackDesignMd(md, brandPath);
    if (gstack) return { ...gstack, source: "brand.md (gstack legacy)" };
  }

  // Tailwind + CSS fallback
  const tw = extractTailwindColors(root);
  const css = extractRootCssVars(root);
  if (tw || css) {
    const merged = { ...(tw?.colors || {}), ...(css?.colors || {}) };
    return {
      source: "tailwind+css",
      schema: "css-tokens",
      path: tw?.path || css?.path || null,
      brand_name: null,
      url: null,
      logo: null,
      colors: merged,
      typography_tokens: null,
      rounded: null,
      spacing: null,
      components: null,
      fonts: null,
      voice_notes: null,
      visual_notes: null,
      sections: {},
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
    schema: null,
    path: null,
    brand_name: null,
    url: null,
    logo: null,
    colors: null,
    typography_tokens: null,
    rounded: null,
    spacing: null,
    components: null,
    fonts: null,
    voice_notes: null,
    visual_notes: null,
    sections: {},
    canvas_size: null,
    consistency: null,
    output_dir: null,
    raw_excerpts: {},
  };
}

const root = resolve(process.argv[2] || process.cwd());
console.log(JSON.stringify(discover(root), null, 2));
