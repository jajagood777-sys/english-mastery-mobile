#!/usr/bin/env node
/**
 * Permanent disposable-copy mutation testing audit for YanDao Cultivation Palace.
 * Injects 4 classic high-severity bugs into a temporary copy of the repo and verifies
 * that `npm test` kills every single mutant. Never modifies the working tree.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';

const srcDir = path.resolve(new URL('..', import.meta.url).pathname);
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yandao-mutation-'));

const MUTANTS = [
  {
    id: 'M1_MISSING_AUDIO_COMPLETE',
    file: 'handover.mjs',
    find: 'const complete=packagedCount===expectedCount&&missingIds.length===0&&abnormalIds.length===0;',
    replace: 'const complete=true;'
  },
  {
    id: 'M2_FAILED_RADIO_SYNTH_TIMED',
    file: 'radio.mjs',
    find: 'const extra = runningSince > 0 ? Math.max(0, ts - runningSince) : 0;',
    replace: 'const extra = 10000;'
  },
  {
    id: 'M3_DUPLICATE_ATTEMPT_DOUBLE_COUNTED',
    file: 'core.mjs',
    find: 'if(!allowed.has(attempt.sessionId)||seen.has(key)||fingerprints.has(fingerprint)) return false;',
    replace: 'if(!allowed.has(attempt.sessionId)) return false;'
  },
  {
    id: 'M4_RETRY_OVERWRITES_FIRST_ANSWER',
    file: 'core.mjs',
    find: "user_answer: attempt.answer || '',",
    replace: "user_answer: attempt.retry_answer || attempt.answer || '',"
  }
];

function copyTree(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (['.git', 'node_modules', '__pycache__'].includes(entry.name)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyTree(s, d);
    else fs.copyFileSync(s, d);
  }
}

let survived = 0;
try {
  copyTree(srcDir, tmpDir);
  for (const m of MUTANTS) {
    const target = path.join(tmpDir, m.file);
    const original = fs.readFileSync(target, 'utf8');
    if (!original.includes(m.find)) {
      console.error(`ERROR: Anchor not found for ${m.id} in ${m.file}`);
      process.exitCode = 1;
      break;
    }
    fs.writeFileSync(target, original.replace(m.find, m.replace), 'utf8');
    let killed = false;
    try {
      execSync('npm test', { cwd: tmpDir, stdio: 'pipe' });
    } catch {
      killed = true;
    }
    fs.writeFileSync(target, original, 'utf8');
    console.log(`${m.id}: ${killed ? 'KILLED' : 'SURVIVED'}`);
    if (!killed) survived += 1;
  }
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

if (survived > 0) {
  console.error(`Mutation audit FAILED: ${survived} mutant(s) survived.`);
  process.exit(1);
}
console.log(`Mutation audit PASSED: ${MUTANTS.length}/${MUTANTS.length} mutants killed.`);
