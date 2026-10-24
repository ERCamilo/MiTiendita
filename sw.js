// sw.js - Service Worker para Mi Tiendita (PWA con soporte Offline completo y Actualizaciones)
const CACHE_VERSION = 'mitiendita-v1.4';
const CACHE_NAME = `mitiendita-cache-${CACHE_VERSION}`;

// Recursos estáticos críticos del núcleo
const STATIC_ASSETS = [
    './',
    './index.html',
    './js/app.js?v=4.0',
    './manifest.json',
    './js/app.js',
    './js/db.js',
    './js/state.js',
    './js/toast.js',
    './js/pwa.js',
    './js/clientImport.js',
    './js/modals/modalImportarClientes.js',
    './js/modals/modalAbono.js',
    './js/modals/modalAjustes.js',
    './js/modals/modalConfirm.js',
    './js/modals/modalDetalleCliente.js',
    './js/modals/modalNuevoCliente.js',
    './js/modals/modalNuevoPedido.js',
    './js/modals/modalTicket.js',
    './icons/icon.svg',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

// Dependencias usadas por la interfaz: precarga best-effort con red.
// Fallar al descargarlas no debe bloquear el funcionamiento local de la PWA.
const OPTIONAL_EXTERNAL_ASSETS = [
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/lucide@latest',
    'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
    'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap'
];

async function precacheOptional(cache) {
    await Promise.allSettled(OPTIONAL_EXTERNAL_ASSETS.map(async url => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3500);
        try {
            const response = await fetch(url, { mode: 'no-cors', signal: controller.signal });
            if (response.ok || response.type === 'opaque') {
                await cache.put(url, response);
            }
        } finally {
            clearTimeout(timer);
        }
    }));
}

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(async cache => {
                await cache.addAll(STATIC_ASSETS);
                await precacheOptional(cache);
            })
            .then(() => self.skipWaiting())
    );
});

// Activación: Limpieza de versiones antiguas de caché y control inmediato
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => {
                return Promise.all(
                    keys.map(key => {
                        if (key.startsWith('mitiendita-cache-') && key !== CACHE_NAME) {
                            return caches.delete(key);
                        }
                    })
                );
            })
            .then(() => self.clients.claim())
    );
});

// Peticiones de red: Network First para HTML/JS con fallback a caché; Cache First para CDN y fuentes
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignorar esquemas no soportados (ej. extensiones del navegador)
    if (!request.url.startsWith('http')) return;

    // Solo manejar métodos GET
    if (request.method !== 'GET') return;

    // Recursos de CDN externos (Tailwind, Lucide, Fonts, Unsplash): Stale-While-Revalidate
    if (url.origin !== location.origin) {
        event.respondWith(
            caches.open(CACHE_NAME).then(async cache => {
                const cachedResponse = await cache.match(request);
                const fetchPromise = fetch(request)
                    .then(networkResponse => {
                        if (networkResponse && networkResponse.status === 200) {
                            cache.put(request, networkResponse.clone());
                        }
                        return networkResponse;
                    })
                    .catch(() => cachedResponse);

                return cachedResponse || fetchPromise;
            })
        );
        return;
    }

    // Recursos propios de la app: Network First con fallback a caché para asegurar siempre la versión más reciente
    event.respondWith(
        fetch(request)
            .then(networkResponse => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(request, responseClone);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                // Fallback offline desde caché
                return caches.match(request).then(cachedResponse => {
                    if (cachedResponse) return cachedResponse;
                    if (request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }
                    return new Response('Sin conexión', { status: 503, statusText: 'Offline' });
                });
            })
    );
});

// Escucha de mensajes desde la aplicación cliente (ej. forzar actualización / skipWaiting)
self.addEventListener('message', event => {
    if (!event.data) return;

    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }

    if (event.data.action === 'clearCache') {
        caches.keys().then(keys => {
            return Promise.all(keys.filter(k => k.startsWith('mitiendita-cache-')).map(k => caches.delete(k)));
        }).then(() => {
            if (event.ports && event.ports[0]) {
                event.ports[0].postMessage({ success: true });
            }
        });
    }
});
