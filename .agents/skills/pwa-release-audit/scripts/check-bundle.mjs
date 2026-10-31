#!/usr/bin/env node
// No network: check the exact package/app/SW bundle before a Pages release.
import {existsSync,readFileSync,statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';

export function auditPwaBundle({packageJson,core,sw,manifest,html,root,exists=existsSync}){
  const errors=[],warnings=[];
  let pkg={},mf={};
  try{pkg=JSON.parse(packageJson);}catch{errors.push('package.json is not valid JSON');}
  try{mf=JSON.parse(manifest);}catch{errors.push('manifest.webmanifest is not valid JSON');}
  const appVersion=core.match(/export const APP_VERSION\s*=\s*['"]([^'"]+)['"]/ )?.[1]||null;
  const swVersion=sw.match(/const CACHE\s*=\s*['"]english-cultivation-static-v([^'"]+)['"]/ )?.[1]||null;
  if(!appVersion)errors.push('APP_VERSION not found in core.mjs');
  if(!swVersion)errors.push('Versioned service-worker CACHE marker not found');
  if(pkg.version!==appVersion||pkg.version!==swVersion)errors.push(`Release version mismatch: package=${pkg.version||'missing'}, app=${appVersion||'missing'}, sw=${swVersion||'missing'}`);
  const assetSource=sw.match(/const ASSETS\s*=\s*\[([\s\S]*?)\];/)?.[1]||'';
  if(!assetSource)errors.push('sw.js ASSETS array missing');
  const assets=[...assetSource.matchAll(/['"]([^'"]+)['"]/g)].map(x=>x[1]);
  const seen=new Set();
  for(const asset of assets){
    if(seen.has(asset))errors.push('Duplicate service-worker asset: '+asset);
    seen.add(asset);
    if(asset==='./')continue;
    if(!asset.startsWith('./')||asset.includes('..')||asset.includes('?')||asset.includes('#')){
      errors.push('Invalid local precache path: '+asset);continue;
    }
    const filepath=resolve(root,asset.slice(2));
    if(!filepath.startsWith(resolve(root)+'/')){errors.push('Asset escapes repository: '+asset);continue;}
    if(!exists(filepath))errors.push('Missing precache asset: '+asset);
  }
  for(const essential of ['./index.html','./styles.css','./app.js','./core.mjs','./manifest.webmanifest']){
    if(!seen.has(essential))errors.push('Essential asset not precached: '+essential);
  }
  if(!/\bcache(?:s)?\.addAll\(ASSETS\)/.test(sw)&&!/\.addAll\(ASSETS\)/.test(sw))errors.push('Service worker does not appear to precache ASSETS with addAll');
  if(!/rel=["']manifest["']/.test(html))errors.push('index.html lacks a manifest link');
  if(!/type=["']module["'][^>]*src=["']app\.js["']/.test(html))errors.push('index.html lacks its app.js module entrypoint');
  if(!mf.name||!mf.start_url||!Array.isArray(mf.icons)||!mf.icons.length)errors.push('PWA manifest missing name/start_url/icons');
  for(const icon of mf.icons||[]){
    if(!icon||!icon.src||icon.src.startsWith('http')||icon.src.includes('..')){errors.push('Invalid manifest icon path');continue;}
    const filepath=resolve(root,icon.src.replace(/^\.\//,''));
    if(!exists(filepath))errors.push('Missing manifest icon: '+icon.src);
  }
  if(assets.length===0)warnings.push('No assets parsed: check service worker format.');
  return {ok:errors.length===0,version:{package:pkg.version||null,app:appVersion,serviceWorker:swVersion,dataSchema:'deliberately not compared'},assetCount:assets.length,errors,warnings,scope:'local_static_bundle_only',livePagesVerified:false};
}

export function auditRepoFromDisk(root){
  const read=file=>readFileSync(join(root,file),'utf8');
  const result=auditPwaBundle({
    packageJson:read('package.json'),core:read('core.mjs'),sw:read('sw.js'),
    manifest:read('manifest.webmanifest'),html:read('index.html'),root
  });
  return result;
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  try{
    const root=resolve(fileURLToPath(new URL('../../../../',import.meta.url)));
    const report=auditRepoFromDisk(root);
    console.log(JSON.stringify(report,null,2));
    if(!report.ok)process.exitCode=1;
  }catch(error){console.error('PWA BUNDLE CHECK FAILED: '+(error.stack||error.message));process.exitCode=1;}
}
