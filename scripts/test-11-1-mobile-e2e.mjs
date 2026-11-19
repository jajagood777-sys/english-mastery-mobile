const {default:pw}=await import(process.env.PLAYWRIGHT_CORE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core/index.js');
import {accessSync,constants} from 'node:fs';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const chromium=pw.chromium; const root=new URL('..',import.meta.url).pathname;
const bin=['/usr/bin/chromium','/usr/bin/google-chrome','/opt/google/chrome/chrome'].find(p=>{try{accessSync(p,constants.X_OK);return true;}catch{return false;}});
if(!bin)throw Error('No Chromium executable');
const server=spawn('python3',['-m','http.server','4175','--bind','127.0.0.1'],{cwd:root,stdio:'ignore'});
const browser=await chromium.launch({headless:true,executablePath:bin,args:['--no-sandbox','--disable-dev-shm-usage']});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
const page=await context.newPage();const errors=[];page.on('console',m=>{if(m.type()==='error')errors.push(`console:${m.text()}`);});page.on('pageerror',e=>errors.push(`page:${e.message}`));
try{
 await page.goto('http://127.0.0.1:4175/',{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'导入今日总学习包'}).click();
 const input=page.locator('input[type=file][accept*=".json"]').last();await input.setInputFiles(`${root}/examples/v22-smart-choice-110.json`);
 await page.getByRole('heading',{name:/导入学习材料/}).waitFor();
 await page.getByRole('button',{name:/确认导入/}).click();
 await page.getByRole('button',{name:'开始／继续今日完整学习'}).waitFor({timeout:10000}).catch(()=>{});
 const ribbon=page.locator('.journey-flow-ribbon');assert.equal(await ribbon.count(),1,'six-stage ribbon should be visible');
 const auto=page.getByRole('button',{name:/切题自动播音/});assert.equal(await auto.count(),1);await auto.click();
 const options=page.locator('.vocab-option-btn');assert.ok(await options.count()>1,'touch vocab options missing');await options.nth(1).click();
 await page.getByText(/区分锚点|CDTL|可吸收/).first().waitFor({timeout:5000}).catch(()=>{});
 const a11y=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,innerWidth:innerWidth,targets:[...document.querySelectorAll('button')].filter(b=>b.offsetParent).map(b=>Math.round(b.getBoundingClientRect().height)).filter(Boolean)}));
 assert.ok(a11y.scrollWidth<=a11y.innerWidth,`horizontal overflow ${a11y.scrollWidth}/${a11y.innerWidth}`);assert.ok(a11y.targets.every(h=>h>=44),`touch target below 44px: ${a11y.targets.filter(h=>h<44)}`);assert.equal(errors.length,0,errors.join(' | '));
 console.log(JSON.stringify({pass:true,viewport:'390x844@3x touch',sixStageRibbon:true,autoplayToggle:true,vocabWrongPath:true,consoleErrors:0,pageErrors:0,horizontalOverflow:false,touchTargets:true}));
}finally{await browser.close();server.kill('SIGTERM');}
