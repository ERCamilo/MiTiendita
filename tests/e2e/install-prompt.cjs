// npm run test:e2e:install -- requires local HTTP server on E2E_BASE_URL.
const { chromium, devices } = require('playwright-core');
const assert = require('node:assert/strict');
const URL = process.env.E2E_BASE_URL || 'http://127.0.0.1:8897/';
const CHROME = process.env.CHROME_BIN || '/snap/bin/chromium';

function simulateInstallEvent() {
    const event = new Event('beforeinstallprompt', { cancelable: true });
    event.prompt = () => {
        window.__installPromptCalls = (window.__installPromptCalls || 0) + 1;
        window.__promptHadUserGesture = navigator.userActivation.isActive;
        return Promise.resolve();
    };
    event.userChoice = Promise.resolve({ outcome: 'accepted' });
    window.dispatchEvent(event);
    return {
        captured: window.__mitienditaInstallGate?.pending === event,
        defaultPrevented: event.defaultPrevented,
        wasCalled: window.__installPromptCalls || 0
    };
}

async function main() {
    const browser = await chromium.launch({
        headless: true, executablePath: CHROME,
        args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
    try {
        // Force app.js to arrive late, reproducing a slow external module/CDN.
        const context = await browser.newContext(devices['Pixel 7']);
        const page = await context.newPage();
        let release;
        await page.route('**/js/app.js?v=4.1', async route => {
            await new Promise(resolve => { release = resolve; });
            await route.continue();
        });
        const errors = [];
        page.on('pageerror', error => errors.push(String(error)));
        await page.goto(URL, { waitUntil: 'commit' });
        await page.waitForFunction(() => !!window.__mitienditaInstallGate, null, { timeout: 15000 });
        await page.waitForFunction(() => !!document.getElementById('tab-btn-instalar-pwa'), null, { timeout: 15000 });
        const early = await page.evaluate(simulateInstallEvent);
        assert.equal(early.captured, true, 'El receptor del HEAD perdió el evento temprano');
        assert.equal(early.defaultPrevented, true);
        assert.equal(early.wasCalled, 0);
        assert.equal(typeof release, 'function', 'No se interceptó app.js');
        release();
        await page.locator('#modal-ajustes').waitFor({ state: 'attached', timeout: 18000 });
        await page.locator('#nav-ajustes').click();
        await page.waitForFunction(() => document.getElementById('tab-btn-instalar-texto')?.textContent === 'Instalar aplicación');
        assert.equal(await page.locator('#tab-pwa-badge-status').innerText(), 'Lista para instalar');
        await page.locator('#tab-btn-instalar-pwa').click();
        await page.waitForFunction(() => window.__installPromptCalls === 1);
        assert.equal(await page.evaluate(() => window.__promptHadUserGesture), true,
            'prompt() debe ejecutarse directamente en el clic del usuario');
        await page.waitForFunction(() => window.__mitienditaInstallGate?.pending === null);
        console.log('PASS: evento temprano retenido, prompt invocado una sola vez en el gesto');
        assert.equal(errors.length, 0, errors.join('\n'));

        // No native event: do NOT pretend an automatic install is possible.
        await page.waitForFunction(() => document.getElementById('tab-btn-instalar-texto')?.textContent === 'Instalar o ver opciones');
        await page.locator('#tab-btn-instalar-pwa').click();
        await page.locator('#pwa-install-guide').waitFor({ state: 'visible' });
        assert.equal(await page.evaluate(() => window.__installPromptCalls), 1);
        await page.locator('#pwa-install-guide [data-pwa-close]').first().click();
        console.log('PASS: sin permiso nativo se muestra guía, no se fuerza');
        await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
        await page.waitForFunction(() => document.getElementById('tab-btn-instalar-pwa')?.disabled);
        console.log('PASS: appinstalled cambia el estado a instalada');

        await context.close();

        // Late prompt event: normal Mini-style flow must continue working.
        const context2 = await browser.newContext(devices['Pixel 7']);
        const page2 = await context2.newPage();
        await page2.goto(URL, { waitUntil: 'domcontentloaded' });
        await page2.locator('#modal-ajustes').waitFor({ state: 'attached' });
        const late = await page2.evaluate(simulateInstallEvent);
        assert.equal(late.captured, true);
        assert.equal(late.defaultPrevented, true);
        await page2.locator('#nav-ajustes').click();
        await page2.waitForFunction(() => document.getElementById('tab-btn-instalar-texto')?.textContent === 'Instalar aplicación');
        await page2.locator('#tab-btn-instalar-pwa').click();
        await page2.waitForFunction(() => window.__installPromptCalls === 1);
        console.log('PASS: evento tardío activa el instalador nativo');
        await context2.close();
        console.log('INSTALL_E2E_PASS 4');
    } finally {
        await browser.close();
    }
}
main().catch(e => { console.error('INSTALL_E2E_FAIL', e); process.exitCode = 1; });
