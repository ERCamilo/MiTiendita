import { 
    state, 
    cargarEstado,
    guardarEnLocalStorage, 
    calcularConsumoCliente, 
    calcularPagosCliente, 
    calcularMontoRestanteCliente, 
    contarPedidosCliente,
    calcularConsumoHoyCliente,
    calcularTotalVendidoHoy,
    calcularTotalPendienteCiclo,
    calcularTotalPagadoCiclo,
    calcularTotalVendidoCiclo,
    calcularCantidadVendidaHoyProducto,
    calcularCantidadProductoCliente,
    agregarVentaRapida,
    reducirVentaRapida,
    aplicarTema,
    resetearTodosLosDatos,
    cargarDatosDemostracion
} from './state.js';
import { showToast } from './toast.js';

import { initModalNuevoCliente, abrirModalNuevoCliente } from './modals/modalNuevoCliente.js';
import { initModalImportarClientes, abrirModalImportarClientes } from './modals/modalImportarClientes.js';
import { compararClientesPorNumero } from './clientImport.js';
import { initModalNuevoPedido, abrirModalNuevoPedido } from './modals/modalNuevoPedido.js';
import { initModalAbono, abrirModalAbono } from './modals/modalAbono.js';
import { initModalTicket, abrirModalCompartirTicket } from './modals/modalTicket.js';
import { initModalDetalleCliente, abrirDetalleCliente } from './modals/modalDetalleCliente.js';
import { initModalConfirm, customConfirm } from './modals/modalConfirm.js';
import { initModalAjustes, abrirModalAjustes, COLORES_TEMA, ejecutarExportarBackup, ejecutarImportarBackup } from './modals/modalAjustes.js';
import { initPWA, instalarPWA, forzarActualizacion, obtenerEstadoInstalacionPWA, onPWAStateChange } from './pwa.js';

let clienteExpandidoId = null;
let currentTab = 'clientes';
let productoRapidoSeleccionadoId = null;

// 1. Inicialización de la Aplicación (async para IndexedDB)
initPWA();

document.addEventListener('DOMContentLoaded', async () => {
    await cargarEstado();
    aplicarTema(state.colorTema || 'coral');
    
    // Inicializar Componentes Modales
    initModalNuevoCliente(() => render());
    initModalImportarClientes(() => render());
    initModalNuevoPedido(() => render());
    initModalAbono(() => render());
    initModalTicket();
    initModalDetalleCliente(() => render());
    initModalConfirm();
    initModalAjustes(() => render());

    // Eventos Globales de Navegación y Acciones
    vincularEventosGlobales();

    // Render Inicial
    render();
});

function vincularEventosGlobales() {
    // Botón Ajustes en Header: navega a la pestaña de Ajustes
    const btnAjustes = document.getElementById('btn-abrir-ajustes');
    if (btnAjustes) {
        btnAjustes.addEventListener('click', () => switchTab('ajustes'));
    }

    // Botón Cerrar Ciclo en Header o Reportes
    const btnCerrarCiclo = document.getElementById('btn-cerrar-ciclo');
    if (btnCerrarCiclo) {
        btnCerrarCiclo.addEventListener('click', promptCerrarPeriodo);
    }

    // Botón Cerrar Ciclo en Hero Comanda (Nota del Día)
    const btnCerrarHero = document.getElementById('btn-cerrar-ciclo-hero');
    if (btnCerrarHero) {
        btnCerrarHero.addEventListener('click', promptCerrarPeriodo);
    }

    // Botón Editar Productos en Menú del Día
    const btnIrProds = document.getElementById('btn-ir-a-productos');
    if (btnIrProds) {
        btnIrProds.addEventListener('click', () => switchTab('productos'));
    }

    // Botón Nuevo Cliente en Header de Clientes
    const btnNuevoCliente = document.getElementById('btn-abrir-nuevo-cliente');
    if (btnNuevoCliente) {
        btnNuevoCliente.addEventListener('click', abrirModalNuevoCliente);
    }

    ['btn-abrir-importar-clientes', 'tab-btn-importar-clientes'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', abrirModalImportarClientes);
    });

    // Barra de Navegación Inferior (4 Tabs: Clientes, Productos, Reportes, Ajustes)
    ['clientes', 'productos', 'reportes', 'ajustes'].forEach(tab => {
        const navBtn = document.getElementById(`nav-${tab}`);
        if (navBtn) {
            navBtn.addEventListener('click', () => switchTab(tab));
        }
    });

    // Eventos PWA en Pestaña de Ajustes
    const tabBtnInstalar = document.getElementById('tab-btn-instalar-pwa');
    if (tabBtnInstalar) {
        tabBtnInstalar.addEventListener('click', () => {
            instalarPWA();
        });
    }

    const tabBtnActualizar = document.getElementById('tab-btn-actualizar-pwa');
    if (tabBtnActualizar) {
        tabBtnActualizar.addEventListener('click', () => {
            customConfirm(
                "Actualizar Aplicación",
                "Se limpiará el caché local y se descargará la última versión de la app. Tus clientes, ventas y deudas NO se verán afectados. ¿Continuar?",
                () => {
                    forzarActualizacion();
                },
                "refresh-cw"
            );
        });
    }

    onPWAStateChange(() => {
        actualizarEstadoPWAEnTab();
    });

    // Eventos de Identidad y Moneda en Pestaña Ajustes
    const tabBtnGuardarIdentidad = document.getElementById('tab-btn-guardar-identidad');
    if (tabBtnGuardarIdentidad) {
        tabBtnGuardarIdentidad.addEventListener('click', guardarIdentidadTiendaDesdeTab);
    }

    document.querySelectorAll('.tab-btn-moneda').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const moneda = e.currentTarget.getAttribute('data-moneda');
            seleccionarMonedaTabUI(moneda);
        });
    });

    // Eventos de Backup en Pestaña Ajustes
    const tabBtnExportar = document.getElementById('tab-btn-exportar-backup');
    if (tabBtnExportar) {
        tabBtnExportar.addEventListener('click', ejecutarExportarBackup);
    }

    const tabBtnImportar = document.getElementById('tab-btn-importar-backup');
    const tabInputImportar = document.getElementById('tab-input-archivo-backup');
    if (tabBtnImportar && tabInputImportar) {
        tabBtnImportar.addEventListener('click', () => tabInputImportar.click());
        tabInputImportar.addEventListener('change', ejecutarImportarBackup);
    }

    // Eventos de Mantenimiento en Pestaña Ajustes
    const tabBtnDemo = document.getElementById('tab-btn-cargar-demo');
    if (tabBtnDemo) {
        tabBtnDemo.addEventListener('click', () => {
            customConfirm(
                "Cargar Demostración",
                "Se reemplazarán los datos actuales con clientes y productos de ejemplo. ¿Deseas continuar?",
                () => {
                    cargarDatosDemostracion();
                    render();
                    showToast("¡Datos de demostración cargados!");
                },
                "sparkles"
            );
        });
    }

    const tabBtnReset = document.getElementById('tab-btn-reset-datos');
    if (tabBtnReset) {
        tabBtnReset.addEventListener('click', () => {
            customConfirm(
                "Borrar Todos los Datos",
                "⚠️ ATENCIÓN: Se eliminarán permanentemente todos los clientes, productos, ventas e historial. Esta acción no se puede deshacer.",
                async () => {
                    await resetearTodosLosDatos();
                    render();
                    showToast("Todos los datos han sido borrados.");
                },
                "trash-2"
            );
        });
    }

    // Formulario de Nuevo Producto
    const btnCrearProd = document.getElementById('btn-crear-producto');
    if (btnCrearProd) {
        btnCrearProd.addEventListener('click', ejecutarCrearProducto);
    }

    // Eventos Multimedia de Foto para Productos
    const btnCamara = document.getElementById('btn-foto-camara');
    const inputCamara = document.getElementById('prod-camera-input');
    if (btnCamara && inputCamara) {
        btnCamara.addEventListener('click', () => inputCamara.click());
        inputCamara.addEventListener('change', procesarArchivoImagenProducto);
    }

    const btnGaleria = document.getElementById('btn-foto-galeria');
    const inputGaleria = document.getElementById('prod-file-input');
    if (btnGaleria && inputGaleria) {
        btnGaleria.addEventListener('click', () => inputGaleria.click());
        inputGaleria.addEventListener('change', procesarArchivoImagenProducto);
    }

    const btnQuitarFondo = document.getElementById('btn-quitar-fondo');
    if (btnQuitarFondo) {
        btnQuitarFondo.addEventListener('click', ejecutarQuitarFondoProducto);
    }

    const btnRemoverFoto = document.getElementById('btn-remover-foto-prod');
    if (btnRemoverFoto) {
        btnRemoverFoto.addEventListener('click', limpiarFotoProducto);
    }

    // Formulario de Gastos Operativos
    const btnGuardarGasto = document.getElementById('btn-guardar-gasto');
    if (btnGuardarGasto) {
        btnGuardarGasto.addEventListener('click', guardarGastoOperativo);
    }
}

