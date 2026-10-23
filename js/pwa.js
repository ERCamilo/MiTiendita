// Gestión de instalación de Mi Tiendita y actualizaciones PWA.
import { showToast } from './toast.js';

let deferredInstallPrompt = null;
let swRegistration = null;
let initialized = false;
let refreshing = false;
const listeners = new Set();

function notifyPWAChange() {
    listeners.forEach(callback => {
        try {
            callback();
        } catch (error) {
            console.error('Error en observador PWA:', error);
        }
    });
}

/**
 * Registrar los eventos ANTES de cargar IndexedDB. Si load ya ocurrió,
 * registrar el service worker inmediatamente.
 */
export function initPWA() {
    if (initialized) return;
    initialized = true;

    window.addEventListener('beforeinstallprompt', event => {
        event.preventDefault();
        deferredInstallPrompt = event;
        notifyPWAChange();
    });

    window.addEventListener('appinstalled', () => {
        deferredInstallPrompt = null;
        showToast('Mi Tiendita se ha instalado correctamente.');
        notifyPWAChange();
    });

    if (!('serviceWorker' in navigator)) {
        notifyPWAChange();
        return;
    }

    // No recargar durante la primera instalación: Chrome podría perder el
    // aviso pendiente al tomar el worker el control de esta primera pestaña.
    const hadControllerOnStartup = Boolean(navigator.serviceWorker.controller);
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        notifyPWAChange();
        if (hadControllerOnStartup && !refreshing) {
            refreshing = true;
            window.location.reload();
        }
    });

    const registerWorker = async () => {
        try {
            swRegistration = await navigator.serviceWorker.register('./sw.js');
            swRegistration.addEventListener('updatefound', () => {
                const worker = swRegistration.installing;
                if (!worker) return;
                worker.addEventListener('statechange', () => {
                    if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                        showToast('Nueva versión disponible. Puedes actualizarla en Ajustes.', 5000);
                        notifyPWAChange();
                    }
                });
            });
            notifyPWAChange();
        } catch (error) {
            console.warn('No se pudo registrar el service worker:', error);
            notifyPWAChange();
        }
    };

    if (document.readyState === 'complete') {
        void registerWorker();
    } else {
        window.addEventListener('load', registerWorker, { once: true });
    }
}

export function onPWAStateChange(callback) {
    if (typeof callback !== 'function') return () => {};
    listeners.add(callback);
    return () => listeners.delete(callback);
}

export function esPWAInstalada() {
    return window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        navigator.standalone === true ||
        document.referrer.startsWith('android-app://');
}

export function hayPromptInstalacionDisponible() {
    return deferredInstallPrompt !== null;
}

/** Estado para ambas superficies de Ajustes; no confundir PWA con offline. */
export function obtenerEstadoInstalacionPWA() {
    if (esPWAInstalada()) {
        return { tipo: 'instalada', etiqueta: 'Abierta como aplicación', accion: 'Aplicación instalada' };
    }
    if (hayPromptInstalacionDisponible()) {
        return { tipo: 'disponible', etiqueta: 'Lista para instalar', accion: 'Instalar aplicación' };
    }
    if (!window.isSecureContext) {
        return { tipo: 'inseguro', etiqueta: 'Requiere HTTPS', accion: 'Ver instrucciones' };
    }
    return { tipo: 'manual', etiqueta: 'Instalación desde el navegador', accion: 'Cómo instalar' };
}

