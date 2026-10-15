# Arquitectura y modelado UML

## 1. Arquitectura observada (2026-10-14)
Aplicación web estática: `index.html` y módulos JavaScript se ejecutan en el navegador. `app.js` gestiona vistas y eventos; `state.js` concentra estado y cálculos; `db.js` implementa el almacenamiento local IndexedDB. `sw.js` mantiene recursos en caché; no se encontró servicio backend ni base de datos remota en el repositorio.

```mermaid
flowchart TD
  U[Usuario en móvil o PC] --> FE[Frontend HTML, CSS y JavaScript]
  FE --> ST[Estado y reglas de negocio]
  ST --> DB[(IndexedDB local)]
  FE --> SW[Service Worker y caché]
  FE --> MOD[Modales de cliente, pedido, abono y ticket]
```

## 2. Clases del dominio (modelo conceptual simplificado)
Este diagrama es **una representación técnica de los datos observados**, no un archivo UML generado automáticamente. El registro de gastos es agregado en el estado actual; el detalle por categoría se modela como evolución.

```mermaid
classDiagram
  class Cliente {
    +id
    +nombre
    +telefono
    +deuda_anterior
  }
  class Producto {
    +id
    +nombre
    +precio
    +costo
  }
  class Venta {
    +id
    +clienteId
    +productoId
    +cantidad
    +fechaIso
    +periodo
  }
  class Pago {
    +id
    +clienteId
    +monto
    +periodo
  }
  class EstadoLocal {
    +periodoActual
    +gastosOperativos
    +historicoCierres
  }
  Cliente "1" --> "0..*" Venta
  Producto "1" --> "0..*" Venta
  Cliente "1" --> "0..*" Pago
  EstadoLocal --> Cliente
  EstadoLocal --> Producto
```

## 3. Secuencia propuesta para un abono local
```mermaid
sequenceDiagram
  actor V as Vendedor
  participant F as Frontend
  participant E as Estado y cálculos
  participant I as IndexedDB
  V->>F: Introduce abono
  F->>E: Solicita registrar movimiento
  E->>I: Persiste datos locales
  E->>F: Recalcula saldo
  F->>V: Muestra importe pendiente
```

## 4. Backend propuesto (aún no implementado)
El backend se responsabilizaría de las cuentas de usuario, autorizaciones, validación de movimientos, consistencia de saldos, auditoría, sincronización y copia central de seguridad. Se plantea una API REST sobre HTTPS con JSON y una base relacional (por ejemplo PostgreSQL).

```mermaid
flowchart LR
  A[Frontend PWA] --> B[Cola local IndexedDB]
  A -. HTTPS/JSON cuando haya red .-> C[API backend futura]
  C --> D[Reglas, autenticación y conflictos]
  D --> E[(Base de datos central futura)]
```

**Protocolo futuro:** el navegador enviaría ventas, pagos y cambios mediante solicitudes HTTPS; el servidor devolvería confirmaciones, identificadores y datos actualizados. Hasta que se implemente este flujo, las banderas `_syncStatus` solo preparan el modelo para sincronización.

## 5. Herramientas de gestión
Git registra cambios y versiones; GitHub Issues gestiona incidencias, requisitos y riesgos; GitHub Projects organiza las tarjetas bajo el flujo Scrumban (Backlog, Por hacer, En progreso, En revisión, Finalizado).
