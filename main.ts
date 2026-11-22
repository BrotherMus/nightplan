// Nightplan's hand-in (Node 22, standard library only). The game is game/: static files a desktop
// browser plays offline (index.html, style.css and ES modules under game/src, no library, no
// network). This program copies game/ and screenshots/ to /output (MAKEFUN_OUTPUT_DIR outside the
// grader) and writes /output/dossier.json with the kit's buildDossier, byte for byte as the gate
// rebuilds it. Both runs write the same bytes: nothing here reads the clock or randomness.
//
//   node serve.ts                                  play it at http://localhost:8080
//   node tools/shots.mjs                           retake the screenshots
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyFolder(name: string): void {
  const from = join(repoRoot, name);
  mkdirSync(join(outputDir, name), { recursive: true });
  if (existsSync(from)) cpSync(from, join(outputDir, name), { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
copyFolder('game');
copyFolder('screenshots');

// The gate wants 3 or 4 screenshots; say so plainly instead of handing in a dossier it refuses.
const shots = readdirSync(join(outputDir, 'screenshots')).filter((name) => !name.startsWith('.'));
if (shots.length < 3 || shots.length > 4) {
  console.error(`screenshots/ holds ${shots.length} images; the gate takes 3 or 4`);
  process.exitCode = 1;
}

// The scorer's caps: the dossier text is held to 160 KiB, 4 screenshots of 256 KiB at most, and
// game/ to 993 entries and 48 MiB with paths of 1000 bytes at most.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
