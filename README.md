# MiTiendita - Agenda digital de ventas y cuentas por cobrar

**Asignatura:** Ingeniería de Software (UAPA) · **Cierre académico:** Semana VIII · **Revisión documental:** 14 de octubre de 2026.

## Objetivo y problema
MiTiendita es una aplicación web móvil dirigida a microemprendedores que venden alimentos, meriendas y artículos a crédito ("fiao"). Busca sustituir la libreta de papel y facilitar el registro de consumos, los saldos por cliente, los abonos y el control básico del negocio, incluso cuando la conectividad es limitada.

El problema identificado durante el levantamiento de requisitos fue la pérdida de anotaciones, el cálculo manual de deudas, la confusión de pagos y gastos, y la dependencia de una conexión a Internet.

## Funcionalidades observadas en el código actual
- Clientes y consulta de cuentas por cobrar.
- Catálogo de productos y ventas/pedidos rápidos.
- Registro de pagos y abonos; consulta de detalles e historial.
- Indicadores de ventas, cobros y saldos; gastos operativos y reportes.
- Períodos o ciclos de cobro, ajustes de tienda, exportación e importación de respaldo.
- Interfaz adaptable al móvil; aplicación web progresiva (PWA) instalable con manifiesto y service worker.
- Persistencia de datos local en IndexedDB y migración de datos antiguos desde localStorage.

Estas capacidades se identificaron por inspección de código. **No equivalen a una certificación de pruebas funcionales o de aceptación completas.**

## Arquitectura seleccionada: frontend local, backend proyectado

### Frontend (existente)
El navegador ejecuta `index.html`, módulos JavaScript bajo `js/` y ventanas modales en `js/modals/`. Gestiona interfaces, validaciones, cálculos, catálogo, clientes, ventas y cobros. `js/state.js` administra el estado y los cálculos; `js/db.js` almacena registros en **IndexedDB** (base de datos que funciona dentro del navegador). `manifest.json`, `js/pwa.js` y `sw.js` administran instalación y almacenamiento en caché de recursos.

### Backend (no implementado; propuesta de evolución)
Un backend ofrecería una **API REST** (conjunto de rutas HTTP para intercambiar datos JSON), autenticación y permisos, validación de transacciones, base de datos central, copias de seguridad y sincronización entre dispositivos. Tecnologías posibles: Node.js, un servidor HTTP y PostgreSQL; **no forman parte de la implementación comprobada**.

### Comunicación entre las partes
**Hoy:** usuario → frontend → IndexedDB local. No se requiere backend para guardar las operaciones actuales.

**En una versión futura:** frontend → HTTPS/JSON → API del backend → base de datos central. Los movimientos hechos sin conexión quedarían pendientes y se transmitirían al reconectar; habría que implementar resolución de conflictos y pruebas de integridad. El código incluye metadatos `_syncStatus`, pero **no se verificó sincronización remota activa**.

## Herramientas y tecnologías
HTML5; CSS/Tailwind CSS cargado por CDN; JavaScript modular (ES Modules); IndexedDB; localStorage como mecanismo heredado; Service Worker; Web App Manifest; Lucide; html2canvas; Git, GitHub Issues y GitHub Projects. No se identificó framework de servidor ni backend desplegado en el repositorio.

## Organización de archivos
```text
MiTiendita/
├── index.html                 # Interfaz de usuario
├── js/
│   ├── app.js                 # Navegación y acciones
│   ├── state.js               # Estado y cálculos
│   ├── db.js                  # Persistencia IndexedDB
│   ├── pwa.js                 # Instalación/actualización PWA
│   └── modals/                # Formularios y diálogos
├── sw.js                      # Caché offline de la PWA
├── manifest.json              # Metadatos de instalación
├── icons/                     # Iconos
├── docs/                      # Requisitos, arquitectura, UML y seguimiento
├── CHANGELOG.md               # Registro de cinco avances
└── README.md                  # Presentación técnica del proyecto
```

## Estado actual
**Prototipo web/PWA con persistencia local; cierre técnico documental de la Semana VIII.** El repositorio registra una actualización de PWA el 04-09-2026. La sincronización remota, autenticación por roles, pruebas formales offline y validación completa de los requisitos permanecen pendientes. No debe interpretarse como versión certificada para producción.

