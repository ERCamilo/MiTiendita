// js/pwa.js - Módulo de Gestión de PWA, Instalación y Actualizaciones
import { showToast } from './toast.js';

let deferredInstallPrompt = null;
let pwaListeners = [];
let swRegistration = null;

/**
 * Inicializa el Service Worker y los eventos de instalación PWA.
 */
export function initPWA() {
    // 1. Registro del Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => {
                    swRegistration = reg;
                    // Comprobar si hay un service worker esperando activación
                    reg.addEventListener('updatefound', () => {
                        const nuevoWorker = reg.installing;
                        if (nuevoWorker) {
                            nuevoWorker.addEventListener('statechange', () => {
                                if (nuevoWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    showToast("✨ Nueva versión disponible. Toca en Ajustes para actualizar.", 5000);
                                    notificarCambioPWA();
                                }
                            });
                        }
                    });
                })
                .catch(err => {
                    console.warn('Error registrando Service Worker:', err);
                });
        });

        // Escucha si otro SW toma el control
        let refrescando = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refrescando) {
                refrescando = true;
                window.location.reload();
            }
        });
    }

    // 2. Evento para capturar el prompt nativo de instalación
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevenir el banner automático del navegador para controlarlo desde UI
        e.preventDefault();
        deferredInstallPrompt = e;
        notificarCambioPWA();
    });

    // 3. Evento cuando la app se instala con éxito
    window.addEventListener('appinstalled', () => {
        deferredInstallPrompt = null;
        showToast("🎉 ¡Mi Tiendita se ha instalado en tu dispositivo!");
        notificarCambioPWA();
    });
}

/**
 * Suscripción a cambios de estado de la PWA (para actualizar UI de botones)
 */
export function onPWAStateChange(callback) {
    if (typeof callback === 'function') {
        pwaListeners.push(callback);
    }
}

function notificarCambioPWA() {
    pwaListeners.forEach(cb => {
        try { cb(); } catch (e) { console.error(e); }
    });
}

/**
 * Determina si la aplicación ya se está ejecutando instalada (Standalone PWA).
 */
export function esPWAInstalada() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true ||
           document.referrer.includes('android-app://');
}

/**
 * Determina si el navegador tiene listo el prompt de instalación.
 */
export function hayPromptInstalacionDisponible() {
    return deferredInstallPrompt !== null;
}

/**
 * Dispara el flujo nativo de instalación de la aplicación.
 */
export async function instalarPWA() {
    if (esPWAInstalada()) {
        showToast("La aplicación ya está instalada en tu dispositivo.");
        return;
    }

    if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        if (outcome === 'accepted') {
            showToast("Instalando aplicación...");
        } else {
            showToast("Instalación cancelada.");
        }
        deferredInstallPrompt = null;
        notificarCambioPWA();
        return;
    }

    // Caso iOS / Safari u otros navegadores sin prompt automático
    const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (esIOS) {
        alert("Para instalar en iPhone/iPad:\n1. Toca el botón 'Compartir' (cuadrado con flecha hacia arriba).\n2. Selecciona 'Añadir a pantalla de inicio'.");
    } else {
        showToast("Puedes instalarla tocando los 3 puntos del navegador ➔ 'Instalar aplicación' o 'Agregar a la pantalla principal'.", 6000);
    }
}

/**
 * Forzar búsqueda de actualizaciones:
 * Limpia totalmente el CacheStorage, actualiza el Service Worker y recarga la página.
 * NO toca IndexedDB ni LocalStorage (los clientes y saldos están a salvo).
 */
export async function forzarActualizacion() {
    showToast("🔄 Limpiando caché y buscando última versión...", 3000);

    try {
        // 1. Vaciar todas las cachés locales
        if ('caches' in window) {
            const cacheKeys = await caches.keys();
            await Promise.all(cacheKeys.map(key => caches.delete(key)));
        }

        // 2. Forzar actualización del registro del Service Worker
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const reg of registrations) {
                if (reg.waiting) {
                    reg.waiting.postMessage({ action: 'skipWaiting' });
                }
                await reg.update();
            }
        }

        // 3. Recarga limpia evitando caché HTTP del navegador
        setTimeout(() => {
            const urlLimpia = window.location.origin + window.location.pathname + '?v=' + Date.now();
            window.location.href = urlLimpia;
        }, 600);

    } catch (err) {
        console.error("Error forzando actualización:", err);
        showToast("Error al limpiar caché. Recargando de todos modos...");
        setTimeout(() => {
            window.location.reload(true);
        }, 1000);
    }
}
