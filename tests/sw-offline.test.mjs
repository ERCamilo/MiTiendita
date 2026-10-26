import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('HU05: los recursos locales siguen disponibles tras quedar offline', async () => {
    const code = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
    const listeners = new Map();
    const store = new Map();
    const normalize = key => new URL(typeof key === 'string' ? key : key.url, 'https://tienda.erlin.do/').href;
    const cache = {
        addAll: async assets => {
            assets.forEach(path => store.set(normalize(path), new Response('recurso-local')));
        },
        match: async req => store.get(normalize(req)),
        put: async (req, res) => store.set(normalize(req), res),
    };
    const caches = {
        open: async () => cache,
        match: async req => cache.match(req),
        keys: async () => ['mitiendita-cache-antigua'],
        delete: async () => true
    };
    const context = {
        console, URL, setTimeout, clearTimeout, AbortController, Response,
        location: { origin: 'https://tienda.erlin.do' }, caches,
        fetch: async () => { throw new Error('sin conexión'); },
        self: {
            addEventListener(type, cb) { listeners.set(type, cb); },
            skipWaiting: async () => {},
            clients: { claim: async () => {} }
        }
    };
    vm.runInNewContext(code, context);
    let installed;
    listeners.get('install')({ waitUntil(promise) { installed = promise; } });
    await installed;
    assert(store.has('https://tienda.erlin.do/index.html'));
    assert(store.has('https://tienda.erlin.do/js/app.js?v=4.1'));
    assert(store.has('https://tienda.erlin.do/js/clientImport.js'));
    let result;
    listeners.get('fetch')({
        request: { url: 'https://tienda.erlin.do/index.html', method: 'GET', mode: 'navigate' },
        respondWith(promise) { result = promise; }
    });
    const response = await result;
    assert.equal(await response.text(), 'recurso-local');
});
