const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const report = [];
const base = (process.env.E2E_BASE_URL || 'http://127.0.0.1:8892/');
async function database(page) {
  return page.evaluate(() => new Promise((res,rej)=>{
    const rq=indexedDB.open('storeflow_db');
    rq.onerror=()=>rej(rq.error?.message);
    rq.onsuccess=()=>{
      const db=rq.result, stores=['clientes','productos','ventas','pagos','gastos','config'];
      const names=stores.filter(s=>db.objectStoreNames.contains(s));
      const t=db.transaction(names,'readonly');
      const out={};
      for(const name of names){const q=t.objectStore(name).getAll();q.onsuccess=()=>out[name]=q.result;}
      t.oncomplete=()=>{db.close();res(out)};
      t.onerror=()=>rej(t.error?.message);
    }
  }));
}
async function run(browser) {
 const ctx=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,acceptDownloads:true});
 const page=await ctx.newPage();
 const errors=[];
 page.on('pageerror', e=>errors.push('pageerror '+String(e)));
 page.on('console',m=>{if(m.type()==='error' && !/favicon|ERR_|Failed to load resource/.test(m.text()))errors.push('console '+m.text().slice(0,260));});
 const step=async(name,fn)=>{await fn();report.push({name,result:'PASS'});console.log('PASS',name)};
 try{
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
 await page.locator('#modal-importar-clientes').waitFor({state:'attached',timeout:20000});
 await step('Importar clientes JSON desde pantalla y conservar numeración',async()=>{
   await page.locator('#btn-abrir-importar-clientes').click();
   await page.locator('#clientes-import-json').fill(JSON.stringify([
     {number:'001',name:'Persona Prueba Uno',position:'Ayudante',sueldo:'900',paused:true},
     {number:'005',name:'Persona Prueba Dos',position:'Albañil'},
     {number:'1',name:'Persona Duplicada'}]));
   await page.locator('#clientes-import-analizar').click();
   const preview=await page.locator('#clientes-import-resumen').innerText();
   assert.match(preview,/3 registros.*2 nuevos.*1 omitidos/);
   await page.locator('#clientes-import-confirm').click();
   await page.waitForFunction(()=>document.querySelectorAll('#lista-clientes-container .header-card-cliente').length===2);
   const db=await database(page);
   assert.deepEqual(db.clientes.map(c=>c.numeroOrden).sort(),['001','005']);
   assert(db.clientes.every(c=>c.deuda_anterior===0&&c.sueldo===undefined&&c.paused===undefined));
 });
 await step('Registrar producto y pedido en cliente 001',async()=>{
   await page.locator('#nav-productos').click();
   await page.locator('#prod-nombre').fill('Almuerzo test');
   await page.locator('#prod-precio').fill('125');
   await page.locator('#prod-costo').fill('70');
   await page.locator('#btn-crear-producto').click();
   await page.waitForFunction(()=>document.body.innerText.includes('Almuerzo test'));
   await page.locator('#nav-clientes').click();
   const card=page.locator('#lista-clientes-container > div').filter({hasText:'Persona Prueba Uno'});
   await card.locator('.header-card-cliente').click();
   await card.locator('.btn-abrir-pedido').click();
   await page.locator('#modal-pedido-grid-productos .btn-sumar-cant').first().click();
   assert.match(await page.locator('#pedido-modal-total-monto').innerText(),/125/);
   await page.locator('#btn-confirmar-pedido-modal').click();
   await page.waitForFunction(()=>document.querySelector('#modal-nuevo-pedido')?.classList.contains('hidden'));
   const db=await database(page);
   assert.equal(db.ventas.length,1);
   assert.equal(db.ventas[0].precioUnitario,125);
   assert.equal(db.ventas[0].costoUnitario,70);
 });
 await step('Abonar 25 y liquidar sin perder deuda anterior',async()=>{
   const card=page.locator('#lista-clientes-container > div').filter({hasText:'Persona Prueba Uno'});
   await card.locator('.btn-abrir-abono-directo').click();
   await page.locator('#abono-monto').fill('25');
   await page.locator('#btn-ejecutar-abono').click();
   await page.waitForFunction(()=>document.querySelector('#modal-abono-cliente')?.classList.contains('hidden'));
   const db=await database(page);
   assert.equal(db.pagos.length,1);assert.equal(db.pagos[0].monto,25);
   assert.equal(db.clientes[0].deuda_anterior,0);
   assert.match(await card.innerText(),/100\.00/);
   await card.locator('.btn-ver-detalle').click();
   await page.locator('#btn-liquidar-total-cliente').click();
   await page.waitForFunction(()=>document.querySelector('#modal-detalle-cliente')?.classList.contains('hidden'));
   const settled=await database(page);
   assert.equal(settled.pagos.length,2);
   assert.deepEqual(settled.pagos.map(p=>p.monto).sort((a,b)=>a-b),[25,100]);
   assert.equal(settled.clientes[0].deuda_anterior,0);
 });
 await step('Exportar copia completa e importar tras cambio local',async()=>{
   await page.locator('#nav-ajustes').click();
   await page.evaluate(() => {
     const original = HTMLAnchorElement.prototype.click;
     HTMLAnchorElement.prototype.click = function(...args) {
       if (this.download && this.href.startsWith('data:text/json')) {
         window.__lastBackupHref = this.href;
       }
       return original.apply(this, args);
     };
   });
   await page.locator('#tab-btn-exportar-backup').click();
   await page.waitForFunction(()=>!!window.__lastBackupHref,null,{timeout:12000});
   const href=await page.evaluate(()=>window.__lastBackupHref);
   assert(href && href.includes(','));
   const content=JSON.parse(decodeURIComponent(href.split(',').slice(1).join(',')));
   assert.equal(content.ventas.length,1);
   assert.equal(content.pagos.length,2);
   assert.equal(content.clientes.length,2);
   await page.locator('#nav-clientes').click();
   await page.locator('#btn-abrir-nuevo-cliente').click();
   await page.locator('#nuevo-cliente-nombre').fill('Cliente temporal');
   await page.locator('#btn-crear-nuevo-cliente').click();
   await page.waitForFunction(()=>document.querySelectorAll('#lista-clientes-container .header-card-cliente').length===3);
   // Restaurar desde el mismo JSON exportado.
   await page.locator('#nav-ajustes').click();
   await page.locator('#tab-input-archivo-backup').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(content))});
   await page.locator('#modal-confirm:not(.hidden) #btn-confirm-ok').click();
   await page.waitForFunction(()=>document.querySelectorAll('#lista-clientes-container .header-card-cliente').length===2,{timeout:12000}).catch(()=>{});
   await page.waitForTimeout(500);
   const db=await database(page);
   assert.equal(db.clientes.length,2);
   assert.equal(db.ventas.length,1);
   assert.equal(db.pagos.length,2);
 });
 await step('Datos sobreviven recarga del navegador',async()=>{
   await page.reload({waitUntil:'domcontentloaded'});
   await page.locator('#modal-importar-clientes').waitFor({state:'attached'});
   const db=await database(page);
   assert.equal(db.clientes.length,2);
   assert.equal(db.ventas.length,1);
   assert.equal(db.pagos.length,2);
 });
 await step('Uso offline real de la caché del navegador',async()=>{
   await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller),null,{timeout:12000});
   await ctx.setOffline(true);
   await page.reload({waitUntil:'domcontentloaded',timeout:16000});
   await page.locator('#modal-importar-clientes').waitFor({state:'attached',timeout:15000});
   const db=await database(page);
   assert.equal(db.clientes.length,2);
   await ctx.setOffline(false);
 });
 console.log('PAGEERRORS',JSON.stringify(errors.slice(0,12)));
 } catch(e) {
   console.log('FAILED_AT',JSON.stringify(report));
   console.log('PAGEERRORS',JSON.stringify(errors.slice(0,20)));
   try{await page.screenshot({path:'/tmp/mitiendita-e2e-failed.png',fullPage:true})}catch{}
   throw e;
 } finally { await ctx.close(); }
}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:(process.env.CHROME_BIN || '/snap/bin/chromium'),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 try{await run(browser);console.log('E2E_ALL_PASS',report.length)}
 finally{await browser.close()}
})().catch(e=>{console.error('E2E_FAIL',e);process.exitCode=1});
