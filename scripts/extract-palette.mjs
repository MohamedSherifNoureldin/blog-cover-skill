#!/usr/bin/env node
/**
 * Ref-image palette extractor.
 *
 * Given an image (logo, hero screenshot, brand reference), extract the
 * dominant colors and emit them as a brand-spec JSON the orchestrator
 * can plug into a DESIGN.md.
 *
 * Strategy:
 *   1. Resize to 200x200 for cheap analysis (preserves dominant colors,
 *      drops anti-alias noise).
 *   2. Quantize to a small palette via posterize.
 *   3. Histogram-count every pixel by quantized color, sort by frequency.
 *   4. Filter out near-white and near-black "neutral" pixels (they dominate
 *      most images and aren't useful as brand colors).
 *   5. Pick the top N distinct (by perceptual distance) colors.
 *   6. Heuristically classify into bg / accent / text roles:
 *      - bg     = darkest dominant or lightest dominant (whichever dominates)
 *      - accent = highest-saturation non-neutral color
 *      - text   = #ffffff if bg is dark, #0a0a0a if bg is light
 *
 * Usage:
 *   node extract-palette.mjs <image-path> [--n 5]
 *
 * Output: JSON to stdout.
 *   {
 *     dominant: [{ hex, count }, ...],
 *     suggested: { primary_bg, accent, text, muted },
 *     source_path: "/abs/path"
 *   }
 */

import sharp from "sharp";
import { existsSync } from "fs";
import { resolve } from "path";

const ANALYSIS_SIZE = 200;
const QUANTIZE_STEP = 24; // colors per channel after quantize: 256/24 ≈ 11
const NEUTRAL_FLOOR = 18; // luma <= this is "near-black"
const NEUTRAL_CEILING = 240; // luma >= this is "near-white"

function rgbToHex(r, g, b) {
  const h = (n) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

function quantize(v) {
  return Math.min(255, Math.round(v / QUANTIZE_STEP) * QUANTIZE_STEP);
}

function luma(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function saturation(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

function perceptualDistance(a, b) {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

async function extract(imagePath, n = 5) {
  const abs = resolve(imagePath);
  if (!existsSync(abs)) {
    throw new Error(`Image not found: ${abs}`);
  }

  const { data, info } = await sharp(abs)
    .resize(ANALYSIS_SIZE, ANALYSIS_SIZE, { fit: "inside" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const counts = new Map();
  const pixelCount = info.width * info.height;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 128) continue; // skip transparent pixels
    const r = quantize(data[i]);
    const g = quantize(data[i + 1]);
    const b = quantize(data[i + 2]);
    const key = (r << 16) | (g << 8) | b;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const all = Array.from(counts.entries())
    .map(([key, count]) => ({
      r: (key >> 16) & 0xff,
      g: (key >> 8) & 0xff,
      b: key & 0xff,
      count,
      hex: rgbToHex((key >> 16) & 0xff, (key >> 8) & 0xff, key & 0xff),
    }))
    .sort((a, b) => b.count - a.count);

  // Separate neutrals (dominant bg/fg) from chromatic candidates
  const neutrals = all.filter((c) => {
    const L = luma(c.r, c.g, c.b);
    return L <= NEUTRAL_FLOOR || L >= NEUTRAL_CEILING || saturation(c.r, c.g, c.b) < 0.1;
  });
  const chromatic = all.filter((c) => {
    const L = luma(c.r, c.g, c.b);
    return L > NEUTRAL_FLOOR && L < NEUTRAL_CEILING && saturation(c.r, c.g, c.b) >= 0.1;
  });

  // Take top N distinct chromatic colors
  const dominantChromatic = [];
  for (const c of chromatic) {
    if (
      dominantChromatic.every(
        (d) => perceptualDistance(c, d) > QUANTIZE_STEP * 2
      )
    ) {
      dominantChromatic.push(c);
      if (dominantChromatic.length >= n) break;
    }
  }

  // Corner-sampling heuristic: in a designed image, the 4 corners are
  // almost always true background (not content). Sample a 10px patch from
  // each corner, find the dominant quantized color across corners, and
  // prefer that as primary_bg over global pixel-count dominance.
  function sampleCorner(x0, y0) {
    const tally = new Map();
    for (let y = y0; y < y0 + 10 && y < info.height; y++) {
      for (let x = x0; x < x0 + 10 && x < info.width; x++) {
        const i = (y * info.width + x) * 4;
        if (data[i + 3] < 128) continue;
        const r = quantize(data[i]);
        const g = quantize(data[i + 1]);
        const b = quantize(data[i + 2]);
        const key = (r << 16) | (g << 8) | b;
        tally.set(key, (tally.get(key) || 0) + 1);
      }
    }
    if (tally.size === 0) return null;
    const [topKey] = Array.from(tally.entries()).sort((a, b) => b[1] - a[1])[0];
    return {
      r: (topKey >> 16) & 0xff,
      g: (topKey >> 8) & 0xff,
      b: topKey & 0xff,
      hex: rgbToHex((topKey >> 16) & 0xff, (topKey >> 8) & 0xff, topKey & 0xff),
    };
  }
  const corners = [
    sampleCorner(0, 0),
    sampleCorner(info.width - 10, 0),
    sampleCorner(0, info.height - 10),
    sampleCorner(info.width - 10, info.height - 10),
  ].filter(Boolean);

  // Group corners by hex; if 3+ corners agree, that's the bg
  const cornerTally = new Map();
  for (const c of corners) {
    cornerTally.set(c.hex, (cornerTally.get(c.hex) || 0) + 1);
  }
  let cornerBg = null;
  for (const [hex, votes] of cornerTally.entries()) {
    if (votes >= Math.ceil(corners.length / 2)) {
      cornerBg = corners.find((c) => c.hex === hex);
      break;
    }
  }

  // Classify: prefer cornerBg, fall back to dominant neutral
  const dominantNeutral = cornerBg || neutrals[0] || all[0];
  const bgIsDark = luma(dominantNeutral.r, dominantNeutral.g, dominantNeutral.b) < 128;

  const accent =
    dominantChromatic.sort(
      (a, b) => saturation(b.r, b.g, b.b) - saturation(a.r, a.g, a.b)
    )[0] || dominantChromatic[0];

  const suggested = {
    primary_bg: dominantNeutral.hex,
    accent: accent?.hex || (bgIsDark ? "#00E676" : "#0F62FE"),
    text: bgIsDark ? "#ffffff" : "#0a0a0a",
    muted: bgIsDark ? "rgba(255,255,255,0.40)" : "rgba(10,10,10,0.55)",
  };

  return {
    source_path: abs,
    bg_is_dark: bgIsDark,
    dominant: [
      ...all.slice(0, 3).map((c) => ({ hex: c.hex, count: c.count, role: "dominant" })),
      ...dominantChromatic.map((c) => ({ hex: c.hex, count: c.count, role: "chromatic" })),
    ],
    suggested,
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === "--help") {
    console.error("Usage: node extract-palette.mjs <image-path> [--n N]");
    process.exit(1);
  }
  const imagePath = args[0];
  const nIdx = args.indexOf("--n");
  const n = nIdx >= 0 ? parseInt(args[nIdx + 1], 10) || 5 : 5;
  const result = await extract(imagePath, n);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
