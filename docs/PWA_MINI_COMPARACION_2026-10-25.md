# Instalación PWA — comparación Mini y MiTiendita (25-10-2026)

## Fuentes inspeccionadas

- Mini Sistema de Asistencia: `ERCamilo/Mini_Sistema_de_Asistencia` en `main`, archivo `index.html` (botón #btn-install-pwa, `initPWA()`, `installPWA()`), `manifest.json` y `sw.js`.
- MiTiendita: `ERCamilo/MiTiendita` en `main` (commit inicial de esta corrección `bf238bb`), archivos `index.html`, `js/pwa.js`, `manifest.json` y `sw.js`.
- API: `beforeinstallprompt` es propia de algunos navegadores Chromium; una PWA **no puede obligar** a Android a mostrarla si no recibe el evento.

## Comparativa verificada

| Aspecto | Mini | MiTiendita, antes del arreglo |
|---|---|---|
| Detección | `beforeinstallprompt` + `preventDefault` | Igual |
| Botón | `prompt()` solo con evento guardado | Igual; si falta, guía de instalación |
| Instalación completada | `appinstalled` | Igual |
| Instalación manual | El botón se desactiva si no hay evento | Muestra instrucciones Chrome/Samsung/Firefox |
| Registro service worker | Registro propio con `updateViaCache: 'none'` | Registro en módulo con caché por defecto |
| Posible carrera al inicio | Código embebido en index.html | Eventos registrados dentro de módulo JavaScript posterior a bibliotecas externas |

No se ha identificado ninguna API especial, APK o ruta «forzada» en Mini. La posibilidad de instalar Mini y no MiTiendita en un mismo celular **no prueba** por sí sola una diferencia de compatibilidad; Chrome toma decisiones por sitio y contexto.

## Cambio implementado en MiTiendita

1. Captura temprana de `beforeinstallprompt` y `appinstalled` en el `head`, antes de bibliotecas CDN.
2. `js/pwa.js` reutiliza el permiso capturado antes de cargar el módulo, o continúa escuchando los eventos posteriores.
3. El botón invoca `prompt()` directamente al toque, una sola vez, cuando existe permiso nativo. Si no existe, permanece disponible y muestra instrucciones; no presenta una instalación inexistente como éxito.
4. Se adopta `updateViaCache: 'none'` para el registro del service worker, sin eliminar respaldos ni datos.
5. Se actualizan las referencias de caché a `v1.5` y `js/app.js?v=4.1`.

## Evidencia y límites

- `npm test`: 19/19 comprobaciones unitarias, incluidas dos sobre captura temprana del evento.
- `npm run test:e2e:install`: cuatro escenarios simulando un aviso real del navegador, aviso tardío, ausencia de permiso y `appinstalled`.
- Playwright también valida la regresión de flujos de pedidos, abonos, importación, respaldo y modo offline.
- **Pendiente:** reproducir el problema en el Android específico donde aparece «Cómo instalar», comparar navegador, estado previo de instalación y permiso. Los eventos sintéticos de Playwright **no prueban** que un teléfono real vaya a emitir `beforeinstallprompt`.

## Decisión

Dejar estos cambios en rama y PR para validación. No instalar a la fuerza, no borrar almacenamiento ni desregistrar el service worker, porque ambas operaciones podrían afectar datos locales y no garantizan habilitar el instalador.
