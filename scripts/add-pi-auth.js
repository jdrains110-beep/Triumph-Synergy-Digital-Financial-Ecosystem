#!/usr/bin/env node
// One-off script: inject PiSignInButton into ecosystem pages that don't have it yet.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const pages = [
  "app/ecosystem/credit-dispute/page.tsx",
  "app/ecosystem/sovereign-ai-bot/page.tsx",
  "app/ecosystem/sovereign-aviation/page.tsx",
  "app/ecosystem/sovereign-commerce-regulation/page.tsx",
  "app/ecosystem/sovereign-delivery/page.tsx",
  "app/ecosystem/sovereign-health/page.tsx",
  "app/ecosystem/sovereign-housing/page.tsx",
  "app/ecosystem/sovereign-pidex/page.tsx",
  "app/ecosystem/sovereign-positions/page.tsx",
  "app/ecosystem/sovereign-rivals/page.tsx",
  "app/ecosystem/sovereign-sports/page.tsx",
  "app/ecosystem/sovereign-travel/page.tsx",
  "app/ecosystem/sovereign-wawa/page.tsx",
  "app/ecosystem/tokenization/page.tsx",
  "app/ecosystem/work-programs/page.tsx",
];

const IMPORT = 'import { PiSignInButton } from "@/components/pi-sign-in-button";';

pages.forEach((rel) => {
  const filePath = path.join(root, rel);
  let c = fs.readFileSync(filePath, "utf8");

  if (c.includes("pi-sign-in-button")) {
    console.log("SKIP (already present):", rel);
    return;
  }

  // ── 1. Insert import after the last `import …` line ──────────────────────
  const lines = c.split("\n");
  let lastImport = -1;
  lines.forEach((l, i) => {
    if (l.trim().startsWith("import ")) lastImport = i;
  });
  // Fallback: insert after "use client" directive
  if (lastImport === -1) {
    lines.forEach((l, i) => {
      if (l.includes("use client") && lastImport === -1) lastImport = i;
    });
  }
  if (lastImport >= 0) {
    lines.splice(lastImport + 1, 0, IMPORT);
    c = lines.join("\n");
  }

  // ── 2. Insert <PiSignInButton /> right after the first </h1> ─────────────
  const h1Match = /<h1[^>]*>/.exec(c);
  if (h1Match) {
    const closeTag = "</h1>";
    const closeIdx = c.indexOf(closeTag, h1Match.index);
    if (closeIdx !== -1) {
      const before = c.slice(0, h1Match.index);
      const lineStart = before.lastIndexOf("\n") + 1;
      const indent = " ".repeat(before.length - lineStart);
      const insertAt = closeIdx + closeTag.length;
      c =
        c.slice(0, insertAt) +
        "\n" + indent + "<PiSignInButton />" +
        c.slice(insertAt);
      console.log("OK:", rel);
    }
  } else {
    console.log("NO <h1> FOUND — skipping element injection:", rel);
  }

  fs.writeFileSync(filePath, c, "utf8");
});

console.log("Done.");