function installationInstructions() {
    const ua = navigator.userAgent || '';
    const android = /Android/i.test(ua);
    const ios = /iPad|iPhone|iPod/i.test(ua) && !window.MSStream;
    const inApp = /Instagram|FBAN|FBAV|FB_IAB|WhatsApp|TikTok|; wv\)|\bwv\b/i.test(ua);

    if (!window.isSecureContext) {
        return {
            context: 'Esta página debe abrirse con HTTPS para instalarse como aplicación.',
            steps: ['Abre la dirección segura de Mi Tiendita (https://tienda.erlin.do) en el navegador.', 'Desde allí vuelve a pulsar Instalar.']
        };
    }
    if (android && inApp) {
        return {
            context: 'Estás posiblemente dentro del navegador de otra aplicación.',
            steps: ['En el menú de esta aplicación, selecciona Abrir en navegador, Chrome o Samsung Internet.', 'Si no aparece, copia el enlace y pégalo en Chrome o Samsung Internet.', 'En el navegador, abre su menú y selecciona Instalar aplicación o Añadir a pantalla de inicio.']
        };
    }
    if (android && /SamsungBrowser/i.test(ua)) {
        return {
            context: 'Instalación con Samsung Internet.',
            steps: ['Abre el menú de Samsung Internet.', 'Selecciona Añadir página a y después Pantalla de inicio (el nombre puede variar).', 'Confirma la instalación o creación del acceso directo.']
        };
    }
    if (android && /Firefox/i.test(ua)) {
        return {
            context: 'Firefox para Android usa un acceso directo en la pantalla de inicio.',
            steps: ['Abre el menú de Firefox.', 'Elige Instalar o Añadir a pantalla de inicio si aparece.', 'Confirma el acceso directo. Para una instalación tipo app, prueba Chrome.']
        };
    }
    if (android) {
        return {
            context: 'Instalación en Chrome u otro navegador de Android.',
            steps: ['Abre el menú del navegador (normalmente ⋮).', 'Elige Instalar aplicación o Añadir a pantalla de inicio.', 'Confirma. Si esa opción no aparece, abre este enlace directamente en Chrome o Samsung Internet.']
        };
    }
    if (ios) {
        return {
            context: 'Instalación en iPhone o iPad.',
            steps: ['Abre el menú Compartir del navegador.', 'Selecciona Añadir a pantalla de inicio.', 'Pulsa Añadir para crear el icono de Mi Tiendita.']
        };
    }
    return {
        context: 'Instalación desde el navegador.',
        steps: ['Abre el menú de Chrome o Edge.', 'Selecciona Instalar Mi Tiendita, Instalar aplicación o Crear acceso directo.', 'Confirma para añadir Mi Tiendita a tus aplicaciones.']
    };
}

