import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runSyntheticDataSafetyChecks} from '../.agents/skills/learning-data-safety/scripts/check-fixture.mjs';
import {auditMobileShell} from '../.agents/skills/mobile-accessibility-review/scripts/audit-baseline.mjs';
import {auditPwaBundle,auditRepoFromDisk} from '../.agents/skills/pwa-release-audit/scripts/check-bundle.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(join(root,path),'utf8');

test('three specialized Codex skills are scoped and have deterministic scripts',()=>{
 for(const name of ['learning-data-safety','mobile-accessibility-review','pwa-release-audit']){
  const folder=join(root,'.agents','skills',name);
  assert.ok(existsSync(join(folder,'SKILL.md')));
  const skill=readFileSync(join(folder,'SKILL.md'),'utf8');
  assert.match(skill,/^---\s*\nname:\s*[a-z][a-z0-9-]*\s*\ndescription:/);
  assert.ok(existsSync(join(folder,'scripts')),name);
 }
});
test('synthetic localStorage failure, backup and K/V/N regression probe passes',()=>{
 const result=runSyntheticDataSafetyChecks();
 assert.equal(result.ok,true);
 assert.equal(result.counts.checks,4);
 assert.equal(result.realSafariDataTested,false);
});
test('mobile shell has expected baseline controls, not a WCAG certification',()=>{
 const report=auditMobileShell({html:read('index.html'),css:read('styles.css')});
 assert.equal(report.ok,true,JSON.stringify(report.checks.filter(x=>!x.ok)));
 assert.equal(report.scope,'static_shell_only');
 assert.equal(report.counts.passed,report.counts.total);
});
test('mobile check detects absent skip link without altering files',()=>{
 const broken=read('index.html').replace('class="skip-link"','class="not-a-skip-link"');
 const report=auditMobileShell({html:broken,css:read('styles.css')});
 assert.equal(report.ok,false);
 assert.equal(report.checks.find(x=>x.id==='skip_link_to_main').ok,false);
});
test('PWA release assets exist and code/package/cache versions match',()=>{
 const report=auditRepoFromDisk(root);
 assert.equal(report.ok,true,JSON.stringify(report.errors));
 assert.equal(report.version.package,JSON.parse(read('package.json')).version);
 assert.equal(report.version.serviceWorker,report.version.app);
 assert.ok(report.assetCount>=6);
 assert.equal(report.livePagesVerified,false);
});
test('PWA check detects stale app version and missing required precache asset',()=>{
 const args={
  packageJson:JSON.stringify({...JSON.parse(read('package.json')),version:'0.0.1'}),
  core:read('core.mjs'),sw:read('sw.js'),manifest:read('manifest.webmanifest'),
  html:read('index.html'),root,
  exists: filepath=>filepath.endsWith('/index.html')?false:existsSync(filepath)
 };
 const report=auditPwaBundle(args);
 assert.equal(report.ok,false);
 assert.ok(report.errors.some(x=>x.includes('Release version mismatch')));
 assert.ok(report.errors.some(x=>x.includes('Missing precache asset: ./index.html')));
});
