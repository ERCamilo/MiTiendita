# Registro de avances - MiTiendita

Cinco hitos verificables mediante el historial de GitHub y la documentación técnica. Las fechas corresponden a commits visibles, no a pruebas de aceptación.

| # | Fecha | Avance o ajuste | Evidencia |
|---|---|---|---|
| 1 | 17-08-2026 | Creación del repositorio y primera versión controlada. | Commit `7f200a8` (first commit). |
| 2 | 17-08-2026 | Incorporación de una versión de pruebas del sistema. | Commit `5ae1e26` (version de pruebas). |
| 3 | 17-08-2026 | Configuración del nombre de dominio personalizado mediante CNAME (`tienda.erlin.do`). | Commit `c3a828a`; archivo `CNAME`. |
| 4 | 04-09-2026 | Soporte de instalación PWA, ajustes y controles de actualización/caché. | Commit `e2676f7`; `manifest.json`, `sw.js`, `js/pwa.js`. |
| 5 | 14-10-2026 | Consolidación documental del cierre académico: README, requisitos, UML, arquitectura, seguimiento y nota técnica. | Archivos `README.md`, `CHANGELOG.md` y `docs/` de esta entrega. |

**Control de cambios:** Git conserva los commits; los Issues registran requisitos y pendientes; GitHub Projects permite reflejar el avance tras la comprobación de cada tarea. Este historial **no demuestra** por sí mismo que se hayan superado pruebas funcionales.

**Base de código inspeccionada antes del cierre documental:** `e2676f7cbc580380cdb45b6f2176314cced69e8b`.

## Trabajo pendiente de integración — 24-10-2026

- Rama `feat/hu01-hu05-core-20261024`: seguridad atómica de IndexedDB, pagos y cierres confirmados, precios unitarios conservados en nuevos pedidos, gastos por categoría en la base de datos y utilidades de consulta. Mejora adicional de recursos PWA offline.
- Suite automática: **17/17 PASS** con Node.js/fake-indexeddb/simulación de service worker. No se ejecutó validación Android o sincronización entre teléfonos.
- Pendientes de UI: issues #6, #7, #8 y #9. Bloqueo de infraestructura: #10.
- Reporte: `docs/HU01-HU05_CORE_AUDIT_2026-10-24.md`.
