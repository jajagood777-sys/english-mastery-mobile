import {chromium} from 'playwright-core';
import {accessSync,constants} from 'node:fs';
const possible=['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'];
const binary=possible.find(x=>{try{accessSync(x,constants.X_OK);return true}catch{return false}});
if(!binary)throw Error('Chrome/Chromium unavailable on this CI runner');
const browser=await chromium.launch({headless:true,executablePath:binary,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage();
const errors=[];
page.on('pageerror',e=>errors.push('PAGE '+e.message));
page.on('requestfailed',r=>{const u=r.url();if(/huggingface|\.wasm|kokoro-engine|voice/i.test(u))errors.push('REQUEST '+u.slice(0,160)+' '+r.failure()?.errorText)});
page.on('console',m=>{if(m.type()==='error')errors.push('CONSOLE '+m.text().slice(0,180))});
try{
 await page.goto('http://127.0.0.1:4175/kokoro-test.html',{waitUntil:'domcontentloaded'});
 await page.locator('#load').click();
 await page.waitForFunction(()=>/Model loaded|LOAD FAILED/.test(document.querySelector('#status')?.textContent||''),null,{timeout:220000});
 const status=await page.locator('#status').innerText();
 if(!status.includes('Model loaded'))throw Error('Browser load failed: '+status);
 console.log('BROWSER MODEL READY: '+status);
 await page.locator('#generate').click();
 await page.waitForFunction(()=>/Generated \d+ bytes|SYNTHESIS FAILED/.test(document.querySelector('#status')?.textContent||''),null,{timeout:160000});
 const out=await page.locator('#status').innerText();
 if(!out.includes('Generated '))throw Error('Browser generate failed: '+out);
 const ready=await page.evaluate(async()=>{const a=document.querySelector('#player');await a.play();return {duration:a.duration,src:a.currentSrc,readyState:a.readyState,downloadDisabled:document.querySelector('#download').disabled}});
 if(ready.downloadDisabled||!(ready.duration>0)||!ready.src.startsWith('blob:'))throw Error('Audio decode/play verification failed '+JSON.stringify(ready));
 console.log('BROWSER WAV PASS: '+JSON.stringify({status:out,duration:ready.duration,readyState:ready.readyState}));
}finally{console.log('BROWSER ERRORS '+JSON.stringify(errors.slice(0,20)));await browser.close()}
