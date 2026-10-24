const { chromium,devices }=require('playwright-core');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:(process.env.CHROME_BIN || '/snap/bin/chromium'),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 const ctx=await browser.newContext({...devices['Pixel 7']});
 const page=await ctx.newPage();
 await page.goto((process.env.E2E_BASE_URL || 'http://127.0.0.1:8892/'),{waitUntil:'domcontentloaded'});
 await page.locator('#modal-ajustes').waitFor({state:'attached',timeout:18000});
 const perf=await page.evaluate(async()=>{
   const {guardarCambioConfirmado}=await import('/js/state.js');
   const {buscarClientes,ordenarPorSaldo}=await import('/js/clientQueries.js');
   const time1=performance.now();
   await guardarCambioConfirmado(s=>{
     s.clientes=Array.from({length:700},(_,i)=>({
       id:'stress_'+i,numeroOrden:String(i+1).padStart(3,'0'),nombre:'Persona prueba '+i,
       telefono:'809555'+String(i).padStart(4,'0'),
       deuda_anterior:i*2,pagado_en_periodo:false
     }));
   });
   const persistMs=performance.now()-time1;
   const names=Array.from({length:700},(_,i)=>({id:'a'+i,nombre:'Cliente Ejemplo '+i,telefono:String(8090000000+i)}));
   const time2=performance.now();
   const hits=buscarClientes(names,'ejemplo 699');
   const searchMs=performance.now()-time2;
   const time3=performance.now();
   const sorted=ordenarPorSaldo(names,c=>Number(c.id.slice(1)));
   const sortMs=performance.now()-time3;
   return {persistMs,searchMs,sortMs,hits:hits.length,first:sorted[0].id};
 });
 console.log('STRESS_CORE',JSON.stringify(perf));
 assert(perf.persistMs<5000 && perf.searchMs<500 && perf.sortMs<500);
 const t=Date.now();
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelectorAll('#lista-clientes-container .header-card-cliente').length===700,{timeout:20000});
 console.log('STRESS_RENDER_700_MS',Date.now()-t);
 console.log('STRESS_PASS');
 await browser.close();
})().catch(e=>{console.error('STRESS_FAIL',e);process.exitCode=1});
