#!/usr/bin/env node
/**
 * Puppeteer renderer for blog covers.
 *
 * Usage:
 *   node render.mjs <input.html> <output.png> [width] [height]
 *   node render.mjs --batch <dir> [width] [height]
 *
 * Defaults to 2240x1260 if dimensions not provided. Width and height can also
 * be sourced from DESIGN.md `canvas_size` field upstream by the SKILL.md flow.
 */

import puppeteer from "puppeteer";
import { existsSync, readdirSync, statSync } from "fs";
import { resolve, join, basename, extname } from "path";

const DEFAULT_WIDTH = 2240;
const DEFAULT_HEIGHT = 1260;

async function renderOne(htmlPath, pngPath, width, height) {
  if (!existsSync(htmlPath)) {
    throw new Error(`Input HTML not found: ${htmlPath}`);
  }

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({
      width,
      height,
      deviceScaleFactor: 1,
    });

    const fileUrl = `file://${resolve(htmlPath)}`;
    await page.goto(fileUrl, { waitUntil: "networkidle0", timeout: 60000 });

    // Let webfonts settle before snapshot
    await page.evaluate(() => document.fonts.ready);
    await new Promise((r) => setTimeout(r, 200));

    await page.screenshot({
      path: pngPath,
      type: "png",
      clip: { x: 0, y: 0, width, height },
      omitBackground: false,
    });

    console.log(`  ${basename(htmlPath)} → ${basename(pngPath)}`);
  } finally {
    await browser.close();
  }
}

async function renderBatch(dir, width, height) {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    throw new Error(`Batch directory not found: ${dir}`);
  }
  const htmls = readdirSync(dir).filter((f) => f.endsWith(".html"));
  if (htmls.length === 0) {
    console.log(`No .html files in ${dir}`);
    return;
  }
  console.log(`Rendering ${htmls.length} cover(s)...`);
  for (const html of htmls) {
    const slug = basename(html, ".html");
    const htmlPath = join(dir, html);
    const pngPath = join(dir, `${slug}.png`);
    await renderOne(htmlPath, pngPath, width, height);
  }
  console.log("Done.");
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`Usage:
  render.mjs <input.html> <output.png> [width] [height]
  render.mjs --batch <dir> [width] [height]

Defaults: ${DEFAULT_WIDTH}x${DEFAULT_HEIGHT}`);
    process.exit(args.length === 0 ? 1 : 0);
  }

  if (args[0] === "--batch") {
    const dir = args[1];
    const width = parseInt(args[2], 10) || DEFAULT_WIDTH;
    const height = parseInt(args[3], 10) || DEFAULT_HEIGHT;
    await renderBatch(dir, width, height);
    return;
  }

  const [input, output] = args;
  const width = parseInt(args[2], 10) || DEFAULT_WIDTH;
  const height = parseInt(args[3], 10) || DEFAULT_HEIGHT;
  if (!output) {
    throw new Error("Output PNG path required. See --help.");
  }
  await renderOne(input, output, width, height);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
