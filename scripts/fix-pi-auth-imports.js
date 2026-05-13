#!/usr/bin/env node
// Fix incorrectly placed PiSignInButton imports in ecosystem pages.
// The import was inserted mid-way through a multi-line `import {` block.
// This script: removes it from the wrong location, then re-inserts it
// after the last complete import statement.

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

const IMPORT_LINE = 'import { PiSignInButton } from "@/components/pi-sign-in-button";';

pages.forEach((rel) => {
  const filePath = path.join(root, rel);
  let lines = fs.readFileSync(filePath, "utf8").split("\n");

  // Remove ALL existing PiSignInButton import lines (may be misplaced)
  const existingIndices = [];
  lines.forEach((l, i) => {
    if (l.includes("pi-sign-in-button")) existingIndices.push(i);
  });

  if (existingIndices.length === 0) {
    // Not present at all — add it (see below)
  } else {
    // Remove them
    for (let i = existingIndices.length - 1; i >= 0; i--) {
      lines.splice(existingIndices[i], 1);
    }
  }

  // Find last line of the last complete import statement.
  // A "complete" import ends with a line matching: } from "..."; or from "...";
  let lastImportEnd = -1;
  // Track whether we're inside a multi-line import
  let inMultilineImport = false;
  lines.forEach((l, i) => {
    const trimmed = l.trim();
    if (!inMultilineImport) {
      // Single-line import: import X from "y"; or import { X } from "y";
      if (/^import\s/.test(trimmed)) {
        if (trimmed.endsWith(";") || trimmed.endsWith('";') || trimmed.endsWith("';")) {
          lastImportEnd = i;
        } else if (trimmed.includes("{") && !trimmed.includes("}")) {
          // Opening brace without closing — multi-line
          inMultilineImport = true;
        } else {
          lastImportEnd = i;
        }
      }
    } else {
      // Inside multi-line import — look for closing } from "...";
      if (/\}\s*from\s*['"]/.test(trimmed)) {
        lastImportEnd = i;
        inMultilineImport = false;
      }
    }
  });

  if (lastImportEnd >= 0) {
    lines.splice(lastImportEnd + 1, 0, IMPORT_LINE);
    console.log("FIXED:", rel, "(inserted at line", lastImportEnd + 1, ")");
  } else {
    // No imports found; insert after "use client" if present, else at top
    const useClientIdx = lines.findIndex((l) => l.includes("use client"));
    const insertAt = useClientIdx >= 0 ? useClientIdx + 1 : 0;
    lines.splice(insertAt, 0, IMPORT_LINE);
    console.log("ADDED (no imports found):", rel);
  }

  fs.writeFileSync(filePath, lines.join("\n"), "utf8");
});

console.log("Done.");
