// main.ts — the hand-in program for The Gilded Hour.
//
// It copies game/ and screenshots/ from this repository into the output
// directory (MAKEFUN_OUTPUT_DIR when set, /output otherwise) and writes
// dossier.json there, built by the kit's own buildDossier so the dossier
// is byte for byte the one the gate rebuilds. Nothing here depends on
// the clock, the network or the order of the filesystem, so two runs
// over the same repository write the same bytes.

import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const root = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

// Start from an empty directory so a stale file can never leak from one
// hand-in into the next.
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

cpSync(join(root, 'game'), join(outDir, 'game'), { recursive: true });
cpSync(join(root, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

// The bounty's caps: the dossier's text of the source is held to 160 KiB,
// screenshots to 4 files of at most 256 KiB each, the game tree to 993
// files and 48 MiB with no path over 1,000 bytes.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 48 * 1024 * 1024,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
