/**
 * generate-console-goldens.js — writes ./console-goldens/<deck>-<case>.html.
 *
 *   node commander/tests/fixtures/generate-console-goldens.js
 *
 * ⚠️ These goldens exist to prove the v7.4.0 Phase 0 extraction changed no
 * byte of any deck's HTML. Regenerating them after a render change makes
 * ../console-extraction.test.js compare the new renderer against itself — the
 * test passes and proves nothing. Run this ONLY when a deck's markup is meant
 * to change, and review the resulting diff as the actual change under review.
 */
import fs from 'node:fs/promises';

import { buildSnapshotHtml } from '../../cowork-plugin/lib/mission-control-snapshot.js';
import { buildSafetyHtml } from '../../cowork-plugin/lib/safety-snapshot.js';
import { buildUsageHtml } from '../../cowork-plugin/lib/usage-snapshot.js';
import { GOLDEN_DIR, missionControlCases, safetyCases, usageCases } from './console-models.js';

const DECKS = [
  ['mission-control', buildSnapshotHtml, missionControlCases],
  ['usage', buildUsageHtml, usageCases],
  ['safety', buildSafetyHtml, safetyCases],
];

await fs.mkdir(GOLDEN_DIR, { recursive: true });

for (const [deck, build, cases] of DECKS) {
  for (const { name, model, now } of await cases()) {
    const file = new URL(`./console-goldens/${deck}-${name}.html`, import.meta.url);
    await fs.writeFile(file, build(model, { now }));
    process.stdout.write(`wrote ${deck}-${name}.html\n`);
  }
}
