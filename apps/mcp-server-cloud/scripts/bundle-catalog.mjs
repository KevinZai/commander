#!/usr/bin/env node
/**
 * Pre-build bundling script for catalog data.
 * Copies registry.yaml + skills SKILL.md files from repo root into data/ dir.
 * Run as: node scripts/bundle-catalog.mjs
 *
 * This ensures the deployed container has the catalog baked in, since Dockerfile
 * COPY context is limited to apps/mcp-server-cloud/ directory.
 */

import { cp, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, "..");
// apps/mcp-server-cloud/scripts -> apps/mcp-server-cloud -> apps -> cc-commander (REPO_ROOT)
const REPO_ROOT = path.resolve(APP_ROOT, "../..");
const DATA_DIR = path.join(APP_ROOT, "data");

const REGISTRY_SRC = path.join(REPO_ROOT, "commander/core/registry.yaml");
const SKILLS_SRC = path.join(REPO_ROOT, "skills");

async function bundle() {
  try {
    // Ensure data/ dir exists
    await mkdir(DATA_DIR, { recursive: true });

    // 1. Copy registry.yaml
    if (existsSync(REGISTRY_SRC)) {
      await cp(REGISTRY_SRC, path.join(DATA_DIR, "registry.yaml"));
      console.log(`✓ Copied registry.yaml (${REGISTRY_SRC})`);
    } else {
      console.warn(`⚠ registry.yaml not found at ${REGISTRY_SRC} — skipping`);
    }

    // 2. Copy skills/ dir (optional — only if registry needs full content)
    // For now, we only need registry.yaml since commander_get_skill fetches remotely.
    // If future versions need offline SKILL.md, uncomment below:
    // if (existsSync(SKILLS_SRC)) {
    //   await cp(SKILLS_SRC, path.join(DATA_DIR, "skills"), { recursive: true });
    //   console.log(`✓ Copied skills/ dir`);
    // }

    console.log(`✓ Catalog bundled into ${DATA_DIR}/`);
  } catch (err) {
    console.error(`✗ Bundle failed: ${err.message}`);
    process.exit(1);
  }
}

bundle();
