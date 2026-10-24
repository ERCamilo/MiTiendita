const {chromium,devices}=require('playwright-core');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:(process.env.CHROME_BIN || '/snap/bin/chromium'),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 const context=await browser.newContext({...devices['Pixel 7'],acceptDownloads:true});
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.goto((process.env.E2E_BASE_URL || 'http://127.0.0.1:8892/'),{waitUntil:'domcontentloaded'});
 await page.locator('#modal-ajustes').waitFor({state:'attached',timeout:20000});
 console.log('UA',await page.evaluate(()=>navigator.userAgent));
 await page.locator('#nav-ajustes').click();
 await page.locator('#tab-btn-instalar-pwa').click();
 const guia=page.locator('#pwa-install-guide');
 await guia.waitFor({state:'visible',timeout:10000});
 const steps=await page.locator('#pwa-guide-steps').innerText();
 assert(/Android|Chrome|navegador|Instalar|Añadir/.test(steps));
 console.log('INSTALL_GUIDE_OK',steps.slice(0,160).replace(/\n/g,' / '));
 await guia.locator('[data-pwa-close]').first().click();
 const res=await page.evaluate(async()=> {
   const m=await fetch('/manifest.json').then(r=>r.json());
   const icons=await Promise.all(m.icons.map(async i=>({path:i.src,ok:(await fetch(i.src)).ok})));
   return {start_url:m.start_url,scope:m.scope,display:m.display,icons}
 });
 assert.equal(res.display,'standalone');
 assert(res.icons.every(i=>i.ok));
 console.log('MANIFEST_OK',JSON.stringify(res));
 await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller),null,{timeout:12000}).catch(async()=>{await page.reload();await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller),null,{timeout:12000});});
 const sw=await page.evaluate(()=>({scope:navigator.serviceWorker.controller?.scriptURL,cacheAvailable:'caches' in window}));
 console.log('SW_READY',JSON.stringify(sw));
 await context.setOffline(true);
 await page.reload({waitUntil:'domcontentloaded',timeout:12000});
 await page.locator('#modal-ajustes').waitFor({state:'attached',timeout:12000});
 console.log('ANDROID_EMULATION_OFFLINE_PASS');
 console.log('PAGE_ERRORS',JSON.stringify(errors));
 await context.setOffline(false);
 await browser.close();
})().catch(e=>{console.error('ANDROID_EMULATION_FAIL',e);process.exitCode=1});
