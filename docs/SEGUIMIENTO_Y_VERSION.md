# Seguimiento técnico y nota de versión

**Sistema:** MiTiendita – Agenda digital de ventas y cuentas por cobrar.  
**Fecha de revisión:** 14-10-2026.  
**Rama base inspeccionada:** `main`, commit `e2676f7cbc580380cdb45b6f2176314cced69e8b`.  
**Tipo de cierre:** documental/académico; **no** cierre de todos los requisitos de producto.

## Issues seleccionados (4)
Se verificó que estos cuatro Issues existían y se encontraban **abiertos** durante la revisión. Implementación parcial no equivale a criterio de aceptación cumplido.

| Issue | Categoría de seguimiento | Motivo de selección | Estado GitHub |
|---|---|---|---|
| [#1 – HU01 Pedidos a crédito](https://github.com/ERCamilo/MiTiendita/issues/1) | Funcionalidad clave | Comprobar rapidez, persistencia y saldo tras pedido. | Open |
| [#3 – HU03 Pagos y abonos](https://github.com/ERCamilo/MiTiendita/issues/3) | Integridad financiera | Comprobar recálculo y trazabilidad, incluido abono parcial. | Open |
| [#4 – HU04 Gastos y ganancias](https://github.com/ERCamilo/MiTiendita/issues/4) | Mejora/precisión del negocio | Definir y verificar fórmula y registro de egresos. | Open |
| [#5 – HU05 Offline y sincronización](https://github.com/ERCamilo/MiTiendita/issues/5) | Riesgo técnico | Probar modo avión; implementar y comprobar sincronización remota. | Open |

**Issue no seleccionado:** #2 (directorio y saldos) permanece registrado, pero la actividad pide evidenciar cuatro Issues; no se elimina ni se considera resuelto.

## Estado del tablero GitHub Projects
**Pendiente de comprobación visual en GitHub Projects.** El acceso disponible permitió verificar repositorio e Issues, pero no leer ni modificar el tablero de Projects; no se certifica su estado.

**Distribución recomendada, sujeta a validación del responsable:**
- **En revisión:** #1, #3, #4 por disponer de componentes en código sin pruebas de aceptación documentadas.
- **En progreso / Backlog:** #5, según el alcance real, porque existen archivos de PWA y almacenamiento offline, pero no un backend de sincronización comprobado.
- **Finalizado:** únicamente tarjetas documentales cuya entrega y verificación se haya realizado.
Conservar columnas Backlog, Por hacer, En progreso, En revisión y Finalizado.

## Nota técnica de versión (cierre de Semana VIII)
### Contenido de la versión actual
Interfaz móvil con clientes, productos, pedidos, abonos, reportes, ajustes y ciclos; almacenamiento local mediante IndexedDB; instalación PWA con service worker, manifiesto y herramientas de actualización/backup. Se presenta como **prototipo funcional en código**, sin atribuir validaciones que no se han realizado.

### Control de cambios
Git controla modificaciones a los archivos y mantiene histórico de commits. Se registran cinco hitos en [CHANGELOG](../CHANGELOG.md). Los requerimientos trazan historias de usuario a Issues; el tablero debe actualizarse según el trabajo comprobado.

### Pendientes
1. Verificar escenarios reales de aceptación para RF01-RF05/RNF01-RNF05 y documentar resultados.
2. Implementar autenticación/roles si se confirma el requisito de Semana II.
3. Construir backend y sincronización remota; resolver conflictos de cambios hechos sin red.
4. Probar PWA completamente offline (incluidas bibliotecas externas) y recuperación de respaldos.
5. Reconciliar cifras de ingresos, cuentas por cobrar, gastos y ganancias.
6. Validar y capturar el estado actual de GitHub Projects.

### Próximo paso técnico
Ejecutar una ronda reproducible de pruebas, empezando por saldo tras pedido, abonos parciales, exportación/importación de respaldo y operación en modo avión; registrar incidencias, actualizar su estado en GitHub Projects y solo después cerrar los Issues que cumplan sus criterios.

## Evidencias solicitadas para el PDF
- Captura REAL del README publicado en GitHub.
- Captura REAL de los cuatro Issues seleccionados (puede ser listado filtrado y detalle).
- Captura REAL y actualizada del tablero GitHub Projects.
- Enlace permanente al repositorio e historial de cinco avances.

**No sustituir capturas actuales por diagramas simulados o capturas de semanas anteriores sin identificarlas como históricas.**