// 2. Control de Vistas / Pestañas
export function switchTab(tab) {
    currentTab = tab;
    ['clientes', 'productos', 'reportes', 'ajustes'].forEach(t => {
        const view = document.getElementById(`view-${t}`);
        const navBtn = document.getElementById(`nav-${t}`);
        const navIcon = document.getElementById(`nav-icon-${t}`);
        const navText = document.getElementById(`nav-text-${t}`);

        if (t === tab) {
            if (view) view.classList.remove('hidden');
            if (navIcon) navIcon.className = "w-10 h-10 rounded-full bg-m3-primary text-white flex items-center justify-center shadow-xs";
            if (navText) navText.className = "text-[11px] font-bold text-m3-primary";
        } else {
            if (view) view.classList.add('hidden');
            if (navIcon) navIcon.className = "w-10 h-10 rounded-full bg-transparent text-[#8A8580] flex items-center justify-center";
            if (navText) navText.className = "text-[11px] font-medium text-[#8A8580]";
        }
    });

    if (tab === 'ajustes') {
        renderAjustesTab();
    }

    render();
}

let temaSeleccionadoEnTab = null;

function renderAjustesTab() {
    const inputNombre = document.getElementById('tab-ajustes-nombre-tienda');
    if (inputNombre) {
        inputNombre.value = state.nombreTienda || "Mi Tiendita";
    }

    seleccionarMonedaTabUI(state.simboloMoneda || "$");
    temaSeleccionadoEnTab = state.colorTema || "coral";
    renderTemasSwatchesTab();
    actualizarEstadoPWAEnTab();
}

function renderTemasSwatchesTab() {
    const container = document.getElementById('tab-temas-container');
    if (!container || !COLORES_TEMA) return;

    container.innerHTML = Object.entries(COLORES_TEMA).map(([key, v]) => `
        <button type="button" class="tab-btn-tema flex flex-col items-center space-y-1 p-1.5 rounded-xl border-2 transition active:scale-95 cursor-pointer ${key === temaSeleccionadoEnTab ? 'border-gray-900 bg-gray-100' : 'border-transparent hover:border-gray-300'}" data-tema="${key}" title="${v.label}">
            <span class="w-6 h-6 rounded-full shadow-2xs border-2 border-white" style="background:${v.hex}"></span>
            <span class="text-[9px] font-semibold text-gray-700">${v.label}</span>
        </button>
    `).join('');

    container.querySelectorAll('.tab-btn-tema').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tema = e.currentTarget.getAttribute('data-tema');
            temaSeleccionadoEnTab = tema;
            aplicarTema(tema);
            renderTemasSwatchesTab();
        });
    });
}

function seleccionarMonedaTabUI(moneda) {
    document.querySelectorAll('.tab-btn-moneda').forEach(btn => {
        if (btn.getAttribute('data-moneda') === moneda) {
            btn.className = "tab-btn-moneda py-2 rounded-xl text-xs font-bold bg-m3-primary text-white border border-m3-primary shadow-xs";
        } else {
            btn.className = "tab-btn-moneda py-2 rounded-xl text-xs font-bold bg-[#F8F5F0] border border-[#EAE5DE] text-m3-onSurface hover:bg-[#EAE5DE]";
        }
    });
}

