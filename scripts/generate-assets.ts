/**
 * One-shot script to generate PNG assets from the cropped SVG icon.
 *
 * Produces:
 *   public/favicon.png   — 32x32 PNG, dark charcoal bg, light icon, rounded corners
 *   public/og-image.png  — 1200x630 social sharing image, dark charcoal bg
 *
 * Run: `npx tsx scripts/generate-assets.ts`
 */

import sharp from "sharp";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const ICON_PATH = resolve(ROOT, "public/logo-icon.svg");
const FAVICON_OUT = resolve(ROOT, "public/favicon.png");
const OG_OUT = resolve(ROOT, "public/og-image.png");

const DARK_BG = { r: 26, g: 26, b: 26, alpha: 1 } as const; // #1a1a1a

async function generateFavicon() {
  const SIZE = 32;
  const RADIUS = 4;

  // Render the icon and negate (dark paths → light paths)
  const iconBuffer = await sharp(ICON_PATH)
    .resize(SIZE - 4, SIZE - 4, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .negate({ alpha: false })
    .png()
    .toBuffer();

  // Rounded-rect mask (white = keep, black = transparent)
  const maskSvg = `<svg width="${SIZE}" height="${SIZE}">
    <rect x="0" y="0" width="${SIZE}" height="${SIZE}" rx="${RADIUS}" ry="${RADIUS}" fill="white"/>
  </svg>`;

  // Composite: dark bg + centered icon, then apply rounded mask
  await sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: DARK_BG },
  })
    .composite([
      { input: iconBuffer, left: 2, top: 2 },
    ])
    .png()
    .toBuffer()
    .then((buf) =>
      sharp(buf)
        .composite([
          {
            input: Buffer.from(maskSvg),
            blend: "dest-in",
          },
        ])
        .png()
        .toFile(FAVICON_OUT),
    );

  console.log("  ✓ public/favicon.png (32x32, dark bg)");
}

async function generateOgImage() {
  const OG_WIDTH = 1200;
  const OG_HEIGHT = 630;
  const LOGO_HEIGHT = 220;

  // Render the icon larger for the OG image, then negate for dark bg
  const logoBuffer = await sharp(ICON_PATH)
    .resize({ height: LOGO_HEIGHT, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .negate({ alpha: false })
    .png()
    .toBuffer();

  const logoMeta = await sharp(logoBuffer).metadata();
  const logoWidth = logoMeta.width ?? LOGO_HEIGHT;

  // Text overlay — white title, light-gray tagline
  const textSvg = `
    <svg width="${OG_WIDTH}" height="${OG_HEIGHT}">
      <style>
        .title { fill: #ffffff; font-family: system-ui, sans-serif; font-size: 72px; font-weight: 700; }
        .tagline { fill: #94a3b8; font-family: system-ui, sans-serif; font-size: 32px; }
      </style>
      <text x="440" y="290" class="title">Memogenesis</text>
      <text x="440" y="345" class="tagline">AI-Powered Flashcard Generator</text>
    </svg>
  `;

  // Composite: dark canvas + logo centered-left + text
  await sharp({
    create: { width: OG_WIDTH, height: OG_HEIGHT, channels: 4, background: DARK_BG },
  })
    .composite([
      {
        input: logoBuffer,
        left: Math.round(200 - logoWidth / 2),
        top: Math.round((OG_HEIGHT - LOGO_HEIGHT) / 2),
      },
      {
        input: Buffer.from(textSvg),
        left: 0,
        top: 0,
      },
    ])
    .png()
    .toFile(OG_OUT);

  console.log("  ✓ public/og-image.png (1200x630, dark bg)");
}

async function main() {
  console.log("Generating assets from public/logo-icon.svg...\n");
  await generateFavicon();
  await generateOgImage();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Failed to generate assets:", err);
  process.exit(1);
});
