#!/usr/bin/env node
// Limited static mobile accessibility smoke; NOT a WCAG certification.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

export function auditMobileShell({html,css}){
  const checks=[
    {id:'document_language',ok:/<html\b[^>]*\blang=["']zh-CN["']/i.test(html)},
    {id:'responsive_viewport',ok:/name=["']viewport["'][^>]*content=["'][^"']*width=device-width/i.test(html)},
    {id:'viewport_safe_area',ok:/viewport-fit=cover/.test(html)},
    {id:'main_landmark',ok:/<main\b[^>]*\bid=["']app["']/i.test(html)},
    {id:'skip_link_to_main',ok:/class=["'](?:[^"']*\s)?skip-link(?:\s[^"']*)?["']/.test(html)&&/href=["']#app["']/.test(html)},
    {id:'named_primary_navigation',ok:/<nav\b[^>]*aria-label=["']主导航["']/i.test(html)},
    {id:'five_chinese_navigation_destinations',ok:['首页','训练','阅读','进度','我的'].every(x=>html.includes('>'+x+'</span>'))},
    {id:'polite_status_message',ok:/role=["']status["']/.test(html)&&/aria-live=["']polite["']/.test(html)},
    {id:'keyboard_focus_visible_styles',ok:/:focus-visible\s*\{/.test(css)},
    {id:'bottom_safe_area_rule',ok:/safe-area-inset-bottom/.test(css)},
    {id:'reduced_motion_rule',ok:/prefers-reduced-motion/.test(css)}
  ];
  return {ok:checks.every(x=>x.ok),scope:'static_shell_only',counts:{passed:checks.filter(x=>x.ok).length,total:checks.length},checks,notes:['No tap-target measurements, actual keyboard focus testing, Safari selection or full WCAG conformance is inferred.','Use disposable Playwright emulation and physical iPhone Safari tests for real user acceptance.']};
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  const base=new URL('../../../../',import.meta.url);
  const result=auditMobileShell({html:readFileSync(new URL('index.html',base),'utf8'),css:readFileSync(new URL('styles.css',base),'utf8')});
  console.log(JSON.stringify(result,null,2));
  if(!result.ok)process.exitCode=1;
}
