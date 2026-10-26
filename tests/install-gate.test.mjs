import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// Debe ejecutarse en el <head>, antes de los CDN y del módulo tardío app.js.
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const source = html.match(/<script>\s*(window\.__mitienditaInstallGate[\s\S]*?)<\/script>/)?.[1];
test('receptor de instalación carga en head antes de scripts externos', () => {
    assert(source, 'No se encontró receptor temprano');
    assert(html.indexOf('window.__mitienditaInstallGate') < html.indexOf('cdn.tailwindcss.com'));
    assert(html.indexOf('window.__mitienditaInstallGate') < html.indexOf('type="module"'));
});

test('antes de app.js se conserva el evento nativo y preventDefault', () => {
    const listeners = new Map();
    const w = {
        addEventListener: (name, fn) => listeners.set(name, fn)
    };
    vm.runInNewContext(source, { window: w });
    let prevented = false;
    const event = { preventDefault() { prevented = true; }, prompt() {} };
    listeners.get('beforeinstallprompt')(event);
    assert.equal(prevented, true);
    assert.equal(w.__mitienditaInstallGate.pending, event);
    listeners.get('appinstalled')({});
    assert.equal(w.__mitienditaInstallGate.pending, null);
    assert.equal(w.__mitienditaInstallGate.installed, true);
});