function guardarIdentidadTiendaDesdeTab() {
    const inputNombre = document.getElementById('tab-ajustes-nombre-tienda');
    const nuevoNombre = inputNombre ? inputNombre.value.trim() : "Mi Tiendita";

    const btnMonedaActivo = document.querySelector('.tab-btn-moneda.bg-m3-primary');
    const nuevaMoneda = btnMonedaActivo ? btnMonedaActivo.getAttribute('data-moneda') : "$";

    state.nombreTienda = nuevoNombre || "Mi Tiendita";
    state.simboloMoneda = nuevaMoneda;
    state.colorTema = temaSeleccionadoEnTab || "coral";
    aplicarTema(state.colorTema);
    guardarEnLocalStorage();

    render();
    showToast(`¡Ajustes de "${state.nombreTienda}" guardados con éxito!`);
}

function actualizarEstadoPWAEnTab() {
    const boton = document.getElementById('tab-btn-instalar-pwa');
    const texto = document.getElementById('tab-btn-instalar-texto');
    const badge = document.getElementById('tab-pwa-badge-status');
    if (!boton || !texto) return;
    const estado = obtenerEstadoInstalacionPWA();
    boton.disabled = estado.tipo === 'instalada';
    boton.classList.toggle('opacity-60', boton.disabled);
    boton.classList.toggle('cursor-not-allowed', boton.disabled);
    texto.textContent = estado.accion;
    if (badge) {
        badge.textContent = estado.etiqueta;
        badge.className = 'text-[10px] font-extrabold px-2.5 py-1 rounded-full ' +
            (estado.tipo === 'instalada' ? 'bg-blue-100 text-blue-800' :
             estado.tipo === 'disponible' ? 'bg-emerald-100 text-emerald-800' :
             'bg-amber-100 text-amber-800');
    }
}

// 3. Función Central de Renderizado
export function render() {
    // Apply current theme
    aplicarTema(state.colorTema || 'coral');

    // Header Store Name & Initials Avatar
    const headerNombre = document.getElementById('header-nombre-tienda');
    if (headerNombre) {
        headerNombre.innerText = state.nombreTienda || "Mi Tiendita";
    }

    const avatarInit = document.getElementById('header-avatar-iniciales');
    if (avatarInit) {
        avatarInit.innerText = obtenerIniciales(state.nombreTienda || "Mi Tiendita");
    }

    const tagPeriodo = document.getElementById('periodo-tag');
    if (tagPeriodo) {
        tagPeriodo.innerText = `Período #${state.periodoActual}`;
    }

    const tagPeriodoHero = document.getElementById('periodo-badge-hero');
    if (tagPeriodoHero) {
        tagPeriodoHero.innerText = `Período #${state.periodoActual}`;
    }

    // Fecha y Hora Local del Dispositivo
    renderFechaYHora();

    if (currentTab === 'clientes') {
        renderEstadisticasDashboard();
        renderMenuDelDia();
        renderClientes();
    } else if (currentTab === 'productos') {
        renderProductos();
    } else if (currentTab === 'reportes') {
        renderReportes();
    }

    if (window.lucide) window.lucide.createIcons();
}

function renderFechaYHora() {
    const headerFecha = document.getElementById('header-fecha-actual');
    const badgeHora = document.getElementById('stat-badge-hora');
    const ahora = new Date();

    if (headerFecha) {
        try {
            const formateadorFecha = new Intl.DateTimeFormat('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
            });
            headerFecha.innerText = formateadorFecha.format(ahora);
        } catch (e) {
            headerFecha.innerText = ahora.toLocaleDateString('es-ES');
        }
    }

    if (badgeHora) {
        try {
            const formateadorHora = new Intl.DateTimeFormat('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
            });
            badgeHora.innerText = formateadorHora.format(ahora);
        } catch (e) {
            badgeHora.innerText = ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
    }
}

function renderEstadisticasDashboard() {
    const totalHoy = calcularTotalVendidoHoy();
    const totalCiclo = calcularTotalVendidoCiclo();
    const totalPagado = calcularTotalPagadoCiclo();
    const totalPendiente = calcularTotalPendienteCiclo();

    // Contar clientes con saldo pendiente
    let clientesConDeuda = 0;
    state.clientes.forEach(c => {
        const monto = calcularMontoRestanteCliente(c.id);
        if (monto > 0.01) clientesConDeuda++;
    });

    const elHoy = document.getElementById('stat-total-hoy');
    const elCiclo = document.getElementById('stat-total-ciclo');
    const elPagado = document.getElementById('stat-total-pagado');
    const elPendiente = document.getElementById('stat-total-pendiente');
    const elResumen = document.getElementById('stat-resumen-deudores');

    if (elHoy) elHoy.innerText = `$${totalHoy.toFixed(2)}`;
    if (elCiclo) elCiclo.innerText = `$${totalCiclo.toFixed(2)}`;
    if (elPagado) elPagado.innerText = `$${totalPagado.toFixed(2)}`;
    if (elPendiente) elPendiente.innerText = `$${totalPendiente.toFixed(2)}`;

    if (elResumen) {
        const clienteTexto = clientesConDeuda === 1 ? '1 cliente' : `${clientesConDeuda} clientes`;
        elResumen.innerText = `Te deben entre ${clienteTexto} · vendiste $${totalHoy.toFixed(2)} hoy`;
    }
}