Se mantienen para seguimiento los Issues **[#1](https://github.com/ERCamilo/MiTiendita/issues/1), [#3](https://github.com/ERCamilo/MiTiendita/issues/3), [#4](https://github.com/ERCamilo/MiTiendita/issues/4) y [#5](https://github.com/ERCamilo/MiTiendita/issues/5)**. Su estado en GitHub al momento de la revisión era **Open**, aunque algunos módulos tienen código implementado; cerrar un Issue requiere validar sus criterios de aceptación.

## Importación de clientes desde una lista JSON

En **Clientes → Importar** (también disponible en **Ajustes → Importar solo clientes**) puedes seleccionar un archivo `.json` o pegar una lista como:

```json
[
  {"number": "001", "name": "Cliente de ejemplo", "position": "Ayudante", "paused": true},
  {"number": "005", "name": "Otro cliente", "sueldo": "900"}
]
```

El importador lee **solo `number` y `name`**. Guarda `numeroOrden` como texto, conserva ceros iniciales y muestra el número en la tarjeta del cliente, ordenada numéricamente. Se ignoran puesto, sueldo, pausa y cualquier otro campo. Todos los clientes nuevos comienzan con deuda cero y sin pedidos ni pagos previos.

Antes de confirmar, la aplicación muestra una vista previa y omite números de orden ya presentes, incluidos equivalentes como `001` y `1`. Los nombres iguales con números distintos **sí** pueden importarse. No reemplaza los registros, ventas, productos, pagos ni los respaldos existentes. El archivo se procesa localmente y no se envía a GitHub.

**Pruebas:** `node --test tests/client-import.test.mjs`. La prueba usa únicamente nombres ficticios. Esta importación de lista no debe confundirse con **Restaurar JSON**, que sustituye el conjunto de datos de la app.

## Uso local
Se recomienda servir el proyecto con un servidor HTTP estático (`python3 -m http.server 8000` y abrir `http://localhost:8000`). La instalación PWA requiere HTTPS o localhost y compatibilidad del navegador. Parte de los estilos y bibliotecas se cargan desde CDN, por lo que es necesario comprobar su disponibilidad tras la primera carga en modo avión.

## Documentación de la asignatura
- [Requisitos e historias de usuario](docs/REQUISITOS.md)
- [Arquitectura y modelos UML](docs/ARQUITECTURA_Y_UML.md)
- [Seguimiento de Issues, riesgos y nota de versión](docs/SEGUIMIENTO_Y_VERSION.md)
- [Registro de cambios](CHANGELOG.md)

**Referencia metodológica:** Kanban/Scrumban, con las columnas Backlog, Por hacer, En progreso, En revisión y Finalizado, de acuerdo con el trabajo de la Semana II.

> Nota de alcance: En la Semana II el título era "Sistema de Gestión y Control Comercial"; la Semana III concretó la propuesta como "Agenda Digital de Ventas y Cuentas por Cobrar". Para la entrega final se adopta el segundo enfoque, sin atribuir al código funciones no constatadas.

## Mejoras de lógica HU01–HU05 (24 de octubre de 2026)

Los cambios de persistencia atómica, pedidos con precios registrados, abonos durables, consultas de clientes, gastos por categoría y precaché PWA están desarrollados en la rama `feat/hu01-hu05-core-20261024` y cuentan con pruebas automatizadas (`npm ci && npm test`). No se han integrado a `main` y no equivalen a la aceptación funcional en Android. Consulta el [reporte técnico HU01–HU05](docs/HU01-HU05_CORE_AUDIT_2026-10-24.md) para resultados, riesgos, pendientes visuales e infraestructura de sincronización.

### Pruebas de navegador para el PR #11

Desde la raíz, inicia en una terminal `python3 -m http.server 8892 --bind 127.0.0.1` y en otra, después de `npm ci`, ejecuta `npm run test:e2e:flows`, `npm run test:e2e:android` y `npm run test:e2e:stress`. Requiere Chromium instalado (en a2: `/snap/bin/chromium`; ruta alternativa mediante `CHROME_BIN`). Usa una sesión aislada y datos ficticios. El resultado en modo emulado **no certifica la instalación real en Android físico**.
