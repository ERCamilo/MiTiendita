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

## Uso local
Se recomienda servir el proyecto con un servidor HTTP estático (`python3 -m http.server 8000` y abrir `http://localhost:8000`). La instalación PWA requiere HTTPS o localhost y compatibilidad del navegador. Parte de los estilos y bibliotecas se cargan desde CDN, por lo que es necesario comprobar su disponibilidad tras la primera carga en modo avión.

## Documentación de la asignatura
- [Requisitos e historias de usuario](docs/REQUISITOS.md)
- [Arquitectura y modelos UML](docs/ARQUITECTURA_Y_UML.md)
- [Seguimiento de Issues, riesgos y nota de versión](docs/SEGUIMIENTO_Y_VERSION.md)
- [Registro de cambios](CHANGELOG.md)

**Referencia metodológica:** Kanban/Scrumban, con las columnas Backlog, Por hacer, En progreso, En revisión y Finalizado, de acuerdo con el trabajo de la Semana II.

> Nota de alcance: En la Semana II el título era "Sistema de Gestión y Control Comercial"; la Semana III concretó la propuesta como "Agenda Digital de Ventas y Cuentas por Cobrar". Para la entrega final se adopta el segundo enfoque, sin atribuir al código funciones no constatadas.
