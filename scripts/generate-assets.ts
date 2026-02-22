/**
 * One-shot script to generate PNG assets from the SVG logo.
 *
 * Produces:
 *   public/favicon.png   — 32x32 PNG fallback favicon
 *   public/og-image.png  — 1200x630 social sharing image
 *
 * Run: `npx tsx scripts/generate-assets.ts`
 */

import sharp from "sharp";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const LOGO_PATH = resolve(ROOT, "public/logo.svg");
const FAVICON_OUT = resolve(ROOT, "public/favicon.png");
const OG_OUT = resolve(ROOT, "public/og-image.png");

async function generateFavicon() {
  await sharp(LOGO_PATH).resize(32, 32).png().toFile(FAVICON_OUT);
  console.log("  ✓ public/favicon.png (32x32)");
}

async function generateOgImage() {
  const OG_WIDTH = 1200;
  const OG_HEIGHT = 630;
  const LOGO_SIZE = 200;

  // Read and resize the logo
  const logoBuffer = await sharp(LOGO_PATH)
    .resize(LOGO_SIZE, LOGO_SIZE)
    .png()
    .toBuffer();

  // Create an SVG overlay with the text
  const textSvg = `
    <svg width="${OG_WIDTH}" height="${OG_HEIGHT}">
      <style>
        .title { fill: #0f172a; font-family: system-ui, sans-serif; font-size: 72px; font-weight: 700; }
        .tagline { fill: #64748b; font-family: system-ui, sans-serif; font-size: 32px; }
      </style>
      <text x="440" y="290" class="title">Memogenesis</text>
      <text x="440" y="345" class="tagline">AI-Powered Flashcard Generator</text>
    </svg>
  `;

  // Composite: white canvas + centered-left logo + text overlay
  await sharp({
    create: {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([
      {
        input: logoBuffer,
        left: 160,
        top: Math.round((OG_HEIGHT - LOGO_SIZE) / 2),
      },
      {
        input: Buffer.from(textSvg),
        left: 0,
        top: 0,
      },
    ])
    .png()
    .toFile(OG_OUT);

  console.log("  ✓ public/og-image.png (1200x630)");
}

async function main() {
  console.log("Generating assets from public/logo.svg...\n");
  await generateFavicon();
  await generateOgImage();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Failed to generate assets:", err);
  process.exit(1);
});
