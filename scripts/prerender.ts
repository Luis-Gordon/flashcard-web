/**
 * Build-time pre-render script for SEO.
 *
 * Generates static HTML pages for public marketing routes so crawlers can
 * index content without executing JavaScript. JS-enabled visitors are
 * bootstrapped into the SPA via a small inline script.
 *
 * Run: `tsx scripts/prerender.ts` (runs automatically as `prebuild`).
 */

import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";

// Import route components — we render the full page with MarketingLayout
import Landing from "../src/routes/Landing.js";
import Pricing from "../src/routes/Pricing.js";
import Privacy from "../src/routes/Privacy.js";
import Terms from "../src/routes/Terms.js";

const BASE_URL = "https://memogenesis.com";

interface PageConfig {
  route: string;
  component: React.ComponentType;
  title: string;
  description: string;
  outputFile: string;
}

const PAGES: PageConfig[] = [
  {
    route: "/",
    component: Landing,
    title: "Memogenesis — AI Flashcard Generator",
    description:
      "Turn any text, URL, or PDF into study-ready Anki flashcards with AI. 10 knowledge domains, smart enhancement, and .apkg export.",
    outputFile: "landing.html",
  },
  {
    route: "/pricing",
    component: Pricing,
    title: "Pricing — Memogenesis",
    description:
      "Simple, transparent pricing. Start free with 50 cards per month. Upgrade to Plus or Pro for more cards and features.",
    outputFile: "pricing.html",
  },
  {
    route: "/privacy",
    component: Privacy,
    title: "Privacy Policy — Memogenesis",
    description:
      "How Memogenesis collects, processes, and protects your data. GDPR compliant.",
    outputFile: "privacy.html",
  },
  {
    route: "/terms",
    component: Terms,
    title: "Terms of Service — Memogenesis",
    description:
      "Terms and conditions for using the Memogenesis flashcard generation service.",
    outputFile: "terms.html",
  },
];

function buildHtml(page: PageConfig): string {
  // Render the React component inside a StaticRouter for link resolution
  const html = renderToString(
    createElement(
      StaticRouter,
      { location: page.route },
      createElement(page.component),
    ),
  );

  const canonical = `${BASE_URL}${page.route === "/" ? "" : page.route}`;
  const isLanding = page.route === "/";

  const jsonLd = isLanding
    ? `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Memogenesis",
  "url": "${BASE_URL}",
  "description": "${page.description}"
}
</script>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${page.title}</title>
    <meta name="description" content="${page.description}" />
    <link rel="canonical" href="${canonical}" />

    <link rel="icon" type="image/svg+xml" href="/logo-lineart-icon.svg" />
    <link rel="icon" type="image/png" href="/favicon.png" />

    <!-- Open Graph -->
    <meta property="og:title" content="${page.title}" />
    <meta property="og:description" content="${page.description}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${BASE_URL}/og-image.png" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${page.title}" />
    <meta name="twitter:description" content="${page.description}" />
    <meta name="twitter:image" content="${BASE_URL}/og-image.png" />

    ${jsonLd}
  </head>
  <body>
    ${html}
    <noscript>
      <p>Memogenesis requires JavaScript for the full experience. The content above is a static preview.</p>
    </noscript>
    <script>
      // Redirect .html URLs to clean paths (SPA handles them via wrangler)
      if (window.location.pathname.endsWith('.html')) {
        window.location.replace(window.location.pathname.replace('.html', ''));
      }
    </script>
  </body>
</html>`;
}

// Main
const publicDir = resolve(import.meta.dirname, "../public");
if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true });
}

let generated = 0;
for (const page of PAGES) {
  const outputPath = resolve(publicDir, page.outputFile);
  const dir = dirname(outputPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const html = buildHtml(page);
  writeFileSync(outputPath, html, "utf-8");
  generated++;
  console.log(`  ✓ ${page.outputFile} (${page.route})`);
}

console.log(`\nPre-rendered ${generated} pages to public/`);
