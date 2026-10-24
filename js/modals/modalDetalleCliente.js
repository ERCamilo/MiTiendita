// js/modals/modalDetalleCliente.js - Modal para desglose detallado de compras del cliente
import { state, calcularConsumoCliente, calcularPagosCliente, calcularMontoRestanteCliente, registrarAbonoConfirmado } from '../state.js';
import { showToast } from '../toast.js';

let selectedClienteId = null;
let onDetalleActualizadoCallback = null;
let detalleTabActivo = 'dias'; // 'dias' | 'productos'

export function initModalDetalleCliente(onDetalleActualizado) {
    onDetalleActualizadoCallback = onDetalleActualizado;
    if (document.getElementById('modal-detalle-cliente')) return;

    const modal = document.createElement('div');
    modal.id = 'modal-detalle-cliente';
    modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end justify-center hidden';
    modal.innerHTML = `
        <div class="bg-white w-full max-w-md rounded-t-[32px] p-6 space-y-4 shadow-2xl border-t border-m3-outlineVariant animate-in slide-in-from-bottom duration-200 max-h-[92vh] overflow-y-auto">
            <div class="w-12 h-1 bg-m3-outlineVariant rounded-full mx-auto mb-2"></div>
            
            <div class="flex justify-between items-start">
                <div>
                    <h2 id="det-cliente-nombre" class="text-xl font-bold text-m3-onSurface">Cliente</h2>
                    <p id="det-cliente-telefono" class="text-xs text-m3-outline">Sin Teléfono</p>
                </div>
                <div class="text-right">
                    <p class="text-xs text-m3-outline">Total Acumulado</p>
                    <p id="det-cliente-total" class="text-2xl font-black text-m3-primary">$0.00</p>
                </div>
            </div>

            <!-- Tabs: Por Día / Por Producto -->
            <div class="flex bg-m3-surface rounded-2xl p-1 border border-m3-outlineVariant/30">
                <button type="button" id="det-tab-dias" class="flex-1 py-2 text-xs font-bold rounded-xl text-center transition cursor-pointer bg-white text-m3-onSurface shadow-xs">
                    <span class="flex items-center justify-center space-x-1">
                        <i data-lucide="calendar-days" class="w-3.5 h-3.5"></i>
                        <span>Por Día</span>
                    </span>
                </button>
                <button type="button" id="det-tab-productos" class="flex-1 py-2 text-xs font-bold rounded-xl text-center transition cursor-pointer text-m3-outline">
                    <span class="flex items-center justify-center space-x-1">
                        <i data-lucide="package" class="w-3.5 h-3.5"></i>
                        <span>Por Producto</span>
                    </span>
                </button>
            </div>

            <!-- Contenido: Vista Por Día -->
            <div id="det-content-dias" class="space-y-2">
                <div id="det-lista-dias" class="max-h-56 overflow-y-auto space-y-3 pr-1">
                    <!-- Dinámico -->
                </div>
            </div>

            <!-- Contenido: Vista Por Producto -->
            <div id="det-content-productos" class="space-y-2 hidden">
                <div id="det-lista-productos-resumen" class="max-h-56 overflow-y-auto space-y-2 pr-1">
                    <!-- Dinámico -->
                </div>
            </div>

            <!-- Resumen de Deuda Anterior y Pagos -->
            <div class="bg-m3-surface p-4 rounded-2xl space-y-1.5 text-xs">
                <div class="flex justify-between text-m3-onSurfaceVariant">
                    <span>Deuda arrastrada de cortes anteriores:</span>
                    <span id="det-deuda-anterior" class="font-bold text-m3-onSurface">$0.00</span>
                </div>
                <div class="flex justify-between text-m3-onSurfaceVariant">
                    <span>Abonos registrados en este período:</span>
                    <span id="det-abonos-periodo" class="font-bold text-green-700">-$0.00</span>
                </div>
                <div class="flex justify-between text-sm font-bold text-m3-onSurface pt-2 border-t border-dashed border-m3-outlineVariant">
                    <span>Total Restante a Cobrar:</span>
                    <span id="det-desglose-neto" class="text-m3-primary">$0.00</span>
                </div>
            </div>

            <!-- Opciones de Liquidación -->
            <div class="grid grid-cols-2 gap-2 pt-2">
                <button type="button" id="btn-cerrar-detalle-cliente" class="py-3 text-sm font-semibold rounded-full border border-m3-outlineVariant text-m3-onSurface hover:bg-m3-surface active:scale-95 transition-all cursor-pointer">Regresar</button>
                <button type="button" id="btn-liquidar-total-cliente" class="py-3 text-sm font-semibold rounded-full bg-green-700 text-white hover:bg-green-800 active:scale-95 transition-all flex items-center justify-center space-x-1 shadow-md cursor-pointer">
                    <i data-lucide="check-circle-2" class="w-4 h-4"></i>
                    <span>Liquidar Total</span>
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('btn-cerrar-detalle-cliente').addEventListener('click', cerrarModalDetalleCliente);
    document.getElementById('btn-liquidar-total-cliente').addEventListener('click', marcarComoTotalmentePagado);

    // Tab switching
    document.getElementById('det-tab-dias').addEventListener('click', () => {
        detalleTabActivo = 'dias';
        actualizarTabsUI();
    });
    document.getElementById('det-tab-productos').addEventListener('click', () => {
        detalleTabActivo = 'productos';
        actualizarTabsUI();
    });
}

function actualizarTabsUI() {
    const tabDias = document.getElementById('det-tab-dias');
    const tabProds = document.getElementById('det-tab-productos');
    const contentDias = document.getElementById('det-content-dias');
    const contentProds = document.getElementById('det-content-productos');

    if (detalleTabActivo === 'dias') {
        tabDias.className = 'flex-1 py-2 text-xs font-bold rounded-xl text-center transition cursor-pointer bg-white text-m3-onSurface shadow-xs';
        tabProds.className = 'flex-1 py-2 text-xs font-bold rounded-xl text-center transition cursor-pointer text-m3-outline';
        contentDias.classList.remove('hidden');
        contentProds.classList.add('hidden');
    } else {
        tabProds.className = 'flex-1 py-2 text-xs font-bold rounded-xl text-center transition cursor-pointer bg-white text-m3-onSurface shadow-xs';
        tabDias.className = 'flex-1 py-2 text-xs font-bold rounded-xl text-center transition cursor-pointer text-m3-outline';
        contentProds.classList.remove('hidden');
        contentDias.classList.add('hidden');
    }
}

export function abrirDetalleCliente(clienteId) {
    selectedClienteId = clienteId;
    detalleTabActivo = 'dias';
    const cliente = state.clientes.find(c => c.id === clienteId);
    if (!cliente) return;

    const totalConsumo = calcularConsumoCliente(clienteId);
    const pagosPeriodo = calcularPagosCliente(clienteId);
    const totalRestante = calcularMontoRestanteCliente(clienteId);

    document.getElementById('det-cliente-nombre').innerText = cliente.nombre;
    document.getElementById('det-cliente-telefono').innerText = cliente.telefono ? cliente.telefono : 'Sin Teléfono';
    document.getElementById('det-cliente-total').innerText = `$${totalConsumo.toFixed(2)}`;
    document.getElementById('det-deuda-anterior').innerText = `$${cliente.deuda_anterior.toFixed(2)}`;
    document.getElementById('det-abonos-periodo').innerText = `-$${pagosPeriodo.toFixed(2)}`;
    document.getElementById('det-desglose-neto').innerText = `$${totalRestante.toFixed(2)}`;

    const ventasCliente = state.ventas.filter(v => v.clienteId === clienteId && v.periodo === state.periodoActual);

    // ── Vista "Por Día" ──
    renderVistaPorDia(ventasCliente);

    // ── Vista "Por Producto" ──
    renderVistaPorProducto(ventasCliente);

    // Activate tabs
    actualizarTabsUI();

    document.getElementById('modal-detalle-cliente').classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
}

function renderVistaPorDia(ventasCliente) {
    const lista = document.getElementById('det-lista-dias');
    lista.innerHTML = '';

    if (ventasCliente.length === 0) {
        lista.innerHTML = `<p class="text-xs text-m3-outline text-center py-6">No hay consumos registrados en este período.</p>`;
        return;
    }

    // Group sales by date
    const porDia = {};
    ventasCliente.forEach(v => {
        let diaKey = 'Sin fecha';
        if (v.fechaIso) {
            diaKey = new Date(v.fechaIso).toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' });
        } else if (v.fecha) {
            diaKey = v.fecha.split(',')[0] || v.fecha;
        }
        if (!porDia[diaKey]) porDia[diaKey] = [];
        porDia[diaKey].push(v);
    });

    // Render each day group
    Object.entries(porDia).reverse().forEach(([dia, ventas]) => {
        let subtotalDia = 0;
        const itemsHtml = ventas.map(v => {
            const p = state.productos.find(prod => prod.id === v.productoId);
            if (!p) return '';
            const lineTotal = (v.precioUnitario ?? p.precio) * v.cantidad;
            subtotalDia += lineTotal;
            const avatarHtml = getAvatarHtml(p);
            const hora = v.fecha ? v.fecha.split(',')[1]?.trim() || '' : '';
            return `
                <div class="flex justify-between items-center py-1.5">
                    <div class="flex items-center space-x-2 min-w-0">
                        ${avatarHtml}
                        <div class="min-w-0">
                            <span class="font-semibold text-m3-onSurface block truncate text-[11px]">${p.nombre}</span>
                            ${hora ? `<span class="text-[9px] text-m3-outline">${hora}</span>` : ''}
                        </div>
                    </div>
                    <div class="text-right shrink-0">
                        <span class="text-[11px] text-m3-outline">${v.cantidad}× $${(v.precioUnitario ?? p.precio).toFixed(2)}</span>
                        <span class="font-bold text-m3-onSurface text-xs block">$${lineTotal.toFixed(2)}</span>
                    </div>
                </div>
            `;
        }).join('');

        const grupo = document.createElement('div');
        grupo.className = 'bg-m3-surface rounded-2xl p-3 border border-m3-outlineVariant/20';
        grupo.innerHTML = `
            <div class="flex justify-between items-center mb-2 pb-1.5 border-b border-m3-outlineVariant/30">
                <div class="flex items-center space-x-1.5">
                    <i data-lucide="calendar" class="w-3 h-3 text-m3-primary"></i>
                    <span class="text-[11px] font-bold text-m3-onSurface capitalize">${dia}</span>
                </div>
                <span class="text-[11px] font-black text-m3-primary bg-m3-primaryContainer/50 px-2 py-0.5 rounded-lg">$${subtotalDia.toFixed(2)}</span>
            </div>
            <div class="space-y-0.5 text-xs">
                ${itemsHtml}
            </div>
        `;
        lista.appendChild(grupo);
    });
}

function renderVistaPorProducto(ventasCliente) {
    const lista = document.getElementById('det-lista-productos-resumen');
    lista.innerHTML = '';

    if (ventasCliente.length === 0) {
        lista.innerHTML = `<p class="text-xs text-m3-outline text-center py-6">No hay consumos registrados en este período.</p>`;
        return;
    }

    // Aggregate by product
    const porProducto = {};
    ventasCliente.forEach(v => {
        if (!porProducto[v.productoId]) {
            porProducto[v.productoId] = { cantidad: 0, total: 0 };
        }
        const p = state.productos.find(prod => prod.id === v.productoId);
        if (p) {
            porProducto[v.productoId].cantidad += v.cantidad;
            porProducto[v.productoId].total += (v.precioUnitario ?? p.precio) * v.cantidad;
        }
    });

    // Sort by total spent descending
    const sorted = Object.entries(porProducto).sort((a, b) => b[1].total - a[1].total);
    const grandTotal = sorted.reduce((s, [, v]) => s + v.total, 0);

    sorted.forEach(([productoId, data]) => {
        const p = state.productos.find(prod => prod.id === productoId);
        if (!p) return;

        const avatarHtml = getAvatarHtml(p, 'w-10 h-10');
        const pct = grandTotal > 0 ? ((data.total / grandTotal) * 100).toFixed(0) : 0;

        const item = document.createElement('div');
        item.className = 'flex items-center bg-m3-surface p-3 rounded-2xl text-xs border border-m3-outlineVariant/20';
        item.innerHTML = `
            <div class="flex items-center space-x-3 min-w-0 flex-1">
                ${avatarHtml}
                <div class="min-w-0 flex-1">
                    <span class="font-bold text-m3-onSurface block truncate">${p.nombre}</span>
                    <div class="flex items-center space-x-2 mt-1">
                        <span class="text-[10px] text-m3-outline">${data.cantidad} ${data.cantidad === 1 ? 'unidad' : 'unidades'}</span>
                        <span class="text-[10px] text-m3-outline">·</span>
                        <span class="text-[10px] text-m3-outline">$${(data.total / (data.cantidad || 1)).toFixed(2)} prom. c/u</span>
                    </div>
                    <!-- Barra de proporción -->
                    <div class="mt-1.5 w-full h-1.5 bg-m3-outlineVariant/30 rounded-full overflow-hidden">
                        <div class="h-full bg-m3-primary rounded-full transition-all" style="width: ${pct}%"></div>
                    </div>
                </div>
            </div>
            <div class="text-right shrink-0 ml-3">
                <span class="text-sm font-black text-m3-onSurface block">$${data.total.toFixed(2)}</span>
                <span class="text-[10px] text-m3-outline">${pct}%</span>
            </div>
        `;
        lista.appendChild(item);
    });
}

function getAvatarHtml(producto, sizeClasses = 'w-7 h-7') {
    const tieneImagen = producto.imagen && producto.imagen.trim() !== "";
    if (tieneImagen) {
        return `<img class="${sizeClasses} object-cover rounded-lg shrink-0" src="${producto.imagen}" onerror="this.onerror=null; this.parentElement.innerHTML='<span>${producto.emoji || '🍩'}</span>'"/>`;
    }
    return `<span class="text-sm shrink-0">${producto.emoji || '🍩'}</span>`;
}

export function cerrarModalDetalleCliente() {
    const modal = document.getElementById('modal-detalle-cliente');
    if (modal) modal.classList.add('hidden');
    selectedClienteId = null;
}

let liquidacionEnProceso = false;
async function marcarComoTotalmentePagado() {
    if (liquidacionEnProceso) return;
    const cliente = state.clientes.find(c => c.id === selectedClienteId);
    if (!cliente) return;
    const restante = calcularMontoRestanteCliente(cliente.id);
    if (restante <= 0) {
        showToast('Esta cuenta ya está saldada.');
        return;
    }
    liquidacionEnProceso = true;
    try {
        await registrarAbonoConfirmado(cliente.id, restante);
        // Nunca borrar deuda_anterior: el pago queda registrado en el período.
        cerrarModalDetalleCliente();
        onDetalleActualizadoCallback?.();
        showToast('Cuenta liquidada y pago guardado correctamente.');
    } catch (error) {
        console.error('Error liquidando cuenta:', error);
        showToast('No se pudo guardar la liquidación.', true);
    } finally {
        liquidacionEnProceso = false;
    }
}
