#!/usr/bin/env node
/**
 * Interactive DESIGN.md bootstrapper.
 *
 * Called when brand discovery returns `source: "none"` or the user passed
 * --interactive. Reads answers from stdin one per line (the SKILL.md
 * orchestrator passes the values via AskUserQuestion and pipes them in).
 *
 * Stdin format (one value per line, in order):
 *   brand_name
 *   url
 *   logo_path
 *   primary_bg
 *   accent
 *   text_color (default #ffffff if blank)
 *   display_font
 *   display_weights
 *   mono_font
 *   mono_weights
 *   font_source (google_fonts | local)
 *   voice_notes (can be multi-line; ended by line "---END---")
 *   visual_notes (can be multi-line; ended by line "---END---")
 *   consistency (consistent | varied | neutral)
 *
 * Usage:
 *   node init-design.mjs <output-path> < answers.txt
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const TEMPLATE_PATH = join(__dirname, "..", "templates", "DESIGN.md.template");

function readStdin() {
  const data = readFileSync(0, "utf8");
  return data.split("\n");
}

function readMultiLine(lines, idx) {
  const out = [];
  while (idx < lines.length && lines[idx].trim() !== "---END---") {
    out.push(lines[idx]);
    idx++;
  }
  return { value: out.join("\n").trim(), nextIdx: idx + 1 };
}

function main() {
  const out = resolve(process.argv[2] || "./DESIGN.md");
  if (existsSync(out)) {
    console.error(
      `Refusing to overwrite ${out}. Delete it first or pick a different path.`
    );
    process.exit(2);
  }

  if (!existsSync(TEMPLATE_PATH)) {
    console.error(`Template missing: ${TEMPLATE_PATH}`);
    process.exit(2);
  }

  const lines = readStdin();
  let i = 0;
  const next = () => (lines[i++] ?? "").trim();

  const brand_name = next();
  const url = next();
  const logo = next();
  const primary_bg = next();
  const accent = next();
  const text = next() || "#ffffff";
  const display_font = next();
  const display_weights = next();
  const mono_font = next();
  const mono_weights = next();
  const font_source = next() || "google_fonts";
  const voiceParse = readMultiLine(lines, i);
  i = voiceParse.nextIdx;
  const visualParse = readMultiLine(lines, i);
  i = visualParse.nextIdx;
  const consistency = next() || "neutral";

  let tmpl = readFileSync(TEMPLATE_PATH, "utf8");
  tmpl = tmpl
    .replace(/{{BRAND_NAME}}/g, brand_name)
    .replace(/{{URL}}/g, url)
    .replace(/{{LOGO_PATH}}/g, logo)
    .replace(/{{PRIMARY_BG}}/g, primary_bg)
    .replace(/{{ACCENT}}/g, accent)
    .replace(/{{TEXT}}/g, text)
    .replace(
      /{{MUTED}}/g,
      "rgba(255,255,255,0.40)"
    )
    .replace(/{{EXTRA_PALETTE}}/g, "")
    .replace(/{{DISPLAY_FONT}}/g, display_font)
    .replace(/{{DISPLAY_WEIGHTS}}/g, display_weights)
    .replace(/{{MONO_FONT}}/g, mono_font)
    .replace(/{{MONO_WEIGHTS}}/g, mono_weights)
    .replace(/{{FONT_SOURCE}}/g, font_source)
    .replace(/{{VOICE_NOTES}}/g, voiceParse.value || "(none)")
    .replace(/{{VISUAL_NOTES}}/g, visualParse.value || "(none)")
    .replace(/consistency: "neutral"/g, `consistency: "${consistency}"`);

  // The frontmatter line for consistency wasn't templated; ensure it matches
  // the user's choice.
  tmpl = tmpl.replace(
    /(^---[\s\S]*?consistency:\s*)"[^"]+"/m,
    `$1"${consistency}"`
  );

  writeFileSync(out, tmpl);
  console.log(`Wrote ${out}`);
}

main();
