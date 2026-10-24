# Informe técnico HU01–HU05 — MiTiendita

**Fecha de creación y revisión:** 2026-10-24  
**Repositorio:** [ERCamilo/MiTiendita](https://github.com/ERCamilo/MiTiendita)  
**Rama de trabajo:** [feat/hu01-hu05-core-20261024](https://github.com/ERCamilo/MiTiendita/tree/feat/hu01-hu05-core-20261024)  
**Origen:** rama de importación JSON, que integra también los cambios previos de instalación Android.  
**Producción / main:** no modificadas por esta fase.

## Dictamen ejecutivo

Se ejecutaron y publicaron correcciones **sin rediseñar la interfaz** para las cinco historias abiertas [#1–#5](https://github.com/ERCamilo/MiTiendita/issues). Hay funcionalidad nueva y correcciones de integridad contable verificadas, pero **no puede declararse terminada la aceptación global**: faltan trabajos visuales y el servidor de sincronización exigido por HU05. Ninguna historia original fue cerrada automáticamente.

Se realizaron **17 pruebas automáticas correctas** mediante Node.js, fake-indexeddb y una simulación del service worker. No equivalen a pruebas end-to-end en un Android real, una prueba con dos dispositivos, ni una evaluación de rendimiento en producción.

## Hallazgos y trabajo completado

### HU01 — Libreta y pedidos diarios — funcionalidad de datos implementada, UX pendiente (#6)
- El pedido confirma éxito **después** de escribir en IndexedDB.
- Cada nueva línea guarda precio/costo unitario del momento del pedido; editar el catálogo ya no cambia el monto de ventas posteriores a la corrección.
- Se protege contra cantidades inválidas y se permite reducir o retirar un consumo con guardado atómico.
- Las ventas heredadas sin precio unitario reciben una referencia inferida desde el catálogo al cargarse: `precioInferidoDelCatalogo=true`. No se afirma que coincida con el precio histórico original.
- Pendiente: medir y ajustar el flujo para máximo tres toques móviles, más las pruebas de respuesta y accesibilidad.

### HU02 — Directorio y cuentas por cobrar — capa de consulta preparada, UI pendiente (#7)
- Nuevas utilidades: búsqueda por nombre, teléfono o número de orden (normaliza tildes), orden por saldo y movimientos cronológicos.
- La importación JSON previa preserva códigos como `001`, detecta duplicados numéricos y muestra el código en las tarjetas.
- Las utilidades de búsqueda y orden por saldo aún **no están conectadas a controles visuales**; por eso el criterio de búsqueda en menos de 0,5 s no puede darse por verificado.
- Diseño pendiente: buscador, filtros, selector de orden (número/saldo/nombre) y vista cronológica conjunta.

### HU03 — Pagos, abonos y liquidación — lógica corregida, pendiente aceptación final
- Los guardados y restauraciones de todos los almacenes comparten una transacción IndexedDB (todo o nada).
- Un fallo simulado aborta la transacción sin borrar el saldo ni los clientes previos.
- Los abonos y la señal de cuenta saldada se guardan juntos y solo se anuncia éxito tras confirmación de IndexedDB.
- Liquidar una cuenta registra un pago verificable: ya no cambia arbitrariamente `deuda_anterior=0`.
- Las fechas de pago se guardan como `fechaIso` además del texto mostrado, y se rechazan importes negativos o superiores al saldo.
- El cierre de período persiste saldos, historial y nuevo número de período de forma conjunta.
- Pendiente: validación manual del botón de liquidación y recuperación ante corte de red/dispositivo Android antes de cierre del issue y merge.

### HU04 — Gastos y balance — modelo sin UI completado, diseño pendiente (#8)
- Esquema de base de datos v2 con almacén `gastos`; no destruye los datos existentes al migrar.
- Cada gasto nuevo guarda identificador, monto, fecha, categoría, descripción opcional y período.
- Categorías soportadas: `insumos`, `empaques`, `transporte`, `servicios`, `otros`.
- La pantalla existente sigue usando `otros` por defecto; **no hay selector de categorías ni historial de gastos** todavía.
- El cálculo de ganancias usa el precio y costo registrados en cada venta nueva, y excluye registros marcados como eliminados.
- Los gastos históricos solo tenían un total acumulado: no pueden reconstruirse fielmente por categoría.
- Pendiente: interfaz para categoría, historial, correcciones auditadas y decidir la interpretación de efectivo frente a ventas a crédito.

### HU05 — PWA/offline — robustez local mejorada, sincronización remota pendiente (#9, #10)
- El service worker precarga los recursos propios; la caché ya incorpora los módulos de importación.
- Las dependencias externas más relevantes se intentan precargar sin bloquear la instalación si falla la red.
- La migración IndexedDB v1→v2 fue probada con clientes y pagos existentes.
- Se conserva la gestión de instalación Android desarrollada anteriormente en la rama base.
- **No hay servidor sincronizador, autenticación o resolución de conflictos entre dos celulares**. El campo `_syncStatus` no equivale a datos sincronizados remotamente.
- Los CDN pueden no estar disponibles en un primer arranque si la precarga opcional falla; verificar en Android real.
- Pendiente: proveedor y contrato de sincronización, pruebas de modo avión y UI que distinga «guardado localmente» frente a «sincronizado».

## Pruebas realizadas

Comando reproducible: `npm ci && npm test` (Node.js 22 utilizado).

| Área | Casos incluidos | Resultado |
|---|---|---|
| Importador JSON previo | 6 pruebas de number/name, duplicados y orden | 6/6 |
| Contabilidad, consultas, rollback, cierres y precios heredados | 9 pruebas | 9/9 |
| Migración IndexedDB v1→v2 | 1 prueba | 1/1 |
| Recursos offline en simulación del service worker | 1 prueba | 1/1 |
| **Total** | | **17/17 PASS** |

**No ejecutado:** Playwright sobre Android real, instalación PWA en varios modelos, arranque offline completo con dependencias CDN no precargadas, medición <0,5 s de búsqueda en el dispositivo, tres toques comprobados, sincronización de dos teléfonos, pruebas de almacenamiento casi lleno.

## Ronda de pruebas de navegador del PR #11 — 24/10/2026

Entorno: Chromium 155 ejecutado en a2 contra servidor **local** sobre 127.0.0.1; no se ingresaron datos reales ni se accedió a producción. Playwright Core, ventana móvil de 393 × 852 y perfil emulado Pixel 7 (Android 14). GitHub Actions y las 17 pruebas automatizadas también aprobaron.

**Flujos E2E: 6/6 PASS** — importación JSON con duplicados y códigos `001`, creación de producto y pedido, abono parcial más liquidación total con registro de pago, exportación/restauración JSON, persistencia tras recarga y nueva apertura real con conexión de navegador desactivada. No hubo excepciones de JavaScript en esos recorridos.

**Pruebas Android emulado:** guía manual de instalación, manifiesto e iconos accesibles, control de service worker y apertura en modo offline: **PASS**. No equivale a instalación física desde Chrome o Samsung Internet en un teléfono real; tampoco verifica el prompt nativo del sistema operativo.

**Estrés con 700 clientes ficticios:** guardado ~47–56 ms, consulta ~3,2–3,4 ms, orden ~0,4 ms y recarga/rendereado móvil ~541–563 ms en esta máquina. No extrapolar estos tiempos a dispositivos Android modestos. La búsqueda aún no tiene control UI; la consulta probada es la función de datos.

**Reproducción:** `npm ci && npm test`, luego levantar `python3 -m http.server 8892 --bind 127.0.0.1` desde la raíz del repositorio y ejecutar, desde otra terminal, `npm run test:e2e:flows`, `npm run test:e2e:android` y `npm run test:e2e:stress`. Los escenarios usan datos inventados y contextos aislados. Chrome configurable mediante `CHROME_BIN` y servidor mediante `E2E_BASE_URL`.

**Puerta de salida pendiente antes de desplegar:** prueba manual en Android físico (instalación Chrome y Samsung Internet según disponibilidad, desconexión, actualización, restauración, cierre/abono y conservación de datos de prueba). A2 no tiene ADB conectado. El fallo de la instalación en algunos celulares descrito por el usuario no puede considerarse resuelto hasta esta verificación.

## Pendientes abiertos y decisiones para diseño

- [#6 — HU01, flujo móvil máximo tres toques](https://github.com/ERCamilo/MiTiendita/issues/6): UX.
- [#7 — HU02, filtros, búsqueda y orden](https://github.com/ERCamilo/MiTiendita/issues/7): UX.
- [#8 — HU04, gastos por categoría e historial](https://github.com/ERCamilo/MiTiendita/issues/8): UX.
- [#9 — HU05, estados offline y sincronización](https://github.com/ERCamilo/MiTiendita/issues/9): UX.
- [#10 — HU05, backend seguro y resolución de conflictos](https://github.com/ERCamilo/MiTiendita/issues/10): infraestructura, NO resoluble mediante interfaz.

## Riesgos remanentes

1. El guardado atómico continúa reescribiendo todas las entidades: garantiza consistencia entre almacenes, pero requiere medir rendimiento al crecer la cartera y el historial.
2. IndexedDB está sujeto a cuota o eliminación de datos por políticas del navegador. No sustituye una copia de seguridad externa.
3. Los precios de transacciones heredadas sin precio original solo pueden fijarse como **estimación**, no recuperarse con exactitud histórica.
4. La integración de la rama de importación de clientes y de instalación Android aún está pendiente de pruebas conjuntas y merge.
5. HU05 no puede cerrarse por completo sin servidor, autenticación, reglas de conflicto y verificación multi-dispositivo.

## Recomendación de integración

1. Revisar los cuatro commits de esta fase y aprobar los cambios de datos en una PR de la rama actual.
2. Ejecutar pruebas de dispositivo Android y copia/restauración con datos ficticios antes de incorporar en `main`.
3. Diseñar primero los issues #6–#8 sin modificar silenciosamente el orden de clientes ya solicitado.
4. Resolver la arquitectura de #10; a continuación implementar y diseñar #9 y validar reconexión.
5. Cerrar cada historia original solo tras integrar y verificar sus criterios completos; HU03 es candidata a aceptación técnica, no se cerró automáticamente.

**Resumen humanizado:** MiTiendita ahora registra con mayor seguridad pedidos, abonos y cierres; conserva un historial de gastos por categoría en la base de datos y prepara la búsqueda de clientes. Faltan controles de pantalla para algunas funciones y la sincronización real entre dispositivos. Se evitó modificar producción o presentar características parciales como terminadas.
