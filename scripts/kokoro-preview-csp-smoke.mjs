import {chromium} from 'playwright-core';
import {accessSync,constants} from 'node:fs';
const browserBin=['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(path=>{try{accessSync(path,constants.X_OK);return true}catch{return false}});
if(!browserBin)throw Error('Chromium is not installed');
const browser=await chromium.launch({executablePath:browserBin,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage();
const errors=[];
page.on('pageerror',e=>errors.push('PAGE '+e.message));
page.on('console',m=>{if(m.type()==='error')errors.push('CONSOLE '+m.text().slice(0,240))});
page.on('response',r=>{if(r.status()>=400)errors.push('HTTP '+r.status()+' '+r.url().slice(0,220))});
try{
 await page.goto('http://127.0.0.1:4175/kokoro-preview/live.html',{waitUntil:'domcontentloaded'});
 await page.locator('#load').click();
 await page.waitForFunction(()=>/Model loaded|LOAD FAILED/.test(document.querySelector('#status')?.textContent||''),null,{timeout:220000});
 const modelStatus=await page.locator('#status').innerText();
 if(!modelStatus.includes('Model loaded'))throw Error('Model load failed under preview CSP: '+modelStatus+'; '+JSON.stringify(errors.slice(0,9)));
 console.log('PREVIEW MODEL SUCCESS '+modelStatus);
 await page.locator('#generate').click();
 await page.waitForFunction(()=>/Generated \d+ bytes|SYNTHESIS FAILED/.test(document.querySelector('#status')?.textContent||''),null,{timeout:150000});
 const result=await page.locator('#status').innerText();
 if(!result.includes('Generated'))throw Error('Synth failed '+result);
 const audio=await page.evaluate(async()=>{const a=document.querySelector('#player');await a.play();return {duration:a.duration,size:document.querySelector('#download').disabled,src:a.currentSrc.startsWith('blob:')}});
 if(!(audio.duration>0)||audio.size!==false||!audio.src)throw Error('No valid browser audio '+JSON.stringify(audio));
 console.log('PREVIEW HEART BROWSER PASS '+JSON.stringify({result,duration:audio.duration}));
}finally{console.log('DIAGNOSTICS '+JSON.stringify(errors.slice(0,10)));await browser.close()}