function renderMenuDelDia() {
    const grid = document.getElementById('menu-del-dia-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (!state.productos || state.productos.length === 0) {
        grid.innerHTML = `
            <div class="col-span-2 bg-white rounded-2xl p-4 text-center border border-[#EBE7DF] text-xs text-[#8A8580]">
                No hay productos en el menú. Toca "Editar productos" para añadir.
            </div>
        `;
        return;
    }

    // Mostrar los primeros 4 productos frecuentes (grid 2x2 como la maqueta)
    state.productos.slice(0, 4).forEach(prod => {
        const card = document.createElement('div');
        const isActiveQuick = (productoRapidoSeleccionadoId === prod.id);
        card.className = `bg-white rounded-2xl p-2.5 shadow-xs border ${isActiveQuick ? 'border-m3-primary ring-2 ring-m3-primary/30' : 'border-[#EBE7DF]'} flex flex-col justify-between space-y-2 transition-all cursor-pointer hover:border-m3-primary/40`;

        const imgHtml = (prod.imagen && prod.imagen.trim() !== '')
            ? `<img src="${prod.imagen}" class="w-full h-full object-cover rounded-xl" alt="${prod.nombre}" onerror="this.onerror=null; this.parentElement.innerHTML='<span class=\\'text-3xl\\'>${prod.emoji || '📦'}</span>'"/>`
            : `<span class="text-3xl">${prod.emoji || '📦'}</span>`;

        card.innerHTML = `
            <div class="w-full h-24 rounded-xl bg-[#F5F2EB] flex items-center justify-center overflow-hidden border border-[#EBE7DF]/50">
                ${imgHtml}
            </div>
            <div>
                <h4 class="font-bold text-xs text-[#1D1D1F] truncate" title="${prod.nombre}">${prod.nombre}</h4>
                <div class="flex items-center justify-between mt-1 pt-0.5">
                    <span class="font-black text-sm text-[#1D1D1F]">$${prod.precio.toFixed(2)}</span>
                    <button type="button" class="btn-despacho-rapido w-7 h-7 rounded-full bg-m3-primary hover:bg-m3-primary/90 text-white font-black text-sm flex items-center justify-center transition active:scale-90 shadow-2xs cursor-pointer" title="Despachar ${prod.nombre}">
                        <i data-lucide="plus" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        `;

        const btnPlus = card.querySelector('.btn-despacho-rapido');
        if (btnPlus) {
            btnPlus.addEventListener('click', (e) => {
                e.stopPropagation();
                despacharProductoDirecto(prod.id);
            });
        }

        card.addEventListener('click', () => {
            despacharProductoDirecto(prod.id);
        });

        grid.appendChild(card);
    });

    if (window.lucide) window.lucide.createIcons();
}

function despacharProductoDirecto(productoId) {
    const prod = state.productos.find(p => p.id === productoId);
    if (!prod) return;

    // Si hay un cliente expandido o seleccionado, cargar directamente
    if (clienteExpandidoId) {
        const cli = state.clientes.find(c => c.id === clienteExpandidoId);
        agregarVentaRapida(clienteExpandidoId, productoId, 1);
        render();
        showToast(`⚡ +1 ${prod.nombre} agregado a ${cli ? cli.nombre : 'cliente'}`);
        return;
    }

    // Si no hay cliente seleccionado, alternar modo despacho rápido
    if (productoRapidoSeleccionadoId === productoId) {
        productoRapidoSeleccionadoId = null;
        render();
        showToast("Modo rápido desactivado.");
    } else {
        productoRapidoSeleccionadoId = productoId;
        render();
        showToast(`⚡ ${prod.nombre} activo: toca un cliente abajo para despachar`);
    }
}

function escaparHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function obtenerIniciales(nombre) {
    if (!nombre) return "CL";
    const parts = nombre.trim().split(/\s+/);
    if (parts.length > 1) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
}

function obtenerUltimoMovimientoCliente(clienteId) {
    const ventasCliente = state.ventas.filter(v => v.clienteId === clienteId && !v._deleted);
    if (ventasCliente.length === 0) {
        return "Sin consumos este período";
    }
    const ultima = ventasCliente[ventasCliente.length - 1];
    const prod = state.productos.find(p => p.id === ultima.productoId);
    const nombreProd = prod ? prod.nombre : "Producto";

    let fechaTxt = "Hoy";
    if (ultima.fecha) {
        if (ultima.fecha.includes(',')) {
            const partes = ultima.fecha.split(',');
            fechaTxt = `Hoy ${partes[1].trim()}`;
        } else {
            fechaTxt = ultima.fecha;
        }
    }
    return `${fechaTxt} · ${nombreProd}`;
}

