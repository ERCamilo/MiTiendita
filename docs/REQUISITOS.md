# Requisitos e historias de usuario - MiTiendita

Transcripción sintetizada y normalizada de la tarea de la Semana III (Ingeniería de Software, UAPA). El presente documento representa **requisitos previstos**, no pruebas de cumplimiento.

## Problema y levantamiento
Observación directa y entrevista contextual con un vendedor de comidas a crédito. Se identificaron pérdida de anotaciones, imposibilidad de conocer el saldo acumulado sin sumar, errores en abonos, mezcla de ingresos y gastos, y conectividad móvil inestable.

## Historias de usuario
| ID | Necesidad |
|---|---|
| HU01 | Registrar un pedido o consumo a crédito de manera rápida. |
| HU02 | Consultar el directorio de clientes, saldo deudor y detalle. |
| HU03 | Registrar abonos o pagos totales con fecha y monto. |
| HU04 | Controlar gastos para estimar la ganancia del negocio. |
| HU05 | Operar desde móvil sin Internet y sincronizar cuando regrese la red. |

## Requisitos funcionales
| ID | Descripción | Prioridad | Issue |
|---|---|---|---|
| RF01 | Registrar ventas/pedidos "fiao" asociados a un cliente. | Alta | #1 |
| RF02 | Mostrar clientes, saldos pendientes e historial. | Alta | #2 |
| RF03 | Registrar pagos y abonos recalculando el saldo. | Alta | #3 |
| RF04 | Registrar gastos y mostrar resultados del negocio. | Media | #4 |
| RF05 | Persistir datos en el dispositivo y sincronizar posteriormente. | Media | #5 |

## Requisitos no funcionales
| ID | Descripción y criterio propuesto | Prioridad |
|---|---|---|
| RNF01 | Operación móvil ágil: registrar un pedido en máximo tres toques y menos de 10 segundos. | Alta |
| RNF02 | Disponibilidad offline total de funciones críticas una vez instalada y precargada la app. | Alta |
| RNF03 | Trazabilidad y consistencia de saldos: conservar los movimientos que justifican cada cambio. | Alta |
| RNF04 | Diseño mobile-first, controles táctiles accesibles con una mano. | Media |
| RNF05 | Ligereza: paquete inicial JavaScript/CSS inferior a 5 MB y objetivo Lighthouse >80. | Baja |

La tabla de trazabilidad de la tarea menciona además un tiempo menor a 8 segundos para RNF01, distinto de los 10 segundos de su tabla original. Se conserva el criterio de la tabla de requisitos y **debe acordarse un umbral único antes de la aceptación**.

## Riesgos para aceptación
- **R-01: pérdida de datos locales** al eliminar almacenamiento del navegador o cambiar de dispositivo. Mitigación: respaldo/exportación y backend futuro.
- **R-02: ausencia de sincronización remota verificable** pese a HU05/RF05. Mitigación: definir API, cola offline, conflictos y pruebas de reconexión.
- **R-03: datos financieros inconsistentes** ante interrupción durante una operación. Mitigación: pruebas de atomicidad, validación y conciliación.
- **R-04: librerías externas de CDN** potencialmente no disponibles en frío sin red. Mitigación: servir recursos críticos localmente y probar en modo avión.
- **R-05: autenticación y roles** planteados en Semana II pero sin implementación comprobada. Mitigación: especificar y probar el módulo antes de usar el sistema con varios usuarios.

## Alcance
La Semana II planteaba inventario y POS de alcance general. La Semana III delimitó el caso de uso a ventas a crédito, cuentas por cobrar y control de gastos: ese es el foco de esta entrega.
