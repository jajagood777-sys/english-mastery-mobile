// Guardrail for public GitHub Pages source. No external dependencies or network.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const visited = [];
const errors = [];
const skip = new Set(['.git', '.github', '.agents', 'node_modules', 'test', 'scripts']);
const privateName = /(?:^|\/)(?:\.env(?:\.|$)|(?:.*[-_])?(?:full[-_]?local[-_]?backup|private[-_]?backup|english[-_]?mastery[-_]?backup|battle[-_]?report)(?:[-_.]|$)|[^/]+\.(?:pem|p12|pfx|key)$)/i;
const credential = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9]{32,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{50,}\b/,
  /"(?:access_token|refresh_token|private_key)"\s*:\s*"[^"]{12,}"/i,
];
function walk(dir) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(ent.name)) continue;
    const path = join(dir, ent.name);
    const name = relative(root, path).replaceAll('\\', '/');
    if (privateName.test(name)) errors.push(`private filename: ${name}`);
    if (ent.isDirectory()) { walk(path); continue; }
    if (!ent.isFile()) continue;
    visited.push(name);
    if (!/\.(?:js|mjs|json|html|css|webmanifest|md|txt|yml|yaml)$/i.test(name)) continue;
    const body = readFileSync(path, 'utf8');
    for (const pattern of credential) if (pattern.test(body)) errors.push(`possible credential: ${name} (${pattern.source.slice(0, 28)})`);
    if (/\.json$/i.test(name) && /"attempts"\s*:\s*\[\s*\{/.test(body) && /"sessions"\s*:\s*\[/.test(body))
      errors.push(`possible real user study export: ${name}`);
  }
}
walk(root);
if (errors.length) {
  console.error('Public repository safety gate failed:\n' + errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Public repository safety gate: checked ${visited.length} files; no matched private material.`);
}
