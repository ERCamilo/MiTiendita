import { 
    state, 
    cargarDeLocalStorage, 
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
    aplicarTema
} from './state.js';
import { showToast } from './toast.js';

import { initModalNuevoCliente, abrirModalNuevoCliente } from './modals/modalNuevoCliente.js';
import { initModalNuevoPedido, abrirModalNuevoPedido } from './modals/modalNuevoPedido.js';
import { initModalAbono, abrirModalAbono } from './modals/modalAbono.js';
import { initModalTicket, abrirModalCompartirTicket } from './modals/modalTicket.js';
import { initModalDetalleCliente, abrirDetalleCliente } from './modals/modalDetalleCliente.js';
import { initModalConfirm, customConfirm } from './modals/modalConfirm.js';
import { initModalAjustes, abrirModalAjustes } from './modals/modalAjustes.js';

let clienteExpandidoId = null;
let currentTab = 'clientes';
let productoRapidoSeleccionadoId = null;

// 1. Inicialización de la Aplicación
document.addEventListener('DOMContentLoaded', () => {
    cargarDeLocalStorage();
    aplicarTema(state.colorTema || 'azul');
    
    // Inicializar Componentes Modales
    initModalNuevoCliente(() => render());
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
    // Botón Ajustes en Header
    const btnAjustes = document.getElementById('btn-abrir-ajustes');
    if (btnAjustes) {
        btnAjustes.addEventListener('click', abrirModalAjustes);
    }

    // Botón Cerrar Ciclo en Header
    const btnCerrarCiclo = document.getElementById('btn-cerrar-ciclo');
    if (btnCerrarCiclo) {
        btnCerrarCiclo.addEventListener('click', promptCerrarPeriodo);
    }

    // Botón Nuevo Cliente en Header de Clientes
    const btnNuevoCliente = document.getElementById('btn-abrir-nuevo-cliente');
    if (btnNuevoCliente) {
        btnNuevoCliente.addEventListener('click', abrirModalNuevoCliente);
    }

    // Barra de Navegación Inferior (Tabs)
    ['clientes', 'productos', 'reportes'].forEach(tab => {
        const navBtn = document.getElementById(`nav-${tab}`);
        if (navBtn) {
            navBtn.addEventListener('click', () => switchTab(tab));
        }
    });

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

    // Eventos de la Barra de Producto Rápido (Modo 1-Tap)
    const dropdownQuick = document.getElementById('quick-prod-dropdown');
    if (dropdownQuick) {
        dropdownQuick.addEventListener('change', (e) => {
            productoRapidoSeleccionadoId = e.target.value || null;
            render();
            if (productoRapidoSeleccionadoId) {
                const prod = state.productos.find(p => p.id === productoRapidoSeleccionadoId);
                showToast(`⚡ Modo despacho rápido activo para: ${prod ? prod.nombre : ''}`);
            }
        });
    }

    const btnLimpiarQuick = document.getElementById('btn-limpiar-quick-prod');
    if (btnLimpiarQuick) {
        btnLimpiarQuick.addEventListener('click', () => {
            productoRapidoSeleccionadoId = null;
            render();
            showToast("Modo normal restaurado.");
        });
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
    ['clientes', 'productos', 'reportes'].forEach(t => {
        const view = document.getElementById(`view-${t}`);
        const navBtn = document.getElementById(`nav-${t}`);
        const navIcon = document.getElementById(`nav-icon-${t}`);
        const navText = document.getElementById(`nav-text-${t}`);

        if (t === tab) {
            if (view) view.classList.remove('hidden');
            if (navIcon) navIcon.className = "w-10 h-10 rounded-2xl bg-m3-primary text-white flex items-center justify-center shadow-xs";
            if (navText) navText.className = "text-[11px] font-bold text-m3-primary";
        } else {
            if (view) view.classList.add('hidden');
            if (navIcon) navIcon.className = "w-10 h-10 rounded-2xl bg-transparent text-m3-outline flex items-center justify-center";
            if (navText) navText.className = "text-[11px] font-medium text-m3-outline";
        }
    });

    render();
}

// 3. Función Central de Renderizado
export function render() {
    // Apply current theme
    aplicarTema(state.colorTema || 'azul');
    // Header Store Name & Tag
    const headerNombre = document.getElementById('header-nombre-tienda');
    if (headerNombre) {
        headerNombre.innerText = state.nombreTienda || "StoreFlow";
    }

    const tagPeriodo = document.getElementById('periodo-tag');
    if (tagPeriodo) {
        tagPeriodo.innerText = `Período #${state.periodoActual}`;
    }

    // Fecha y Hora Local del Dispositivo
    renderFechaYHora();

    if (currentTab === 'clientes') {
        renderEstadisticasDashboard();
        renderBarraProductoRapido();
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
                weekday: 'short',
                day: 'numeric',
                month: 'short'
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

    const elHoy = document.getElementById('stat-total-hoy');
    const elCiclo = document.getElementById('stat-total-ciclo');
    const elPagado = document.getElementById('stat-total-pagado');
    const elPendiente = document.getElementById('stat-total-pendiente');

    if (elHoy) elHoy.innerText = `$${totalHoy.toFixed(2)}`;
    if (elCiclo) elCiclo.innerText = `$${totalCiclo.toFixed(2)}`;
    if (elPagado) elPagado.innerText = `$${totalPagado.toFixed(2)}`;
    if (elPendiente) elPendiente.innerText = `$${totalPendiente.toFixed(2)}`;
}

function renderBarraProductoRapido() {
    const dropdown = document.getElementById('quick-prod-dropdown');
    const selectContainer = document.getElementById('quick-prod-select-container');
    const activeCard = document.getElementById('quick-prod-active-card');
    const hint = document.getElementById('quick-prod-hint');

    if (!dropdown || !selectContainer || !activeCard) return;

    // Actualizar opciones del dropdown
    const valorPrevio = productoRapidoSeleccionadoId || "";
    dropdown.innerHTML = `<option value="">⚡ Seleccionar producto para despacho rápido...</option>`;
    state.productos.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.innerText = `${p.emoji || '📦'} ${p.nombre} - $${p.precio.toFixed(2)}`;
        if (p.id === valorPrevio) opt.selected = true;
        dropdown.appendChild(opt);
    });

    if (!productoRapidoSeleccionadoId) {
        selectContainer.classList.remove('hidden');
        activeCard.classList.add('hidden');
        if (hint) hint.innerText = "Selecciona para activar";
    } else {
        const prod = state.productos.find(p => p.id === productoRapidoSeleccionadoId);
        if (!prod) {
            productoRapidoSeleccionadoId = null;
            selectContainer.classList.remove('hidden');
            activeCard.classList.add('hidden');
            return;
        }

        selectContainer.classList.add('hidden');
        activeCard.classList.remove('hidden');
        if (hint) hint.innerText = "Modo 1-Tap activo";

        // Renderizar datos del producto en la tarjeta activa
        const imgBox = document.getElementById('quick-prod-img-box');
        if (imgBox) {
            if (prod.imagen && prod.imagen.trim() !== '') {
                imgBox.innerHTML = `<img src="${prod.imagen}" class="w-full h-full object-cover" alt="${prod.nombre}" onerror="this.onerror=null; this.parentElement.innerHTML='<span class=\\'text-xl\\'>${prod.emoji || '📦'}</span>'"/>`;
            } else {
                imgBox.innerHTML = `<span class="text-2xl">${prod.emoji || '📦'}</span>`;
            }
        }

        const nombreEl = document.getElementById('quick-prod-nombre');
        const precioEl = document.getElementById('quick-prod-precio');
        const vendidoHoyEl = document.getElementById('quick-prod-vendido-hoy');

        if (nombreEl) nombreEl.innerText = prod.nombre;
        if (precioEl) precioEl.innerText = `$${prod.precio.toFixed(2)}`;
        if (vendidoHoyEl) {
            const cantHoy = calcularCantidadVendidaHoyProducto(prod.id);
            vendidoHoyEl.innerText = `${cantHoy} ${cantHoy === 1 ? 'unidad' : 'unidades'}`;
        }
    }
}

// 4. Render de la Vista de Clientes (Tarjetas y Acordeones)
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
            <div class="bg-white border border-m3-outlineVariant/40 rounded-3xl p-8 text-center space-y-2">
                <i data-lucide="users" class="w-8 h-8 text-m3-outline mx-auto"></i>
                <h4 class="font-bold text-sm text-m3-onSurface">Sin Clientes Registrados</h4>
                <p class="text-xs text-m3-outline">Toca "Nuevo Cliente" para comenzar tu registro contable.</p>
            </div>
        `;
        return;
    }

    const prodRapido = productoRapidoSeleccionadoId ? state.productos.find(p => p.id === productoRapidoSeleccionadoId) : null;

    state.clientes.forEach((c, index) => {
        const consumoPeriodo = calcularConsumoCliente(c.id);
        const consumoHoy = calcularConsumoHoyCliente(c.id);
        const pagosPeriodo = calcularPagosCliente(c.id);
        const montoRestante = calcularMontoRestanteCliente(c.id);
        const { totalPedidos, totalArticulos } = contarPedidosCliente(c.id);
        const estaExpandido = (clienteExpandidoId === c.id);
        const cantEsteProd = prodRapido ? calcularCantidadProductoCliente(c.id, prodRapido.id) : 0;

        const card = document.createElement('div');
        card.className = `bg-white border ${estaExpandido ? 'border-m3-primary shadow-md ring-1 ring-m3-primary/30' : (prodRapido ? 'border-amber-200/80 shadow-xs' : 'border-m3-outlineVariant/50 shadow-xs')} rounded-2xl p-4 space-y-3 transition-all`;

        const actionRightHtml = prodRapido 
            ? `
                <div class="flex items-center justify-between bg-amber-50 border border-amber-300/80 rounded-xl p-1 shadow-2xs">
                    <button type="button" class="btn-quick-minus w-7 h-7 rounded-lg bg-white text-amber-900 hover:bg-amber-100 font-bold flex items-center justify-center transition active:scale-90 shadow-2xs ${cantEsteProd > 0 ? 'cursor-pointer' : 'opacity-30 cursor-not-allowed'}" ${cantEsteProd > 0 ? '' : 'disabled'}>
                        <i data-lucide="minus" class="w-3.5 h-3.5"></i>
                    </button>
                    <div class="text-center px-1">
                        <span class="font-black text-xs text-amber-950">${cantEsteProd}</span>
                        <span class="text-[9px] font-semibold text-amber-800 ml-0.5">uds</span>
                    </div>
                    <button type="button" class="btn-quick-plus w-7 h-7 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold flex items-center justify-center transition active:scale-90 shadow-2xs cursor-pointer">
                        <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                    </button>
                </div>
            `
            : `
                <button type="button" class="btn-abrir-pedido py-2.5 px-3 rounded-xl bg-m3-primary hover:bg-m3-primary/90 text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-xs transition active:scale-95 cursor-pointer">
                    <i data-lucide="plus-circle" class="w-3.5 h-3.5"></i>
                    <span>Agregar Pedido</span>
                </button>
            `;

        card.innerHTML = `
            <!-- Fila Principal: [(Número) Nombre] y [Monto Total] -->
            <div class="flex items-center justify-between cursor-pointer header-card-cliente">
                <div class="flex items-center space-x-3 min-w-0">
                    <span class="px-2.5 py-1 rounded-xl bg-m3-primaryContainer text-m3-onPrimaryContainer text-xs font-black shrink-0 shadow-xs">
                        #${index + 1}
                    </span>
                    <div class="min-w-0">
                        <h4 class="font-bold text-sm text-m3-onSurface truncate">${c.nombre}</h4>
                        <div class="flex items-center space-x-1.5 text-[11px] text-m3-outline truncate mt-0.5">
                            <span>${c.telefono ? c.telefono : 'Sin tel'}</span>
                            <span class="inline-block w-1 h-1 bg-m3-outline/40 rounded-full"></span>
                            <span class="font-bold text-m3-primary bg-m3-primaryContainer/50 px-1.5 py-0.5 rounded-md text-[10px]">Hoy: $${consumoHoy.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="text-right shrink-0">
                    <p class="text-[10px] uppercase font-bold text-m3-outline tracking-wider">Monto Total</p>
                    <span class="text-base font-black ${montoRestante > 0 ? 'text-m3-error' : 'text-green-600'}">
                        $${montoRestante.toFixed(2)}
                    </span>
                </div>
            </div>

            <!-- Fila de Acciones: [Ver Cuenta / Ocultar] y [Acción Rápida o Agregar Pedido] -->
            <div class="grid grid-cols-2 gap-2 pt-1 border-t border-m3-outlineVariant/20 items-center">
                <button type="button" class="btn-toggle-expand py-2.5 px-3 rounded-xl bg-m3-surface hover:bg-m3-surfaceVariant text-m3-onSurface text-xs font-bold flex items-center justify-center space-x-1.5 border border-m3-outlineVariant/40 transition active:scale-95 cursor-pointer">
                    <i data-lucide="${estaExpandido ? 'chevron-up' : 'eye'}" class="w-3.5 h-3.5 text-m3-primary"></i>
                    <span>${estaExpandido ? 'Ocultar Cuenta' : 'Ver Cuenta'}</span>
                </button>
                ${actionRightHtml}
            </div>

            <!-- SECCIÓN EXPANDIDA: Desglose Contable y Acciones de Cobro -->
            ${estaExpandido ? `
                <div class="pt-3 border-t border-dashed border-m3-outlineVariant/40 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    <!-- 5 Puntos Contables Clave -->
                    <div class="bg-m3-surface p-3.5 rounded-2xl space-y-2 text-xs">
                        <div class="flex justify-between items-center text-m3-onSurfaceVariant">
                            <span>1. Pendiente ciclo anterior:</span>
                            <span class="font-bold text-m3-onSurface">$${c.deuda_anterior.toFixed(2)}</span>
                        </div>
                        <div class="flex justify-between items-center text-m3-onSurfaceVariant">
                            <span>2. Pedidos en este ciclo:</span>
                            <span class="font-bold text-m3-primary bg-m3-primaryContainer/50 px-2 py-0.5 rounded-lg">${totalPedidos} pedidos (${totalArticulos} uds)</span>
                        </div>
                        <div class="flex justify-between items-center text-m3-onSurfaceVariant">
                            <span>3. Consumo acumulado actual:</span>
                            <span class="font-bold text-m3-onSurface">$${consumoPeriodo.toFixed(2)}</span>
                        </div>
                        <div class="flex justify-between items-center text-m3-onSurfaceVariant">
                            <span>4. Pagos / Abonos realizados:</span>
                            <span class="font-bold text-green-700 bg-green-100/80 px-2 py-0.5 rounded-lg">-$${pagosPeriodo.toFixed(2)}</span>
                        </div>
                        <div class="flex justify-between items-center text-sm font-bold text-m3-onSurface pt-2 border-t border-dashed border-m3-outlineVariant">
                            <span>5. Monto Restante a Cobrar:</span>
                            <span class="text-base font-black ${montoRestante > 0 ? 'text-m3-error' : 'text-green-600'}">$${montoRestante.toFixed(2)}</span>
                        </div>
                    </div>

                    <!-- Botones de Acción dentro del Acordeón -->
                    <div class="grid grid-cols-2 gap-2">
                        <button type="button" class="btn-abrir-abono py-2.5 px-3 rounded-xl bg-green-700 hover:bg-green-800 text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-xs transition active:scale-95 cursor-pointer">
                            <i data-lucide="hand-coins" class="w-3.5 h-3.5"></i>
                            <span>Registrar Abono</span>
                        </button>
                        <button type="button" class="btn-abrir-ticket py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-xs transition active:scale-95 cursor-pointer">
                            <i data-lucide="image" class="w-3.5 h-3.5"></i>
                            <span>WhatsApp</span>
                        </button>
                    </div>

                    <button type="button" class="btn-ver-detalle w-full py-2 px-3 rounded-xl bg-white border border-m3-outlineVariant/40 text-m3-outline hover:text-m3-primary hover:bg-m3-surface text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer">
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
            const btnPedido = card.querySelector('.btn-abrir-pedido');
            if (btnPedido) {
                btnPedido.addEventListener('click', (e) => {
                    e.stopPropagation();
                    abrirModalNuevoPedido(c.id);
                });
            }
        }

        if (estaExpandido) {
            card.querySelector('.btn-abrir-abono').addEventListener('click', () => abrirModalAbono(c.id));
            card.querySelector('.btn-abrir-ticket').addEventListener('click', () => abrirModalCompartirTicket(c.id));
            card.querySelector('.btn-ver-detalle').addEventListener('click', () => abrirDetalleCliente(c.id));
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