/** Guía accesible y persistente cuando el navegador no da un aviso nativo. */
export function mostrarGuiaInstalacion() {
    const existing = document.getElementById('pwa-install-guide');
    if (existing) {
        existing.querySelector('[data-pwa-close]')?.focus();
        return;
    }

    const previousFocus = document.activeElement;
    const guide = document.createElement('div');
    guide.id = 'pwa-install-guide';
    guide.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4';
    guide.innerHTML = [
        '<section role="dialog" aria-modal="true" aria-labelledby="pwa-guide-title" class="bg-white rounded-3xl p-5 w-full max-w-md shadow-xl space-y-4" style="max-height:90vh;overflow:auto;">',
        '<div class="flex items-start justify-between gap-3">',
        '<div><h2 id="pwa-guide-title" class="text-lg font-extrabold text-gray-900">Instalar Mi Tiendita</h2>',
        '<p id="pwa-guide-context" class="text-sm text-gray-600 mt-1"></p></div>',
        '<button type="button" data-pwa-close aria-label="Cerrar instrucciones" class="shrink-0 w-11 h-11 rounded-xl bg-gray-100 text-gray-700 font-bold">✕</button>',
        '</div>',
        '<ol id="pwa-guide-steps" class="list-decimal list-outside ml-5 space-y-3 text-sm text-gray-800"></ol>',
        '<p class="text-xs text-gray-600 bg-orange-50 p-3 rounded-xl">Importante: tus cuentas están guardadas en este navegador. Instalar la app no sincroniza ni traslada los datos a otro teléfono. Exporta un respaldo antes de cambiar de dispositivo.</p>',
        '<div class="space-y-2">',
        '<label for="pwa-guide-url" class="block text-xs font-bold text-gray-700">Enlace para abrir en otro navegador</label>',
        '<input id="pwa-guide-url" type="text" readonly class="w-full rounded-xl border p-3 text-xs" />',
        '<button id="pwa-guide-copy" type="button" class="w-full min-h-11 p-3 rounded-xl bg-orange-600 text-white font-bold text-sm">Copiar enlace</button>',
        '<button type="button" data-pwa-close class="w-full min-h-11 p-3 rounded-xl bg-gray-100 text-gray-800 font-bold text-sm">Entendido</button>',
        '</div></section>'
    ].join('');

    const info = installationInstructions();
    guide.querySelector('#pwa-guide-context').textContent = info.context;
    const steps = guide.querySelector('#pwa-guide-steps');
    info.steps.forEach(step => {
        const item = document.createElement('li');
        item.textContent = step;
        steps.appendChild(item);
    });
    // Evita copiar parámetros de la navegación (posibles tokens privados).
    const appURL = window.location.origin + window.location.pathname;
    const urlInput = guide.querySelector('#pwa-guide-url');
    urlInput.value = appURL;

    const close = () => {
        guide.removeEventListener('keydown', onKeyDown);
        guide.remove();
        if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
    };
    const onKeyDown = event => {
        if (event.key === 'Escape') close();
        if (event.key !== 'Tab') return;
        const focusables = [...guide.querySelectorAll('button, input')];
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    };
    guide.addEventListener('keydown', onKeyDown);
    guide.querySelectorAll('[data-pwa-close]').forEach(button => button.addEventListener('click', close));
    guide.addEventListener('click', event => {
        if (event.target === guide) close();
    });
    guide.querySelector('#pwa-guide-copy').addEventListener('click', async () => {
        try {
            if (!navigator.clipboard?.writeText) throw new Error('Clipboard API no disponible');
            await navigator.clipboard.writeText(appURL);
            showToast('Enlace copiado. Ábrelo en Chrome o Samsung Internet.');
        } catch {
            urlInput.focus();
            urlInput.select();
            showToast('Selecciona y copia el enlace para abrirlo en otro navegador.', 5000);
        }
    });

    document.body.appendChild(guide);
    guide.querySelector('[data-pwa-close]').focus();
}

export async function instalarPWA() {
    if (esPWAInstalada()) {
        showToast('Ya estás utilizando Mi Tiendita como aplicación.');
        return;
    }

    if (!deferredInstallPrompt) {
        mostrarGuiaInstalacion();
        return;
    }

    // prompt() debe ejecutarse directamente en el gesto del usuario.
    const pendingPrompt = deferredInstallPrompt;
    deferredInstallPrompt = null;
    notifyPWAChange();
    try {
        await pendingPrompt.prompt();
        const result = await pendingPrompt.userChoice;
        if (result?.outcome === 'accepted') {
            showToast('Instalación solicitada. Confirma los pasos de Android.');
        } else {
            showToast('Instalación cancelada. Puedes usar el menú del navegador.');
        }
    } catch (error) {
        console.warn('El navegador no pudo mostrar el instalador:', error);
        mostrarGuiaInstalacion();
    } finally {
        notifyPWAChange();
    }
}

/** Limpiar solo las cachés de Mi Tiendita, sin modificar IndexedDB. */
export async function forzarActualizacion() {
    showToast('Buscando la última versión...', 3000);
    try {
        if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.filter(key => key.startsWith('mitiendita-cache-')).map(key => caches.delete(key)));
        }
        if ('serviceWorker' in navigator) {
            const registration = swRegistration || await navigator.serviceWorker.getRegistration('./');
            if (registration) {
                await registration.update();
                if (registration.waiting) {
                    registration.waiting.postMessage({ action: 'skipWaiting' });
                }
            }
        }
        const url = new URL(window.location.href);
        url.searchParams.set('v', String(Date.now()));
        window.location.assign(url.href);
    } catch (error) {
        console.error('Error al actualizar PWA:', error);
        showToast('No se pudo actualizar. Comprueba tu conexión e inténtalo otra vez.', 5000);
    }
}