// 4. Render de la Vista de Clientes (Tarjetas con Avatar y Comanda)
function renderClientes() {
    const countEl = document.getElementById('clientes-count');
    if (countEl) {
        countEl.innerText = `${state.clientes.length} clientes registrados`;
    }

    const listaContainer = document.getElementById('lista-clientes-container');
    if (!listaContainer) return;
    listaContainer.innerHTML = '';

    if (state.clientes.length === 0) {
        listaContainer.innerHTML = `
            <div class="bg-white border border-[#EBE7DF] rounded-3xl p-8 text-center space-y-2">
                <i data-lucide="users" class="w-8 h-8 text-[#8A8580] mx-auto"></i>
                <h4 class="font-bold text-sm text-[#1D1D1F]">Sin Clientes Registrados</h4>
                <p class="text-xs text-[#8A8580]">Toca "+ Nuevo cliente" para comenzar tu registro contable.</p>
            </div>
        `;
        return;
    }

    const prodRapido = productoRapidoSeleccionadoId ? state.productos.find(p => p.id === productoRapidoSeleccionadoId) : null;

    [...state.clientes].sort(compararClientesPorNumero).forEach((c) => {
        const consumoPeriodo = calcularConsumoCliente(c.id);
        const pagosPeriodo = calcularPagosCliente(c.id);
        const montoRestante = calcularMontoRestanteCliente(c.id);
        const { totalPedidos, totalArticulos } = contarPedidosCliente(c.id);
        const estaExpandido = (clienteExpandidoId === c.id);
        const cantEsteProd = prodRapido ? calcularCantidadProductoCliente(c.id, prodRapido.id) : 0;
        const iniciales = obtenerIniciales(c.nombre);
        const ultimoMov = obtenerUltimoMovimientoCliente(c.id);

        const card = document.createElement('div');
        card.className = `bg-white border ${estaExpandido ? 'border-m3-primary shadow-md ring-1 ring-m3-primary/30' : (prodRapido ? 'border-amber-300 ring-1 ring-amber-300/50 shadow-xs' : 'border-[#EBE7DF] shadow-xs')} rounded-2xl p-4 space-y-3 transition-all`;

        const actionButtonsHtml = prodRapido 
            ? `
                <div class="grid grid-cols-2 gap-2 pt-1 border-t border-[#F2EFEB] items-center">
                    <button type="button" class="btn-toggle-expand py-2 px-3 rounded-xl bg-[#F8F5F0] hover:bg-[#EFEAE2] text-[#4A4540] text-xs font-bold flex items-center justify-center space-x-1.5 border border-[#EBE7DF] transition active:scale-95 cursor-pointer">
                        <i data-lucide="${estaExpandido ? 'chevron-up' : 'eye'}" class="w-3.5 h-3.5 text-m3-primary"></i>
                        <span>${estaExpandido ? 'Ocultar' : 'Ver detalle'}</span>
                    </button>
                    <div class="flex items-center justify-between bg-amber-50 border border-amber-300/80 rounded-xl p-1 shadow-2xs">
                        <button type="button" class="btn-quick-minus w-7 h-7 rounded-lg bg-white text-amber-900 hover:bg-amber-100 font-bold flex items-center justify-center transition active:scale-90 shadow-2xs ${cantEsteProd > 0 ? 'cursor-pointer' : 'opacity-30 cursor-not-allowed'}" ${cantEsteProd > 0 ? '' : 'disabled'}>
                            <i data-lucide="minus" class="w-3.5 h-3.5"></i>
                        </button>
                        <div class="text-center px-1">
                            <span class="font-black text-xs text-amber-950">${cantEsteProd}</span>
                            <span class="text-[9px] font-semibold text-amber-800 ml-0.5">uds</span>
                        </div>
                        <button type="button" class="btn-quick-plus w-7 h-7 rounded-lg bg-m3-primary hover:bg-m3-primary/90 text-white font-bold flex items-center justify-center transition active:scale-90 shadow-2xs cursor-pointer">
                            <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>
                </div>
            `
            : `
                <div class="grid grid-cols-2 gap-2 pt-1 border-t border-[#F2EFEB] items-center">
                    <button type="button" class="btn-toggle-expand py-2 px-3 rounded-xl bg-[#F8F5F0] hover:bg-[#EFEAE2] text-[#4A4540] text-xs font-bold flex items-center justify-center space-x-1.5 border border-[#EBE7DF] transition active:scale-95 cursor-pointer">
                        <i data-lucide="${estaExpandido ? 'chevron-up' : 'eye'}" class="w-3.5 h-3.5 text-m3-primary"></i>
                        <span>${estaExpandido ? 'Ocultar' : 'Ver detalle'}</span>
                    </button>
                    <button type="button" class="btn-abrir-abono-directo py-2 px-3 rounded-xl bg-m3-primary hover:bg-m3-primary/90 text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-xs transition active:scale-95 cursor-pointer">
                        <i data-lucide="hand-coins" class="w-3.5 h-3.5"></i>
                        <span>Abonar</span>
                    </button>
                </div>
            `;

        card.innerHTML = `
            <!-- Fila Principal: [Avatar + Nombre + Último Movimiento] y [Te deben + Monto] -->
            <div class="flex items-center justify-between cursor-pointer header-card-cliente">
                <div class="flex items-center space-x-3 min-w-0">
                    <div class="w-10 h-10 rounded-full bg-[#F5EBE6] text-m3-primary font-black text-xs flex items-center justify-center shrink-0 border border-[#ECD9D2] shadow-2xs">
                        ${iniciales}
                    </div>
                    <div class="min-w-0">
                        <h4 class="font-bold text-sm text-[#1D1D1F] truncate">${c.numeroOrden !== undefined && c.numeroOrden !== null && c.numeroOrden !== '' ? `<span class="text-m3-primary">#${escaparHtml(c.numeroOrden)}</span> · ` : ''}${escaparHtml(c.nombre)}</h4>
                        <p class="text-[11px] text-[#8A8580] font-medium truncate mt-0.5">
                            ${ultimoMov}
                        </p>
                    </div>
                </div>
                
                <div class="text-right shrink-0">
                    <span class="text-[10px] uppercase font-bold text-[#8A8580] tracking-wider block">Te deben</span>
                    <span class="text-base font-black ${montoRestante > 0 ? 'text-m3-primary' : 'text-green-600'}">
                        $${montoRestante.toFixed(2)}
                    </span>
                </div>
            </div>

            <!-- Fila de Acciones: [Ver detalle / Ocultar] y [Abonar o Despacho 1-Tap] -->
            ${actionButtonsHtml}

            <!-- SECCIÓN EXPANDIDA: Desglose Contable y Acciones de Cobro -->
            ${estaExpandido ? `
                <div class="pt-3 border-t border-dashed border-[#EBE7DF] space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    <!-- 5 Puntos Contables Clave -->
                    <div class="bg-[#F8F5F0] p-3.5 rounded-2xl space-y-2 text-xs">
                        <div class="flex justify-between items-center text-[#5F5A54]">
                            <span>1. Pendiente ciclo anterior:</span>
                            <span class="font-bold text-[#1D1D1F]">$${c.deuda_anterior.toFixed(2)}</span>
                        </div>
                        <div class="flex justify-between items-center text-[#5F5A54]">
                            <span>2. Pedidos en este ciclo:</span>
                            <span class="font-bold text-m3-primary bg-m3-primaryContainer/60 px-2 py-0.5 rounded-lg">${totalPedidos} pedidos (${totalArticulos} uds)</span>
                        </div>
                        <div class="flex justify-between items-center text-[#5F5A54]">
                            <span>3. Consumo acumulado actual:</span>
                            <span class="font-bold text-[#1D1D1F]">$${consumoPeriodo.toFixed(2)}</span>
                        </div>
                        <div class="flex justify-between items-center text-[#5F5A54]">
                            <span>4. Pagos / Abonos realizados:</span>
                            <span class="font-bold text-green-700 bg-green-100/80 px-2 py-0.5 rounded-lg">-$${pagosPeriodo.toFixed(2)}</span>
                        </div>
                        <div class="flex justify-between items-center text-sm font-bold text-[#1D1D1F] pt-2 border-t border-dashed border-[#DCD6CC]">
                            <span>5. Monto Restante a Cobrar:</span>
                            <span class="text-base font-black ${montoRestante > 0 ? 'text-m3-primary' : 'text-green-600'}">$${montoRestante.toFixed(2)}</span>
                        </div>
                    </div>

                    <!-- Botones de Acción dentro del Acordeón -->
                    <div class="grid grid-cols-2 gap-2">
                        <button type="button" class="btn-abrir-pedido py-2.5 px-3 rounded-xl bg-m3-primary hover:bg-m3-primary/90 text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-xs transition active:scale-95 cursor-pointer">
                            <i data-lucide="plus-circle" class="w-3.5 h-3.5"></i>
                            <span>Agregar Pedido</span>
                        </button>
                        <button type="button" class="btn-abrir-ticket py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-xs transition active:scale-95 cursor-pointer">
                            <i data-lucide="image" class="w-3.5 h-3.5"></i>
                            <span>WhatsApp</span>
                        </button>
                    </div>

                    <button type="button" class="btn-ver-detalle w-full py-2 px-3 rounded-xl bg-white border border-[#EBE7DF] text-[#5F5A54] hover:text-m3-primary hover:bg-[#F8F5F0] text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer">
                        <i data-lucide="receipt" class="w-3.5 h-3.5"></i>
                        <span>Ver lista detallada de consumos</span>
                    </button>
                </div>
            ` : ''}
        `;

        card.querySelector('.header-card-cliente').addEventListener('click', () => toggleExpandirCliente(c.id));
        card.querySelector('.btn-toggle-expand').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleExpandirCliente(c.id);
        });

        if (prodRapido) {
            const btnPlus = card.querySelector('.btn-quick-plus');
            const btnMinus = card.querySelector('.btn-quick-minus');
            if (btnPlus) {
                btnPlus.addEventListener('click', (e) => {
                    e.stopPropagation();
                    agregarVentaRapida(c.id, prodRapido.id, 1);
                    render();
                    showToast(`+1 ${prodRapido.nombre} ➔ ${c.nombre}`);
                });
            }
            if (btnMinus) {
                btnMinus.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (reducirVentaRapida(c.id, prodRapido.id)) {
                        render();
                        showToast(`-1 ${prodRapido.nombre} ➔ ${c.nombre}`);
                    }
                });
            }
        } else {
            const btnAbonoDirecto = card.querySelector('.btn-abrir-abono-directo');
            if (btnAbonoDirecto) {
                btnAbonoDirecto.addEventListener('click', (e) => {
                    e.stopPropagation();
                    abrirModalAbono(c.id);
                });
            }
        }

        if (estaExpandido) {
            const btnPed = card.querySelector('.btn-abrir-pedido');
            if (btnPed) btnPed.addEventListener('click', () => abrirModalNuevoPedido(c.id));
            const btnTick = card.querySelector('.btn-abrir-ticket');
            if (btnTick) btnTick.addEventListener('click', () => abrirModalCompartirTicket(c.id));
            const btnDet = card.querySelector('.btn-ver-detalle');
            if (btnDet) btnDet.addEventListener('click', () => abrirDetalleCliente(c.id));
        }

        listaContainer.appendChild(card);
    });
}

function toggleExpandirCliente(clienteId) {
    if (clienteExpandidoId === clienteId) {
        clienteExpandidoId = null;
    } else {
        clienteExpandidoId = clienteId;
    }
    render();
}

// 5. Render de la Vista de Productos
function renderProductos() {
    const lista = document.getElementById('lista-productos-gestion');
    if (!lista) return;
    lista.innerHTML = '';

    state.productos.forEach(p => {
        const item = document.createElement('div');
        item.className = "bg-white p-3.5 rounded-2xl border border-m3-outlineVariant/50 flex items-center justify-between shadow-xs";
        
        const tieneImagen = p.imagen && p.imagen.trim() !== "";
        const avatarImg = tieneImagen 
            ? `<img class="w-10 h-10 object-cover rounded-xl shrink-0" src="${p.imagen}" onerror="this.onerror=null; this.parentElement.innerHTML='<span class=\\'text-xl\\'>${p.emoji || '🍩'}</span>'"/>`
            : `<div class="w-10 h-10 bg-m3-surfaceVariant rounded-xl flex items-center justify-center text-xl shrink-0">${p.emoji || '🍩'}</div>`;

        item.innerHTML = `
            <div class="flex items-center space-x-3 min-w-0">
                ${avatarImg}
                <div class="min-w-0">
                    <h4 class="font-bold text-sm text-m3-onSurface truncate">${p.nombre}</h4>
                    <p class="text-xs text-m3-outline font-medium">Precio: <strong class="text-m3-primary">$${p.precio}</strong> | Costo: $${p.costo}</p>
                </div>
            </div>
            <button type="button" class="btn-eliminar-prod p-2 text-m3-outline hover:text-m3-error hover:bg-m3-surface rounded-xl transition cursor-pointer">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
        `;

        item.querySelector('.btn-eliminar-prod').addEventListener('click', () => {
            customConfirm(
                "Eliminar Producto", 
                `¿Deseas eliminar "${p.nombre}" del catálogo?`,
                () => eliminarProducto(p.id)
            );
        });

        lista.appendChild(item);
    });
}

let imagenProductoActual = null;

function procesarArchivoImagenProducto(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showToast("Por favor selecciona un archivo de imagen válido.", true);
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            // Redimensionar automáticamente a máximo 400x400 para optimizar almacenamiento
            const maxDim = 400;
            let width = img.width;
            let height = img.height;
            if (width > height) {
                if (width > maxDim) {
                    height = Math.round((height * maxDim) / width);
                    width = maxDim;
                }
            } else {
                if (height > maxDim) {
                    width = Math.round((width * maxDim) / height);
                    height = maxDim;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const optimizedDataUrl = canvas.toDataURL('image/png', 0.85);
            setFotoProducto(optimizedDataUrl);
            showToast("Foto cargada con éxito.");
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
}

function setFotoProducto(dataUrl) {
    imagenProductoActual = dataUrl;
    const inputHidden = document.getElementById('prod-imagen-data');
    const previewImg = document.getElementById('prod-preview-img');
    const placeholder = document.getElementById('prod-preview-placeholder');
    const btnRemover = document.getElementById('btn-remover-foto-prod');
    const btnQuitarFondo = document.getElementById('btn-quitar-fondo');

    if (inputHidden) inputHidden.value = dataUrl;
    if (previewImg) {
        previewImg.src = dataUrl;
        previewImg.classList.remove('hidden');
    }
    if (placeholder) placeholder.classList.add('hidden');
    if (btnRemover) btnRemover.classList.remove('hidden');

    if (btnQuitarFondo) {
        btnQuitarFondo.removeAttribute('disabled');
        btnQuitarFondo.className = "w-full py-1.5 px-2.5 rounded-xl bg-m3-primaryContainer text-m3-onPrimaryContainer hover:bg-m3-primaryContainer/80 text-[11px] font-bold flex items-center justify-center space-x-1.5 border border-m3-primary/30 transition active:scale-95 cursor-pointer shadow-xs";
    }
    if (window.lucide) window.lucide.createIcons();
}

function limpiarFotoProducto() {
    imagenProductoActual = null;
    const inputHidden = document.getElementById('prod-imagen-data');
    const previewImg = document.getElementById('prod-preview-img');
    const placeholder = document.getElementById('prod-preview-placeholder');
    const btnRemover = document.getElementById('btn-remover-foto-prod');
    const btnQuitarFondo = document.getElementById('btn-quitar-fondo');

    if (inputHidden) inputHidden.value = '';
    if (previewImg) {
        previewImg.src = '';
        previewImg.classList.add('hidden');
    }
    if (placeholder) placeholder.classList.remove('hidden');
    if (btnRemover) btnRemover.classList.add('hidden');

    if (btnQuitarFondo) {
        btnQuitarFondo.setAttribute('disabled', 'true');
        btnQuitarFondo.className = "w-full py-1.5 px-2.5 rounded-xl bg-m3-primaryContainer/30 text-m3-outline text-[11px] font-bold flex items-center justify-center space-x-1.5 border border-m3-primaryContainer/40 transition cursor-not-allowed";
    }
}

// Algoritmo Inteligente de Eliminación de Fondo en el Cliente (Canvas Alpha Segmentation)
async function ejecutarQuitarFondoProducto() {
    if (!imagenProductoActual) return;

    const btnQuitarFondo = document.getElementById('btn-quitar-fondo');
    const txtQuitarFondo = document.getElementById('txt-quitar-fondo');
    if (txtQuitarFondo) txtQuitarFondo.innerText = "⏳ Procesando...";
    if (btnQuitarFondo) btnQuitarFondo.setAttribute('disabled', 'true');

    try {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const w = img.width;
            const h = img.height;
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);

            const imageData = ctx.getImageData(0, 0, w, h);
            const data = imageData.data;

            // 1. Muestrear los colores de las 4 esquinas y bordes exteriores para identificar el fondo
            const muestrasBordes = [
                0, // Top-Left (x=0, y=0)
                (w - 1) * 4, // Top-Right
                ((h - 1) * w) * 4, // Bottom-Left
                ((h - 1) * w + (w - 1)) * 4, // Bottom-Right
                Math.floor(w / 2) * 4, // Top-Center
                (Math.floor(h / 2) * w) * 4, // Left-Center
                (Math.floor(h / 2) * w + (w - 1)) * 4, // Right-Center
                ((h - 1) * w + Math.floor(w / 2)) * 4 // Bottom-Center
            ];

            let bgR = 0, bgG = 0, bgB = 0;
            muestrasBordes.forEach(idx => {
                bgR += data[idx];
                bgG += data[idx + 1];
                bgB += data[idx + 2];
            });
            bgR = Math.round(bgR / muestrasBordes.length);
            bgG = Math.round(bgG / muestrasBordes.length);
            bgB = Math.round(bgB / muestrasBordes.length);

            // 2. Umbral de tolerancia y suavizado de bordes (Feathering)
            const tolerance = 40;
            const feather = 25;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // Distancia euclidiana en espacio RGB
                const dist = Math.sqrt(
                    Math.pow(r - bgR, 2) +
                    Math.pow(g - bgG, 2) +
                    Math.pow(b - bgB, 2)
                );

                if (dist < tolerance) {
                    data[i + 3] = 0; // Transparente
                } else if (dist < tolerance + feather) {
                    const alphaRatio = (dist - tolerance) / feather;
                    data[i + 3] = Math.round(data[i + 3] * alphaRatio); // Suavizado
                }
            }

            ctx.putImageData(imageData, 0, 0);
            const resultadoSinFondo = canvas.toDataURL('image/png', 0.9);

            setFotoProducto(resultadoSinFondo);
            showToast("✨ ¡Fondo eliminado con éxito!");

            if (txtQuitarFondo) txtQuitarFondo.innerText = "✨ Quitar Fondo";
            if (btnQuitarFondo) btnQuitarFondo.removeAttribute('disabled');
        };
        img.src = imagenProductoActual;
    } catch (err) {
        console.error("Error al procesar eliminación de fondo:", err);
        showToast("No se pudo procesar el fondo", true);
        if (txtQuitarFondo) txtQuitarFondo.innerText = "✨ Quitar Fondo";
        if (btnQuitarFondo) btnQuitarFondo.removeAttribute('disabled');
    }
}

function ejecutarCrearProducto() {
    const nombre = document.getElementById('prod-nombre').value.trim();
    const precio = parseFloat(document.getElementById('prod-precio').value);
    const costo = parseFloat(document.getElementById('prod-costo').value) || 0;
    const emoji = document.getElementById('prod-emoji').value.trim() || "🍩";
    const imagenData = document.getElementById('prod-imagen-data').value.trim();

    if (!nombre || isNaN(precio) || precio <= 0) {
        showToast("Nombre y precio válidos son obligatorios.", true);
        return;
    }

    state.productos.push({
        id: "p_" + Date.now(),
        nombre,
        precio,
        costo,
        emoji,
        imagen: imagenData
    });

    document.getElementById('prod-nombre').value = '';
    document.getElementById('prod-precio').value = '';
    document.getElementById('prod-costo').value = '';
    document.getElementById('prod-emoji').value = '🍰';
    limpiarFotoProducto();

    guardarEnLocalStorage();
    render();
    showToast(`¡Producto "${nombre}" agregado al menú!`);
}

function eliminarProducto(id) {
    state.productos = state.productos.filter(p => p.id !== id);
    guardarEnLocalStorage();
    render();
    showToast("Producto eliminado del menú.");
}

// 6. Render de la Vista de Reportes Financieros
function renderReportes() {
    let ingresosVentas = 0;
    let costoProduccion = 0;

    state.ventas.forEach(v => {
        if (v.periodo === state.periodoActual) {
            const p = state.productos.find(prod => prod.id === v.productoId);
            if (p) {
                ingresosVentas += p.precio * v.cantidad;
                costoProduccion += p.costo * v.cantidad;
            }
        }
    });

    let deudaTotalPendiente = 0;
    state.clientes.forEach(c => {
        deudaTotalPendiente += calcularMontoRestanteCliente(c.id);
    });

    const gananciaNeta = ingresosVentas - (costoProduccion + state.gastosOperativos);

    const ingEl = document.getElementById('rep-ingresos');
    const costEl = document.getElementById('rep-costos');
    const gastEl = document.getElementById('rep-gastos');
    const netEl = document.getElementById('rep-neto');
    const fiadoEl = document.getElementById('rep-fiado');

    if (ingEl) ingEl.innerText = `$${ingresosVentas.toFixed(2)}`;
    if (costEl) costEl.innerText = `$${costoProduccion.toFixed(2)}`;
    if (gastEl) gastEl.innerText = `$${state.gastosOperativos.toFixed(2)}`;
    if (netEl) {
        netEl.innerText = `$${gananciaNeta.toFixed(2)}`;
        netEl.className = `text-2xl font-black ${gananciaNeta >= 0 ? 'text-green-700' : 'text-m3-error'}`;
    }
    if (fiadoEl) fiadoEl.innerText = `$${deudaTotalPendiente.toFixed(2)}`;

    // Render Histórico de Cierres
    const contHistorico = document.getElementById('historico-cierres-container');
    if (!contHistorico) return;
    contHistorico.innerHTML = '';

    if (!state.historicoCierres || state.historicoCierres.length === 0) {
        contHistorico.innerHTML = `<p class="text-xs text-m3-outline text-center py-4">No hay períodos anteriores cerrados.</p>`;
    } else {
        [...state.historicoCierres].reverse().forEach(h => {
            const row = document.createElement('div');
            row.className = "bg-white p-3 rounded-2xl border border-m3-outlineVariant/40 text-xs flex justify-between items-center shadow-xs";
            row.innerHTML = `
                <div>
                    <span class="font-black text-m3-onSurface block">Período #${h.id}</span>
                    <span class="text-[10px] text-m3-outline">${h.fecha}</span>
                </div>
                <div class="text-right">
                    <span class="text-m3-outline block text-[10px]">Venta: $${h.ingresos}</span>
                    <span class="font-black text-green-700 text-sm">Ganancia: $${h.gananciaNeta}</span>
                </div>
            `;
            contHistorico.appendChild(row);
        });
    }
}

function guardarGastoOperativo() {
    const inputGasto = document.getElementById('gasto-op-input');
    const monto = parseFloat(inputGasto.value);

    if (isNaN(monto) || monto < 0) {
        showToast("Ingresa un monto válido.", true);
        return;
    }

    state.gastosOperativos += monto;
    inputGasto.value = '';
    guardarEnLocalStorage();
    renderReportes();
    showToast(`¡Gasto de $${monto.toFixed(2)} registrado en el período actual!`);
}

// 7. Cierre de Período Contable
function promptCerrarPeriodo() {
    customConfirm(
        "Cierre de Período Contable", 
        "¿Estás seguro de cerrar el período actual? Los saldos no cubiertos se trasladarán de forma exacta como deuda anterior para el siguiente ciclo.",
        () => ejecutarCierrePeriodo(),
        "shield-alert"
    );
}

function ejecutarCierrePeriodo() {
    let ingresosVentasPeriodo = 0;
    let costoProduccionPeriodo = 0;

    state.ventas.forEach(v => {
        if (v.periodo === state.periodoActual) {
            const p = state.productos.find(prod => prod.id === v.productoId);
            if (p) {
                ingresosVentasPeriodo += p.precio * v.cantidad;
                costoProduccionPeriodo += p.costo * v.cantidad;
            }
        }
    });

    const gananciaNeta = ingresosVentasPeriodo - (costoProduccionPeriodo + state.gastosOperativos);
    const ahora = new Date();
    const fechaCierreStr = ahora.toLocaleDateString('es-ES') + " " + ahora.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'});

    if (!state.historicoCierres) state.historicoCierres = [];
    state.historicoCierres.push({
        id: state.periodoActual,
        fecha: fechaCierreStr,
        ingresos: ingresosVentasPeriodo.toFixed(2),
        costoProd: costoProduccionPeriodo.toFixed(2),
        gastoOp: state.gastosOperativos.toFixed(2),
        gananciaNeta: gananciaNeta.toFixed(2)
    });

    // Traspaso de Deudas Inteligente
    state.clientes.forEach(c => {
        const consumoPeriodo = calcularConsumoCliente(c.id);
        const pagosPeriodo = calcularPagosCliente(c.id);
        const deudaRestante = Math.max(0, (c.deuda_anterior + consumoPeriodo) - pagosPeriodo);

        c.deuda_anterior = deudaRestante;
        c.pagado_en_periodo = false;
    });

    state.periodoActual++;
    state.gastosOperativos = 0;
    clienteExpandidoId = null;

    guardarEnLocalStorage();
    render();
    showToast(`¡Período #${state.periodoActual - 1} cerrado! Se inició el Período #${state.periodoActual}`);
}
